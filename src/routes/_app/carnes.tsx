import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { FileText, Download } from "lucide-react";
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
  head: () => ({ meta: [{ title: "Carnês — Dominion Net" }] }),
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

  const [clienteId, setClienteId] = useState<string>(search.cliente ?? "");
  const [parcelas, setParcelas] = useState<number>(12);
  const [valor, setValor] = useState<string>("");
  const [inicio, setInicio] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });

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
      const lista: CarneParcela[] = [];
      const insertRows = [] as Parameters<typeof supabase.from<"parcelas">>[0] extends never ? never : Array<{
        cliente_id: string;
        numero_parcela: number;
        total_parcelas: number;
        referencia_mes: number;
        referencia_ano: number;
        valor: number;
        data_vencimento: string;
        status: "pendente";
        origem: string;
      }>;
      for (let i = 0; i < parcelas; i++) {
        const venc = new Date(dataInicio);
        venc.setMonth(venc.getMonth() + i);
        lista.push({ numero: i + 1, total: parcelas, valor: v, vencimento: venc });
        insertRows.push({
          cliente_id: clienteId,
          numero_parcela: i + 1,
          total_parcelas: parcelas,
          referencia_mes: venc.getMonth() + 1,
          referencia_ano: venc.getFullYear(),
          valor: v,
          data_vencimento: venc.toISOString().slice(0, 10),
          status: "pendente" as const,
          origem: "carne",
        });
      }

      // Salvar parcelas no banco
      const { error } = await supabase.from("parcelas").insert(insertRows);
      if (error) throw error;

      // Gerar PDF
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
          <Label>Cliente *</Label>
          <Select value={clienteId} onValueChange={setClienteId}>
            <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
            <SelectContent>
              {clientes.data?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
