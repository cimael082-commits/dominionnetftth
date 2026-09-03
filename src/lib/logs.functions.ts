/**
 * Ponte cliente → servidor para registrar eventos de autenticação no módulo de Logs.
 *
 * É intencionalmente pública (login inválido acontece sem sessão) e por isso
 * aceita apenas um conjunto fechado de eventos, sem texto livre do navegador.
 */
import { createServerFn } from "@tanstack/react-start";

const EVENTOS = {
  login_ok: { tipo: "SUCESSO", descricao: "Login realizado", status: "sucesso" },
  login_falha: { tipo: "ALERTA", descricao: "Tentativa de login inválida", status: "falha" },
  logout: { tipo: "INFO", descricao: "Logout realizado", status: "ok" },
} as const;

export type EventoAuth = keyof typeof EVENTOS;

function validar(input: unknown): { evento: EventoAuth; usuario: string | null } {
  const obj = (input ?? {}) as { evento?: unknown; usuario?: unknown };
  const evento = typeof obj.evento === "string" ? obj.evento : "";
  if (!(evento in EVENTOS)) throw new Error("Evento inválido");
  const usuario =
    typeof obj.usuario === "string" && obj.usuario.trim().length > 0
      ? obj.usuario.trim().slice(0, 160)
      : null;
  return { evento: evento as EventoAuth, usuario };
}

export const registrarLogAuth = createServerFn({ method: "POST" })
  .inputValidator(validar)
  .handler(async ({ data }) => {
    const { registrarLog, ipDaRequisicao } = await import("@/lib/logs.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const meta = EVENTOS[data.evento];
    let ip: string | null = null;
    try {
      ip = ipDaRequisicao(getRequest());
    } catch {
      /* fora de contexto de requisição — segue sem IP */
    }
    await registrarLog({
      tipo: meta.tipo,
      categoria: data.evento === "login_falha" ? "Seguranca" : "Login",
      descricao: meta.descricao,
      origem: "Painel Administrativo",
      usuario: data.usuario,
      status: meta.status,
      ip,
    });
    return { ok: true };
  });
