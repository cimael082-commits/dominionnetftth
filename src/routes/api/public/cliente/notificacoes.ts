import { createFileRoute } from "@tanstack/react-router";
import { CLIENTE_CORS, jsonResp, requireCliente } from "@/lib/cliente-auth.server";

export const Route = createFileRoute("/api/public/cliente/notificacoes")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CLIENTE_CORS }),
      GET: async ({ request }) => {
        const clienteId = await requireCliente(request);
        if (!clienteId) return jsonResp(401, { error: "Não autorizado" });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin
          .from("notificacoes")
          .select("id, tipo, titulo, corpo, parcela_id, lido, created_at")
          .eq("cliente_id", clienteId)
          .order("created_at", { ascending: false })
          .limit(200);
        return jsonResp(200, { notificacoes: data ?? [] });
      },
      POST: async ({ request }) => {
        const clienteId = await requireCliente(request);
        if (!clienteId) return jsonResp(401, { error: "Não autorizado" });
        const body = (await request.json().catch(() => ({}))) as {
          id?: string;
          all?: boolean;
        };
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        if (body.all) {
          await supabaseAdmin
            .from("notificacoes")
            .update({ lido: true })
            .eq("cliente_id", clienteId)
            .eq("lido", false);
        } else if (body.id) {
          await supabaseAdmin
            .from("notificacoes")
            .update({ lido: true })
            .eq("id", body.id)
            .eq("cliente_id", clienteId);
        }
        return jsonResp(200, { ok: true });
      },
    },
  },
});
