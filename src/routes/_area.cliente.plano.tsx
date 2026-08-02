import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Zap, Wifi, DollarSign, Calendar, CheckCircle2, Radio } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { clienteFetch } from "@/lib/cliente-auth";
import { formatBRL } from "@/lib/status-utils";

export const Route = createFileRoute("/_area/cliente/plano")({
  component: PlanoPage,
});

type Cliente = {
  nome: string;
  plano: string | null;
  mensalidade: number;
  dia_vencimento: number | null;
  status: string;
};

function extractSpeed(plano: string | null): string | null {
  if (!plano) return null;
  const m = plano.match(/(\d+)\s*(mega|mbps|gb|giga)/i);
  return m ? `${m[1]} ${/(gb|giga)/i.test(m[2]) ? "Gbps" : "Mbps"}` : null;
}

function PlanoPage() {
  const [cli, setCli] = useState<Cliente | null>(null);

  useEffect(() => {
    clienteFetch<{ cliente: Cliente }>("/api/public/cliente/me").then((r) => setCli(r.cliente));
  }, []);

  if (!cli) return <div className="text-sm text-muted-foreground">Carregando...</div>;
  const speed = extractSpeed(cli.plano);

  const beneficios = [
    "Fibra óptica FTTH de alta velocidade",
    "Wi-Fi 5G de última geração",
    "Suporte técnico 7 dias por semana",
    "IP dedicado sob demanda",
    "Sem taxa de instalação para novos clientes",
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Meu Plano</h1>

      <Card className="border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center ring-1 ring-primary/40">
              <Radio className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Plano contratado</div>
              <div className="text-xl font-bold">{cli.plano || "—"}</div>
            </div>
            <Badge variant="outline" className="border-primary/50 text-primary">Dominion 5G</Badge>
          </div>
          {speed && (
            <div className="flex items-center gap-2 pt-2 border-t border-border/40">
              <Zap className="h-5 w-5 text-primary" />
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">Velocidade</div>
                <div className="text-lg font-bold">{speed}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <DollarSign className="h-5 w-5 text-primary mb-2" />
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Mensalidade</div>
            <div className="text-lg font-bold">{formatBRL(Number(cli.mensalidade))}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Calendar className="h-5 w-5 text-primary mb-2" />
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Dia de vencimento</div>
            <div className="text-lg font-bold">Dia {cli.dia_vencimento ?? "—"}</div>
          </CardContent>
        </Card>
      </div>

      <PixQrCard titulo="Pagar mensalidade" />

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-primary" />
            <div className="text-sm font-semibold">Benefícios inclusos</div>
          </div>
          <ul className="space-y-2">
            {beneficios.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Para mudar de plano, fale com o suporte.
      </p>
    </div>
  );
}
