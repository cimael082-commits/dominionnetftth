/**
 * Utilitários para abertura de conversa no WhatsApp.
 *
 * Regras de normalização (Brasil):
 * - Remove tudo que não for dígito.
 * - Remove o prefixo internacional "00" quando presente.
 * - Acrescenta o DDI 55 quando o número tem 10 ou 11 dígitos (DDD + número).
 */
export function normalizeWhatsappNumber(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;

  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) digits = digits.slice(2);

  // DDD + 8/9 dígitos -> falta o DDI brasileiro
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;

  // Números válidos internacionais têm entre 12 e 15 dígitos com DDI
  if (digits.length < 12 || digits.length > 15) return null;

  return digits;
}

/** Retorna o primeiro número utilizável entre WhatsApp e telefone. */
export function pickWhatsappNumber(cliente: {
  whatsapp?: string | null;
  telefone?: string | null;
}): string | null {
  return (
    normalizeWhatsappNumber(cliente.whatsapp) ??
    normalizeWhatsappNumber(cliente.telefone)
  );
}

/** Monta a URL wa.me com mensagem opcional. */
export function whatsappUrl(number: string, message?: string): string {
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Abre a conversa em nova aba. Retorna false quando o número é inválido. */
export function openWhatsapp(
  cliente: { whatsapp?: string | null; telefone?: string | null },
  message?: string,
): boolean {
  const number = pickWhatsappNumber(cliente);
  if (!number) return false;
  window.open(whatsappUrl(number, message), "_blank", "noopener,noreferrer");
  return true;
}
