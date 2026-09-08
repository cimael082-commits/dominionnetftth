CREATE TABLE public.backups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  arquivo_path text NOT NULL,
  tamanho_bytes bigint NOT NULL DEFAULT 0,
  tipo text NOT NULL DEFAULT 'manual' CHECK (tipo IN ('manual','automatico','pre_restauracao')),
  status text NOT NULL DEFAULT 'concluido' CHECK (status IN ('concluido','erro','processando')),
  tabelas jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_registros integer NOT NULL DEFAULT 0,
  versao text NOT NULL DEFAULT '1',
  criado_por text,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, DELETE ON public.backups TO authenticated;
GRANT ALL ON public.backups TO service_role;

ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe visualiza backups" ON public.backups
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Admin exclui backups" ON public.backups
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_backups_created_at ON public.backups (created_at DESC);

CREATE TRIGGER trg_backups_updated
  BEFORE UPDATE ON public.backups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admin le arquivos de backup" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'backups' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin envia arquivos de backup" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'backups' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin remove arquivos de backup" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'backups' AND public.has_role(auth.uid(), 'admin'));