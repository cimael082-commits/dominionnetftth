import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Router as RouterIcon, RefreshCw, Wifi, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/roteadores")({
  head: () => ({
    meta: [
      { title: "Roteadores MikroTik — Dominion Net" },
      { name: "description", content: "Monitore todos os MikroTik conectados: status, clientes online e última sincronização." },
      { property: "og:title", content: "Roteadores MikroTik — Dominion Net" },
      { property: "og:description", content: "Monitore todos os MikroTik conectados em tempo real." },
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

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("roteadores")
      .select("id, router_id, nome, ip, identity, versao, clientes_online, clientes_total, ultima_sincronizacao")
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
    const t = setInterval(load, 30000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(t);
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
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
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
