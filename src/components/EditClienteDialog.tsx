import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { ClienteStatus } from "@/lib/status-utils";
import { EquipamentosPicker } from "@/components/equipamentos-picker";

type Cliente = {
  id: string;
  nome: string;
  cpf_cnpj: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  cep: string | null;
  plano: string | null;
  valor_mensalidade: number;
  dia_vencimento: number;
  login_pppoe: string | null;
  senha_pppoe: string | null;
  senha_reset?: string | null;
  equipamentos?: string[] | null;
  equipamentos_obs?: string | null;
  ssid_wifi: string | null;
  senha_wifi: string | null;
  status: string;
  observacoes: string | null;
  latitude: number | null;
  longitude: number | null;
};

export function EditClienteDialog({
  cliente,
  open,
  onOpenChange,
}: {
  cliente: Cliente | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [equipamentos, setEquipamentos] = useState<string[]>([]);

  useEffect(() => {
    if (cliente && open) {
      setForm({
        nome: cliente.nome ?? "",
        cpf_cnpj: cliente.cpf_cnpj ?? "",
        telefone: cliente.telefone ?? "",
        whatsapp: cliente.whatsapp ?? "",
        email: cliente.email ?? "",
        endereco: cliente.endereco ?? "",
        bairro: cliente.bairro ?? "",
        cidade: cliente.cidade ?? "",
        cep: cliente.cep ?? "",
        plano: cliente.plano ?? "",
        valor_mensalidade: String(cliente.valor_mensalidade ?? 0),
        dia_vencimento: String(cliente.dia_vencimento ?? 10),
        login_pppoe: cliente.login_pppoe ?? "",
        
        senha_reset: cliente.senha_reset ?? "",
        equipamentos_obs: cliente.equipamentos_obs ?? "",
        ssid_wifi: cliente.ssid_wifi ?? "",
        senha_wifi: cliente.senha_wifi ?? "",
        status: cliente.status ?? "ativo",
        observacoes: cliente.observacoes ?? "",
        latitude: cliente.latitude != null ? String(cliente.latitude) : "",
        longitude: cliente.longitude != null ? String(cliente.longitude) : "",
      });
      setEquipamentos(cliente.equipamentos ?? []);
    }
  }, [cliente, open]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!cliente) return;
      const patch: Record<string, unknown> = {
        nome: form.nome,
        cpf_cnpj: form.cpf_cnpj || null,
        telefone: form.telefone || null,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        endereco: form.endereco || null,
        bairro: form.bairro || null,
        cidade: form.cidade || null,
        cep: form.cep || null,
        plano: form.plano || null,
        valor_mensalidade: parseFloat(form.valor_mensalidade) || 0,
        dia_vencimento: parseInt(form.dia_vencimento) || 10,
        login_pppoe: form.login_pppoe || null,
        
        senha_reset: form.senha_reset || null,
        equipamentos,
        equipamentos_obs: form.equipamentos_obs || null,
        ssid_wifi: form.ssid_wifi || null,
        senha_wifi: form.senha_wifi || null,
        status: form.status as ClienteStatus,
        observacoes: form.observacoes || null,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      };
      const { error } = await supabase
        .from("clientes")
        .update(patch as never)
        .eq("id", cliente.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente atualizado com sucesso!");
      qc.invalidateQueries({ queryKey: ["clientes"] });
      qc.invalidateQueries({ queryKey: ["cliente", cliente?.id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  if (!cliente) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar cliente</DialogTitle>
          <DialogDescription>Atualize as informações do assinante.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.nome?.trim()) return toast.error("Nome é obrigatório");
            mut.mutate();
          }}
          className="grid grid-cols-2 gap-3"
        >
          <F label="Nome *" col={2}><Input value={form.nome ?? ""} onChange={(e) => set("nome", e.target.value)} required /></F>
          <F label="CPF / CNPJ"><Input value={form.cpf_cnpj ?? ""} onChange={(e) => set("cpf_cnpj", e.target.value)} /></F>
          <F label="Telefone"><Input value={form.telefone ?? ""} onChange={(e) => set("telefone", e.target.value)} /></F>
          <F label="WhatsApp"><Input value={form.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} /></F>
          <F label="E-mail"><Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} /></F>
          <F label="Endereço" col={2}><Input value={form.endereco ?? ""} onChange={(e) => set("endereco", e.target.value)} /></F>
          <F label="Bairro"><Input value={form.bairro ?? ""} onChange={(e) => set("bairro", e.target.value)} /></F>
          <F label="Cidade"><Input value={form.cidade ?? ""} onChange={(e) => set("cidade", e.target.value)} /></F>
          <F label="CEP"><Input value={form.cep ?? ""} onChange={(e) => set("cep", e.target.value)} /></F>
          <F label="Plano"><Input value={form.plano ?? ""} onChange={(e) => set("plano", e.target.value)} /></F>
          <F label="Mensalidade (R$)"><Input type="number" step="0.01" value={form.valor_mensalidade ?? ""} onChange={(e) => set("valor_mensalidade", e.target.value)} /></F>
          <F label="Dia vencimento"><Input type="number" min={1} max={31} value={form.dia_vencimento ?? ""} onChange={(e) => set("dia_vencimento", e.target.value)} /></F>
          <F label="Login PPPoE"><Input value={form.login_pppoe ?? ""} onChange={(e) => set("login_pppoe", e.target.value)} /></F>
          
          <F label="Senha de reset"><Input value={form.senha_reset ?? ""} onChange={(e) => set("senha_reset", e.target.value)} placeholder="senha de reset do equipamento" /></F>
          <F label="SSID Wi-Fi"><Input value={form.ssid_wifi ?? ""} onChange={(e) => set("ssid_wifi", e.target.value)} /></F>
          <F label="Senha Wi-Fi"><Input value={form.senha_wifi ?? ""} onChange={(e) => set("senha_wifi", e.target.value)} /></F>
          <F label="Equipamentos na casa do cliente" col={2}>
            <EquipamentosPicker value={equipamentos} onChange={setEquipamentos} />
          </F>
          <F label="Observação dos equipamentos" col={2}>
            <Textarea
              rows={2}
              value={form.equipamentos_obs ?? ""}
              onChange={(e) => set("equipamentos_obs", e.target.value)}
              placeholder="Ex.: repetidor Wi-Fi, switch, ONU modelo X..."
            />
          </F>
          <F label="Status">
            <Select value={form.status ?? "ativo"} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="bloqueado">Bloqueado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
                <SelectItem value="inadimplente">Inadimplente</SelectItem>
              </SelectContent>
            </Select>
          </F>
          <F label="Latitude"><Input value={form.latitude ?? ""} onChange={(e) => set("latitude", e.target.value)} /></F>
          <F label="Longitude"><Input value={form.longitude ?? ""} onChange={(e) => set("longitude", e.target.value)} /></F>
          <F label="Observações" col={2}>
            <Textarea rows={3} value={form.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} />
          </F>

          <DialogFooter className="col-span-2 mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, children, col = 1 }: { label: string; children: React.ReactNode; col?: 1 | 2 }) {
  return (
    <div className={`space-y-1.5 ${col === 2 ? "col-span-2" : ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
