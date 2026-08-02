CREATE TABLE public.assistente_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_assistente_mensagens_user_created
  ON public.assistente_mensagens (user_id, created_at);

GRANT SELECT, INSERT, DELETE ON public.assistente_mensagens TO authenticated;
GRANT ALL ON public.assistente_mensagens TO service_role;

ALTER TABLE public.assistente_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário lê suas mensagens"
  ON public.assistente_mensagens FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Usuário cria suas mensagens"
  ON public.assistente_mensagens FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuário apaga suas mensagens"
  ON public.assistente_mensagens FOR DELETE TO authenticated
  USING (user_id = auth.uid());