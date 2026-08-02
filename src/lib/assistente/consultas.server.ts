/**
 * Consultas de leitura usadas pelo Assistente IA.
 *
 * Todas as funções usam o cliente administrativo (service role) e só são
 * chamadas depois que a rota HTTP confirmou a sessão do administrador.
 * Os retornos são resumidos de propósito: o modelo trabalha melhor com
 * poucos campos relevantes do que com linhas inteiras do banco.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type DB = SupabaseClient<Database>;

export async function getAdmin(): Promise<DB> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as DB;
}

const hoje = () => new Date().toISOString().slice(0, 10);

function inicioFimMes(ano?: number, mes?: number) {
  const agora = new Date();
  const y = ano ?? agora.getUTCFullYear();
  const m = mes ?? agora.getUTCMonth() + 1;
  const ini = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
  const fim = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { ini, fim, ano: y, mes: m };
}

/** Clientes online/offline, com filtro opcional de tempo sem conexão. */
export async function statusConexao(args: {
  estado?: "online" | "offline" | "todos";
  minutosSemConexao?: number;
  limite?: number;
}) {
  const db = await getAdmin();
  const limite = Math.min(args.limite ?? 40, 100);
  let q = db
    .from("clientes")
    .select("id,nome,telefone,whatsapp,status,online,ip_atual,uptime_atual,ultima_sincronizacao,router_id,endereco,bairro,plano")
    .neq("status", "cancelado")
    .order("nome");

  if (args.estado === "online") q = q.eq("online", true);
  if (args.estado === "offline") q = q.eq("online", false);

  const { data, error } = await q.limit(500);
  if (error) throw new Error(error.message);

  let linhas = data ?? [];
  if (args.minutosSemConexao && args.minutosSemConexao > 0) {
    const corte = Date.now() - args.minutosSemConexao * 60_000;
    linhas = linhas.filter(
      (c) =>
        c.online === false &&
        (!c.ultima_sincronizacao || new Date(c.ultima_sincronizacao).getTime() <= corte),
    );
  }

  const { count: totalOnline } = await db
    .from("clientes")
    .select("id", { count: "exact", head: true })
    .eq("online", true)
    .neq("status", "cancelado");
  const { count: totalGeral } = await db
    .from("clientes")
    .select("id", { count: "exact", head: true })
    .neq("status", "cancelado");

  return {
    total_clientes: totalGeral ?? 0,
    total_online: totalOnline ?? 0,
    total_offline: (totalGeral ?? 0) - (totalOnline ?? 0),
    encontrados: linhas.length,
    clientes: linhas.slice(0, limite),
  };
}

/** Busca livre de clientes por nome, documento, telefone, endereço, plano ou login. */
export async function buscarClientes(args: {
  termo?: string;
  status?: string;
  plano?: string;
  limite?: number;
}) {
  const db = await getAdmin();
  const limite = Math.min(args.limite ?? 25, 100);
  let q = db
    .from("clientes")
    .select(
      "id,nome,cpf_cnpj,telefone,whatsapp,email,endereco,bairro,cidade,plano,valor_mensalidade,dia_vencimento,status,online,login_pppoe,latitude,longitude",
    )
    .order("nome")
    .limit(limite);

  if (args.termo?.trim()) {
    const s = `%${args.termo.trim()}%`;
    q = q.or(
      `nome.ilike.${s},cpf_cnpj.ilike.${s},telefone.ilike.${s},whatsapp.ilike.${s},endereco.ilike.${s},bairro.ilike.${s},cidade.ilike.${s},login_pppoe.ilike.${s},plano.ilike.${s}`,
    );
  }
  if (args.status?.trim()) q = q.eq("status", args.status.trim());
  if (args.plano?.trim()) q = q.ilike("plano", `%${args.plano.trim()}%`);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return { encontrados: data?.length ?? 0, clientes: data ?? [] };
}

