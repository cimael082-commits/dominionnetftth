CREATE TABLE public.logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_hora timestamptz NOT NULL DEFAULT now(),
  tipo text NOT NULL DEFAULT 'INFO' CHECK (tipo IN ('INFO','SUCESSO','ALERTA','ERRO','CRITICO')),
  categoria text NOT NULL DEFAULT 'Sistema' CHECK (categoria IN ('Sistema','MikroTik','OLT','ONU','API','Financeiro','Cliente','Login','Seguranca','Rede')),
  origem text,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nome text,
  usuario text,
  descricao text NOT NULL,
  equipamento text,
  ip text,
  status text NOT NULL DEFAULT 'ok',
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_logs_data_hora ON public.logs (data_hora DESC);
CREATE INDEX idx_logs_tipo ON public.logs (tipo);
CREATE INDEX idx_logs_categoria ON public.logs (categoria);
CREATE INDEX idx_logs_cliente_id ON public.logs (cliente_id);

GRANT SELECT, DELETE ON public.logs TO authenticated;
GRANT ALL ON public.logs TO service_role;

ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff le logs" ON public.logs
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Admin apaga logs" ON public.logs
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.logs;