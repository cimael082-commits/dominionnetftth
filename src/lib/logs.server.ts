/**
 * Registro central de logs do sistema (uso exclusivo no servidor).
 *
 * Qualquer falha de gravação é engolida de propósito: um log é observabilidade,
 * nunca pode derrubar a operação principal (sincronização, login, cobrança...).
 */

export type LogTipo = "INFO" | "SUCESSO" | "ALERTA" | "ERRO" | "CRITICO";

export type LogCategoria =
  | "Sistema"
  | "MikroTik"
  | "OLT"
  | "ONU"
  | "API"
  | "Financeiro"
  | "Cliente"
  | "Login"
  | "Seguranca"
  | "Rede";

export interface LogEntrada {
  tipo: LogTipo;
  categoria: LogCategoria;
  descricao: string;
  origem?: string | null;
  cliente_id?: string | null;
  cliente_nome?: string | null;
  usuario?: string | null;
  equipamento?: string | null;
  ip?: string | null;
  status?: string | null;
  detalhes?: Record<string, unknown>;
}

type LinhaLog = LogEntrada & { data_hora: string; detalhes: Record<string, unknown> };

function normalizar(e: LogEntrada): LinhaLog {
  return {
    ...e,
    origem: e.origem ?? null,
    cliente_id: e.cliente_id ?? null,
    cliente_nome: e.cliente_nome ?? null,
    usuario: e.usuario ?? null,
    equipamento: e.equipamento ?? null,
    ip: e.ip ?? null,
    status: e.status ?? "ok",
    detalhes: e.detalhes ?? {},
    data_hora: new Date().toISOString(),
  };
}

/** Grava um único log. Nunca lança. */
export async function registrarLog(entrada: LogEntrada): Promise<void> {
  await registrarLogs([entrada]);
}

/** Grava vários logs de uma vez (uma chamada só ao banco). Nunca lança. */
export async function registrarLogs(entradas: LogEntrada[]): Promise<void> {
  if (entradas.length === 0) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("logs").insert(entradas.map(normalizar) as never);
  } catch (err) {
    console.error("[logs] falha ao registrar log:", err);
  }
}

/** Extrai o IP de origem de uma requisição HTTP, quando disponível. */
export function ipDaRequisicao(request: Request): string | null {
  const h = request.headers;
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return h.get("cf-connecting-ip") ?? h.get("x-real-ip") ?? null;
}