/** Parcelas em aberto/vencidas em um período, com total. */
export async function parcelasEmAberto(args: {
  periodo?: "hoje" | "mes" | "todas";
  incluirPagas?: boolean;
  limite?: number;
}) {
  const db = await getAdmin();
  const limite = Math.min(args.limite ?? 60, 200);
  const { ini, fim } = inicioFimMes();

  let q = db
    .from("parcelas")
    .select("id,cliente_id,valor,data_vencimento,data_pagamento,status,referencia_mes,referencia_ano,clientes(nome,telefone,whatsapp)")
    .order("data_vencimento");

  if (!args.incluirPagas) q = q.in("status", ["pendente", "vencido"]);
  if (args.periodo === "hoje") q = q.eq("data_vencimento", hoje());
  if (args.periodo === "mes") q = q.gte("data_vencimento", ini).lte("data_vencimento", fim);

  const { data, error } = await q.limit(500);
  if (error) throw new Error(error.message);

  const linhas = data ?? [];
  const total = linhas.reduce((s, p) => s + Number(p.valor), 0);
  return {
    periodo: args.periodo ?? "todas",
    quantidade: linhas.length,
    valor_total: total,
    parcelas: linhas.slice(0, limite),
  };
}

/** Clientes inadimplentes agrupados, com número de parcelas e total devido. */
export async function inadimplentes(args: { minimoParcelas?: number; limite?: number }) {
  const db = await getAdmin();
  const minimo = args.minimoParcelas ?? 1;
  const { data, error } = await db
    .from("parcelas")
    .select("id,cliente_id,valor,data_vencimento,status,clientes(nome,telefone,whatsapp,status)")
    .in("status", ["pendente", "vencido"])
    .lte("data_vencimento", hoje())
    .limit(1000);
  if (error) throw new Error(error.message);

  const mapa = new Map<
    string,
    { cliente_id: string; nome: string; telefone: string | null; whatsapp: string | null; parcelas_atraso: number; total_devido: number; vencimento_mais_antigo: string }
  >();
  for (const p of data ?? []) {
    const atual = mapa.get(p.cliente_id) ?? {
      cliente_id: p.cliente_id,
      nome: p.clientes?.nome ?? "—",
      telefone: p.clientes?.telefone ?? null,
      whatsapp: p.clientes?.whatsapp ?? null,
      parcelas_atraso: 0,
      total_devido: 0,
      vencimento_mais_antigo: p.data_vencimento,
    };
    atual.parcelas_atraso += 1;
    atual.total_devido += Number(p.valor);
    if (p.data_vencimento < atual.vencimento_mais_antigo) atual.vencimento_mais_antigo = p.data_vencimento;
    mapa.set(p.cliente_id, atual);
  }

  const lista = [...mapa.values()]
    .filter((c) => c.parcelas_atraso >= minimo)
    .sort((a, b) => b.total_devido - a.total_devido);

  return {
    minimo_parcelas: minimo,
    clientes_inadimplentes: lista.length,
    total_em_atraso: lista.reduce((s, c) => s + c.total_devido, 0),
    clientes: lista.slice(0, Math.min(args.limite ?? 40, 100)),
  };
}

/** Faturamento recebido, a receber e em atraso de um mês. */
export async function resumoFinanceiro(args: { ano?: number; mes?: number }) {
  const db = await getAdmin();
  const { ini, fim, ano, mes } = inicioFimMes(args.ano, args.mes);

  const { data: doMes, error } = await db
    .from("parcelas")
    .select("valor,status,data_pagamento,data_vencimento")
    .gte("data_vencimento", ini)
    .lte("data_vencimento", fim)
    .limit(2000);
  if (error) throw new Error(error.message);

  const linhas = doMes ?? [];
  const soma = (f: (p: (typeof linhas)[number]) => boolean) =>
    linhas.filter(f).reduce((s, p) => s + Number(p.valor), 0);

  const { data: pagos } = await db
    .from("parcelas")
    .select("valor")
    .eq("status", "pago")
    .gte("data_pagamento", ini)
    .lte("data_pagamento", fim)
    .limit(2000);

  return {
    referencia: `${String(mes).padStart(2, "0")}/${ano}`,
    recebido_no_mes: (pagos ?? []).reduce((s, p) => s + Number(p.valor), 0),
    a_receber: soma((p) => p.status === "pendente"),
    em_atraso: soma((p) => p.status === "vencido"),
    parcelas_no_mes: linhas.length,
  };
}

