import { useEffect, useState } from "react";
import QRCodeLib from "qrcode";
import { Copy, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { clienteFetch } from "@/lib/cliente-auth";
import { formatBRL, formatDate } from "@/lib/status-utils";

type ParcelaPix = {
  id: string;
  valor: number;
  data_vencimento: string;
  status: string;
  pix_brcode: string | null;
};

export interface PixQrCardProps {
  /** Título exibido no topo do cartão. */
  titulo?: string;
  /** Renderiza o QR já aberto, sem exigir clique. */
  aberto?: boolean;
  className?: string;
}

/**
 * Cartão de pagamento com QR Code Pix da próxima fatura em aberto.
 * Busca os dados por conta própria para poder ser reutilizado em qualquer
 * tela da Central do Cliente sem acoplar estado ao componente pai.
 */
export function PixQrCard({ titulo = "Pagar com Pix", aberto = true, className }: PixQrCardProps) {
  const [parcela, setParcela] = useState<ParcelaPix | null>(null);
  const [qr, setQr] = useState<string>("");
  const [visivel, setVisivel] = useState(aberto);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    clienteFetch<{ parcelas: ParcelaPix[] }>("/api/public/cliente/financeiro")
      .then((r) => {
        if (!ativo) return;
        const abertas = (r.parcelas ?? []).filter(
          (p) => p.status !== "pago" && p.status !== "cancelado",
        );
        setParcela(abertas[0] ?? null);
      })
      .catch(() => {
        if (ativo) setParcela(null);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!parcela?.pix_brcode || !visivel) return;
    let ativo = true;
    QRCodeLib.toDataURL(parcela.pix_brcode, { width: 300, margin: 1 })
      .then((d) => {
        if (ativo) setQr(d);
      })
      .catch(() => {
        if (ativo) setQr("");
      });
    return () => {
      ativo = false;
    };
  }, [parcela, visivel]);

  if (carregando) return null;

  if (!parcela || !parcela.pix_brcode) {
    return (
      <Card className={className}>
        <CardContent className="p-4 text-sm text-muted-foreground flex items-center gap-2">
          <QrCode className="h-4 w-4 shrink-0" />
          Nenhuma fatura em aberto para pagamento 🎉
        </CardContent>
      </Card>
    );
  }

  const brcode = parcela.pix_brcode;

  return (
    <Card className={`border-primary/40 bg-primary/5 ${className ?? ""}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{titulo}</div>
            <div className="text-xl font-bold">{formatBRL(Number(parcela.valor))}</div>
            <div className="text-xs text-muted-foreground">
              Vencimento: {formatDate(parcela.data_vencimento)}
            </div>
          </div>
          <QrCode className="h-6 w-6 text-primary shrink-0" />
        </div>

        {visivel && qr && (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-border/60 bg-background/70 p-3">
            <img src={qr} alt="QR Code Pix para pagamento da fatura" className="h-48 w-48 rounded" />
            <p className="text-[11px] text-muted-foreground text-center">
              Abra o app do banco, escolha Pix e aponte a câmera.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setVisivel((v) => !v)}>
            {visivel ? "Ocultar QR" : "Mostrar QR Code"}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(brcode);
              toast.success("Código Pix copiado!");
            }}
          >
            <Copy className="h-3.5 w-3.5 mr-1" /> Copia e Cola
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
