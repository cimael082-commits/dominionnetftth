import { createFileRoute } from "@tanstack/react-router";
import { CLIENTE_CORS, jsonResp, requireCliente } from "@/lib/cliente-auth.server";
import { gerarPixBRCode } from "@/lib/pix";

export const Route = createFileRoute("/api/public/cliente/financeiro")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CLIENTE_CORS }),
      GET: async ({ request }) => {
        const clienteId = await requireCliente(request);
        if (!clienteId) return jsonResp(401, { error: "Não autorizado" });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const [{ data: parcelas }, { data: cliente }, { data: cfg }] = await Promise.all([
          supabaseAdmin
            .from("parcelas")
            .select(
              "id, numero_parcela, total_parcelas, valor, data_vencimento, data_pagamento, status, forma_pagamento",
            )
            .eq("cliente_id", clienteId)
            .order("data_vencimento", { ascending: true }),
          supabaseAdmin
            .from("clientes")
            .select("nome, cidade")
            .eq("id", clienteId)
            .maybeSingle(),
          supabaseAdmin
            .from("configuracoes_empresa")
            .select("nome_empresa, chave_pix, cidade_pix")
            .limit(1)
            .maybeSingle(),
        ]);

        const chavePix = cfg?.chave_pix?.trim() || "";
        const beneficiario = cfg?.nome_empresa || "Dominion Net";
        const cidade = cfg?.cidade_pix || cliente?.cidade || "Maceio";

        const enriched = (parcelas ?? []).map((p) => {
          const brcode = chavePix
            ? gerarPixBRCode({
                chave: chavePix,
                beneficiario,
                cidade,
                valor: Number(p.valor),
                txid: p.id.replace(/-/g, "").slice(0, 25),
              })
            : null;
          return { ...p, pix_brcode: brcode };
        });

        return jsonResp(200, { parcelas: enriched });
      },
    },
  },
});
