
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS online BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ip_atual TEXT,
  ADD COLUMN IF NOT EXISTS uptime_atual TEXT,
  ADD COLUMN IF NOT EXISTS ultima_sincronizacao TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clientes_login_pppoe ON public.clientes(login_pppoe);

CREATE TABLE IF NOT EXISTS public.eventos_conexao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  login_pppoe TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('conectou','desconectou')),
  ip TEXT,
  uptime TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eventos_conexao_cliente ON public.eventos_conexao(cliente_id);
CREATE INDEX IF NOT EXISTS idx_eventos_conexao_created ON public.eventos_conexao(created_at DESC);

GRANT SELECT, INSERT ON public.eventos_conexao TO authenticated;
GRANT ALL ON public.eventos_conexao TO service_role;

ALTER TABLE public.eventos_conexao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver eventos"
  ON public.eventos_conexao FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem inserir eventos"
  ON public.eventos_conexao FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

ALTER PUBLICATION supabase_realtime ADD TABLE public.clientes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.eventos_conexao;
ALTER TABLE public.clientes REPLICA IDENTITY FULL;
ALTER TABLE public.eventos_conexao REPLICA IDENTITY FULL;
