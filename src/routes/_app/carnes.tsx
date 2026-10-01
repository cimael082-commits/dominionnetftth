import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { FileText, Download, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { gerarCarnePDF, type CarneParcela } from "@/lib/carne-pdf";
import { toast } from "sonner";
import { formatBRL } from "@/lib/status-utils";
import { z } from "zod";

const searchSchema = z.object({ cliente: z.string().optional() });

export const Route = createFileRoute("/_app/carnes")({
  head: () => ({
    meta: [
      { title: "Carnês — Dominion Net" },
      { name: "description", content: "Emita carnês de clientes com parcelas e QR Code Pix." },
      { property: "og:title", content: "Carnês — Dominion Net" },
      { property: "og:description", content: "Emita carnês de clientes com parcelas e QR Code Pix." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: searchSchema,
  component: CarnesPage,
});

function CarnesPage() {
  const search = Route.useSearch();
  const qc = useQueryClient();

  const clientes = useQuery({
    queryKey: ["clientes-simples"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("id,nome,cpf_cnpj,endereco,telefone,valor_mensalidade,dia_vencimento").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const empresa = useQuery({
    queryKey: ["empresa"],
    queryFn: async () => {
      const { data } = await supabase.from("configuracoes_empresa").select("*").limit(1).single();
      return data;
    },
  });

  const [filtro, setFiltro] = useState("");
  const [clienteId, setClienteId] = useState<string>(search.cliente ?? "");
  const [parcelas, setParcelas] = useState<number>(12);
  const [valor, setValor] = useState<string>("");
  const [inicio, setInicio] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });

  const clientesFiltrados = clientes.data?.filter((cliente) => {
    const corresponde = cliente.nome
      .toLocaleLowerCase("pt-BR")
      .includes(filtro.trim().toLocaleLowerCase("pt-BR"));
    return corresponde || cliente.id === clienteId;
  }) ?? [];

  useEffect(() => {
    if (clienteId && clientes.data) {
      const c = clientes.data.find((x) => x.id === clienteId);
      if (c && !valor) {
        setValor(String(c.valor_mensalidade));
        const d = new Date();
        d.setDate(c.dia_vencimento);
        if (d < new Date()) d.setMonth(d.getMonth() + 1);
        setInicio(d.toISOString().slice(0, 10));
      }
    }
  }, [clienteId, clientes.data]);

  const gerar = useMutation({
    mutationFn: async () => {
      const cliente = clientes.data?.find((c) => c.id === clienteId);
      const emp = empresa.data;
      if (!cliente || !emp) throw new Error("Selecione um cliente");
      const v = parseFloat(valor);
      if (!v || v <= 0) throw new Error("Valor inválido");

      const dataInicio = new Date(inicio + "T00:00:00");
      const diaBase = dataInicio.getDate();
      const lista: CarneParcela[] = [];
      type ParcelaInsert = import("@/integrations/supabase/types").TablesInsert<"parcelas">;
      const insertRows: ParcelaInsert[] = [];
      for (let i = 0; i < parcelas; i++) {
        const alvoMes = dataInicio.getMonth() + i;
        const ano = dataInicio.getFullYear() + Math.floor(alvoMes / 12);
        const mes = ((alvoMes % 12) + 12) % 12;
        const ultimoDia = new Date(ano, mes + 1, 0).getDate();
        const venc = new Date(ano, mes, Math.min(diaBase, ultimoDia));
        lista.push({ numero: i + 1, total: parcelas, valor: v, vencimento: venc });
        insertRows.push({
          cliente_id: clienteId,
          numero_parcela: i + 1,
          total_parcelas: parcelas,
          referencia_mes: mes + 1,
          referencia_ano: ano,
          valor: v,
          data_vencimento: `${ano}-${String(mes + 1).padStart(2, "0")}-${String(
            Math.min(diaBase, ultimoDia),
          ).padStart(2, "0")}`,
          status: "pendente" as const,
          origem: "carne",
        });
      }

      const { error } = await supabase.from("parcelas").insert(insertRows);
      if (error) throw error;

      const blob = await gerarCarnePDF({
        cliente: {
          nome: cliente.nome,
          cpf_cnpj: cliente.cpf_cnpj,
          endereco: cliente.endereco,
          telefone: cliente.telefone,
        },
        empresa: {
          nome_empresa: emp.nome_empresa,
          cnpj: emp.cnpj,
          telefone: emp.telefone,
          endereco: emp.endereco,
          pix_chave: emp.pix_chave,
          pix_beneficiario: emp.pix_beneficiario,
          pix_cidade: emp.pix_cidade,
        },
        parcelas: lista,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `carne-${cliente.nome.replace(/\s+/g, "_")}-${parcelas}x.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast.success("Carnê gerado e parcelas lançadas!");
      qc.invalidateQueries({ queryKey: ["financeiro-all"] });
      qc.invalidateQueries({ queryKey: ["parcelas"] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const totalCarne = parcelas * (parseFloat(valor) || 0);

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Emissão de Carnês</h1>
        <p className="text-muted-foreground mt-1">
          Gere carnês com QR Code Pix automaticamente. As parcelas são lançadas no financeiro do cliente.
        </p>
      </header>

      <Card className="p-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="pesquisar-cliente">Pesquisar cliente por nome</Label>
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="pesquisar-cliente"
                placeholder="Digite o nome do cliente"
                value={filtro}
                onChange={(event) => setFiltro(event.target.value)}
                className="pl-9"
                autoComplete="off"
              />
            </div>
            <Label>Cliente *</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                {clientesFiltrados.length > 0 ? (
                  clientesFiltrados.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))
                ) : null}
              </SelectContent>
            </Select>
            {filtro.trim() && clientesFiltrados.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Parcelas *</Label>
            <Select value={String(parcelas)} onValueChange={(v) => setParcelas(parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 parcelas</SelectItem>
                <SelectItem value="12">12 parcelas</SelectItem>
                <SelectItem value="24">24 parcelas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor por parcela (R$) *</Label>
            <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Vencimento da 1ª parcela</Label>
          <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/30 p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Total do carnê</div>
            <div className="text-2xl font-bold text-primary">{formatBRL(totalCarne)}</div>
          </div>
          <FileText className="h-8 w-8 text-primary/60" />
        </div>

        <Button
          className="w-full"
          size="lg"
          disabled={!clienteId || gerar.isPending}
          onClick={() => gerar.mutate()}
        >
          <Download className="h-4 w-4" />
          {gerar.isPending ? "Gerando..." : "Gerar carnê em PDF"}
        </Button>

        {empresa.data && (
          <p className="text-xs text-muted-foreground text-center">
            Pix: <span className="font-medium">{empresa.data.pix_chave}</span> · {empresa.data.pix_beneficiario}
          </p>
        )}
      </Card>
    </div>
  );
}