/** Situação dos chamados de suporte. */
export async function chamados(args: { status?: string; limite?: number }) {
  const db = await getAdmin();
  let q = db
    .from("chamados")
    .select("id,protocolo,assunto,categoria,status,prioridade,created_at,cliente_id,clientes(nome,telefone,whatsapp)")
    .order("created_at", { ascending: false })
    .limit(Math.min(args.limite ?? 30, 100));
  if (args.status?.trim()) q = q.eq("status", args.status.trim());

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const { data: todos } = await db.from("chamados").select("status").limit(2000);
  const porStatus: Record<string, number> = {};
  for (const c of todos ?? []) porStatus[c.status] = (porStatus[c.status] ?? 0) + 1;

  return { total_por_status: porStatus, chamados: data ?? [] };
}

/** Contagem de assinantes por plano e por status. */
export async function resumoPlanos() {
  const db = await getAdmin();
  const { data, error } = await db
    .from("clientes")
    .select("plano,status,valor_mensalidade,data_ativacao")
    .limit(5000);
  if (error) throw new Error(error.message);

  const planos: Record<string, { assinantes: number; receita_mensal: number }> = {};
  const status: Record<string, number> = {};
  const agora = new Date();
  let ativadosNoMes = 0;
  let cancelados = 0;

  for (const c of data ?? []) {
    const nome = c.plano?.trim() || "Sem plano";
    planos[nome] = planos[nome] ?? { assinantes: 0, receita_mensal: 0 };
    if (c.status !== "cancelado") {
      planos[nome].assinantes += 1;
      planos[nome].receita_mensal += Number(c.valor_mensalidade);
    }
    status[c.status] = (status[c.status] ?? 0) + 1;
    if (c.status === "cancelado") cancelados += 1;
    if (
      c.data_ativacao &&
      new Date(c.data_ativacao).getUTCFullYear() === agora.getUTCFullYear() &&
      new Date(c.data_ativacao).getUTCMonth() === agora.getUTCMonth()
    ) {
      ativadosNoMes += 1;
    }
  }

  return { por_plano: planos, por_status: status, ativados_no_mes: ativadosNoMes, cancelados_total: cancelados };
}

/** Infraestrutura: roteadores MikroTik, CTOs e ocupação de portas. */
export async function resumoRede() {
  const db = await getAdmin();
  const [{ data: roteadores }, { data: ctos }, { data: portas }, { data: rotas }] = await Promise.all([
    db.from("roteadores").select("router_id,nome,ip,online,clientes_online,clientes_total,ultima_sincronizacao").limit(100),
    db.from("ctos").select("id,nome,portas_totais,portas_livres,status,router_id,latitude,longitude").limit(300),
    db.from("cto_portas").select("cto_id,cliente_id").limit(3000),
    db.from("rotas_fibra").select("id,nome,tipo,status,fibras_qtd,fibras_usadas,comprimento_m").limit(300),
  ]);

  const ocupadasPorCto: Record<string, number> = {};
  for (const p of portas ?? []) if (p.cliente_id) ocupadasPorCto[p.cto_id] = (ocupadasPorCto[p.cto_id] ?? 0) + 1;

  return {
    roteadores: roteadores ?? [],
    ctos: (ctos ?? []).map((c) => ({
      ...c,
      portas_ocupadas: ocupadasPorCto[c.id] ?? c.portas_totais - c.portas_livres,
    })),
    rotas_fibra: rotas ?? [],
  };
}

/** Últimos eventos de conexão (quedas e reconexões) do MikroTik. */
export async function eventosConexao(args: { clienteId?: string; limite?: number }) {
  const db = await getAdmin();
  let q = db
    .from("eventos_conexao")
    .select("id,cliente_id,login_pppoe,tipo,ip,uptime,router_id,created_at")
    .order("created_at", { ascending: false })
    .limit(Math.min(args.limite ?? 30, 100));
  if (args.clienteId) q = q.eq("cliente_id", args.clienteId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return { eventos: data ?? [] };
}
