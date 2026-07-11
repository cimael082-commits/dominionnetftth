import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  "Access-Control-Max-Age": "86400",
} as const;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

type Entrada = {
  pppoe_user?: unknown;
  ip?: unknown;
  uptime?: unknown;
};

export const Route = createFileRoute("/api/public/mikrotik/sync")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const expected = process.env.MIKROTIK_API_KEY;
        if (!expected) return json(500, { error: "API key não configurada no servidor" });
        const provided =
          request.headers.get("x-api-key") ||
          (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
        if (!provided || provided !== expected) {
          return json(401, { error: "Não autorizado" });
        }

        let body: { clientes?: Entrada[] };
        try {
          body = (await request.json()) as { clientes?: Entrada[] };
        } catch {
          return json(400, { error: "JSON inválido" });
        }
        if (!body || !Array.isArray(body.clientes)) {
          return json(400, { error: "Formato esperado: { clientes: [...] }" });
        }

        const recebidos = body.clientes
          .map((c) => ({
            pppoe_user: typeof c.pppoe_user === "string" ? c.pppoe_user.trim() : "",
            ip: typeof c.ip === "string" ? c.ip : null,
            uptime: typeof c.uptime === "string" ? c.uptime : null,
          }))
          .filter((c) => c.pppoe_user.length > 0);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date().toISOString();

        // Carrega todos os clientes com login_pppoe
        const { data: clientesDb, error: errList } = await supabaseAdmin
          .from("clientes")
          .select("id, login_pppoe, online")
          .not("login_pppoe", "is", null);
        if (errList) return json(500, { error: errList.message });

        const porLogin = new Map<string, { id: string; login_pppoe: string; online: boolean }>();
        for (const c of clientesDb ?? []) {
          if (c.login_pppoe) porLogin.set(c.login_pppoe.trim(), c as never);
        }

        const eventos: {
          cliente_id: string | null;
          login_pppoe: string;
          tipo: "conectou" | "desconectou";
          ip: string | null;
          uptime: string | null;
        }[] = [];

        // ONLINE: encontrados na sincronização
        const idsOnline: string[] = [];
        let atualizados = 0;
        let naoEncontrados = 0;
        for (const r of recebidos) {
          const cli = porLogin.get(r.pppoe_user);
          if (!cli) {
            naoEncontrados++;
            continue;
          }
          idsOnline.push(cli.id);
          const { error: uErr } = await supabaseAdmin
            .from("clientes")
            .update({
              online: true,
              ip_atual: r.ip,
              uptime_atual: r.uptime,
              ultima_sincronizacao: now,
            })
            .eq("id", cli.id);
          if (!uErr) {
            atualizados++;
            if (!cli.online) {
              eventos.push({
                cliente_id: cli.id,
                login_pppoe: cli.login_pppoe,
                tipo: "conectou",
                ip: r.ip,
                uptime: r.uptime,
              });
            }
          }
        }

        // OFFLINE: todos que estavam online e não vieram na sincronização
        const offlineDoAntes = (clientesDb ?? []).filter(
          (c) => c.online && !idsOnline.includes(c.id),
        );
        if (offlineDoAntes.length > 0) {
          const { error: offErr } = await supabaseAdmin
            .from("clientes")
            .update({
              online: false,
              ip_atual: null,
              uptime_atual: null,
              ultima_sincronizacao: now,
            })
            .in(
              "id",
              offlineDoAntes.map((c) => c.id),
            );
          if (!offErr) {
            for (const c of offlineDoAntes) {
              eventos.push({
                cliente_id: c.id,
                login_pppoe: c.login_pppoe ?? "",
                tipo: "desconectou",
                ip: null,
                uptime: null,
              });
            }
          }
        }

        // Também garante que clientes já offline sem login algum não gerem ruído — nada a fazer.
        if (eventos.length > 0) {
          await supabaseAdmin.from("eventos_conexao").insert(eventos);
        }

        const totalOnline = idsOnline.length;
        const totalOffline = (clientesDb ?? []).length - totalOnline;

        return json(200, {
          ok: true,
          recebidos: recebidos.length,
          atualizados_online: atualizados,
          nao_encontrados: naoEncontrados,
          marcados_offline: offlineDoAntes.length,
          eventos_registrados: eventos.length,
          totais: { online: totalOnline, offline: totalOffline },
          sincronizado_em: now,
        });
      },
    },
  },
});
