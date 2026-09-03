import { createFileRoute } from "@tanstack/react-router";

/**
 * Consulta pública (somente leitura) do mapa de portas de uma CTO.
 *
 * Acessada pelo QR Code fixo colado na caixa física. O token é permanente e
 * único por CTO — nada além do número da porta, do status e do NOME do cliente
 * é exposto (sem CPF, telefone, endereço, plano ou dados financeiros).
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

export const Route = createFileRoute("/api/public/cto/$token")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ params }) => {
        const token = String(params.token ?? "").trim();
        // Token curto/ausente nunca deve chegar ao banco.
        if (!/^[a-zA-Z0-9-]{8,64}$/.test(token)) {
          return json(400, { error: "Token inválido" });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: cto, error } = await supabaseAdmin
          .from("ctos")
          .select("id,nome,portas_totais,status")
          .eq("qr_token", token)
          .maybeSingle();
        if (error) return json(500, { error: "Falha ao consultar a CTO" });
        if (!cto) return json(404, { error: "CTO não encontrada" });

        const { data: portas, error: pErr } = await supabaseAdmin
          .from("cto_portas")
          .select("porta_numero, cliente_id, clientes(nome,status)")
          .eq("cto_id", cto.id)
          .order("porta_numero");
        if (pErr) return json(500, { error: "Falha ao consultar as portas" });

        const linhas = (portas ?? []).map((p) => {
          // Cliente cancelado libera a porta automaticamente.
          const ativo = !!p.cliente_id && p.clientes?.status !== "cancelado";
          return {
            porta: p.porta_numero,
            status: ativo ? ("ocupada" as const) : ("livre" as const),
            cliente: ativo ? (p.clientes?.nome ?? null) : null,
          };
        });

        const ocupadas = linhas.filter((l) => l.status === "ocupada").length;

        return json(200, {
          cto: { nome: cto.nome, portas_totais: cto.portas_totais, status: cto.status },
          portas: linhas,
          resumo: {
            total: linhas.length || cto.portas_totais,
            ocupadas,
            livres: (linhas.length || cto.portas_totais) - ocupadas,
          },
          atualizado_em: new Date().toISOString(),
        });
      },
    },
  },
});
