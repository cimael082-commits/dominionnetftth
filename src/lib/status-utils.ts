export type ClienteStatus = "ativo" | "bloqueado" | "cancelado" | "inadimplente";
export type ParcelaStatus = "pago" | "pendente" | "vencido" | "cancelado";

export const clienteStatusMeta: Record<
  ClienteStatus,
  { label: string; dot: string; badge: string }
> = {
  ativo: {
    label: "Ativo",
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  inadimplente: {
    label: "Inadimplente",
    dot: "bg-red-500",
    badge: "bg-red-500/15 text-red-300 border-red-500/30",
  },
  bloqueado: {
    label: "Bloqueado",
    dot: "bg-blue-500",
    badge: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  },
  cancelado: {
    label: "Cancelado",
    dot: "bg-zinc-500",
    badge: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  },
};

export const parcelaStatusMeta: Record<
  ParcelaStatus,
  { label: string; dot: string; badge: string }
> = {
  pago: {
    label: "Pago",
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  pendente: {
    label: "Pendente",
    dot: "bg-amber-400",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  vencido: {
    label: "Vencido",
    dot: "bg-red-500",
    badge: "bg-red-500/15 text-red-300 border-red-500/30",
  },
  cancelado: {
    label: "Cancelado",
    dot: "bg-zinc-500",
    badge: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  },
};

export function formatBRL(v: number | string | null | undefined): string {
  const n = typeof v === "string" ? parseFloat(v) : v ?? 0;
  return (n ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d + (d.length === 10 ? "T00:00:00" : "")) : d;
  return date.toLocaleDateString("pt-BR");
}
