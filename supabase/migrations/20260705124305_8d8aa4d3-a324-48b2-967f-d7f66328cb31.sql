
-- Trigger util para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Enums
CREATE TYPE public.cliente_status AS ENUM ('ativo','bloqueado','cancelado','inadimplente');
CREATE TYPE public.parcela_status AS ENUM ('pago','pendente','vencido','cancelado');

-- CLIENTES
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf_cnpj TEXT,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT,
  endereco TEXT,
  bairro TEXT,
  cidade TEXT,
  cep TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  plano TEXT,
  valor_mensalidade NUMERIC(10,2) NOT NULL DEFAULT 0,
  dia_vencimento INT NOT NULL DEFAULT 10 CHECK (dia_vencimento BETWEEN 1 AND 31),
  login_pppoe TEXT,
  senha_pppoe TEXT,
  ssid_wifi TEXT,
  senha_wifi TEXT,
  status public.cliente_status NOT NULL DEFAULT 'ativo',
  observacoes TEXT,
  data_ativacao DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados gerenciam clientes" ON public.clientes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_clientes_updated_at BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_clientes_nome ON public.clientes (nome);
CREATE INDEX idx_clientes_status ON public.clientes (status);

-- PARCELAS (financeiro / carnês)
CREATE TABLE public.parcelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  numero_parcela INT,
  total_parcelas INT,
  referencia_mes INT NOT NULL CHECK (referencia_mes BETWEEN 1 AND 12),
  referencia_ano INT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  forma_pagamento TEXT,
  status public.parcela_status NOT NULL DEFAULT 'pendente',
  observacao TEXT,
  origem TEXT NOT NULL DEFAULT 'mensalidade', -- 'mensalidade' | 'carne'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parcelas TO authenticated;
GRANT ALL ON public.parcelas TO service_role;
ALTER TABLE public.parcelas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados gerenciam parcelas" ON public.parcelas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_parcelas_updated_at BEFORE UPDATE ON public.parcelas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_parcelas_cliente ON public.parcelas (cliente_id);
CREATE INDEX idx_parcelas_venc ON public.parcelas (data_vencimento);
CREATE INDEX idx_parcelas_status ON public.parcelas (status);

-- CONFIGURAÇÕES DA EMPRESA
CREATE TABLE public.configuracoes_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_empresa TEXT NOT NULL DEFAULT 'Dominion Net',
  cnpj TEXT,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  pix_chave TEXT NOT NULL DEFAULT 'alexandrejosecicero561@gmail.com',
  pix_tipo TEXT NOT NULL DEFAULT 'email',
  pix_beneficiario TEXT NOT NULL DEFAULT 'DOMINION NET',
  pix_cidade TEXT NOT NULL DEFAULT 'SAO PAULO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_empresa TO authenticated;
GRANT ALL ON public.configuracoes_empresa TO service_role;
ALTER TABLE public.configuracoes_empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados gerenciam config" ON public.configuracoes_empresa
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_config_updated_at BEFORE UPDATE ON public.configuracoes_empresa
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.configuracoes_empresa (nome_empresa, pix_chave, pix_tipo, pix_beneficiario, pix_cidade)
VALUES ('Dominion Net', 'alexandrejosecicero561@gmail.com', 'email', 'DOMINION NET', 'SAO PAULO');

-- Função para marcar parcelas vencidas
CREATE OR REPLACE FUNCTION public.atualizar_status_vencidos()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.parcelas
     SET status = 'vencido'
   WHERE status = 'pendente'
     AND data_vencimento < CURRENT_DATE;
$$;
