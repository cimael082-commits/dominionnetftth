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
  /** URL da Central do Cliente impressa nas orientações finais. */
  centralUrl?: string;
  /** Senha padrão de primeiro acesso à Central do Cliente. */
  senhaPadrao?: string;
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

  await desenharInstrucoes(doc, input);

  return doc.output("blob");
}

/**
 * Página final com as orientações de acesso à Central do Cliente.
 * Impressa junto ao carnê para que o assinante receba tudo de uma vez.
 */
async function desenharInstrucoes(doc: jsPDF, input: CarneInput) {
  const central =
    input.centralUrl ??
    (typeof window !== "undefined" ? `${window.location.origin}/cliente/login` : "");
  const senha = input.senhaPadrao ?? "123";
  const telefone = input.cliente.telefone?.trim() || "—";

  doc.addPage();
  const x = 14;
  const w = 182;
  let y = 20;

  doc.setFillColor(...NAVY);
  doc.roundedRect(x, y, w, 14, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("CENTRAL DO CLIENTE — COMO ACESSAR", x + w / 2, y + 9, { align: "center" });

  y += 22;
  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const passos = [
    "1. Abra o navegador do seu celular ou computador.",
    "2. Acesse o link da Central do Cliente indicado abaixo.",
    "3. Informe seu CPF ou o telefone cadastrado.",
    `4. Digite a senha padrao: ${senha}`,
    "5. Pronto! Veja faturas, QR Code Pix, plano, Wi-Fi e avisos.",
  ];
  for (const linha of passos) {
    doc.text(linha, x + 2, y);
    y += 7;
  }

  y += 4;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, 40, 3, 3, "S");

  const linhas: [string, string][] = [
    ["Link de acesso", central || "Consulte o suporte"],
    ["Telefone cadastrado", telefone],
    ["Senha padrao", senha],
  ];
  let ly = y + 10;
  for (const [rotulo, valor] of linhas) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text(`${rotulo}:`, x + 5, ly);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT);
    doc.text(valor, x + 48, ly);
    ly += 11;
  }

  y += 48;
  if (central) {
    try {
      const qr = await QRCode.toDataURL(central, { margin: 0, width: 300 });
      doc.addImage(qr, "PNG", x + w / 2 - 20, y, 40, 40);
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text("Aponte a camera para abrir a Central", x + w / 2, y + 45, { align: "center" });
    } catch {
      /* ignore */
    }
    y += 52;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(
    `Suporte ${input.empresa.nome_empresa}: ${input.empresa.telefone ?? ""}`.trim(),
    x + w / 2,
    y + 6,
    { align: "center" },
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    "Guarde este comprovante. Por seguranca, altere sua senha apos o primeiro acesso.",
    x + w / 2,
    y + 12,
    { align: "center" },
  );
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

function centralLink(input: CarneInput) {
  return (
    input.centralUrl ??
    (typeof window !== "undefined" ? `${window.location.origin}/cliente/login` : "")
  );
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
  const topH = 30;
  const leftW = 74;

  const fx = x + 4;
  const fy = y + 4;
  const fieldW = 30;
  const fieldH = 7;
  const gapX = 4;
  const gapY = 3;

  const docNum = (input.cliente.cpf_cnpj ?? "").replace(/\D/g, "").slice(-5) || "—";

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
  const logoW = 28;
  drawLogo(doc, logoX, y + 3, logoW, topH - 6);

  // Bloco direito: nome empresa + descrição + telefone
  const rx = logoX + logoW + 4;
  const rw = x + w - rx - 4;
  const tel = input.empresa.telefone ?? "(82) 99382-3246";

  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(input.empresa.nome_empresa, rx, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT);
  doc.text("Internet Fibra Óptica Mais bem avaliada em Maceió", rx, y + 13);
  doc.text("Qualidade Garantida Velocidade sem Limites.", rx, y + 16.5);

  doc.setFillColor(...BLUE_LIGHT);
  doc.roundedRect(rx, y + 19, rw, 8, 4, 4, "F");
  drawIcon(doc, rx + 5, y + 23, 2.6, BLUE, "T");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`Telefone: ${tel}`, rx + 9.5, y + 23.8);

  // Linha divisória horizontal
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.4);
  doc.line(x + 2, y + topH + 1, x + w - 2, y + topH + 1);

  // ================= INFERIOR =================
  const bY = y + topH + 4;

  // ---------- Coluna 1: dados do cliente ----------
  const infoX = x + 4;
  const iconR = 2.8;
  let iy = bY + 1;

  const linhaInfo = (
    rotulo: string,
    valor: string,
    cor: [number, number, number],
    glyph: string,
    corRotulo: [number, number, number] = NAVY,
  ) => {
    drawIcon(doc, infoX + iconR, iy + iconR, iconR, cor, glyph);
    doc.setTextColor(...corRotulo);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(rotulo, infoX + iconR * 2 + 3, iy + 2.2);
    if (valor) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...TEXT);
      doc.text(valor, infoX + iconR * 2 + 3, iy + 6);
    }
    iy += 12;
  };

  linhaInfo("NOME", input.cliente.nome.slice(0, 32), BLUE, "P");
  linhaInfo("ENDEREÇO", (input.cliente.endereco ?? "").slice(0, 34), BLUE, "L");
  drawIcon(doc, infoX + iconR, iy + iconR, iconR, GREEN_WA, "W");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("SUPORTE", infoX + iconR * 2 + 3, iy + 2.2);
  doc.setTextColor(...BLUE);
  doc.setFontSize(8);
  doc.text(tel, infoX + iconR * 2 + 3, iy + 6);
  iy += 12;

  drawIcon(doc, infoX + iconR, iy + iconR, iconR, BLUE, "$");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("PAGUE COM PIX", infoX + iconR * 2 + 3, iy + 2.2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...TEXT);
  doc.text("Pode fazer o pagamento", infoX + iconR * 2 + 3, iy + 5.5);
  doc.text(`pelo Pix ${input.empresa.pix_chave}`, infoX + iconR * 2 + 3, iy + 8.5);

  // ---------- QR Code Pix (inalterado na geração) ----------
  const brcode = gerarPixBRCode({
    chave: input.empresa.pix_chave,
    beneficiario: input.empresa.pix_beneficiario,
    cidade: input.empresa.pix_cidade,
    valor: parcela.valor,
    descricao: `${input.cliente.nome} P${parcela.numero}/${parcela.total}`,
    txid: `P${parcela.numero}${Date.now().toString().slice(-6)}`,
  });

  let qrPix = "";
  try {
    qrPix = await QRCode.toDataURL(brcode, {
      margin: 0,
      width: 400,
      color: { dark: "#000000", light: "#FFFFFF" },
    });
  } catch {
    /* ignore */
  }

  const col2X = x + 58;
  const qrSize = 24;
  const qrY = bY + 2;
  if (qrPix) doc.addImage(qrPix, "PNG", col2X, qrY, qrSize, qrSize);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("ESCANEIE O QR CODE", col2X + qrSize / 2, qrY + qrSize + 3.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("para pagar com Pix", col2X + qrSize / 2, qrY + qrSize + 6.8, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text(input.empresa.pix_chave, col2X + qrSize / 2, qrY + qrSize + 10, { align: "center" });

  // ---------- Coluna 3: bloco PAGUE COM PIX com QR ----------
  const col3X = x + 90;
  doc.setDrawColor(...BLUE_LIGHT);
  doc.setLineWidth(0.3);
  doc.line(col3X - 5, bY, col3X - 5, y + h - 3);

  drawIcon(doc, col3X + 4, bY + 4, 4, BLUE, "$");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("PAGUE COM PIX", col3X + 10, bY + 5.2);
  if (qrPix) doc.addImage(qrPix, "PNG", col3X + 3, bY + 10, qrSize, qrSize);
  doc.setFontSize(7);
  doc.text("ESCANEIE O QR CODE", col3X + 3 + qrSize / 2, bY + 10 + qrSize + 3.5, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("para pagar com Pix", col3X + 3 + qrSize / 2, bY + 10 + qrSize + 6.8, {
    align: "center",
  });

  // ---------- Coluna 4: Central do Cliente ----------
  const col4X = x + 122;
  const col4W = x + w - 4 - col4X;
  doc.setDrawColor(...BLUE_LIGHT);
  doc.line(col4X - 5, bY, col4X - 5, y + h - 3);

  drawIcon(doc, col4X + 3.5, bY + 4, 3.5, BLUE, "P");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("CENTRAL DO CLIENTE", col4X + 9, bY + 5.2);

  const senha = input.senhaPadrao ?? "123";
  const passos: string[][] = [
    ["Acesse o link da Central", "do Cliente indicado abaixo."],
    ["Informe seu CPF ou", "telefone cadastrado."],
    [`Digite a senha padrão: ${senha}`],
    ["Pronto! Veja faturas,", "plano, Wi-Fi e avisos."],
  ];
  let py = bY + 12;
  passos.forEach((linhas, i) => {
    drawIcon(doc, col4X + 2.5, py, 2.5, BLUE, String(i + 1));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...TEXT);
    linhas.forEach((l, j) => doc.text(l, col4X + 7, py - 0.8 + j * 3.2));
    py += linhas.length > 1 ? 8 : 6.5;
  });

  // QR da Central do Cliente (destino: portal do assinante)
  const central = centralLink(input);
  if (central) {
    try {
      const qrCentral = await QRCode.toDataURL(central, {
        margin: 0,
        width: 400,
        color: { dark: "#1E3A8A", light: "#FFFFFF" },
      });
      const cqS = 21;
      const cqX = col4X + col4W - cqS - 1;
      doc.addImage(qrCentral, "PNG", cqX, bY + 11, cqS, cqS);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(...MUTED);
      doc.text("Aponte a câmera para", cqX + cqS / 2, bY + 11 + cqS + 3, { align: "center" });
      doc.text("abrir a Central", cqX + cqS / 2, bY + 11 + cqS + 5.8, { align: "center" });
    } catch {
      /* ignore */
    }

    // Faixa com o endereço da Central
    const faixaY = y + h - 12;
    doc.setFillColor(...BLUE_LIGHT);
    doc.roundedRect(col4X, faixaY, col4W, 9, 4, 4, "F");
    drawIcon(doc, col4X + 5, faixaY + 4.5, 3, BLUE, "@");
    doc.setTextColor(...BLUE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const linkTexto = central.replace(/^https?:\/\//, "");
    doc.text(linkTexto, col4X + 10, faixaY + 5.8, { maxWidth: col4W - 13 });
  }

  // Rodapé mini (parcela n/total)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(`Parcela ${parcela.numero}/${parcela.total}`, x + w - 4, y + h - 1.5, {
    align: "right",
  });
}

