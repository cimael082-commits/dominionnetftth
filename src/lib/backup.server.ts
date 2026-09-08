/**
 * Núcleo do módulo de Backup e Restauração (uso exclusivo no servidor).
 *
 * O backup é um arquivo .zip autocontido:
 *   manifest.json          → metadados (versão, data, contagens)
 *   dados/<tabela>.json    → todas as linhas de cada tabela do sistema
 *   arquivos/<bucket>/...  → arquivos enviados (banners, anexos de chamados)
 *
 * O formato é propositalmente simples e versionado (campo `versao`) para que
 * um arquivo gerado hoje continue restaurável em versões futuras do sistema:
 * na restauração, tabelas ou colunas desconhecidas são ignoradas em vez de
 * quebrar o processo.
 */
import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";

/** Versão do formato de backup. Incrementar apenas em mudanças incompatíveis. */
export const BACKUP_VERSAO = "1";

/**
 * Tabelas exportadas, em ordem de dependência (pais antes dos filhos).
 * A restauração apaga na ordem inversa e insere nesta ordem.
 */
export const TABELAS = [
  "configuracoes_empresa",
  "clientes",
  "roteadores",
  "ctos",
  "cto_portas",
  "ceo_emendas",
  "rotas_fibra",
  "parcelas",
  "avisos",
  "aviso_leituras",
  "banners",
  "chamados",
  "chamado_mensagens",
  "indicacoes",
  "eventos_conexao",
  "user_roles",
  "logs",
  "notificacoes",
] as const;

export type Tabela = (typeof TABELAS)[number];

/**
 * Tabelas alimentadas por gatilhos durante a própria restauração
 * (ex.: inserir uma parcela cria uma notificação). São limpas de novo
 * imediatamente antes de receberem os dados do backup, evitando duplicidade.
 */
const LIMPAR_ANTES_DE_INSERIR = new Set<string>(["cto_portas", "notificacoes"]);

/** Buckets de arquivos enviados incluídos no backup. */
export const BUCKETS = ["banners", "chamados"] as const;

/** Limite total de arquivos binários embarcados (protege memória do servidor). */
const LIMITE_ARQUIVOS_BYTES = 60 * 1024 * 1024;

export interface Manifest {
  versao: string;
  sistema: string;
  gerado_em: string;
  tabelas: Record<string, number>;
  arquivos: { bucket: string; path: string; bytes: number }[];
  observacao?: string;
}

type Admin = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Lê todas as linhas de uma tabela, paginando para não estourar limites. */
async function lerTabela(db: Admin, tabela: string): Promise<Record<string, unknown>[]> {
  const linhas: Record<string, unknown>[] = [];
  const passo = 1000;
  for (let inicio = 0; ; inicio += passo) {
    const { data, error } = await db
      .from(tabela as never)
      .select("*")
      .range(inicio, inicio + passo - 1);
    if (error) throw new Error(`Falha ao ler "${tabela}": ${error.message}`);
    const lote = (data ?? []) as Record<string, unknown>[];
    linhas.push(...lote);
    if (lote.length < passo) break;
  }
  return linhas;
}

/** Lista e baixa os arquivos de um bucket, respeitando o limite de tamanho. */
async function coletarArquivos(
  db: Admin,
  bucket: string,
  restante: { bytes: number },
): Promise<{ entradas: Record<string, Uint8Array>; meta: Manifest["arquivos"] }> {
  const entradas: Record<string, Uint8Array> = {};
  const meta: Manifest["arquivos"] = [];

  async function percorrer(prefixo: string, profundidade: number): Promise<void> {
    if (profundidade > 4) return;
    const { data, error } = await db.storage.from(bucket).list(prefixo, { limit: 1000 });
    if (error || !data) return;
    for (const item of data) {
      const caminho = prefixo ? `${prefixo}/${item.name}` : item.name;
      const tamanho = (item.metadata as { size?: number } | null)?.size;
      if (typeof tamanho !== "number") {
        await percorrer(caminho, profundidade + 1); // provável "pasta"
        continue;
      }
      if (tamanho > restante.bytes) continue;
      const baixado = await db.storage.from(bucket).download(caminho);
      if (baixado.error || !baixado.data) continue;
      const bytes = new Uint8Array(await baixado.data.arrayBuffer());
      entradas[`arquivos/${bucket}/${caminho}`] = bytes;
      meta.push({ bucket, path: caminho, bytes: bytes.byteLength });
      restante.bytes -= bytes.byteLength;
    }
  }

  await percorrer("", 0);
  return { entradas, meta };
}

export interface ResultadoBackup {
  path: string;
  nome: string;
  bytes: number;
  manifest: Manifest;
}

