import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Router as RouterIcon, RefreshCw, Wifi, Users, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { atualizarRoteador, excluirRoteador } from "@/lib/roteadores.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/roteadores")({
  head: () => ({
    meta: [
      { title: "Roteadores MikroTik — Dominion Net" },
      { name: "description", content: "Monitore e administre todos os MikroTik conectados: status, clientes online, renomear e excluir." },
      { property: "og:title", content: "Roteadores MikroTik — Dominion Net" },
      { property: "og:description", content: "Monitore e administre todos os MikroTik conectados em tempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RoteadoresPage,
});

type Roteador = {
  id: string;
  router_id: string;
  nome: string;
  descricao: string | null;
  operadora: string | null;
  ip: string | null;
  identity: string | null;
  versao: string | null;
  clientes_online: number;
  clientes_total: number;
  ultima_sincronizacao: string | null;
};

const OFFLINE_MS = 3 * 60 * 1000;

function isOnline(r: Roteador) {
  return (
    !!r.ultima_sincronizacao &&
    Date.now() - new Date(r.ultima_sincronizacao).getTime() < OFFLINE_MS
  );
}

function RoteadoresPage() {
  const [lista, setLista] = useState<Roteador[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<Roteador | null>(null);
  const [excluindo, setExcluindo] = useState<Roteador | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("roteadores")
      .select(
        "id, router_id, nome, descricao, operadora, ip, identity, versao, clientes_online, clientes_total, ultima_sincronizacao",
      )
      .order("nome");
    setLista((data as Roteador[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("roteadores-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "roteadores" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const online = lista.filter(isOnline).length;
  const clientesOnline = lista.reduce((s, r) => s + (r.clientes_online || 0), 0);

  return (
    <div className="p-6 space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <RouterIcon className="h-6 w-6 text-primary" /> Roteadores
          </h1>
          <p className="text-sm text-muted-foreground">
            MikroTik conectados via agente Python (mesma API Key, múltiplos router_id)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="MikroTik online" value={`${online}/${lista.length}`} icon={Wifi} />
        <Kpi label="Clientes online" value={String(clientesOnline)} icon={Users} />
        <Kpi
          label="Total de clientes vinculados"
          value={String(lista.reduce((s, r) => s + (r.clientes_total || 0), 0))}
          icon={Users}
        />
      </div>

      {lista.length === 0 && !loading && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Nenhum MikroTik sincronizou ainda. Envie um POST para{" "}
            <code className="text-primary">/api/public/mikrotik/sync</code> com o campo{" "}
            <code className="text-primary">router_id</code>.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {lista.map((r) => {
          const on = isOnline(r);
          return (
            <Card key={r.id} className={on ? "border-emerald-500/40" : "border-red-500/40"}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{r.nome}</div>
                    <code className="text-[11px] text-muted-foreground">{r.router_id}</code>
                    {r.operadora && (
                      <div className="text-[11px] text-primary mt-0.5">{r.operadora}</div>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      on
                        ? "border-emerald-500/50 text-emerald-500"
                        : "border-red-500/50 text-red-500"
                    }
                  >
                    {on ? "🟢 Online" : "🔴 Offline"}
                  </Badge>
                </div>

                {r.descricao && (
                  <p className="text-xs text-muted-foreground">{r.descricao}</p>
                )}

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Field label="IP" value={r.ip || "—"} />
                  <Field label="Versão" value={r.versao || "—"} />
                  <Field label="Clientes online" value={String(r.clientes_online ?? 0)} />
                  <Field label="Total de clientes" value={String(r.clientes_total ?? 0)} />
                </div>

                <div className="text-[11px] text-muted-foreground border-t border-border/50 pt-2">
                  Última sincronização:{" "}
                  {r.ultima_sincronizacao
                    ? new Date(r.ultima_sincronizacao).toLocaleString("pt-BR")
                    : "nunca"}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditando(r)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Renomear
                  </Button>
                  <Button variant="destructive" size="sm" className="flex-1" onClick={() => setExcluindo(r)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <EditarRoteadorDialog
        roteador={editando}
        onClose={() => setEditando(null)}
        onSaved={load}
      />
      <ExcluirRoteadorDialog
        roteador={excluindo}
        onClose={() => setExcluindo(null)}
        onDeleted={load}
      />
    </div>
  );
}

function EditarRoteadorDialog({
  roteador,
  onClose,
  onSaved,
}: {
  roteador: Roteador | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const salvar = useServerFn(atualizarRoteador);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [operadora, setOperadora] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (roteador) {
      setNome(roteador.nome ?? "");
      setDescricao(roteador.descricao ?? "");
      setOperadora(roteador.operadora ?? "");
    }
  }, [roteador]);

  async function submit() {
    if (!roteador) return;
    if (!nome.trim()) {
      toast.error("Informe o nome do roteador");
      return;
    }
    setSaving(true);
    try {
      await salvar({
        data: {
          routerId: roteador.router_id,
          nome,
          descricao: descricao || null,
          operadora: operadora || null,
        },
      });
      toast.success("Roteador atualizado");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!roteador} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar roteador</DialogTitle>
          <DialogDescription>
            O identificador técnico (router_id) não pode ser alterado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">router_id</Label>
            <Input value={roteador?.router_id ?? ""} disabled />
          </div>
          <div>
            <Label htmlFor="rt-nome">Nome</Label>
            <Input id="rt-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="rt-operadora">Operadora / link</Label>
            <Input
              id="rt-operadora"
              placeholder="BrisaNet, Vivo, V.tal, 3Dnet..."
              value={operadora}
              onChange={(e) => setOperadora(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="rt-desc">Descrição</Label>
            <Textarea
              id="rt-desc"
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExcluirRoteadorDialog({
  roteador,
  onClose,
  onDeleted,
}: {
  roteador: Roteador | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const excluir = useServerFn(excluirRoteador);
  const [comClientes, setComClientes] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (roteador) setComClientes(false);
  }, [roteador]);

  async function confirmar() {
    if (!roteador) return;
    setDeleting(true);
    try {
      const res = await excluir({
        data: { routerId: roteador.router_id, excluirClientes: comClientes },
      });
      toast.success(
        comClientes
          ? `Roteador e ${res.clientesExcluidos} cliente(s) excluídos`
          : `Roteador excluído (${res.clientesDesvinculados} cliente(s) desvinculados)`,
      );
      onDeleted();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={!!roteador} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir roteador</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir este roteador? Esta ação não poderá ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            <span className="font-medium">{roteador?.nome}</span>{" "}
            <code className="text-xs text-muted-foreground">({roteador?.router_id})</code> —{" "}
            {roteador?.clientes_total ?? 0} cliente(s) vinculado(s).
          </p>
          <p className="text-muted-foreground">
            Os logs de conexão e o histórico de sincronização deste roteador serão removidos.
          </p>
          <label className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
            <Checkbox
              checked={comClientes}
              onCheckedChange={(v) => setComClientes(v === true)}
              className="mt-0.5"
            />
            <span>
              Excluir também os <strong>{roteador?.clientes_total ?? 0} cliente(s)</strong> vinculados
              e todos os dados deles (financeiro, chamados, notificações). Sem marcar, os clientes são
              apenas desvinculados do roteador.
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirmar} disabled={deleting}>
            {deleting ? "Excluindo..." : "Excluir definitivamente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Wifi;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium break-all">{value}</div>
    </div>
  );
}
