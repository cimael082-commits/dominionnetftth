ALTER TABLE public.roteadores
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS operadora text;