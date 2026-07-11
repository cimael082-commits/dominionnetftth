import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  "Access-Control-Max-Age": "86400",
} as const;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export const Route = createFileRoute("/api/public/mikrotik/status")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const expected = process.env.MIKROTIK_API_KEY;
        if (!expected) return json(500, { error: "API key não configurada no servidor" });
        const provided =
          request.headers.get("x-api-key") ||
          (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
        if (!provided || provided !== expected) {
          return json(401, { error: "Não autorizado" });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("clientes")
          .select("id, nome, login_pppoe, online, ip_atual, uptime_atual, ultima_sincronizacao")
          .order("nome");
        if (error) return json(500, { error: error.message });

        const clientes = (data ?? []).map((c) => ({
          id: c.id,
          nome: c.nome,
          login_pppoe: c.login_pppoe,
          status: c.online ? "online" : "offline",
          ip: c.ip_atual,
          uptime: c.uptime_atual,
          ultima_sincronizacao: c.ultima_sincronizacao,
        }));
        const online = clientes.filter((c) => c.status === "online").length;
        return json(200, {
          totais: { online, offline: clientes.length - online, total: clientes.length },
          clientes,
        });
      },
    },
  },
});
