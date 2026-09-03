ALTER TABLE public.ctos ADD COLUMN IF NOT EXISTS qr_token TEXT;
UPDATE public.ctos SET qr_token = replace(gen_random_uuid()::text, '-', '') WHERE qr_token IS NULL;
ALTER TABLE public.ctos ALTER COLUMN qr_token SET DEFAULT replace(gen_random_uuid()::text, '-', '');
ALTER TABLE public.ctos ALTER COLUMN qr_token SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ctos_qr_token_key ON public.ctos (qr_token);