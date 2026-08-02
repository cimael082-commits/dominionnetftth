import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { clienteFetch } from "@/lib/cliente-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_area/cliente/notificacoes")({
  component: NotificacoesPage,
});

type Notificacao = {
  id: string;
  tipo: string;
  titulo: string;
  corpo: string;
  lido: boolean;
  created_at: string;
};

function NotificacoesPage() {
  const [itens, setItens] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const r = await clienteFetch<{ notificacoes: Notificacao[] }>(
        "/api/public/cliente/notificacoes",
      );
      setItens(r.notificacoes);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function marcarTodas() {
    await clienteFetch("/api/public/cliente/notificacoes", {
      method: "POST",
      body: JSON.stringify({ all: true }),
    });
    setItens((prev) => prev.map((n) => ({ ...n, lido: true })));
    toast.success("Todas marcadas como lidas");
  }

  async function marcarUma(id: string) {
    await clienteFetch("/api/public/cliente/notificacoes", {
      method: "POST",
      body: JSON.stringify({ id }),
    });
    setItens((prev) => prev.map((n) => (n.id === id ? { ...n, lido: true } : n)));
  }

  const naoLidas = itens.filter((n) => !n.lido).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h1 className="truncate text-xl font-bold">
          Notificações {naoLidas > 0 && <span className="text-primary">({naoLidas})</span>}
        </h1>
        {naoLidas > 0 && (
          <Button size="sm" variant="outline" onClick={marcarTodas}>
            <CheckCheck className="h-3.5 w-3.5 mr-1" /> Marcar lidas
          </Button>
        )}
      </div>

      {loading && <div className="text-sm text-muted-foreground">Carregando...</div>}
      {!loading && itens.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            <BellOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Nenhuma notificação por enquanto.
          </CardContent>
        </Card>
      )}

      {itens.map((n) => (
        <Card
          key={n.id}
          className={cn("cursor-pointer transition-colors", !n.lido && "border-primary/50 bg-primary/5")}
          onClick={() => !n.lido && marcarUma(n.id)}
        >
          <CardContent className="p-4 flex gap-3">
            <div
              className={cn(
                "h-9 w-9 shrink-0 rounded-full flex items-center justify-center",
                n.lido ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary",
              )}
            >
              <Bell className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold">{n.titulo}</div>
              <p className="text-xs text-muted-foreground break-words">{n.corpo}</p>
              <div className="text-[10px] text-muted-foreground mt-1">
                {new Date(n.created_at).toLocaleString("pt-BR")}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
