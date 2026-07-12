
-- 1. Novos campos em clientes
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS cpf_cnpj_norm TEXT,
  ADD COLUMN IF NOT EXISTS senha_cliente_hash TEXT,
  ADD COLUMN IF NOT EXISTS wifi_ssid TEXT,
  ADD COLUMN IF NOT EXISTS wifi_senha TEXT,
  ADD COLUMN IF NOT EXISTS google_sub TEXT,
  ADD COLUMN IF NOT EXISTS facebook_id TEXT,
  ADD COLUMN IF NOT EXISTS linked_at TIMESTAMPTZ;

-- Normaliza CPF, mas só grava se tiver 11 ou 14 dígitos (evita duplicatas placeholder)
UPDATE public.clientes
   SET cpf_cnpj_norm = CASE
     WHEN length(regexp_replace(COALESCE(cpf_cnpj, ''), '[^0-9]', '', 'g')) IN (11, 14)
       THEN regexp_replace(cpf_cnpj, '[^0-9]', '', 'g')
     ELSE NULL
   END
 WHERE cpf_cnpj_norm IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS clientes_cpf_norm_uidx
  ON public.clientes (cpf_cnpj_norm)
  WHERE cpf_cnpj_norm IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS clientes_google_sub_uidx
  ON public.clientes (google_sub) WHERE google_sub IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS clientes_facebook_id_uidx
  ON public.clientes (facebook_id) WHERE facebook_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS clientes_login_pppoe_idx
  ON public.clientes (login_pppoe) WHERE login_pppoe IS NOT NULL;

-- 2. forma_pagamento em parcelas
ALTER TABLE public.parcelas
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT
    CHECK (forma_pagamento IN ('pix','boleto','dinheiro','cartao','outro'));

-- 3. avisos
CREATE TABLE IF NOT EXISTS public.avisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'info' CHECK (tipo IN ('info','manutencao','promocao','aviso','urgente')),
  destino TEXT NOT NULL DEFAULT 'all' CHECK (destino IN ('all','cliente')),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.avisos TO authenticated;
GRANT ALL ON public.avisos TO service_role;
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins podem ver avisos" ON public.avisos FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins podem criar avisos" ON public.avisos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins podem atualizar avisos" ON public.avisos FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins podem excluir avisos" ON public.avisos FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE INDEX IF NOT EXISTS avisos_destino_idx ON public.avisos (destino, cliente_id, created_at DESC);
DROP TRIGGER IF EXISTS update_avisos_updated_at ON public.avisos;
CREATE TRIGGER update_avisos_updated_at BEFORE UPDATE ON public.avisos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. aviso_leituras
CREATE TABLE IF NOT EXISTS public.aviso_leituras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aviso_id UUID NOT NULL REFERENCES public.avisos(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  lido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (aviso_id, cliente_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aviso_leituras TO authenticated;
GRANT ALL ON public.aviso_leituras TO service_role;
ALTER TABLE public.aviso_leituras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins podem ver leituras" ON public.aviso_leituras FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins podem gerenciar leituras" ON public.aviso_leituras FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 5. notificacoes
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('vencimento_5d','vencimento_2d','vencimento_hoje','atraso','pagamento_confirmado','novo_carne','aviso')),
  titulo TEXT NOT NULL,
  corpo TEXT NOT NULL,
  parcela_id UUID REFERENCES public.parcelas(id) ON DELETE SET NULL,
  aviso_id UUID REFERENCES public.avisos(id) ON DELETE SET NULL,
  lido BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificacoes TO authenticated;
GRANT ALL ON public.notificacoes TO service_role;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins podem ver notificacoes" ON public.notificacoes FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins podem gerenciar notificacoes" ON public.notificacoes FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE INDEX IF NOT EXISTS notificacoes_cliente_idx ON public.notificacoes (cliente_id, lido, created_at DESC);

-- 6. Trigger: pagamento confirmado
CREATE OR REPLACE FUNCTION public.notifica_pagamento_confirmado()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'pago' AND (OLD.status IS DISTINCT FROM 'pago') THEN
    INSERT INTO public.notificacoes (cliente_id, tipo, titulo, corpo, parcela_id)
    VALUES (NEW.cliente_id, 'pagamento_confirmado', 'Pagamento confirmado',
            'Recebemos o pagamento da parcela ' || COALESCE(NEW.numero_parcela::text, '') ||
            ' no valor de R$ ' || to_char(NEW.valor, 'FM999G990D00') || '.', NEW.id);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notifica_pagamento ON public.parcelas;
CREATE TRIGGER trg_notifica_pagamento AFTER UPDATE ON public.parcelas
  FOR EACH ROW EXECUTE FUNCTION public.notifica_pagamento_confirmado();

-- 7. Trigger: nova parcela
CREATE OR REPLACE FUNCTION public.notifica_nova_parcela()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notificacoes (cliente_id, tipo, titulo, corpo, parcela_id)
  VALUES (NEW.cliente_id, 'novo_carne', 'Nova cobrança disponível',
          'Uma nova cobrança de R$ ' || to_char(NEW.valor, 'FM999G990D00') ||
          ' foi gerada, com vencimento em ' || to_char(NEW.data_vencimento, 'DD/MM/YYYY') || '.', NEW.id);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notifica_nova_parcela ON public.parcelas;
CREATE TRIGGER trg_notifica_nova_parcela AFTER INSERT ON public.parcelas
  FOR EACH ROW EXECUTE FUNCTION public.notifica_nova_parcela();

-- 8. Função: gera lembretes diários
CREATE OR REPLACE FUNCTION public.gerar_lembretes_vencimento()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inserted INTEGER := 0; r RECORD; v_dias INTEGER; v_tipo TEXT; v_titulo TEXT; v_corpo TEXT;
BEGIN
  FOR r IN SELECT p.id, p.cliente_id, p.valor, p.data_vencimento, p.status
             FROM public.parcelas p
            WHERE p.status IN ('pendente','vencido','atrasado')
              AND p.data_vencimento BETWEEN CURRENT_DATE - INTERVAL '30 days' AND CURRENT_DATE + INTERVAL '5 days'
  LOOP
    v_dias := r.data_vencimento - CURRENT_DATE;
    IF v_dias = 5 THEN v_tipo := 'vencimento_5d'; v_titulo := 'Sua fatura vence em 5 dias';
    ELSIF v_dias = 2 THEN v_tipo := 'vencimento_2d'; v_titulo := 'Sua fatura vence em 2 dias';
    ELSIF v_dias = 0 THEN v_tipo := 'vencimento_hoje'; v_titulo := 'Sua fatura vence hoje';
    ELSIF v_dias < 0 THEN v_tipo := 'atraso'; v_titulo := 'Fatura em atraso';
    ELSE CONTINUE;
    END IF;
    v_corpo := 'Fatura de R$ ' || to_char(r.valor, 'FM999G990D00') ||
               ' com vencimento em ' || to_char(r.data_vencimento, 'DD/MM/YYYY') || '.';
    IF NOT EXISTS (SELECT 1 FROM public.notificacoes n
                    WHERE n.cliente_id = r.cliente_id AND n.parcela_id = r.id
                      AND n.tipo = v_tipo AND n.created_at::date = CURRENT_DATE) THEN
      INSERT INTO public.notificacoes (cliente_id, tipo, titulo, corpo, parcela_id)
      VALUES (r.cliente_id, v_tipo, v_titulo, v_corpo, r.id);
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;
  RETURN v_inserted;
END; $$;
