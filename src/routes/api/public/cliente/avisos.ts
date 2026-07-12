import { createFileRoute } from "@tanstack/react-router";
import { CLIENTE_CORS, jsonResp, requireCliente } from "@/lib/cliente-auth.server";

export const Route = createFileRoute("/api/public/cliente/avisos")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CLIENTE_CORS }),
      GET: async ({ request }) => {
        const clienteId = await requireCliente(request);
        if (!clienteId) return jsonResp(401, { error: "Não autorizado" });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: avisos } = await supabaseAdmin
          .from("avisos")
          .select("id, titulo, mensagem, tipo, destino, cliente_id, created_at")
          .or(`destino.eq.all,cliente_id.eq.${clienteId}`)
          .order("created_at", { ascending: false })
          .limit(100);
        const { data: leituras } = await supabaseAdmin
          .from("aviso_leituras")
          .select("aviso_id")
          .eq("cliente_id", clienteId);
        const readSet = new Set((leituras ?? []).map((l) => l.aviso_id));
        const list = (avisos ?? []).map((a) => ({ ...a, lido: readSet.has(a.id) }));
        return jsonResp(200, { avisos: list });
      },
      POST: async ({ request }) => {
        const clienteId = await requireCliente(request);
        if (!clienteId) return jsonResp(401, { error: "Não autorizado" });
        const body = (await request.json().catch(() => ({}))) as { aviso_id?: string };
        if (!body.aviso_id) return jsonResp(400, { error: "aviso_id obrigatório" });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("aviso_leituras")
          .upsert(
            { aviso_id: body.aviso_id, cliente_id: clienteId },
            { onConflict: "aviso_id,cliente_id" },
          );
        return jsonResp(200, { ok: true });
      },
    },
  },
});