/** Gera o .zip completo e o grava no armazenamento privado. */
export async function gerarBackup(opts: {
  tipo: "manual" | "automatico" | "pre_restauracao";
  usuario: string | null;
  observacao?: string;
}): Promise<ResultadoBackup> {
  const db = await admin();

  const entradas: Record<string, Uint8Array> = {};
  const contagens: Record<string, number> = {};
  let totalRegistros = 0;

  for (const tabela of TABELAS) {
    const linhas = await lerTabela(db, tabela);
    contagens[tabela] = linhas.length;
    totalRegistros += linhas.length;
    entradas[`dados/${tabela}.json`] = strToU8(JSON.stringify(linhas));
  }

  const restante = { bytes: LIMITE_ARQUIVOS_BYTES };
  const arquivosMeta: Manifest["arquivos"] = [];
  for (const bucket of BUCKETS) {
    const { entradas: arqs, meta } = await coletarArquivos(db, bucket, restante);
    Object.assign(entradas, arqs);
    arquivosMeta.push(...meta);
  }

  const manifest: Manifest = {
    versao: BACKUP_VERSAO,
    sistema: "Dominion Net FTTH",
    gerado_em: new Date().toISOString(),
    tabelas: contagens,
    arquivos: arquivosMeta,
    ...(opts.observacao ? { observacao: opts.observacao } : {}),
  };
  entradas["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));

  const zip = zipSync(entradas, { level: 6 });
  const carimbo = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const nome = `dominionnet-${opts.tipo}-${carimbo}.zip`;
  const path = `gerados/${nome}`;

  const envio = await db.storage
    .from("backups")
    .upload(path, zip as unknown as ArrayBuffer, {
      contentType: "application/zip",
      upsert: true,
    });
  if (envio.error) throw new Error(`Falha ao guardar o backup: ${envio.error.message}`);

  const registro = await db
    .from("backups" as never)
    .insert({
      nome,
      arquivo_path: path,
      tamanho_bytes: zip.byteLength,
      tipo: opts.tipo,
      status: "concluido",
      tabelas: contagens,
      total_registros: totalRegistros,
      versao: BACKUP_VERSAO,
      criado_por: opts.usuario,
      observacao: opts.observacao ?? null,
    } as never);
  if (registro.error) throw new Error(registro.error.message);

  return { path, nome, bytes: zip.byteLength, manifest };
}

/** Baixa e valida a estrutura de um .zip de backup guardado. */
export async function lerZip(path: string): Promise<{
  manifest: Manifest;
  arquivos: Record<string, Uint8Array>;
}> {
  const db = await admin();
  const baixado = await db.storage.from("backups").download(path);
  if (baixado.error || !baixado.data) throw new Error("Arquivo de backup não encontrado.");

  let arquivos: Record<string, Uint8Array>;
  try {
    arquivos = unzipSync(new Uint8Array(await baixado.data.arrayBuffer()));
  } catch {
    throw new Error("O arquivo enviado não é um .zip válido.");
  }

  const bruto = arquivos["manifest.json"];
  if (!bruto) throw new Error("Backup inválido: manifesto ausente.");

  let manifest: Manifest;
  try {
    manifest = JSON.parse(strFromU8(bruto)) as Manifest;
  } catch {
    throw new Error("Backup inválido: manifesto corrompido.");
  }
  if (!manifest.versao || typeof manifest.tabelas !== "object") {
    throw new Error("Backup inválido: manifesto incompleto.");
  }
  return { manifest, arquivos };
}

export interface ResultadoRestauracao {
  tabelas: Record<string, number>;
  arquivos: number;
  ignoradas: string[];
}

/** Restaura o conteúdo de um backup, substituindo os dados atuais. */
export async function restaurarDeZip(path: string): Promise<ResultadoRestauracao> {
  const db = await admin();
  const { manifest, arquivos } = await lerZip(path);

  // Só restaura tabelas conhecidas nesta versão — compatibilidade futura.
  const presentes = TABELAS.filter((t) => arquivos[`dados/${t}.json`]);
  const ignoradas = Object.keys(manifest.tabelas).filter(
    (t) => !(TABELAS as readonly string[]).includes(t),
  );

  // 1) Limpeza, dos filhos para os pais, respeitando as chaves estrangeiras.
  for (const tabela of [...presentes].reverse()) {
    const { error } = await db
      .from(tabela as never)
      .delete()
      .not("id", "is", null);
    if (error) throw new Error(`Falha ao limpar "${tabela}": ${error.message}`);
  }

  // 2) Inserção, dos pais para os filhos.
  const restauradas: Record<string, number> = {};
  for (const tabela of presentes) {
    if (LIMPAR_ANTES_DE_INSERIR.has(tabela)) {
      await db
        .from(tabela as never)
        .delete()
        .not("id", "is", null);
    }
    const linhas = JSON.parse(
      strFromU8(arquivos[`dados/${tabela}.json`]!),
    ) as Record<string, unknown>[];
    for (let i = 0; i < linhas.length; i += 400) {
      const lote = linhas.slice(i, i + 400);
      const { error } = await db.from(tabela as never).upsert(lote as never, { onConflict: "id" });
      if (error) throw new Error(`Falha ao restaurar "${tabela}": ${error.message}`);
    }
    restauradas[tabela] = linhas.length;
  }

  // 3) Arquivos enviados.
  let totalArquivos = 0;
  for (const chave of Object.keys(arquivos)) {
    if (!chave.startsWith("arquivos/")) continue;
    const resto = chave.slice("arquivos/".length);
    const corte = resto.indexOf("/");
    if (corte < 1) continue;
    const bucket = resto.slice(0, corte);
    const destino = resto.slice(corte + 1);
    if (!(BUCKETS as readonly string[]).includes(bucket)) continue;
    const { error } = await db.storage
      .from(bucket)
      .upload(destino, arquivos[chave] as unknown as ArrayBuffer, { upsert: true });
    if (!error) totalArquivos += 1;
  }

  return { tabelas: restauradas, arquivos: totalArquivos, ignoradas };
}
