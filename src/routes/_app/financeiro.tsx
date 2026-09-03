import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, AlertTriangle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
  const [busca, setBusca] = useState("");
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

      // Busca paginada: o PostgREST limita cada resposta, então percorremos
      // todas as páginas para nunca esconder parcelas antigas do administrador.
      const PAGE = 1000;
      const todas: ParcelaRow[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("parcelas")
          .select("*, clientes(id, nome, telefone, whatsapp)")
          .order("data_vencimento", { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const lote = (data ?? []) as unknown as ParcelaRow[];
        todas.push(...lote);
        if (lote.length < PAGE) break;
      }
      return todas;
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
    const termo = busca.trim().toLowerCase();
    return rows.filter((r) => {
      if (filtro !== "todos" && r.status !== filtro) return false;
      if (!termo) return true;
      return (r.clientes?.nome ?? "").toLowerCase().includes(termo);
    });
  }, [q.data, filtro, busca]);

  const totais = useMemo(() => {
    const rows = q.data ?? [];
    return {
      recebido: rows.filter((r) => r.status === "pago").reduce((s, r) => s + Number(r.valor), 0),
      aReceber: rows.filter((r) => r.status === "pendente").reduce((s, r) => s + Number(r.valor), 0),
      vencido: rows.filter((r) => r.status === "vencido").reduce((s, r) => s + Number(r.valor), 0),
    };
  }, [q.data]);

  /** Agrupa parcelas em aberto (pendente/vencido) por cliente para a cobrança. */
  const devedores = useMemo(() => {
    const rows = (q.data ?? []).filter(
      (r) => r.status === "pendente" || r.status === "vencido",
    );
    const map = new Map<
      string,
      {
        clienteId: string;
        nome: string;
        telefone: string | null;
        whatsapp: string | null;
        parcelas: ParcelaRow[];
        total: number;
        totalVencido: number;
        vencidas: number;
      }
    >();

    for (const p of rows) {
      const id = p.cliente_id;
      const atual = map.get(id) ?? {
        clienteId: id,
        nome: p.clientes?.nome ?? "Cliente removido",
        telefone: p.clientes?.telefone ?? null,
        whatsapp: p.clientes?.whatsapp ?? null,
        parcelas: [] as ParcelaRow[],
        total: 0,
        totalVencido: 0,
        vencidas: 0,
      };
      atual.parcelas.push(p);
      atual.total += Number(p.valor);
      if (p.status === "vencido") {
        atual.totalVencido += Number(p.valor);
        atual.vencidas += 1;
      }
      map.set(id, atual);
    }

    const termo = buscaDevedor.trim().toLowerCase();
    return [...map.values()]
      .map((d) => ({
        ...d,
        parcelas: [...d.parcelas].sort((a, b) =>
          a.data_vencimento.localeCompare(b.data_vencimento),
        ),
      }))
      .filter((d) => (termo ? d.nome.toLowerCase().includes(termo) : true))
      .sort((a, b) => b.totalVencido - a.totalVencido || b.total - a.total);
  }, [q.data, buscaDevedor]);

  const totalGeralAberto = devedores.reduce((s, d) => s + d.total, 0);

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

      <Card className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Clientes com mensalidades em aberto
            </h2>
            <p className="text-sm text-muted-foreground">
              {devedores.length} cliente(s) · total em aberto{" "}
              <strong className="text-foreground">{formatBRL(totalGeralAberto)}</strong>
            </p>
          </div>
          <Input
            className="max-w-xs"
            placeholder="Filtrar por nome do cliente..."
            value={buscaDevedor}
            onChange={(e) => setBuscaDevedor(e.target.value)}
          />
        </div>

        {q.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : devedores.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Nenhuma mensalidade em aberto. Tudo em dia.
          </p>
        ) : (
          <div className="divide-y divide-border/60 rounded-lg border border-border/60">
            {devedores.map((d) => {
              const expandido = aberto === d.clienteId;
              return (
                <div key={d.clienteId}>
                  <button
                    type="button"
                    onClick={() => setAberto(expandido ? null : d.clienteId)}
                    aria-expanded={expandido}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-accent/30 transition-colors"
                  >
                    {expandido ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{d.nome}</span>
                        <WhatsappButton
                          cliente={{ nome: d.nome, telefone: d.telefone, whatsapp: d.whatsapp }}
                          message={[
                            `Olá ${d.nome}! Tudo bem? 😊`,
                            "",
                            "Passando para lembrar que sua mensalidade da internet está em aberto.",
                            "",
                            "Pedimos, por favor, que verifique o pagamento e, se já tiver realizado, desconsidere esta mensagem.",
                            "",
                            `Caso precise da segunda via ou do Pix para pagamento, estamos à disposição. 📲 Pix: alexandrejosecicero561@gmail.com`,
                            "",
                            "Agradecemos pela atenção e preferência!",
                            "",
                            "Dominion Net 5G",
                          ].join("\n")}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {d.parcelas.length} mês(es) em aberto
                        {d.vencidas > 0 ? ` · ${d.vencidas} vencida(s)` : ""}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold">{formatBRL(d.total)}</div>
                      {d.totalVencido > 0 && (
                        <div className="text-xs text-red-400">
                          {formatBRL(d.totalVencido)} em atraso
                        </div>
                      )}
                    </div>
                  </button>

                  {expandido && (
                    <div className="bg-muted/20 px-3 pb-3">
                      <table className="w-full text-sm">
                        <thead className="text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="text-left py-2">Referência</th>
                            <th className="text-left py-2">Vencimento</th>
                            <th className="text-left py-2">Valor</th>
                            <th className="text-left py-2">Situação</th>
                            <th className="text-right py-2">Ação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.parcelas.map((p) => {
                            const m = parcelaStatusMeta[p.status as ParcelaStatus];
                            return (
                              <tr key={p.id} className="border-t border-border/40">
                                <td className="py-2">
                                  {String(p.referencia_mes).padStart(2, "0")}/{p.referencia_ano}
                                </td>
                                <td className="py-2">{formatDate(p.data_vencimento)}</td>
                                <td className="py-2 font-medium">{formatBRL(p.valor)}</td>
                                <td className="py-2">
                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs ${m.badge}`}
                                  >
                                    <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
                                    {m.label}
                                  </span>
                                </td>
                                <td className="py-2 text-right">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={marcarPago.isPending}
                                    onClick={() => marcarPago.mutate(p.id)}
                                  >
                                    <Check className="h-3.5 w-3.5" /> Marcar pago
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="border-t border-border">
                            <td colSpan={2} className="py-2 text-xs uppercase text-muted-foreground">
                              Total em aberto
                            </td>
                            <td className="py-2 font-bold text-primary">{formatBRL(d.total)}</td>
                            <td colSpan={2} className="py-2 text-right">
                              <Link
                                to="/clientes/$id"
                                params={{ id: d.clienteId }}
                                className="text-xs text-primary hover:underline"
                              >
                                Abrir ficha do cliente
                              </Link>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>


      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
          {(
            [
              ["todos", "Todos"],
              ["pago", "Pagos"],
              ["pendente", "Pendentes"],
              ["vencido", "Vencidos"],
              ["cancelado", "Cancelados"],
            ] as const
          ).map(([valor, rotulo]) => {
            const ativo = filtro === valor;
            const qtd =
              valor === "todos"
                ? (q.data ?? []).length
                : (q.data ?? []).filter((r) => r.status === valor).length;
            return (
              <button
                key={valor}
                type="button"
                onClick={() => setFiltro(valor)}
                aria-pressed={ativo}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  ativo
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {rotulo}
                <span className="ml-1.5 text-xs opacity-70">{qtd}</span>
              </button>
            );
          })}
        </div>
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Pesquisar cliente pelo nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
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
