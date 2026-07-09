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
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
};
const fmtDDMM = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

// Cores (RGB)
const NAVY: [number, number, number] = [15, 40, 71];
const BLUE: [number, number, number] = [30, 90, 170];
const BLUE_LIGHT: [number, number, number] = [220, 235, 250];
const GREEN_WA: [number, number, number] = [37, 211, 102];
const TEXT: [number, number, number] = [30, 40, 60];
const MUTED: [number, number, number] = [90, 100, 120];

export async function gerarCarnePDF(input: CarneInput): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 8;
  const boletoH = 90;
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

function drawLogo(doc: jsPDF, x: number, y: number, w: number, h: number) {
  // "dn" estilizado + "Dominion Net" abaixo
  doc.setTextColor(...BLUE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("dn", x + w / 2, y + h / 2 + 1, { align: "center", baseline: "middle" });
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text("Dominion Net", x + w / 2, y + h - 4, { align: "center" });
  doc.setFontSize(5.5);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.text("PROVEDOR DE INTERNET", x + w / 2, y + h - 1, { align: "center" });
}

function drawField(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  filled = false,
) {
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text(label, x, y);

  if (filled) {
    doc.setFillColor(...NAVY);
    doc.roundedRect(x, y + 1.2, w, h, 1.5, 1.5, "F");
    doc.setTextColor(255, 255, 255);
  } else {
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y + 1.2, w, h, 1.5, 1.5, "S");
    doc.setTextColor(...NAVY);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(value, x + w / 2, y + 1.2 + h / 2 + 0.5, { align: "center", baseline: "middle" });
}

function drawIcon(
  doc: jsPDF,
  cx: number,
  cy: number,
  r: number,
  color: [number, number, number],
  glyph: string,
) {
  doc.setFillColor(...color);
  doc.circle(cx, cy, r, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(r * 3);
  doc.text(glyph, cx, cy + 0.2, { align: "center", baseline: "middle" });
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
  // Borda externa arredondada
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, w, h, 3, 3, "S");

  // ================= TOPO =================
  const topH = 32;
  // Divisória vertical entre bloco de campos e área da empresa
  const leftW = 78;

  // Campos DOCUMENTO / VENCIMENTO / PARCELA / VALOR
  const fx = x + 4;
  const fy = y + 4;
  const fieldW = 32;
  const fieldH = 7;
  const gapX = 4;
  const gapY = 3;

  const docNum = (input.cliente.cpf_cnpj ?? "").replace(/\D/g, "").slice(-5) || "66959";

  drawField(doc, fx, fy, fieldW, fieldH, "DOCUMENTO", docNum, true);
  drawField(doc, fx + fieldW + gapX, fy, fieldW, fieldH, "VENCIMENTO", fmtDate(parcela.vencimento));
  drawField(doc, fx, fy + fieldH + gapY + 3, fieldW, fieldH, "PARCELA", fmtDDMM(parcela.vencimento));
  drawField(
    doc,
    fx + fieldW + gapX,
    fy + fieldH + gapY + 3,
    fieldW,
    fieldH,
    "VALOR",
    fmtBRL(parcela.valor),
  );

  // Divisória vertical
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.line(x + leftW, y + 3, x + leftW, y + topH);

  // Logo
  const logoX = x + leftW + 3;
  const logoY = y + 3;
  const logoW = 28;
  drawLogo(doc, logoX, logoY, logoW, topH - 6);

  // Bloco direito: nome empresa + descrição + telefone
  const rx = logoX + logoW + 3;
  const rw = x + w - rx - 4;

  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(input.empresa.nome_empresa, rx, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT);
  doc.text("Internet Fibra Óptica Mais bem avaliada em Maceió", rx, y + 13);
  doc.text("Qualidade Garantida Velocidade sem Limites.", rx, y + 17);

  // Barra azul clara com telefone
  doc.setFillColor(...BLUE_LIGHT);
  doc.roundedRect(rx, y + 20, rw, 7, 3, 3, "F");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  const tel = input.empresa.telefone ?? "(82) 98758-5338 ou (82) 99382-3246";
  doc.text(`Telefone: ${tel}  |  Suporte: ${tel}`, rx + 3, y + 24.5);

  // Linha divisória horizontal
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.line(x + 2, y + topH + 1, x + w - 2, y + topH + 1);

  // ================= INFERIOR =================
  const bY = y + topH + 4;
  const bH = h - topH - 6;

  // Coluna esquerda: NOME / ENDEREÇO / SUPORTE
  const infoX = x + 4;
  let iy = bY + 2;
  const iconR = 3;

  drawIcon(doc, infoX + iconR, iy + iconR, iconR, BLUE, "P");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("NOME", infoX + iconR * 2 + 3, iy + 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text(input.cliente.nome.slice(0, 40), infoX + iconR * 2 + 3, iy + 6);

  iy += 13;
  drawIcon(doc, infoX + iconR, iy + iconR, iconR, BLUE, "L");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("ENDEREÇO", infoX + iconR * 2 + 3, iy + 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  const end = (input.cliente.endereco ?? "").slice(0, 45);
  doc.text(end, infoX + iconR * 2 + 3, iy + 6);

  iy += 13;
  drawIcon(doc, infoX + iconR, iy + iconR, iconR, GREEN_WA, "W");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("SUPORTE", infoX + iconR * 2 + 3, iy + 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text(tel, infoX + iconR * 2 + 3, iy + 6);

  // Gerar BR Code
  const brcode = gerarPixBRCode({
    chave: input.empresa.pix_chave,
    beneficiario: input.empresa.pix_beneficiario,
    cidade: input.empresa.pix_cidade,
    valor: parcela.valor,
    descricao: `${input.cliente.nome} P${parcela.numero}/${parcela.total}`,
    txid: `P${parcela.numero}${Date.now().toString().slice(-6)}`,
  });

  let qrDataUrl = "";
  try {
    qrDataUrl = await QRCode.toDataURL(brcode, {
      margin: 0,
      width: 260,
      color: { dark: "#000000", light: "#FFFFFF" },
    });
  } catch {
    /* ignore */
  }

  const qrSize = 26;
  // QR esquerdo (com legenda "ESCANEIE O QR CODE")
  const qrLX = x + 82;
  const qrY = bY + 3;
  if (qrDataUrl) doc.addImage(qrDataUrl, "PNG", qrLX, qrY, qrSize, qrSize);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("ESCANEIE O QR CODE", qrLX + qrSize / 2, qrY + qrSize + 3, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text("para pagar com Pix", qrLX + qrSize / 2, qrY + qrSize + 6, { align: "center" });

  // Bloco PAGUE COM PIX (ícone + textos)
  const pxX = qrLX + qrSize + 6;
  drawIcon(doc, pxX + 4, bY + 7, 4, BLUE, "$");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PAGUE COM PIX", pxX + 10, bY + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT);
  doc.text("Pode fazer o pagamento", pxX + 10, bY + 10);
  doc.text(`pelo Pix ${input.empresa.pix_chave}`, pxX + 10, bY + 14);
  doc.text("ou QR Codes", pxX + 10, bY + 18);

  // QR direito (idêntico)
  const qrRX = x + w - qrSize - 4;
  if (qrDataUrl) doc.addImage(qrDataUrl, "PNG", qrRX, qrY, qrSize, qrSize);

  // Rodapé mini (parcela n/total)
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(
    `Parcela ${parcela.numero}/${parcela.total}`,
    x + w - 4,
    y + h - 1.5,
    { align: "right" },
  );
}
