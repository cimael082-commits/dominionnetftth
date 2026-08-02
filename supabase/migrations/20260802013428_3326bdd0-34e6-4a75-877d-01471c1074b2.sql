-- BANNERS / CAMPANHAS
CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  imagem_url text,
  botao_texto text,
  botao_url text,
  tipo text NOT NULL DEFAULT 'promocao',
  cor text NOT NULL DEFAULT '#1E88E5',
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  inicio_em date,
  fim_em date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth le banners" ON public.banners FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insere banners" ON public.banners FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth atualiza banners" ON public.banners FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth deleta banners" ON public.banners FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE TRIGGER trg_banners_updated BEFORE UPDATE ON public.banners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CHAMADOS (tickets)
CREATE TABLE public.chamados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  protocolo text NOT NULL DEFAULT to_char(now(), 'YYYYMMDDHH24MISS'),
  assunto text NOT NULL,
  categoria text NOT NULL DEFAULT 'suporte',
  descricao text NOT NULL,
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','em_andamento','resolvido','fechado')),
  prioridade text NOT NULL DEFAULT 'normal' CHECK (prioridade IN ('baixa','normal','alta')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chamados_cliente ON public.chamados(cliente_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chamados TO authenticated;
GRANT ALL ON public.chamados TO service_role;
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth gerencia chamados" ON public.chamados FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER trg_chamados_updated BEFORE UPDATE ON public.chamados FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.chamado_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id uuid NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  autor text NOT NULL DEFAULT 'cliente' CHECK (autor IN ('cliente','suporte')),
  mensagem text,
  anexo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chamado_msg ON public.chamado_mensagens(chamado_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chamado_mensagens TO authenticated;
GRANT ALL ON public.chamado_mensagens TO service_role;
ALTER TABLE public.chamado_mensagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth gerencia mensagens" ON public.chamado_mensagens FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- INDICAÇÕES
CREATE TABLE public.indicacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  nome_indicado text,
  telefone_indicado text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','instalado','cancelado')),
  recompensa numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_indicacoes_cliente ON public.indicacoes(cliente_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.indicacoes TO authenticated;
GRANT ALL ON public.indicacoes TO service_role;
ALTER TABLE public.indicacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth gerencia indicacoes" ON public.indicacoes FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER trg_indicacoes_updated BEFORE UPDATE ON public.indicacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- código de indicação por cliente
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS codigo_indicacao text;
UPDATE public.clientes SET codigo_indicacao = upper(substr(replace(id::text,'-',''),1,6)) WHERE codigo_indicacao IS NULL;