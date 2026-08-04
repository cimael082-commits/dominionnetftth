ALTER TABLE public.ctos
  ADD COLUMN IF NOT EXISTS potencia_dbm numeric,
  ADD COLUMN IF NOT EXISTS potencia_atualizada_em timestamptz,
  ADD COLUMN IF NOT EXISTS alerta text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'clientes'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.clientes';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ctos'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.ctos';
  END IF;
END $$;