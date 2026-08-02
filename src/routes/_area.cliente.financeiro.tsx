import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCodeLib from "qrcode";
import { Copy, Download, FileText, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { clienteFetch } from "@/lib/cliente-auth";
import { formatBRL, formatDate, parcelaStatusMeta, type ParcelaStatus } from "@/lib/status-utils";
import { gerarCarnePDF } from "@/lib/carne-pdf";
import { gerarReciboPDF } from "@/lib/recibo-pdf";

export const Route = createFileRoute("/_area/cliente/financeiro")({
  component: FinanceiroCliente,
});

type Parcela = {
  id: string;
  numero_parcela: number;
  total_parcelas: number;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: ParcelaStatus;
  forma_pagamento: string | null;
  pix_brcode: string | null;
};
type ClienteInfo = {
  nome: string;
  cpf_cnpj: string | null;
  telefone: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
};
type EmpresaInfo = {
  nome_empresa: string;
  cnpj: string | null;
  telefone: string | null;
  endereco: string | null;
  pix_chave: string;
  pix_beneficiario: string;
  pix_cidade: string;
};

/** Dispara o download de um Blob no navegador. */
function baixarBlob(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

function FinanceiroCliente() {
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [cliente, setCliente] = useState<ClienteInfo | null>(null);
  const [empresa, setEmpresa] = useState<EmpresaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [qrOpen, setQrOpen] = useState<string | null>(null);
  const [qrData, setQrData] = useState<string>("");

  useEffect(() => {
    clienteFetch<{ parcelas: Parcela[]; cliente: ClienteInfo | null; empresa: EmpresaInfo | null }>(
      "/api/public/cliente/financeiro",
    )
      .then((r) => {
        setParcelas(r.parcelas);
        setCliente(r.cliente);
        setEmpresa(r.empresa);
      })
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function toggleQr(p: Parcela) {
    if (qrOpen === p.id) {
      setQrOpen(null);
      return;
    }
    if (!p.pix_brcode) {
      toast.error("PIX indisponível — fale com o suporte.");
      return;
    }
    const dataUrl = await QRCodeLib.toDataURL(p.pix_brcode, { width: 260, margin: 1 });
    setQrData(dataUrl);
    setQrOpen(p.id);
  }

  function copyBrcode(code: string | null) {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast.success("PIX copiado!");
  }

  /** Gera o carnê completo (ou apenas uma parcela = 2ª via). */
  async function baixarCarne(somente?: Parcela) {
    if (!cliente || !empresa?.pix_chave) {
      toast.error("Dados de cobrança indisponíveis. Fale com o suporte.");
      return;
    }
    const alvo = somente ? [somente] : parcelas.filter((p) => p.status !== "cancelado");
    if (alvo.length === 0) {
      toast.info("Nenhuma parcela para gerar.");
      return;
    }
    setGerando(true);
    try {
      const blob = await gerarCarnePDF({
        cliente,
        empresa,
        parcelas: alvo.map((p) => ({
          numero: p.numero_parcela ?? 1,
          total: p.total_parcelas ?? alvo.length,
          valor: Number(p.valor),
          vencimento: new Date(`${p.data_vencimento}T00:00:00`),
        })),
      });
      baixarBlob(
        blob,
        somente ? `2via-parcela-${somente.numero_parcela}.pdf` : "carne-dominion-net.pdf",
      );
    } catch (e) {
      toast.error((e as Error).message || "Falha ao gerar PDF");
    } finally {
      setGerando(false);
    }
  }

  /** Gera o comprovante de pagamento de uma parcela quitada. */
  function baixarComprovante(p: Parcela) {
    if (!cliente) return;
    const blob = gerarReciboPDF({
      empresa: {
        nome_empresa: empresa?.nome_empresa || "Dominion Net",
        cnpj: empresa?.cnpj ?? null,
        telefone: empresa?.telefone ?? null,
        endereco: empresa?.endereco ?? null,
      },
      cliente: { nome: cliente.nome, cpf_cnpj: cliente.cpf_cnpj, endereco: cliente.endereco },
      parcela: {
        numero: p.numero_parcela,
        total: p.total_parcelas,
        valor: Number(p.valor),
        vencimento: p.data_vencimento,
        pagamento: p.data_pagamento,
        forma: p.forma_pagamento,
        id: p.id,
      },
    });
    baixarBlob(blob, `comprovante-${p.numero_parcela ?? ""}.pdf`);
  }

  const pendentes = parcelas.filter((p) => p.status !== "pago" && p.status !== "cancelado");
  const pagas = parcelas.filter((p) => p.status === "pago");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h1 className="truncate text-xl font-bold">Financeiro</h1>
        <Button size="sm" variant="outline" onClick={() => baixarCarne()} disabled={gerando}>
          <Download className="h-3.5 w-3.5 mr-1" /> {gerando ? "Gerando..." : "Baixar carnê"}
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
          Em aberto ({pendentes.length})
        </h2>
        {loading && <div className="text-sm text-muted-foreground">Carregando...</div>}
        {!loading && pendentes.length === 0 && (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              Nenhuma fatura em aberto 🎉
            </CardContent>
          </Card>
        )}
        {pendentes.map((p) => {
          const meta = parcelaStatusMeta[p.status];
          return (
            <Card key={p.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">
                      Parcela {p.numero_parcela}/{p.total_parcelas}
                    </div>
                    <div className="text-lg font-bold">{formatBRL(Number(p.valor))}</div>
                    <div className="text-xs text-muted-foreground">
                      Vencimento: {formatDate(p.data_vencimento)}
                    </div>
                  </div>
                  <Badge variant="outline" className={meta.badge}>
                    {meta.label}
                  </Badge>
                </div>
                {qrOpen === p.id && qrData && (
                  <div className="flex flex-col items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-3">
                    <img src={qrData} alt="QR Code PIX da fatura" className="h-52 w-52 rounded" />
                    <div className="w-full break-all text-[10px] text-muted-foreground font-mono max-h-16 overflow-auto rounded bg-muted/50 p-2">
                      {p.pix_brcode}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => toggleQr(p)} disabled={!p.pix_brcode}>
                    {qrOpen === p.id ? "Ocultar QR" : "Pagar com PIX"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyBrcode(p.pix_brcode)}
                    disabled={!p.pix_brcode}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copia e Cola
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => baixarCarne(p)} disabled={gerando}>
                    <FileText className="h-3.5 w-3.5 mr-1" /> 2ª via
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
          Histórico de pagamentos ({pagas.length})
        </h2>
        {pagas.length === 0 && (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              Ainda sem pagamentos registrados.
            </CardContent>
          </Card>
        )}
        {pagas.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  Parcela {p.numero_parcela}/{p.total_parcelas} — {formatBRL(Number(p.valor))}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Pago em {formatDate(p.data_pagamento)} • {p.forma_pagamento || "—"}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => baixarComprovante(p)}>
                <Receipt className="h-3.5 w-3.5 mr-1" /> Comprovante
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
