import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  Database,
  Download,
  HardDrive,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  criarBackup,
  baixarBackup,
  excluirBackup,
  validarBackup,
  restaurarBackup,
} from "@/lib/backup.functions";

export const Route = createFileRoute("/_app/backup")({
  head: () => ({
    meta: [
      { title: "Backup e Restauração — Dominion Net" },
      {
        name: "description",
        content:
          "Crie, baixe e restaure backups completos do sistema de gestão FTTH da Dominion Net.",
      },
      { property: "og:title", content: "Backup e Restauração — Dominion Net" },
      {
        property: "og:description",
        content: "Proteja e restaure todos os dados do provedor em poucos cliques.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BackupPage,
});

interface LinhaBackup {
  id: string;
  nome: string;
  tipo: string;
  status: string;
  tamanho_bytes: number;
  total_registros: number;
  criado_por: string | null;
  observacao: string | null;
  created_at: string;
}

const ROTULO_TIPO: Record<string, string> = {
  manual: "Manual",
  automatico: "Automático",
  pre_restauracao: "Segurança (antes de restaurar)",
};

function formatarBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const un = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), un.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${un[i]}`;
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function BackupPage() {
  const qc = useQueryClient();
  const inputArquivo = useRef<HTMLInputElement>(null);
  const [confirmarRestaurar, setConfirmarRestaurar] = useState<{
    id?: string;
    path?: string;
    nome: string;
    resumo?: { tabelas: Record<string, number>; arquivos: number; gerado_em: string };
  } | null>(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState<LinhaBackup | null>(null);
  const [enviando, setEnviando] = useState(false);

  const lista = useQuery({
    queryKey: ["backups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backups")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LinhaBackup[];
    },
  });

  const backups = lista.data ?? [];
  const ultimo = backups[0];
  const espaco = backups.reduce((s, b) => s + (b.tamanho_bytes ?? 0), 0);

  const criar = useMutation({
    mutationFn: async () => criarBackup({ data: {} }),
    onSuccess: () => {
      toast.success("Backup realizado com sucesso.");
      qc.invalidateQueries({ queryKey: ["backups"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const baixar = useMutation({
    mutationFn: async (id: string) => baixarBackup({ data: { id } }),
    onSuccess: (r) => {
      window.open(r.url, "_blank", "noopener");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => excluirBackup({ data: { id } }),
    onSuccess: () => {
      toast.success("Backup excluído.");
      setConfirmarExcluir(null);
      qc.invalidateQueries({ queryKey: ["backups"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const restaurar = useMutation({
    mutationFn: async (alvo: { id?: string; path?: string }) =>
      restaurarBackup({ data: { id: alvo.id ?? null, path: alvo.path ?? null } }),
    onSuccess: () => {
      toast.success("Backup restaurado com sucesso.");
      setConfirmarRestaurar(null);
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /** Envia o .zip escolhido, valida e abre a confirmação da restauração. */
  async function selecionarArquivo(file: File) {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      toast.error("Selecione um arquivo .zip de backup.");
      return;
    }
    setEnviando(true);
    try {
      const path = `enviados/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage
        .from("backups")
        .upload(path, file, { contentType: "application/zip", upsert: true });
      if (error) throw new Error(error.message);
      const resumo = await validarBackup({ data: { path } });
      setConfirmarRestaurar({
        path,
        nome: file.name,
        resumo: { tabelas: resumo.tabelas, arquivos: resumo.arquivos, gerado_em: resumo.gerado_em },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível ler o arquivo.");
    } finally {
      setEnviando(false);
      if (inputArquivo.current) inputArquivo.current.value = "";
    }
  }

  return (
    <div className="p-8 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Backup e Restauração</h1>
          <p className="text-muted-foreground mt-1">
            Proteja todos os dados do provedor e volte atrás em caso de falha.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputArquivo}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void selecionarArquivo(f);
            }}
          />
          <Button
            variant="outline"
            disabled={enviando}
            onClick={() => inputArquivo.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {enviando ? "Verificando..." : "Selecionar arquivo ZIP"}
          </Button>
          <Button onClick={() => criar.mutate()} disabled={criar.isPending}>
            <Database className="h-4 w-4" />
            {criar.isPending ? "Gerando backup..." : "Criar Backup Agora"}
          </Button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi icon={Database} rotulo="Backups" valor={String(backups.length)} />
        <Kpi
          icon={CalendarClock}
          rotulo="Último backup"
          valor={ultimo ? formatarData(ultimo.created_at) : "—"}
        />
        <Kpi icon={RotateCcw} rotulo="Próximo automático" valor="Manual" />
        <Kpi icon={HardDrive} rotulo="Espaço utilizado" valor={formatarBytes(espaco)} />
        <Kpi
          icon={ShieldCheck}
          rotulo="Situação"
          valor={
            criar.isPending
              ? "Em andamento"
              : ultimo?.status === "concluido"
                ? "Protegido"
                : backups.length
                  ? "Atenção"
                  : "Sem backup"
          }
        />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b p-4">
          <h2 className="font-semibold">Backups disponíveis</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cada arquivo contém clientes, financeiro, carnês, mapa da rede, configurações,
            usuários, permissões, logs e arquivos enviados.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Data</th>
                <th className="px-4 py-2 text-left font-medium">Arquivo</th>
                <th className="px-4 py-2 text-left font-medium">Tipo</th>
                <th className="px-4 py-2 text-right font-medium">Registros</th>
                <th className="px-4 py-2 text-right font-medium">Tamanho</th>
                <th className="px-4 py-2 text-left font-medium">Criado por</th>
                <th className="px-4 py-2 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              )}
              {!lista.isLoading && backups.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum backup criado ainda.
                  </td>
                </tr>
              )}
              {backups.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="px-4 py-2 whitespace-nowrap">{formatarData(b.created_at)}</td>
                  <td className="px-4 py-2">
                    <div className="font-medium">{b.nome}</div>
                    {b.observacao && (
                      <div className="text-xs text-muted-foreground">{b.observacao}</div>
                    )}
                  </td>
                  <td className="px-4 py-2">{ROTULO_TIPO[b.tipo] ?? b.tipo}</td>
                  <td className="px-4 py-2 text-right">{b.total_registros}</td>
                  <td className="px-4 py-2 text-right">{formatarBytes(b.tamanho_bytes)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{b.criado_por ?? "—"}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Baixar"
                        onClick={() => baixar.mutate(b.id)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Restaurar"
                        onClick={() => setConfirmarRestaurar({ id: b.id, nome: b.nome })}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Excluir"
                        onClick={() => setConfirmarExcluir(b)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog
        open={!!confirmarRestaurar}
        onOpenChange={(o) => !o && !restaurar.isPending && setConfirmarRestaurar(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar backup</DialogTitle>
            <DialogDescription>
              Os dados atuais serão substituídos pelo conteúdo de{" "}
              <strong>{confirmarRestaurar?.nome}</strong>. Um backup de segurança do estado atual
              será criado automaticamente antes de começar.
            </DialogDescription>
          </DialogHeader>
          {confirmarRestaurar?.resumo && (
            <div className="max-h-56 overflow-y-auto rounded-md border p-3 text-sm">
              <div className="mb-2 text-muted-foreground">
                Gerado em {formatarData(confirmarRestaurar.resumo.gerado_em)} ·{" "}
                {confirmarRestaurar.resumo.arquivos} arquivo(s) enviado(s)
              </div>
              <ul className="space-y-0.5">
                {Object.entries(confirmarRestaurar.resumo.tabelas).map(([t, n]) => (
                  <li key={t} className="flex justify-between">
                    <span className="capitalize">{t.replace(/_/g, " ")}</span>
                    <span className="text-muted-foreground">{n} registro(s)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmarRestaurar(null)}
              disabled={restaurar.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() =>
                confirmarRestaurar &&
                restaurar.mutate({
                  ...(confirmarRestaurar.id ? { id: confirmarRestaurar.id } : {}),
                  ...(confirmarRestaurar.path ? { path: confirmarRestaurar.path } : {}),
                })
              }
              disabled={restaurar.isPending}
            >
              {restaurar.isPending ? "Restaurando..." : "Confirmar restauração"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmarExcluir} onOpenChange={(o) => !o && setConfirmarExcluir(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir backup</DialogTitle>
            <DialogDescription>
              O arquivo <strong>{confirmarExcluir?.nome}</strong> será apagado definitivamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarExcluir(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={excluir.isPending}
              onClick={() => confirmarExcluir && excluir.mutate(confirmarExcluir.id)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({
  icon: Icon,
  rotulo,
  valor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  rotulo: string;
  valor: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4" />
        {rotulo}
      </div>
      <div className="mt-1 text-lg font-semibold tracking-tight">{valor}</div>
    </Card>
  );
}
