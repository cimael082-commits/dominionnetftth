
REVOKE ALL ON FUNCTION public.atualizar_status_vencidos() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_status_vencidos() TO service_role;
