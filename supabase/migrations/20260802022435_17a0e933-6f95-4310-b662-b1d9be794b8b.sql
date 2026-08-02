ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS equipamentos text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS equipamentos_obs text,
  ADD COLUMN IF NOT EXISTS senha_reset text;