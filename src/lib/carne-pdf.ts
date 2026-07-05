import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { gerarPixBRCode } from "./pix";

export interface CarneParcela {
  numero: number;
  total: number;
  valor: number;
  vencimento: Date;
}

export interface CarneInput {
  cliente: {
    nome: string;
    cpf_cnpj?: string | null;
    endereco?: string | null;
    telefone?: string | null;
  };
  empresa: {
    nome_empresa: string;
    cnpj?: string | null;
    telefone?: string | null;
    endereco?: string | null;
    pix_chave: string;
    pix_beneficiario: string;
    pix_cidade: string;
  };
  parcelas: CarneParcela[];
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: Date) => d.toLocaleDateString("pt-BR");

export async function gerarCarnePDF(input: CarneInput): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const margin = 10;
  const boletoH = 85;
  const perPage = 3;

  for (let i = 0; i < input.parcelas.length; i++) {
    const p = input.parcelas[i];
    const idxInPage = i % perPage;
    if (i > 0 && idxInPage === 0) doc.addPage();

    const y = margin + idxInPage * (boletoH + 4);
    await desenharBoleto(doc, margin, y, pageW - margin * 2, boletoH, p, input);
  }

  return doc.output("blob");
}

async function desenharBoleto(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  parcela: CarneParcela,
  input: CarneInput,
) {
  // Borda
  doc.setDrawColor(30, 60, 120);
  doc.setLineWidth(0.4);
  doc.rect(x, y, w, h);

  // Cabeçalho colorido
  doc.setFillColor(15, 40, 71);
  doc.rect(x, y, w, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(input.empresa.nome_empresa.toUpperCase(), x + 3, y + 8);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Parcela ${parcela.numero}/${parcela.total}`,
    x + w - 3,
    y + 8,
    { align: "right" },
  );

  // Dados
  doc.setTextColor(20, 20, 30);
  doc.setFontSize(9);
  let ly = y + 17;
  doc.setFont("helvetica", "bold");
  doc.text("Cliente:", x + 3, ly);
  doc.setFont("helvetica", "normal");
  doc.text(input.cliente.nome, x + 20, ly);

  ly += 5;
  if (input.cliente.cpf_cnpj) {
    doc.setFont("helvetica", "bold");
    doc.text("CPF/CNPJ:", x + 3, ly);
    doc.setFont("helvetica", "normal");
    doc.text(input.cliente.cpf_cnpj, x + 25, ly);
    ly += 5;
  }
  if (input.cliente.endereco) {
    doc.setFont("helvetica", "bold");
    doc.text("Endereço:", x + 3, ly);
    doc.setFont("helvetica", "normal");
    doc.text(input.cliente.endereco.slice(0, 70), x + 22, ly);
    ly += 5;
  }

  // Bloco valor / vencimento
  const boxX = x + w - 55;
  doc.setDrawColor(30, 60, 120);
  doc.rect(boxX, y + 15, 52, 22);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 90);
  doc.text("VENCIMENTO", boxX + 2, y + 19);
  doc.text("VALOR", boxX + 2, y + 28);
  doc.setTextColor(15, 40, 71);
  doc.setFontSize(11);
  doc.text(fmtDate(parcela.vencimento), boxX + 2, y + 24);
  doc.text(fmtBRL(parcela.valor), boxX + 2, y + 33);

  // QR Code Pix
  const brcode = gerarPixBRCode({
    chave: input.empresa.pix_chave,
    beneficiario: input.empresa.pix_beneficiario,
    cidade: input.empresa.pix_cidade,
    valor: parcela.valor,
    descricao: `${input.cliente.nome} P${parcela.numero}/${parcela.total}`,
    txid: `P${parcela.numero}${Date.now().toString().slice(-6)}`,
  });

  try {
    const qrDataUrl = await QRCode.toDataURL(brcode, {
      margin: 0,
      width: 220,
      color: { dark: "#0F2847", light: "#FFFFFF" },
    });
    doc.addImage(qrDataUrl, "PNG", x + 3, y + h - 38, 34, 34);
  } catch {
    /* ignore */
  }

  // Texto pix
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 40, 71);
  doc.text("Pague com Pix", x + 40, y + h - 32);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 70);
  doc.text(`Chave: ${input.empresa.pix_chave}`, x + 40, y + h - 27);
  doc.text(`Beneficiário: ${input.empresa.pix_beneficiario}`, x + 40, y + h - 22);
  doc.text("Copia-e-cola:", x + 40, y + h - 17);
  doc.setFontSize(6.5);
  const lines = doc.splitTextToSize(brcode, w - 45);
  doc.text(lines.slice(0, 3), x + 40, y + h - 13);

  // Rodapé
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 130);
  doc.text(
    `Após o vencimento entre em contato com ${input.empresa.nome_empresa}.`,
    x + 3,
    y + h - 2,
  );
}
