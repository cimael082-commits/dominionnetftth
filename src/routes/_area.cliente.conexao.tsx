import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { clienteFetch } from "@/lib/cliente-auth";

export const Route = createFileRoute("/_area/cliente/conexao")({
  component: ConexaoPage,
});

type Cliente = {
  nome: string;
  online: boolean | null;
  ip_atual: string | null;
  uptime_atual: string | null;
  ultima_sincronizacao: string | null;
  login_pppoe: string | null;
  plano: string | null;
};

function ConexaoPage() {
  const [cli, setCli] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await clienteFetch<{ cliente: Cliente }>("/api/public/cliente/me");
      setCli(r.cliente);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const online = cli?.online === true;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Status da Conexão</h1>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      <Card className={online ? "border-emerald-500/40" : "border-red-500/40"}>
        <CardContent className="p-5 flex flex-col items-center gap-3 text-center">
          <div className={`h-16 w-16 rounded-full flex items-center justify-center text-3xl ${online ? "bg-emerald-500/15" : "bg-red-500/15"}`}>
            {online ? "🟢" : "🔴"}
          </div>
          <div>
            <div className="text-2xl font-bold">{online ? "Internet Online" : "Internet Offline"}</div>
            <div className="text-xs text-muted-foreground">
              {cli?.ultima_sincronizacao
                ? `Última verificação: ${new Date(cli.ultima_sincronizacao).toLocaleString("pt-BR")}`
                : "Aguardando sincronização"}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <InfoTile label="Plano" value={cli?.plano || "—"} />
        <InfoTile label="Login PPPoE" value={cli?.login_pppoe || "—"} />
        <InfoTile label="IP" value={cli?.ip_atual || "—"} />
        <InfoTile label="Uptime" value={cli?.uptime_atual || "—"} />
      </div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</div>
        <div className="text-sm font-semibold break-all">{value}</div>
      </CardContent>
    </Card>
  );
}
