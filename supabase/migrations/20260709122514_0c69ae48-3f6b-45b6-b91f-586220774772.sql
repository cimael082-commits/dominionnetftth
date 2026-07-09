ALTER TABLE public.rotas_fibra
  ADD COLUMN IF NOT EXISTS fibras_qtd integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS cor_cabo text NOT NULL DEFAULT '#f59e0b';