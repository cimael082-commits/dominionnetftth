import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, CheckCheck, Megaphone, AlertTriangle, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { clienteFetch } from "@/lib/cliente-auth";

export const Route = createFileRoute("/_area/cliente/avisos")({
  component: AvisosPage,
});

type Aviso = {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  destino: string;
  created_at: string;
  lido: boolean;
};
type Notif = {
  id: string;
  tipo: string;
  titulo: string;
  corpo: string | null;
  lido: boolean;
  created_at: string;
};

function tipoBadge(tipo: string) {
  if (tipo === "urgente" || tipo.startsWith("atraso")) return { c: "bg-red-500/15 text-red-300 border-red-500/30", i: AlertTriangle };
  if (tipo.startsWith("vencimento")) return { c: "bg-amber-500/15 text-amber-300 border-amber-500/30", i: Bell };
  if (tipo === "pagamento_confirmado") return { c: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", i: CheckCheck };
  if (tipo === "manutencao") return { c: "bg-blue-500/15 text-blue-300 border-blue-500/30", i: Info };
  return { c: "bg-primary/15 text-primary border-primary/30", i: Megaphone };
}

function AvisosPage() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [tab, setTab] = useState<"avisos" | "notifs">("notifs");

  async function load() {
    const [a, n] = await Promise.all([
      clienteFetch<{ avisos: Aviso[] }>("/api/public/cliente/avisos"),
      clienteFetch<{ notificacoes: Notif[] }>("/api/public/cliente/notificacoes"),
    ]);
    setAvisos(a.avisos);
    setNotifs(n.notificacoes);
  }
  useEffect(() => { load().catch((e: Error) => toast.error(e.message)); }, []);

  async function marcarAviso(id: string) {
    await clienteFetch("/api/public/cliente/avisos", { method: "POST", body: JSON.stringify({ aviso_id: id }) });
    setAvisos((prev) => prev.map((x) => (x.id === id ? { ...x, lido: true } : x)));
  }
  async function marcarTodas() {
    await clienteFetch("/api/public/cliente/notificacoes", { method: "POST", body: JSON.stringify({ all: true }) });
    setNotifs((prev) => prev.map((x) => ({ ...x, lido: true })));
    toast.success("Notificações marcadas como lidas");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Central de avisos</h1>
        {tab === "notifs" && notifs.some((n) => !n.lido) && (
          <Button size="sm" variant="outline" onClick={marcarTodas}>
            <CheckCheck className="h-3.5 w-3.5 mr-1" /> Marcar todas
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/60 bg-card p-1">
        {(["notifs", "avisos"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-2 text-xs font-semibold rounded-md ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {t === "notifs" ? `Notificações (${notifs.filter((n) => !n.lido).length})` : `Comunicados (${avisos.length})`}
          </button>
        ))}
      </div>

      {tab === "notifs" ? (
        <div className="space-y-2">
          {notifs.length === 0 && (
            <Card><CardContent className="p-4 text-sm text-muted-foreground">Sem notificações.</CardContent></Card>
          )}
          {notifs.map((n) => {
            const { c, i: Icon } = tipoBadge(n.tipo);
            return (
              <Card key={n.id} className={n.lido ? "opacity-70" : ""}>
                <CardContent className="p-3 flex gap-3">
                  <div className={`h-9 w-9 shrink-0 rounded-lg border flex items-center justify-center ${c}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold truncate">{n.titulo}</div>
                      {!n.lido && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    {n.corpo && <div className="text-xs text-muted-foreground">{n.corpo}</div>}
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {avisos.length === 0 && (
            <Card><CardContent className="p-4 text-sm text-muted-foreground">Nenhum comunicado.</CardContent></Card>
          )}
          {avisos.map((a) => {
            const { c, i: Icon } = tipoBadge(a.tipo);
            return (
              <Card key={a.id} className={a.lido ? "opacity-70" : ""}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={c}>
                      <Icon className="h-3 w-3 mr-1" /> {a.tipo}
                    </Badge>
                    <div className="text-[10px] text-muted-foreground ml-auto">
                      {new Date(a.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <div className="text-sm font-semibold">{a.titulo}</div>
                  <div className="text-xs text-muted-foreground whitespace-pre-wrap">{a.mensagem}</div>
                  {!a.lido && (
                    <Button size="sm" variant="outline" onClick={() => marcarAviso(a.id)}>
                      <CheckCheck className="h-3.5 w-3.5 mr-1" /> Marcar como lido
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
