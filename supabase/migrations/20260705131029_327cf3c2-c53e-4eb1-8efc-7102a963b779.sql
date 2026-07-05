
CREATE TYPE public.infra_status AS ENUM ('planejado','implantacao','ativo','desativado');
CREATE TYPE public.rota_tipo AS ENUM ('fibra','colibri');

CREATE TABLE public.ctos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  portas_totais integer NOT NULL DEFAULT 8,
  portas_livres integer NOT NULL DEFAULT 8,
  status public.infra_status NOT NULL DEFAULT 'ativo',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ctos TO authenticated;
GRANT ALL ON public.ctos TO service_role;
ALTER TABLE public.ctos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth le ctos" ON public.ctos FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insere ctos" ON public.ctos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth atualiza ctos" ON public.ctos FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth deleta ctos" ON public.ctos FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE TRIGGER trg_ctos_updated BEFORE UPDATE ON public.ctos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ceo_emendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  status public.infra_status NOT NULL DEFAULT 'ativo',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ceo_emendas TO authenticated;
GRANT ALL ON public.ceo_emendas TO service_role;
ALTER TABLE public.ceo_emendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth le ceos" ON public.ceo_emendas FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insere ceos" ON public.ceo_emendas FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth atualiza ceos" ON public.ceo_emendas FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth deleta ceos" ON public.ceo_emendas FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE TRIGGER trg_ceos_updated BEFORE UPDATE ON public.ceo_emendas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.rotas_fibra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo public.rota_tipo NOT NULL DEFAULT 'fibra',
  status public.infra_status NOT NULL DEFAULT 'planejado',
  coordenadas jsonb NOT NULL DEFAULT '[]'::jsonb,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rotas_fibra TO authenticated;
GRANT ALL ON public.rotas_fibra TO service_role;
ALTER TABLE public.rotas_fibra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth le rotas" ON public.rotas_fibra FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insere rotas" ON public.rotas_fibra FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth atualiza rotas" ON public.rotas_fibra FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth deleta rotas" ON public.rotas_fibra FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE TRIGGER trg_rotas_updated BEFORE UPDATE ON public.rotas_fibra FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
