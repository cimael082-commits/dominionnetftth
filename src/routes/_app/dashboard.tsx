import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  UserX,
  UserMinus,
  AlertTriangle,
  DollarSign,
  Router,
  Wifi,
  WifiOff,
} from "lucide-react";
import { formatBRL } from "@/lib/status-utils";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Dominion Net" },
      {
        name: "description",
        content:
          "Centro de monitoramento Dominion Net: clientes online e offline em tempo real, receita e status da rede FTTH.",
      },
      { property: "og:title", content: "Dashboard — Dominion Net" },
      {
        property: "og:description",
        content: "Monitoramento em tempo real de clientes, financeiro e rede FTTH.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

type ClienteRow = {
  id: string;
  nome: string;
  status: string;
  online: boolean | null;
  plano: string | null;
  ultima_sincronizacao: string | null;
};

/** Formata uma duração em milissegundos de forma amigável (pt-BR). */
function formatDuracao(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "agora há pouco";
  if (min < 60) return `${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `${horas}h ${min % 60}min`;
  const dias = Math.floor(horas / 24);
  return `${dias} dia${dias > 1 ? "s" : ""} ${horas % 24}h`;
}

function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [clientes, parcelasMes, eventos] = await Promise.all([
        supabase
          .from("clientes")
          .select("id, nome, status, online, plano, ultima_sincronizacao")
          .order("nome"),
        supabase
          .from("parcelas")
          .select("valor,status,data_pagamento")
          .eq("status", "pago")
          .gte(
            "data_pagamento",
            new Date(new Date().getFullYear(), new Date().getMonth(), 1)
              .toISOString()
              .slice(0, 10),
          ),
        supabase
          .from("eventos_conexao")
          .select("cliente_id, tipo, created_at")
          .eq("tipo", "desconectou")
          .order("created_at", { ascending: false })
          .limit(2000),
      ]);

      const rows = (clientes.data ?? []) as ClienteRow[];
      const receita = (parcelasMes.data ?? []).reduce(
        (s, p) => s + Number(p.valor ?? 0),
        0,
      );

      // Última queda registrada por cliente (a lista já vem ordenada desc).
      const ultimaQueda = new Map<string, string>();
      for (const ev of eventos.data ?? []) {
        if (ev.cliente_id && !ultimaQueda.has(ev.cliente_id)) {
          ultimaQueda.set(ev.cliente_id, ev.created_at);
        }
      }

      return {
        clientes: rows,
        ultimaQueda: Object.fromEntries(ultimaQueda),
        total: rows.length,
        ativos: rows.filter((c) => c.status === "ativo").length,
        bloqueados: rows.filter((c) => c.status === "bloqueado").length,
        cancelados: rows.filter((c) => c.status === "cancelado").length,
        inadimplentes: rows.filter((c) => c.status === "inadimplente").length,
        online: rows.filter((c) => c.online === true).length,
        offline: rows.filter((c) => c.online !== true && c.status !== "cancelado").length,
        receita,
      };
    },
  });
}

function Dashboard() {
  const { data, isLoading } = useDashboard();
  const qc = useQueryClient();

  // Realtime: qualquer mudança de conexão recarrega os indicadores.
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-monitor")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clientes" },
        () => qc.invalidateQueries({ queryKey: ["dashboard"] }),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "eventos_conexao" },
        () => qc.invalidateQueries({ queryKey: ["dashboard"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parcelas" },
        () => qc.invalidateQueries({ queryKey: ["dashboard"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const offlineList = useMemo(() => {
    const agora = Date.now();
    return (data?.clientes ?? [])
      .filter((c) => c.online !== true && c.status !== "cancelado")
      .map((c) => {
        const desde =
          data?.ultimaQueda?.[c.id] ?? c.ultima_sincronizacao ?? null;
        return {
          ...c,
          desde,
          ms: desde ? agora - new Date(desde).getTime() : Number.NaN,
        };
      })
      .sort((a, b) => (b.ms || 0) - (a.ms || 0));
  }, [data]);

  const cards: Array<{
    label: string;
    value: string | number;
    icon: LucideIcon;
    accent: string;
  }> = [
    { label: "Clientes online", value: data?.online ?? 0, icon: Wifi, accent: "text-emerald-400" },
    { label: "Clientes offline", value: data?.offline ?? 0, icon: WifiOff, accent: "text-red-400" },
    { label: "Clientes ativos", value: data?.ativos ?? 0, icon: Users, accent: "text-emerald-400" },
    { label: "Inadimplentes", value: data?.inadimplentes ?? 0, icon: AlertTriangle, accent: "text-red-400" },
    { label: "Bloqueados", value: data?.bloqueados ?? 0, icon: UserX, accent: "text-blue-400" },
    { label: "Cancelados", value: data?.cancelados ?? 0, icon: UserMinus, accent: "text-zinc-400" },
    { label: "Receita do mês", value: formatBRL(data?.receita ?? 0), icon: DollarSign, accent: "text-primary" },
    { label: "Total de clientes", value: data?.total ?? 0, icon: Router, accent: "text-primary" },
  ];

  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Centro de monitoramento em tempo real da operação Dominion Net.
        </p>
      </header>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="border-border/60">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {c.label}
              </CardTitle>
              <c.icon className={`h-5 w-5 ${c.accent}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${c.accent}`}>
                {isLoading ? "…" : c.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-red-500/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <WifiOff className="h-5 w-5 text-red-400" />
            Clientes offline em tempo real
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            atualização automática · {offlineList.length} cliente(s)
          </span>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : offlineList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Nenhum cliente offline no momento. Rede 100% conectada.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left py-2">Cliente</th>
                    <th className="text-left py-2">Plano</th>
                    <th className="text-left py-2">Offline há</th>
                    <th className="text-left py-2">Desde</th>
                  </tr>
                </thead>
                <tbody>
                  {offlineList.map((c) => (
                    <tr key={c.id} className="border-t border-border/50">
                      <td className="py-2">
                        <Link
                          to="/clientes/$id"
                          params={{ id: c.id }}
                          className="font-medium hover:text-primary"
                        >
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            {c.nome}
                          </span>
                        </Link>
                      </td>
                      <td className="py-2 text-muted-foreground">{c.plano ?? "—"}</td>
                      <td className="py-2 font-semibold text-red-400">
                        {Number.isNaN(c.ms) ? "sem registro" : formatDuracao(c.ms)}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {c.desde
                          ? new Date(c.desde).toLocaleString("pt-BR")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
