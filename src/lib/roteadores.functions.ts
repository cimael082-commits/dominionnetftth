import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Garante que o chamador é staff antes de qualquer operação privilegiada. */
async function assertStaff(supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> }, userId: string) {
  const { data } = await supabase.rpc("is_staff", { _user_id: userId });
  if (data !== true) throw new Error("Acesso negado");
}

export const atualizarRoteador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    routerId: string;
    nome: string;
    descricao: string | null;
    operadora: string | null;
  }) => {
    if (!data?.routerId) throw new Error("routerId obrigatório");
    if (!data.nome?.trim()) throw new Error("Nome obrigatório");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("roteadores")
      .update({
        nome: data.nome.trim(),
        descricao: data.descricao?.trim() || null,
        operadora: data.operadora?.trim() || null,
      })
      .eq("router_id", data.routerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirRoteador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { routerId: string; excluirClientes?: boolean }) => {
    if (!data?.routerId) throw new Error("routerId obrigatório");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const routerId = data.routerId;

    const { data: clientes } = await supabaseAdmin
      .from("clientes")
      .select("id")
      .eq("router_id", routerId);
    const ids = (clientes ?? []).map((c) => c.id);

    // Histórico de sincronização/status sempre é removido junto do roteador.
    await supabaseAdmin.from("eventos_conexao").delete().eq("router_id", routerId);

    let clientesExcluidos = 0;
    if (data.excluirClientes && ids.length > 0) {
      // Remove dependências antes dos clientes (FKs sem cascade).
      await supabaseAdmin.from("eventos_conexao").delete().in("cliente_id", ids);
      await supabaseAdmin.from("notificacoes").delete().in("cliente_id", ids);
      await supabaseAdmin.from("aviso_leituras").delete().in("cliente_id", ids);

      const { data: chamados } = await supabaseAdmin
        .from("chamados")
        .select("id")
        .in("cliente_id", ids);
      const chamadoIds = (chamados ?? []).map((c) => c.id);
      if (chamadoIds.length > 0) {
        await supabaseAdmin.from("chamado_mensagens").delete().in("chamado_id", chamadoIds);
      }
      await supabaseAdmin.from("chamados").delete().in("cliente_id", ids);
      await supabaseAdmin.from("indicacoes").delete().in("cliente_id", ids);
      await supabaseAdmin.from("avisos").delete().in("cliente_id", ids);
      await supabaseAdmin.from("parcelas").delete().in("cliente_id", ids);
      await supabaseAdmin.from("cto_portas").update({ cliente_id: null }).in("cliente_id", ids);

      const { error: delErr } = await supabaseAdmin.from("clientes").delete().in("id", ids);
      if (delErr) throw new Error(delErr.message);
      clientesExcluidos = ids.length;
    } else if (ids.length > 0) {
      // Mantém os clientes, apenas desvincula do roteador removido.
      await supabaseAdmin
        .from("clientes")
        .update({ router_id: null, online: false, ip_atual: null, uptime_atual: null })
        .in("id", ids);
    }

    const { error } = await supabaseAdmin.from("roteadores").delete().eq("router_id", routerId);
    if (error) throw new Error(error.message);

    return { ok: true, clientesExcluidos, clientesDesvinculados: data.excluirClientes ? 0 : ids.length };
  });
