import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Search, MapPin, Phone, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { geocodeAddress } from "@/lib/geocode.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clienteStatusMeta, formatBRL, type ClienteStatus } from "@/lib/status-utils";
import { EditClienteDialog } from "@/components/EditClienteDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Dominion Net" }] }),
  component: ClientesPage,
});

function useClientes(search: string) {
  return useQuery({
    queryKey: ["clientes", search],
    queryFn: async () => {
      let q = supabase.from("clientes").select("*").order("nome");
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(
          `nome.ilike.${s},cpf_cnpj.ilike.${s},telefone.ilike.${s},endereco.ilike.${s},bairro.ilike.${s}`,
        );
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

function ClientesPage() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { data, isLoading } = useClientes(search);
  const [editing, setEditing] = useState<null | Parameters<typeof EditClienteDialog>[0]["cliente"]>(null);

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground mt-1">
            {data?.length ?? 0} cliente(s) cadastrado(s)
          </p>
        </div>
        <NovoClienteDialog />
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nome, CPF, telefone, endereço, bairro..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => {
            const meta = clienteStatusMeta[c.status as ClienteStatus];
            return (
              <div
                key={c.id}
                onClick={() => navigate({ to: "/clientes/$id", params: { id: c.id } })}
                className="block cursor-pointer"
              >
                <Card className="p-4 hover:border-primary/60 hover:bg-accent/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{c.nome}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {c.cpf_cnpj || "Sem CPF"} · {c.plano || "Sem plano"}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${meta.badge}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {c.telefone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3" /> {c.telefone}
                      </div>
                    )}
                    {(c.endereco || c.bairro) && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {[c.endereco, c.bairro].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      Venc. dia {c.dia_vencimento}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-primary">
                        {formatBRL(c.valor_mensalidade)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate({ to: "/clientes/$id", params: { id: c.id }, search: { edit: 1 } });
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
                      >
                        <Pencil className="h-3 w-3" /> Editar
                      </button>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Nenhum cliente encontrado.</p>
        </Card>
      )}
    </div>
  );
}

function NovoClienteDialog() {
  const qc = useQueryClient();
  const geocode = useServerFn(geocodeAddress);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    cpf_cnpj: "",
    telefone: "",
    whatsapp: "",
    email: "",
    endereco: "",
    bairro: "",
    cidade: "",
    cep: "",
    plano: "",
    valor_mensalidade: "",
    dia_vencimento: "10",
    login_pppoe: "",
    senha_pppoe: "",
    ssid_wifi: "",
    senha_wifi: "",
    status: "ativo" as ClienteStatus,
    observacoes: "",
    latitude: "",
    longitude: "",
  });


  const mut = useMutation({
    mutationFn: async () => {
      let lat: number | null = form.latitude ? parseFloat(form.latitude) : null;
      let lng: number | null = form.longitude ? parseFloat(form.longitude) : null;
      if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
        lat = null;
        lng = null;
        const addrParts = [form.endereco, form.bairro, form.cidade, form.cep].filter(Boolean);
        if (addrParts.length >= 2) {
          try {
            const geo = await geocode({ data: { address: addrParts.join(", ") } });
            if (geo) { lat = geo.lat; lng = geo.lng; }
          } catch {
            // geocoding is best-effort; ignore
          }
        }
      }
      const { latitude: _lat, longitude: _lng, ...rest } = form;
      void _lat; void _lng;
      const { error } = await supabase.from("clientes").insert({
        ...rest,
        valor_mensalidade: parseFloat(form.valor_mensalidade) || 0,
        dia_vencimento: parseInt(form.dia_vencimento) || 10,
        latitude: lat,
        longitude: lng,
      });
      if (error) throw error;

    },
    onSuccess: () => {
      toast.success("Cliente cadastrado!");
      qc.invalidateQueries({ queryKey: ["clientes"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      setForm({ ...form, nome: "", cpf_cnpj: "", telefone: "" });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Novo cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
          <DialogDescription>Cadastre um novo assinante.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.nome.trim()) return toast.error("Nome é obrigatório");
            mut.mutate();
          }}
          className="grid grid-cols-2 gap-3"
        >
          <Field label="Nome *" col={2}><Input value={form.nome} onChange={(e) => set("nome", e.target.value)} required /></Field>
          <Field label="CPF / CNPJ"><Input value={form.cpf_cnpj} onChange={(e) => set("cpf_cnpj", e.target.value)} /></Field>
          <Field label="Telefone"><Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} /></Field>
          <Field label="WhatsApp"><Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} /></Field>
          <Field label="E-mail"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Endereço" col={2}><Input value={form.endereco} onChange={(e) => set("endereco", e.target.value)} /></Field>
          <Field label="Bairro"><Input value={form.bairro} onChange={(e) => set("bairro", e.target.value)} /></Field>
          <Field label="Cidade"><Input value={form.cidade} onChange={(e) => set("cidade", e.target.value)} /></Field>
          <Field label="CEP"><Input value={form.cep} onChange={(e) => set("cep", e.target.value)} /></Field>
          <Field label="Plano"><Input value={form.plano} onChange={(e) => set("plano", e.target.value)} placeholder="ex: 500 MEGA" /></Field>
          <Field label="Mensalidade (R$) *"><Input type="number" step="0.01" value={form.valor_mensalidade} onChange={(e) => set("valor_mensalidade", e.target.value)} required /></Field>
          <Field label="Dia vencimento"><Input type="number" min={1} max={31} value={form.dia_vencimento} onChange={(e) => set("dia_vencimento", e.target.value)} /></Field>
          <Field label="Login PPPoE"><Input value={form.login_pppoe} onChange={(e) => set("login_pppoe", e.target.value)} /></Field>
          <Field label="Senha PPPoE"><Input value={form.senha_pppoe} onChange={(e) => set("senha_pppoe", e.target.value)} /></Field>
          <Field label="SSID Wi-Fi"><Input value={form.ssid_wifi} onChange={(e) => set("ssid_wifi", e.target.value)} /></Field>
          <Field label="Senha Wi-Fi"><Input value={form.senha_wifi} onChange={(e) => set("senha_wifi", e.target.value)} /></Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="bloqueado">Bloqueado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
                <SelectItem value="inadimplente">Inadimplente</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Localização (lat, lng)" col={2}>
            <div className="flex gap-2">
              <Input
                placeholder="Cole aqui: -9.66580, -35.73530 (opcional — use Localizar no Mapa)"
                value={form.latitude && form.longitude ? `${form.latitude}, ${form.longitude}` : ""}
                onChange={(e) => {
                  const parts = e.target.value.split(/[,\s]+/).filter(Boolean);
                  set("latitude", parts[0] ?? "");
                  set("longitude", parts[1] ?? "");
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    const txt = await navigator.clipboard.readText();
                    const parts = txt.trim().split(/[,\s]+/).filter(Boolean);
                    if (parts.length >= 2) {
                      set("latitude", parts[0]);
                      set("longitude", parts[1]);
                      toast.success("Coordenadas coladas");
                    } else toast.error("Formato inválido");
                  } catch { toast.error("Não foi possível ler a área de transferência"); }
                }}
              >
                Colar
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Se vazio, será geocodificado automaticamente pelo endereço.
            </p>
          </Field>
          <Field label="Observações" col={2}>
            <Textarea rows={2} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
          </Field>


          <DialogFooter className="col-span-2 mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, col = 1 }: { label: string; children: React.ReactNode; col?: 1 | 2 }) {
  return (
    <div className={`space-y-1.5 ${col === 2 ? "col-span-2" : ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
