import { createFileRoute } from "@tanstack/react-router";
import { CLIENTE_CORS, jsonResp, requireCliente } from "@/lib/cliente-auth.server";

export const Route = createFileRoute("/api/public/cliente/indicacoes")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CLIENTE_CORS }),

      GET: async ({ request }) => {
        const clienteId = await requireCliente(request);
        if (!clienteId) return jsonResp(401, { error: "Não autorizado" });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: cliente } = await supabaseAdmin
          .from("clientes")
          .select("codigo_indicacao")
          .eq("id", clienteId)
          .maybeSingle();

        let codigo = cliente?.codigo_indicacao ?? null;
        if (!codigo) {
          codigo = clienteId.replace(/-/g, "").slice(0, 6).toUpperCase();
          await supabaseAdmin
            .from("clientes")
            .update({ codigo_indicacao: codigo })
            .eq("id", clienteId);
        }

        const { data: indicacoes } = await supabaseAdmin
          .from("indicacoes")
          .select("id, nome_indicado, telefone_indicado, status, recompensa, created_at")
          .eq("cliente_id", clienteId)
          .order("created_at", { ascending: false })
          .limit(100);

        const lista = indicacoes ?? [];
        const creditos = lista
          .filter((i) => i.status === "instalado")
          .reduce((s, i) => s + Number(i.recompensa || 0), 0);

        return jsonResp(200, { codigo, indicacoes: lista, creditos });
      },

      POST: async ({ request }) => {
        const clienteId = await requireCliente(request);
        if (!clienteId) return jsonResp(401, { error: "Não autorizado" });

        const body = (await request.json().catch(() => ({}))) as {
          nome_indicado?: string;
          telefone_indicado?: string;
        };
        const nome = (body.nome_indicado || "").trim();
        if (nome.length < 2) return jsonResp(400, { error: "Informe o nome do amigo" });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: cliente } = await supabaseAdmin
          .from("clientes")
          .select("codigo_indicacao")
          .eq("id", clienteId)
          .maybeSingle();

        const { error } = await supabaseAdmin.from("indicacoes").insert({
          cliente_id: clienteId,
          codigo: cliente?.codigo_indicacao || clienteId.slice(0, 6).toUpperCase(),
          nome_indicado: nome,
          telefone_indicado: (body.telefone_indicado || "").trim() || null,
        });
        if (error) return jsonResp(500, { error: error.message });

        return jsonResp(200, { ok: true });
      },
    },
  },
});
