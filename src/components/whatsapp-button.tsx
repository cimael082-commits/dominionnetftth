import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { openWhatsapp, pickWhatsappNumber } from "@/lib/whatsapp";

export interface WhatsappButtonProps
  extends Omit<React.ComponentProps<"button">, "onClick"> {
  cliente: { nome?: string | null; whatsapp?: string | null; telefone?: string | null };
  /** Mensagem pré-preenchida na conversa. */
  message?: string;
  /** Exibe o rótulo "WhatsApp" ao lado do ícone. */
  showLabel?: boolean;
}

/**
 * Botão que abre a conversa do cliente no WhatsApp.
 * Fica desabilitado (com aviso) quando o cliente não possui número válido.
 */
export function WhatsappButton({
  cliente,
  message,
  showLabel = false,
  className,
  ...rest
}: WhatsappButtonProps) {
  const hasNumber = pickWhatsappNumber(cliente) !== null;

  return (
    <button
      type="button"
      aria-label={`Abrir conversa no WhatsApp com ${cliente.nome ?? "cliente"}`}
      title={hasNumber ? "Conversar no WhatsApp" : "Cliente sem telefone cadastrado"}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!openWhatsapp(cliente, message)) {
          toast.error("Número de WhatsApp inválido ou não cadastrado");
        }
      }}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors",
        hasNumber
          ? "border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10"
          : "border-border text-muted-foreground opacity-60",
        className,
      )}
      {...rest}
    >
      <MessageCircle className="h-3.5 w-3.5" />
      {showLabel ? "WhatsApp" : null}
    </button>
  );
}
