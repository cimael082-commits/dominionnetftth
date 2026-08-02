import { jsPDF } from "jspdf";

export interface ReciboInput {
  empresa: { nome_empresa: string; cnpj?: string | null; telefone?: string | null; endereco?: string | null };
  cliente: { nome: string; cpf_cnpj?: string | null; endereco?: string | null };
  parcela: {
    numero?: number | null;
    total?: number | null;
    valor: number;
    vencimento: string;
    pagamento?: string | null;
    forma?: string | null;
    id: string;
  };
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
};

/** Gera um comprovante de pagamento em PDF (A4). */
export function gerarReciboPDF(input: ReciboInput): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { empresa, cliente, parcela } = input;

  doc.setFillColor(15, 40, 71);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(empresa.nome_empresa || "Dominion Net", 14, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    [empresa.cnpj ? `CNPJ: ${empresa.cnpj}` : "", empresa.telefone || "", empresa.endereco || ""]
      .filter(Boolean)
      .join("  •  "),
    14,
    20,
  );

  doc.setTextColor(30, 40, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("COMPROVANTE DE PAGAMENTO", 14, 42);

  doc.setDrawColor(200, 210, 225);
  doc.roundedRect(14, 48, 182, 62, 3, 3, "S");

  const rows: Array<[string, string]> = [
    ["Cliente", cliente.nome],
    ["CPF/CNPJ", cliente.cpf_cnpj || "—"],
    ["Endereço", cliente.endereco || "—"],
    [
      "Referência",
      parcela.numero && parcela.total ? `Parcela ${parcela.numero}/${parcela.total}` : "Mensalidade",
    ],
    ["Vencimento", fmtDate(parcela.vencimento)],
    ["Pagamento", fmtDate(parcela.pagamento)],
    ["Forma", parcela.forma || "—"],
  ];

  let y = 57;
  doc.setFontSize(10);
  for (const [label, value] of rows) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value).slice(0, 80), 60, y);
    y += 7.5;
  }

  doc.setFillColor(232, 245, 236);
  doc.roundedRect(14, 116, 182, 22, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 110, 60);
  doc.text("VALOR PAGO", 20, 125);
  doc.setFontSize(18);
  doc.text(fmtBRL(Number(parcela.valor)), 20, 134);

  doc.setTextColor(120, 130, 145);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Documento gerado eletronicamente • ID ${parcela.id}`, 14, 150);
  doc.text(
    `Emitido em ${new Date().toLocaleString("pt-BR")} — válido como comprovante de quitação.`,
    14,
    155,
  );

  return doc.output("blob");
}
