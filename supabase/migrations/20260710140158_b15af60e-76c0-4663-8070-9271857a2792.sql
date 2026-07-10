
-- Route enhancements
ALTER TABLE public.rotas_fibra
  ADD COLUMN IF NOT EXISTS fibras_usadas integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comprimento_m numeric(12,2),
  ADD COLUMN IF NOT EXISTS observacoes text;

-- CTO ports table
CREATE TABLE IF NOT EXISTS public.cto_portas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cto_id uuid NOT NULL REFERENCES public.ctos(id) ON DELETE CASCADE,
  porta_numero integer NOT NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cto_id, porta_numero)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cto_portas TO authenticated;
GRANT ALL ON public.cto_portas TO service_role;

ALTER TABLE public.cto_portas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth select cto_portas" ON public.cto_portas FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth insert cto_portas" ON public.cto_portas FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update cto_portas" ON public.cto_portas FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth delete cto_portas" ON public.cto_portas FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TRIGGER cto_portas_updated_at
  BEFORE UPDATE ON public.cto_portas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-populate ports after inserting a CTO
CREATE OR REPLACE FUNCTION public.criar_portas_cto()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.cto_portas (cto_id, porta_numero)
  SELECT NEW.id, g FROM generate_series(1, GREATEST(COALESCE(NEW.portas_totais,8),1)) AS g
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_criar_portas_cto ON public.ctos;
CREATE TRIGGER trg_criar_portas_cto
  AFTER INSERT ON public.ctos
  FOR EACH ROW EXECUTE FUNCTION public.criar_portas_cto();

-- Recalculate free ports on port change
CREATE OR REPLACE FUNCTION public.recalcular_portas_livres()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cto uuid;
BEGIN
  v_cto := COALESCE(NEW.cto_id, OLD.cto_id);
  UPDATE public.ctos
     SET portas_livres = (SELECT COUNT(*) FROM public.cto_portas WHERE cto_id = v_cto AND cliente_id IS NULL)
   WHERE id = v_cto;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalcular_portas_livres ON public.cto_portas;
CREATE TRIGGER trg_recalcular_portas_livres
  AFTER INSERT OR UPDATE OR DELETE ON public.cto_portas
  FOR EACH ROW EXECUTE FUNCTION public.recalcular_portas_livres();

-- Backfill: create rows for any existing CTOs that don't have ports yet
INSERT INTO public.cto_portas (cto_id, porta_numero)
SELECT c.id, g
  FROM public.ctos c
  CROSS JOIN LATERAL generate_series(1, GREATEST(COALESCE(c.portas_totais,8),1)) AS g
 WHERE NOT EXISTS (SELECT 1 FROM public.cto_portas p WHERE p.cto_id = c.id);
