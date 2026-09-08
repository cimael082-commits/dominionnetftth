/**
 * Ponte cliente → servidor do módulo de Backup e Restauração.
 *
 * Todas as ações exigem sessão autenticada COM papel de administrador e são
 * registradas na auditoria (módulo Logs).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Garante que o usuário da requisição é administrador. Devolve o e-mail dele. */
async function exigirAdmin(context: {
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> };
  userId: string;
  claims?: Record<string, unknown> | null;
}): Promise<string | null> {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (data !== true) throw new Error("Apenas administradores podem gerenciar backups.");
  const email = context.claims?.["email"];
  return typeof email === "string" ? email : null;
}

async function auditar(entrada: {
  tipo: "INFO" | "SUCESSO" | "ALERTA" | "ERRO";
  descricao: string;
  usuario: string | null;
  status?: string;
  detalhes?: Record<string, unknown>;
}) {
  const { registrarLog } = await import("@/lib/logs.server");
  await registrarLog({
    tipo: entrada.tipo,
    categoria: "Sistema",
    origem: "Backup e Restauração",
    descricao: entrada.descricao,
    usuario: entrada.usuario,
    status: entrada.status ?? "ok",
    detalhes: entrada.detalhes ?? {},
  });
}

function textoObrigatorio(input: unknown, campo: string): string {
  const obj = (input ?? {}) as Record<string, unknown>;
  const valor = obj[campo];
  if (typeof valor !== "string" || valor.trim().length === 0) {
    throw new Error(`Parâmetro "${campo}" inválido.`);
  }
  return valor.trim();
}

/** Cria um backup completo agora. */
export const criarBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const obj = (input ?? {}) as { observacao?: unknown };
    return {
      observacao:
        typeof obj.observacao === "string" ? obj.observacao.slice(0, 200) : undefined,
    };
  })
  .handler(async ({ data, context }) => {
    const usuario = await exigirAdmin(context as never);
    const { gerarBackup } = await import("@/lib/backup.server");
    try {
      const r = await gerarBackup({
        tipo: "manual",
        usuario,
        ...(data.observacao ? { observacao: data.observacao } : {}),
      });
      await auditar({
        tipo: "SUCESSO",
        descricao: `Backup criado: ${r.nome}`,
        usuario,
        detalhes: { bytes: r.bytes, tabelas: r.manifest.tabelas },
      });
      return { ok: true as const, nome: r.nome, path: r.path, bytes: r.bytes };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "erro desconhecido";
      await auditar({ tipo: "ERRO", descricao: `Falha ao criar backup: ${msg}`, usuario, status: "falha" });
      throw err;
    }
  });

/** Gera um link temporário de download para um backup. */
export const baixarBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ({ id: textoObrigatorio(input, "id") }))
  .handler(async ({ data, context }) => {
    const usuario = await exigirAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: reg, error } = await supabaseAdmin
      .from("backups" as never)
      .select("nome, arquivo_path")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !reg) throw new Error("Backup não encontrado.");
    const linha = reg as unknown as { nome: string; arquivo_path: string };
    const assinado = await supabaseAdmin.storage
      .from("backups")
      .createSignedUrl(linha.arquivo_path, 300, { download: linha.nome });
    if (assinado.error || !assinado.data) throw new Error("Não foi possível gerar o download.");
    await auditar({ tipo: "INFO", descricao: `Download de backup: ${linha.nome}`, usuario });
    return { url: assinado.data.signedUrl, nome: linha.nome };
  });

/** Exclui um backup (registro + arquivo). */
export const excluirBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ({ id: textoObrigatorio(input, "id") }))
  .handler(async ({ data, context }) => {
    const usuario = await exigirAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: reg } = await supabaseAdmin
      .from("backups" as never)
      .select("nome, arquivo_path")
      .eq("id", data.id)
      .maybeSingle();
    const linha = reg as unknown as { nome: string; arquivo_path: string } | null;
    if (linha) await supabaseAdmin.storage.from("backups").remove([linha.arquivo_path]);
    const { error } = await supabaseAdmin.from("backups" as never).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await auditar({
      tipo: "ALERTA",
      descricao: `Backup excluído: ${linha?.nome ?? data.id}`,
      usuario,
    });
    return { ok: true as const };
  });

/** Verifica um arquivo enviado e descreve o que será restaurado. */
export const validarBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ({ path: textoObrigatorio(input, "path") }))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context as never);
    const { lerZip } = await import("@/lib/backup.server");
    const { manifest } = await lerZip(data.path);
    return {
      versao: manifest.versao,
      gerado_em: manifest.gerado_em,
      tabelas: manifest.tabelas,
      arquivos: manifest.arquivos?.length ?? 0,
    };
  });

/**
 * Restaura o sistema a partir de um backup existente (`id`) ou de um arquivo
 * recém-enviado (`path`). Sempre cria antes um backup de segurança do estado atual.
 */
export const restaurarBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const obj = (input ?? {}) as { id?: unknown; path?: unknown };
    const id = typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : null;
    const path = typeof obj.path === "string" && obj.path.trim() ? obj.path.trim() : null;
    if (!id && !path) throw new Error("Informe o backup a restaurar.");
    return { id, path };
  })
  .handler(async ({ data, context }) => {
    const usuario = await exigirAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { gerarBackup, restaurarDeZip } = await import("@/lib/backup.server");

    let alvo = data.path;
    let nomeAlvo = data.path ?? "";
    if (!alvo && data.id) {
      const { data: reg } = await supabaseAdmin
        .from("backups" as never)
        .select("nome, arquivo_path")
        .eq("id", data.id)
        .maybeSingle();
      const linha = reg as unknown as { nome: string; arquivo_path: string } | null;
      if (!linha) throw new Error("Backup não encontrado.");
      alvo = linha.arquivo_path;
      nomeAlvo = linha.nome;
    }

    // Rede de segurança: estado atual guardado antes de qualquer alteração.
    const seguranca = await gerarBackup({
      tipo: "pre_restauracao",
      usuario,
      observacao: `Estado anterior à restauração de ${nomeAlvo}`,
    });

    try {
      const r = await restaurarDeZip(alvo!);
      await auditar({
        tipo: "SUCESSO",
        descricao: `Backup restaurado: ${nomeAlvo}`,
        usuario,
        detalhes: { tabelas: r.tabelas, arquivos: r.arquivos, seguranca: seguranca.nome },
      });
      return { ok: true as const, ...r, backupSeguranca: seguranca.nome };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "erro desconhecido";
      await auditar({
        tipo: "CRITICO" as never,
        descricao: `Falha na restauração de ${nomeAlvo}: ${msg}`,
        usuario,
        status: "falha",
        detalhes: { backupSeguranca: seguranca.nome },
      });
      throw err;
    }
  });
