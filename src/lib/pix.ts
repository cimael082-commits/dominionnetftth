// Gerador de BR Code Pix estático (EMV / QR Code Pix)
// Formato oficial do Banco Central do Brasil.

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function sanitize(v: string, max: number): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 .,\-_@]/g, "")
    .slice(0, max)
    .trim();
}

export interface PixPayloadInput {
  chave: string;
  beneficiario: string;
  cidade: string;
  valor?: number;
  txid?: string;
  descricao?: string;
}

export function gerarPixBRCode({
  chave,
  beneficiario,
  cidade,
  valor,
  txid = "***",
  descricao,
}: PixPayloadInput): string {
  const merchantAccount = tlv("00", "br.gov.bcb.pix") + tlv("01", chave.trim()) +
    (descricao ? tlv("02", sanitize(descricao, 72)) : "");

  const payload =
    tlv("00", "01") +
    tlv("01", "11") + // 11 = QR estático reutilizável
    tlv("26", merchantAccount) +
    tlv("52", "0000") +
    tlv("53", "986") +
    (valor && valor > 0 ? tlv("54", valor.toFixed(2)) : "") +
    tlv("58", "BR") +
    tlv("59", sanitize(beneficiario, 25) || "BENEFICIARIO") +
    tlv("60", sanitize(cidade, 15) || "CIDADE") +
    tlv("62", tlv("05", sanitize(txid, 25) || "***"));

  const toCRC = payload + "6304";
  return toCRC + crc16(toCRC);
}
