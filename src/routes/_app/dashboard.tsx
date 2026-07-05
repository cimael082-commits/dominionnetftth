import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserX, UserMinus, AlertTriangle, DollarSign, Router } from "lucide-react";
import { formatBRL } from "@/lib/status-utils";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Dominion Net" }] }),
  component: Dashboard,
});

function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      // Atualizar vencidos primeiro (client-side update via update)
      const today = new Date().toISOString().slice(0, 10);
      await supabase
        .from("parcelas")
        .update({ status: "vencido" })
        .eq("status", "pendente")
        .lt("data_vencimento", today);

      const [clientes, parcelasMes] = await Promise.all([
        supabase.from("clientes").select("status", { head: false }),
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
      ]);

      const rows = clientes.data ?? [];
      const receita = (parcelasMes.data ?? []).reduce(
        (s, p) => s + Number(p.valor ?? 0),
        0,
      );

      return {
        total: rows.length,
        ativos: rows.filter((c) => c.status === "ativo").length,
        bloqueados: rows.filter((c) => c.status === "bloqueado").length,
        cancelados: rows.filter((c) => c.status === "cancelado").length,
        inadimplentes: rows.filter((c) => c.status === "inadimplente").length,
        receita,
      };
    },
  });
}

function Dashboard() {
  const { data, isLoading } = useDashboard();

  const cards: Array<{
    label: string;
    value: string | number;
    icon: LucideIcon;
    accent: string;
  }> = [
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
          Visão geral da operação Dominion Net.
        </p>
      </header>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
}
