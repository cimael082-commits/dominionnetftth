import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCodeLib from "qrcode";
import { Copy, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { clienteFetch } from "@/lib/cliente-auth";
import { formatBRL, formatDate, parcelaStatusMeta, type ParcelaStatus } from "@/lib/status-utils";

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

function FinanceiroCliente() {
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState<string | null>(null);
  const [qrData, setQrData] = useState<string>("");

  useEffect(() => {
    clienteFetch<{ parcelas: Parcela[] }>("/api/public/cliente/financeiro")
      .then((r) => setParcelas(r.parcelas))
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function toggleQr(p: Parcela) {
    if (qrOpen === p.id) {
      setQrOpen(null);
      return;
    }
    if (!p.pix_brcode) {
      toast.error("PIX indisponível — configure a chave PIX na empresa.");
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

  const pendentes = parcelas.filter((p) => p.status !== "pago" && p.status !== "cancelado");
  const pagas = parcelas.filter((p) => p.status === "pago");

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Financeiro</h1>

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
          Em aberto ({pendentes.length})
        </h2>
        {loading && <div className="text-sm text-muted-foreground">Carregando...</div>}
        {!loading && pendentes.length === 0 && (
          <Card><CardContent className="p-4 text-sm text-muted-foreground">Nenhuma fatura em aberto 🎉</CardContent></Card>
        )}
        {pendentes.map((p) => {
          const meta = parcelaStatusMeta[p.status];
          return (
            <Card key={p.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Parcela {p.numero_parcela}/{p.total_parcelas}
                    </div>
                    <div className="text-lg font-bold">{formatBRL(Number(p.valor))}</div>
                    <div className="text-xs text-muted-foreground">
                      Vencimento: {formatDate(p.data_vencimento)}
                    </div>
                  </div>
                  <Badge variant="outline" className={meta.badge}>{meta.label}</Badge>
                </div>
                {qrOpen === p.id && qrData && (
                  <div className="flex flex-col items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-3">
                    <img src={qrData} alt="QR PIX" className="h-52 w-52 rounded" />
                    <div className="w-full break-all text-[10px] text-muted-foreground font-mono max-h-16 overflow-auto rounded bg-muted/50 p-2">
                      {p.pix_brcode}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => toggleQr(p)} disabled={!p.pix_brcode}>
                    {qrOpen === p.id ? "Ocultar QR" : "Pagar com PIX"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyBrcode(p.pix_brcode)} disabled={!p.pix_brcode}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copia e Cola
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
          <Card><CardContent className="p-4 text-sm text-muted-foreground">Ainda sem pagamentos registrados.</CardContent></Card>
        )}
        {pagas.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">
                  Parcela {p.numero_parcela}/{p.total_parcelas} — {formatBRL(Number(p.valor))}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Pago em {formatDate(p.data_pagamento)} • {p.forma_pagamento || "—"}
                </div>
              </div>
              <Badge variant="outline" className={parcelaStatusMeta.pago.badge}>Pago</Badge>
            </CardContent>
          </Card>
        ))}
      </section>

      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          toast.info("Baixe carnês pelo painel do provedor.");
        }}
        className="flex items-center gap-2 justify-center text-xs text-muted-foreground pt-2"
      >
        <FileText className="h-3.5 w-3.5" /> Baixar carnê em PDF (em breve)
        <Download className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
