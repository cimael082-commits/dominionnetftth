CREATE TABLE public.roteadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  router_id text NOT NULL UNIQUE,
  nome text NOT NULL,
  ip text,
  identity text,
  versao text,
  online boolean NOT NULL DEFAULT false,
  clientes_online integer NOT NULL DEFAULT 0,
  clientes_total integer NOT NULL DEFAULT 0,
  ultima_sincronizacao timestamptz,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.roteadores TO authenticated;
GRANT ALL ON public.roteadores TO service_role;

ALTER TABLE public.roteadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem roteadores" ON public.roteadores FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados inserem roteadores" ON public.roteadores FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados atualizam roteadores" ON public.roteadores FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados deletam roteadores" ON public.roteadores FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_roteadores_updated_at BEFORE UPDATE ON public.roteadores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS router_id text;
ALTER TABLE public.eventos_conexao ADD COLUMN IF NOT EXISTS router_id text;
ALTER TABLE public.ctos ADD COLUMN IF NOT EXISTS router_id text;

CREATE INDEX IF NOT EXISTS idx_clientes_router_id ON public.clientes(router_id);
CREATE INDEX IF NOT EXISTS idx_eventos_conexao_router_id ON public.eventos_conexao(router_id);
CREATE INDEX IF NOT EXISTS idx_ctos_router_id ON public.ctos(router_id);