
REVOKE ALL ON FUNCTION public.notifica_pagamento_confirmado() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notifica_nova_parcela() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.gerar_lembretes_vencimento() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notifica_pagamento_confirmado() TO service_role;
GRANT EXECUTE ON FUNCTION public.notifica_nova_parcela() TO service_role;
GRANT EXECUTE ON FUNCTION public.gerar_lembretes_vencimento() TO service_role;
