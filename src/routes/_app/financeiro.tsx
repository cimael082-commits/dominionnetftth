import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  parcelaStatusMeta,
  formatBRL,
  formatDate,
  type ParcelaStatus,
} from "@/lib/status-utils";
import { WhatsappButton } from "@/components/whatsapp-button";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro e cobrança — Dominion Net" },
      {
        name: "description",
        content:
          "Acompanhe mensalidades em aberto, vencimentos e o total em atraso de cada assinante.",
      },
    ],
  }),
  component: FinanceiroPage,
});

/** Linha de parcela com dados do cliente embutidos. */
type ParcelaRow = {
  id: string;
  cliente_id: string;
  referencia_mes: number;
  referencia_ano: number;
  data_vencimento: string;
  valor: number | string;
  status: string;
  clientes: {
    id: string;
    nome: string;
    telefone: string | null;
    whatsapp: string | null;
  } | null;
};

function FinanceiroPage() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<"todos" | ParcelaStatus>("todos");
  const [buscaDevedor, setBuscaDevedor] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);


  const q = useQuery({
    queryKey: ["financeiro-all"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      await supabase
        .from("parcelas")
        .update({ status: "vencido" })
        .eq("status", "pendente")
        .lt("data_vencimento", today);

      const { data, error } = await supabase
        .from("parcelas")
        .select("*, clientes(nome, id)")
        .order("data_vencimento", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const marcarPago = useMutation({
    mutationFn: async (parcelaId: string) => {
      const { error } = await supabase
        .from("parcelas")
        .update({ status: "pago", data_pagamento: new Date().toISOString().slice(0, 10) })
        .eq("id", parcelaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Parcela paga");
      qc.invalidateQueries({ queryKey: ["financeiro-all"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const filtradas = useMemo(() => {
    const rows = q.data ?? [];
    if (filtro === "todos") return rows;
    return rows.filter((r) => r.status === filtro);
  }, [q.data, filtro]);

  const totais = useMemo(() => {
    const rows = q.data ?? [];
    return {
      recebido: rows.filter((r) => r.status === "pago").reduce((s, r) => s + Number(r.valor), 0),
      aReceber: rows.filter((r) => r.status === "pendente").reduce((s, r) => s + Number(r.valor), 0),
      vencido: rows.filter((r) => r.status === "vencido").reduce((s, r) => s + Number(r.valor), 0),
    };
  }, [q.data]);

  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground mt-1">Controle geral de parcelas e mensalidades.</p>
      </header>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Summary label="Recebido" value={totais.recebido} tone="text-emerald-400" />
        <Summary label="A receber" value={totais.aReceber} tone="text-amber-400" />
        <Summary label="Em atraso" value={totais.vencido} tone="text-red-400" />
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Filtrar:</span>
        <Select value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pago">Pagos</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="vencido">Vencidos</SelectItem>
            <SelectItem value="cancelado">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">Cliente</th>
              <th className="text-left p-3">Referência</th>
              <th className="text-left p-3">Vencimento</th>
              <th className="text-left p-3">Valor</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Ação</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((p) => {
              const m = parcelaStatusMeta[p.status as ParcelaStatus];
              return (
                <tr key={p.id} className="border-t border-border/50 hover:bg-accent/20">
                  <td className="p-3">
                    <Link to="/clientes/$id" params={{ id: p.cliente_id }} className="hover:text-primary">
                      {p.clientes?.nome ?? "—"}
                    </Link>
                  </td>
                  <td className="p-3">
                    {String(p.referencia_mes).padStart(2, "0")}/{p.referencia_ano}
                  </td>
                  <td className="p-3">{formatDate(p.data_vencimento)}</td>
                  <td className="p-3 font-medium">{formatBRL(p.valor)}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs ${m.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} /> {m.label}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {p.status !== "pago" && (
                      <Button size="sm" variant="outline" onClick={() => marcarPago.mutate(p.id)}>
                        <Check className="h-3.5 w-3.5" /> Marcar pago
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtradas.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma parcela encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Summary({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card className="p-5">
      <div className="text-xs uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className={`text-3xl font-bold mt-2 ${tone}`}>{formatBRL(value)}</div>
    </Card>
  );
}
