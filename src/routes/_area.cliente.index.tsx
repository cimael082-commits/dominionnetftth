import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Waves, Wallet, AlertTriangle, CheckCircle2, Wifi, Info, Radio } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { clienteFetch } from "@/lib/cliente-auth";
import { formatBRL } from "@/lib/status-utils";

export const Route = createFileRoute("/_area/cliente/")({
  component: HomeCliente,
});

type Cliente = {
  id: string;
  nome: string;
  plano: string | null;
  mensalidade: number;
  dia_vencimento: number | null;
  status: string;
  online: boolean | null;
  ip_atual: string | null;
  uptime_atual: string | null;
  ultima_sincronizacao: string | null;
};
type Parcela = {
  id: string;
  numero_parcela: number;
  valor: number;
  data_vencimento: string;
  status: string;
};

function HomeCliente() {
  const [cli, setCli] = useState<Cliente | null>(null);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [me, fin] = await Promise.all([
          clienteFetch<{ cliente: Cliente }>("/api/public/cliente/me"),
          clienteFetch<{ parcelas: Parcela[] }>("/api/public/cliente/financeiro"),
        ]);
        setCli(me.cliente);
        setParcelas(fin.parcelas);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-sm text-muted-foreground">Carregando...</div>;
  if (!cli) return <div className="text-sm text-destructive">Erro ao carregar dados</div>;

  const pendentes = parcelas.filter((p) => p.status !== "pago");
  const proxima = pendentes[0];
  const atrasadas = pendentes.filter((p) => p.status === "vencido");
  const online = cli.online === true;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-muted-foreground">Olá,</div>
        <h1 className="text-2xl font-bold tracking-tight">{cli.nome.split(" ")[0]}</h1>
      </div>

      <Card className={online ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/40 bg-red-500/5"}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${online ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500"}`}>
            <Waves className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{online ? "Conectado" : "Desconectado"}</span>
              <Badge variant="outline" className="text-[10px]">{cli.plano || "Sem plano"}</Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {online
                ? `IP ${cli.ip_atual ?? "-"} • ${cli.uptime_atual ?? "-"}`
                : "Se o problema persistir, contate o suporte"}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/cliente/financeiro">
          <Card className="hover:border-primary/60 transition-colors">
            <CardContent className="p-4">
              <Wallet className="h-5 w-5 text-primary mb-2" />
              <div className="text-[11px] text-muted-foreground">Próxima fatura</div>
              <div className="text-lg font-bold">
                {proxima ? formatBRL(Number(proxima.valor)) : "—"}
              </div>
              {proxima && (
                <div className="text-[11px] text-muted-foreground">
                  Vence {new Date(proxima.data_vencimento + "T00:00").toLocaleDateString("pt-BR")}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
        <Link to="/cliente/financeiro">
          <Card className={atrasadas.length > 0 ? "border-red-500/60" : ""}>
            <CardContent className="p-4">
              {atrasadas.length > 0 ? (
                <AlertTriangle className="h-5 w-5 text-red-500 mb-2" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 mb-2" />
              )}
              <div className="text-[11px] text-muted-foreground">Atrasadas</div>
              <div className="text-lg font-bold">{atrasadas.length}</div>
              <div className="text-[11px] text-muted-foreground">
                {atrasadas.length > 0 ? "regularize agora" : "tudo em dia"}
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/cliente/wifi">
          <Card>
            <CardContent className="p-4">
              <Wifi className="h-5 w-5 text-primary mb-2" />
              <div className="text-[11px] text-muted-foreground">Wi-Fi</div>
              <div className="text-sm font-semibold">Ver SSID e senha</div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/cliente/plano">
          <Card>
            <CardContent className="p-4">
              <Radio className="h-5 w-5 text-primary mb-2" />
              <div className="text-[11px] text-muted-foreground">Meu Plano</div>
              <div className="text-sm font-semibold">{cli.plano || "Ver detalhes"}</div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/cliente/avisos">
          <Card>
            <CardContent className="p-4">
              <Info className="h-5 w-5 text-primary mb-2" />
              <div className="text-[11px] text-muted-foreground">Avisos</div>
              <div className="text-sm font-semibold">Central de comunicados</div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
