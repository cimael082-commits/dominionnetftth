import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-Router-Id",
  "Access-Control-Max-Age": "86400",
} as const;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

// Um roteador é considerado offline se não sincroniza há mais de 3 minutos.
const OFFLINE_MS = 3 * 60 * 1000;

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

        const url = new URL(request.url);
        const filtroRouter = url.searchParams.get("router_id");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let q = supabaseAdmin
          .from("clientes")
          .select("id, nome, login_pppoe, online, ip_atual, uptime_atual, ultima_sincronizacao, router_id")
          .order("nome");
        if (filtroRouter) q = q.eq("router_id", filtroRouter);
        const { data, error } = await q;
        if (error) return json(500, { error: error.message });

        const { data: routers } = await supabaseAdmin
          .from("roteadores")
          .select("router_id, nome, ip, online, clientes_online, clientes_total, ultima_sincronizacao")
          .order("nome");

        const agora = Date.now();
        const roteadores = (routers ?? []).map((r) => ({
          ...r,
          online:
            !!r.ultima_sincronizacao &&
            agora - new Date(r.ultima_sincronizacao).getTime() < OFFLINE_MS,
        }));

        const clientes = (data ?? []).map((c) => ({
          id: c.id,
          nome: c.nome,
          login_pppoe: c.login_pppoe,
          router_id: c.router_id,
          status: c.online ? "online" : "offline",
          ip: c.ip_atual,
          uptime: c.uptime_atual,
          ultima_sincronizacao: c.ultima_sincronizacao,
        }));
        const online = clientes.filter((c) => c.status === "online").length;
        return json(200, {
          totais: { online, offline: clientes.length - online, total: clientes.length },
          roteadores,
          clientes,
        });
      },
    },
  },
});
