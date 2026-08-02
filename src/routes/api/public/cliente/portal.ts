import { createFileRoute } from "@tanstack/react-router";
import { CLIENTE_CORS, jsonResp, requireCliente } from "@/lib/cliente-auth.server";

/**
 * Conteúdo editável do portal (texto promocional / suporte).
 * Somente campos públicos da tabela de configurações são expostos.
 */
export const Route = createFileRoute("/api/public/cliente/portal")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CLIENTE_CORS }),
      GET: async ({ request }) => {
        const clienteId = await requireCliente(request);
        if (!clienteId) return jsonResp(401, { error: "Não autorizado" });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data, error } = await supabaseAdmin
          .from("configuracoes_empresa")
          .select(
            "portal_promo_ativo, portal_promo_titulo, portal_promo_texto, portal_suporte_whatsapp, portal_promo_rodape",
          )
          .limit(1)
          .maybeSingle();
        if (error) return jsonResp(500, { error: error.message });

        return jsonResp(200, { portal: data ?? null });
      },
    },
  },
});
