import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Box } from "lucide-react";
import { toast } from "sonner";

/** Estrutura devolvida pela rota pública /api/public/cto/$token. */
type PortaLinha = {
  porta: number;
  status: "livre" | "ocupada";
  cliente: string | null;
};

type CtoPublica = {
  cto: { nome: string; portas_totais: number; status: string };
  portas: PortaLinha[];
  resumo: { total: number; ocupadas: number; livres: number };
  atualizado_em: string;
};

export const Route = createFileRoute("/cto/$token")({
  head: () => ({
    meta: [
      { title: "Mapa de Portas da CTO — Dominion Net" },
      {
        name: "description",
        content:
          "Consulta rápida das portas livres e ocupadas de uma CTO da rede FTTH da Dominion Net.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Mapa de Portas da CTO — Dominion Net" },
      {
        property: "og:description",
        content: "Portas livres e ocupadas da CTO, atualizadas em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CtoPublicaPage,
});

function CtoPublicaPage() {
  const { token } = Route.useParams();

  const q = useQuery({
    queryKey: ["cto-publica", token],
    // Sempre buscar do servidor: o técnico precisa do estado atual da caixa.
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<CtoPublica> => {
      const res = await fetch(`/api/public/cto/${encodeURIComponent(token)}`, {
        headers: { accept: "application/json" },
      });
      const body = (await res.json()) as CtoPublica & { error?: string };
      if (!res.ok) throw new Error(body?.error ?? "Falha ao carregar a CTO");
      return body;
    },
  });

  async function baixarPdf() {
    if (!q.data) return;
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const { cto, portas, resumo } = q.data;

      doc.setFillColor(10, 22, 40);
      doc.rect(0, 0, 210, 22, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text(`CTO ${cto.nome}`, 14, 14);
      doc.setFontSize(9);
      doc.text("Dominion Net Telecom", 196, 14, { align: "right" });

      doc.setTextColor(10, 22, 40);
      let y = 34;
      doc.setFontSize(10);
      doc.setFillColor(233, 238, 245);
      doc.rect(14, y - 6, 182, 8, "F");
      doc.text("Porta", 18, y);
      doc.text("Status", 45, y);
      doc.text("Cliente", 85, y);
      y += 8;

      portas.forEach((p) => {
        if (y > 275) {
          doc.addPage();
          y = 24;
        }
        doc.setFontSize(10);
        doc.text(String(p.porta).padStart(2, "0"), 18, y);
        if (p.status === "ocupada") doc.setTextColor(190, 30, 30);
        else doc.setTextColor(15, 120, 70);
        doc.text(p.status === "ocupada" ? "Ocupada" : "Livre", 45, y);
        doc.setTextColor(10, 22, 40);
        doc.text(p.cliente ?? "—", 85, y);
        y += 7;
      });

      y += 6;
      doc.setFontSize(11);
      doc.text("Resumo:", 14, y);
      y += 6;
      doc.setFontSize(10);
      doc.text(`Portas livres: ${resumo.livres}`, 18, y);
      y += 6;
      doc.text(`Portas ocupadas: ${resumo.ocupadas}`, 18, y);
      y += 8;
      doc.setFontSize(9);
      doc.setTextColor(90, 100, 115);
      doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, y);

      doc.save(`CTO-${cto.nome.replace(/\s+/g, "-")}.pdf`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar o PDF");
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto w-full max-w-lg space-y-4">
        <header className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Box className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-foreground">
              {q.data ? `CTO ${q.data.cto.nome}` : "CTO"}
            </h1>
            <p className="text-xs text-muted-foreground">Mapa de portas · Dominion Net</p>
          </div>
        </header>

        {q.isLoading && (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Carregando portas…
          </div>
        )}

        {q.isError && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-center text-sm text-destructive">
            {(q.error as Error).message}
          </div>
        )}

        {q.data && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-xs text-muted-foreground">Portas livres</div>
                <div className="text-2xl font-bold text-emerald-500">{q.data.resumo.livres}</div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-xs text-muted-foreground">Portas ocupadas</div>
                <div className="text-2xl font-bold text-red-500">{q.data.resumo.ocupadas}</div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="w-16 p-3 text-left">Porta</th>
                    <th className="w-28 p-3 text-left">Status</th>
                    <th className="p-3 text-left">Cliente</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.portas.map((p) => (
                    <tr key={p.porta} className="border-t border-border">
                      <td className="p-3 font-mono">{String(p.porta).padStart(2, "0")}</td>
                      <td className="p-3">
                        <span
                          className={
                            p.status === "ocupada"
                              ? "font-medium text-red-500"
                              : "font-medium text-emerald-500"
                          }
                        >
                          ● {p.status === "ocupada" ? "Ocupada" : "Livre"}
                        </span>
                      </td>
                      <td className="p-3 text-foreground">{p.cliente ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <Button onClick={baixarPdf} className="flex-1">
                <Download className="h-4 w-4" /> Baixar PDF
              </Button>
              <Button variant="outline" onClick={() => q.refetch()} disabled={q.isFetching}>
                <RefreshCw className={q.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Atualizado em {new Date(q.data.atualizado_em).toLocaleString("pt-BR")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
