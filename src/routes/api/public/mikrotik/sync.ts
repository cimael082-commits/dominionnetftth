import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-Router-Id",
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

type Body = {
  router_id?: unknown;
  router_nome?: unknown;
  router_ip?: unknown;
  identity?: unknown;
  versao?: unknown;
  clientes?: Entrada[];
};

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

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

        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return json(400, { error: "JSON inválido" });
        }
        if (!body || !Array.isArray(body.clientes)) {
          return json(400, { error: "Formato esperado: { router_id, clientes: [...] }" });
        }

        const routerId = str(body.router_id) ?? str(request.headers.get("x-router-id"));
        if (!routerId) {
          return json(400, { error: "Campo obrigatório 'router_id' ausente" });
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

        // Registra/atualiza o roteador
        await supabaseAdmin.from("roteadores").upsert(
          {
            router_id: routerId,
            nome: str(body.router_nome) ?? str(body.identity) ?? routerId,
            ip: str(body.router_ip),
            identity: str(body.identity),
            versao: str(body.versao),
            online: true,
            ultima_sincronizacao: now,
          },
          { onConflict: "router_id" },
        );

        // Carrega TODOS os clientes com login PPPoE.
        // O vínculo é feito pelo login enviado pelo agente: se o mesmo cliente
        // passar a responder por outro MikroTik (troca de link), ele é
        // reatribuído a este router_id em vez de ficar "não encontrado".
        const { data: clientesDb, error: errList } = await supabaseAdmin
          .from("clientes")
          .select("id, login_pppoe, online, router_id")
          .not("login_pppoe", "is", null);
        if (errList) return json(500, { error: errList.message });

        const porLogin = new Map<
          string,
          { id: string; login_pppoe: string | null; online: boolean; router_id: string | null }
        >();
        for (const c of clientesDb ?? []) {
          if (c.login_pppoe) porLogin.set(c.login_pppoe.trim(), c as never);
        }

        const eventos: {
          cliente_id: string | null;
          login_pppoe: string;
          tipo: "conectou" | "desconectou";
          ip: string | null;
          uptime: string | null;
          router_id: string;
        }[] = [];

        // ONLINE: encontrados nesta sincronização — pertencem a este router
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
              router_id: routerId,
            })
            .eq("id", cli.id);
          if (!uErr) {
            atualizados++;
            if (!cli.online) {
              eventos.push({
                cliente_id: cli.id,
                login_pppoe: cli.login_pppoe ?? r.pppoe_user,
                tipo: "conectou",
                ip: r.ip,
                uptime: r.uptime,
                router_id: routerId,
              });
            }
          }
        }

        // OFFLINE: SOMENTE clientes deste router que estavam online e não vieram agora.
        // Clientes de outros MikroTik nunca são tocados.
        const offlineDoAntes = (clientesDb ?? []).filter(
          (c) => c.online && c.router_id === routerId && !idsOnline.includes(c.id),
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
                router_id: routerId,
              });
            }
          }
        }

        if (eventos.length > 0) {
          await supabaseAdmin.from("eventos_conexao").insert(eventos);
        }

        // Estatísticas deste router
        const { count: totalRouter } = await supabaseAdmin
          .from("clientes")
          .select("id", { count: "exact", head: true })
          .eq("router_id", routerId);
        const { count: onlineRouter } = await supabaseAdmin
          .from("clientes")
          .select("id", { count: "exact", head: true })
          .eq("router_id", routerId)
          .eq("online", true);

        await supabaseAdmin
          .from("roteadores")
          .update({
            clientes_total: totalRouter ?? 0,
            clientes_online: onlineRouter ?? 0,
            ultima_sincronizacao: now,
            online: true,
          })
          .eq("router_id", routerId);

        return json(200, {
          ok: true,
          router_id: routerId,
          recebidos: recebidos.length,
          atualizados_online: atualizados,
          nao_encontrados: naoEncontrados,
          marcados_offline: offlineDoAntes.length,
          eventos_registrados: eventos.length,
          totais: { online: onlineRouter ?? 0, total: totalRouter ?? 0 },
          sincronizado_em: now,
        });
      },
    },
  },
});
