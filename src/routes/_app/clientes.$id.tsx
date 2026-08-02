import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { useState } from "react";
import {
  ArrowLeft,
  User,
  MapPin,
  Wifi,
  DollarSign,
  Check,
  X,
  Trash2,
  Save,
  Plus,
  FileText,
  KeyRound,
  RotateCcw,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { setClientePortalPassword } from "@/lib/cliente-senha.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  clienteStatusMeta,
  parcelaStatusMeta,
  formatBRL,
  formatDate,
  type ClienteStatus,
  type ParcelaStatus,
} from "@/lib/status-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/clientes/$id")({
  head: () => ({ meta: [{ title: "Cliente — Dominion Net" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ edit: s.edit === 1 || s.edit === "1" ? 1 : undefined }),
  component: ClienteDetail,
});

function ClienteDetail() {
  const { id } = Route.useParams();
  const { edit: editParam } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const cliente = useQuery({
    queryKey: ["cliente", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const parcelas = useQuery({
    queryKey: ["parcelas", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcelas")
        .select("*")
        .eq("cliente_id", id)
        .order("data_vencimento", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [edit, setEdit] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    if (editParam === 1 && edit === null) {
      setEdit({});
      navigate({ to: "/clientes/$id", params: { id }, search: {}, replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editParam]);

  const save = useMutation({
    mutationFn: async () => {
      if (!edit) return;
      const patch: Record<string, unknown> = { ...edit };
      if ("valor_mensalidade" in patch) patch.valor_mensalidade = parseFloat(String(patch.valor_mensalidade)) || 0;
      if ("dia_vencimento" in patch) patch.dia_vencimento = parseInt(String(patch.dia_vencimento)) || 10;
      const { error } = await supabase.from("clientes").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente atualizado");
      qc.invalidateQueries({ queryKey: ["cliente", id] });
      qc.invalidateQueries({ queryKey: ["clientes"] });
      setEdit(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente excluído");
      navigate({ to: "/clientes" });
    },
  });

  const marcarPago = useMutation({
    mutationFn: async (parcelaId: string) => {
      const { error } = await supabase
        .from("parcelas")
        .update({ status: "pago", data_pagamento: new Date().toISOString().slice(0, 10) })
        .eq("id", parcelaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marcado como pago");
      qc.invalidateQueries({ queryKey: ["parcelas", id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const desfazerPago = useMutation({
    mutationFn: async (parcelaId: string) => {
      const { error } = await supabase
        .from("parcelas")
        .update({ status: "pendente", data_pagamento: null })
        .eq("id", parcelaId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parcelas", id] }),
  });

  const setSenhaFn = useServerFn(setClientePortalPassword);
  const senhaPortal = useMutation({
    mutationFn: async (senha: string | null) => {
      return await setSenhaFn({ data: { clienteId: id, senha } });
    },
    onSuccess: (r) => toast.success(r.reset ? "Senha resetada para 123" : "Senha do portal atualizada"),
    onError: (e: Error) => toast.error(e.message),
  });

  if (cliente.isLoading) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  if (cliente.error || !cliente.data) return <div className="p-8">Cliente não encontrado.</div>;

  const c = cliente.data;
  const meta = clienteStatusMeta[c.status as ClienteStatus];
  const editing = edit !== null;
  const val = (k: string): string => (edit?.[k] ?? (c[k as keyof typeof c] ?? "")?.toString() ?? "");

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <Link to="/clientes" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            {c.nome}
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs ${meta.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> {meta.label}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">{c.plano || "Sem plano"} · {formatBRL(c.valor_mensalidade)}</p>
        </div>
        {!editing ? (
          <>
            <Button variant="outline" onClick={() => setEdit({})}>Editar</Button>
            <Button variant="destructive" size="icon" onClick={() => { if (confirm("Excluir cliente?")) del.mutate(); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              <Save className="h-4 w-4" /> Salvar
            </Button>
          </>
        )}
      </div>

      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados"><User className="h-4 w-4" />Dados</TabsTrigger>
          <TabsTrigger value="financeiro"><DollarSign className="h-4 w-4" />Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <User className="h-4 w-4" /> Cadastro
              </h3>
              <Row label="Nome" k="nome" v={val("nome")} edit={editing} onChange={(v) => setEdit((e) => ({ ...(e ?? {}), nome: v }))} />
              <Row label="CPF/CNPJ" k="cpf_cnpj" v={val("cpf_cnpj")} edit={editing} onChange={(v) => setEdit((e) => ({ ...(e ?? {}), cpf_cnpj: v }))} />
              <Row label="Telefone" k="telefone" v={val("telefone")} edit={editing} onChange={(v) => setEdit((e) => ({ ...(e ?? {}), telefone: v }))} />
              <Row label="WhatsApp" k="whatsapp" v={val("whatsapp")} edit={editing} onChange={(v) => setEdit((e) => ({ ...(e ?? {}), whatsapp: v }))} />
              <Row label="E-mail" k="email" v={val("email")} edit={editing} onChange={(v) => setEdit((e) => ({ ...(e ?? {}), email: v }))} />
              {editing && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={val("status")} onValueChange={(v) => setEdit((e) => ({ ...(e ?? {}), status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="bloqueado">Bloqueado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                      <SelectItem value="inadimplente">Inadimplente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </Card>

            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Endereço
              </h3>
              <Row label="Endereço" k="endereco" v={val("endereco")} edit={editing} onChange={(v) => setEdit((e) => ({ ...(e ?? {}), endereco: v }))} />
              <Row label="Bairro" k="bairro" v={val("bairro")} edit={editing} onChange={(v) => setEdit((e) => ({ ...(e ?? {}), bairro: v }))} />
              <Row label="Cidade" k="cidade" v={val("cidade")} edit={editing} onChange={(v) => setEdit((e) => ({ ...(e ?? {}), cidade: v }))} />
              <Row label="CEP" k="cep" v={val("cep")} edit={editing} onChange={(v) => setEdit((e) => ({ ...(e ?? {}), cep: v }))} />
              <div className="grid grid-cols-2 gap-2">
                <Row label="Latitude" k="latitude" v={val("latitude")} edit={editing} onChange={(v) => setEdit((e) => ({ ...(e ?? {}), latitude: v }))} />
                <Row label="Longitude" k="longitude" v={val("longitude")} edit={editing} onChange={(v) => setEdit((e) => ({ ...(e ?? {}), longitude: v }))} />
              </div>
            </Card>

            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Plano
              </h3>
              <Row label="Plano" k="plano" v={val("plano")} edit={editing} onChange={(v) => setEdit((e) => ({ ...(e ?? {}), plano: v }))} />
              <Row label="Mensalidade" k="valor_mensalidade" v={editing ? val("valor_mensalidade") : formatBRL(c.valor_mensalidade)} edit={editing} onChange={(v) => setEdit((e) => ({ ...(e ?? {}), valor_mensalidade: v }))} />
              <Row label="Dia vencimento" k="dia_vencimento" v={val("dia_vencimento")} edit={editing} onChange={(v) => setEdit((e) => ({ ...(e ?? {}), dia_vencimento: v }))} />
            </Card>

            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Wifi className="h-4 w-4" /> Rede
              </h3>
              <Row label="Login PPPoE" k="login_pppoe" v={val("login_pppoe")} edit={editing} onChange={(v) => setEdit((e) => ({ ...(e ?? {}), login_pppoe: v }))} />
              
              <Row label="SSID Wi-Fi" k="ssid_wifi" v={val("ssid_wifi")} edit={editing} onChange={(v) => setEdit((e) => ({ ...(e ?? {}), ssid_wifi: v }))} />
              <Row label="Senha Wi-Fi" k="senha_wifi" v={val("senha_wifi")} edit={editing} onChange={(v) => setEdit((e) => ({ ...(e ?? {}), senha_wifi: v }))} />
            </Card>

            <Card className="p-5 space-y-3 md:col-span-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <KeyRound className="h-4 w-4" /> Portal do Cliente (App / Web)
              </h3>
              <p className="text-xs text-muted-foreground">
                O cliente entra em <code className="bg-muted px-1 rounded">/cliente/login</code> usando CPF ou Login PPPoE.
                Senha padrão inicial: <code className="bg-muted px-1 rounded">123</code>.
              </p>
              <PortalSenhaBox
                onSet={(s: string) => senhaPortal.mutate(s)}
                onReset={() => { if (confirm("Resetar senha do portal para '123'?")) senhaPortal.mutate(null); }}
                pending={senhaPortal.isPending}
              />
            </Card>

            <Card className="p-5 space-y-3 md:col-span-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Observações</h3>
              {editing ? (
                <Textarea rows={3} value={val("observacoes")} onChange={(e) => setEdit((s) => ({ ...(s ?? {}), observacoes: e.target.value }))} />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{c.observacoes || <span className="text-muted-foreground">Sem observações.</span>}</p>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financeiro" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Histórico financeiro</h3>
            <div className="flex gap-2">
              <NovaMensalidadeBtn clienteId={id} valorPadrao={c.valor_mensalidade} diaVenc={c.dia_vencimento} />
              <Link to="/carnes" search={{ cliente: id }}>
                <Button variant="outline">
                  <FileText className="h-4 w-4" /> Emitir carnê
                </Button>
              </Link>
            </div>
          </div>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Referência</th>
                  <th className="text-left p-3">Vencimento</th>
                  <th className="text-left p-3">Valor</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Pagamento</th>
                  <th className="text-right p-3">Ação</th>
                </tr>
              </thead>
              <tbody>
                {parcelas.data && parcelas.data.length > 0 ? parcelas.data.map((p) => {
                  const m = parcelaStatusMeta[p.status as ParcelaStatus];
                  return (
                    <tr key={p.id} className="border-t border-border/50">
                      <td className="p-3">
                        {String(p.referencia_mes).padStart(2, "0")}/{p.referencia_ano}
                        {p.numero_parcela && <span className="text-xs text-muted-foreground ml-2">P{p.numero_parcela}/{p.total_parcelas}</span>}
                      </td>
                      <td className="p-3">{formatDate(p.data_vencimento)}</td>
                      <td className="p-3 font-medium">{formatBRL(p.valor)}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs ${m.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} /> {m.label}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">{formatDate(p.data_pagamento)}</td>
                      <td className="p-3 text-right">
                        {p.status !== "pago" ? (
                          <Button size="sm" variant="outline" onClick={() => marcarPago.mutate(p.id)}>
                            <Check className="h-3.5 w-3.5" /> Marcar pago
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => desfazerPago.mutate(p.id)}>
                            <X className="h-3.5 w-3.5" /> Desfazer
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma parcela lançada ainda.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, v, edit, onChange }: { label: string; k: string; v: string; edit: boolean; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {edit ? (
        <Input value={v} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <div className="text-sm">{v || <span className="text-muted-foreground">—</span>}</div>
      )}
    </div>
  );
}

function NovaMensalidadeBtn({ clienteId, valorPadrao, diaVenc }: { clienteId: string; valorPadrao: number; diaVenc: number }) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: async () => {
      const hoje = new Date();
      const venc = new Date(hoje.getFullYear(), hoje.getMonth(), diaVenc);
      if (venc < hoje) venc.setMonth(venc.getMonth() + 1);
      const { error } = await supabase.from("parcelas").insert({
        cliente_id: clienteId,
        referencia_mes: venc.getMonth() + 1,
        referencia_ano: venc.getFullYear(),
        valor: valorPadrao,
        data_vencimento: venc.toISOString().slice(0, 10),
        status: "pendente",
        origem: "mensalidade",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mensalidade lançada");
      qc.invalidateQueries({ queryKey: ["parcelas", clienteId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
      <Plus className="h-4 w-4" /> Nova mensalidade
    </Button>
  );
}

function PortalSenhaBox({
  onSet,
  onReset,
  pending,
}: {
  onSet: (senha: string) => void;
  onReset: () => void;
  pending: boolean;
}) {
  const [senha, setSenha] = useState("");
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex-1 min-w-[180px] space-y-1.5">
        <Label className="text-xs">Nova senha do portal</Label>
        <Input
          type="text"
          placeholder="ex.: cliente@2025"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
      </div>
      <Button
        onClick={() => { if (senha.length >= 3) { onSet(senha); setSenha(""); } }}
        disabled={pending || senha.length < 3}
      >
        <KeyRound className="h-4 w-4" /> Definir senha
      </Button>
      <Button variant="outline" onClick={onReset} disabled={pending}>
        <RotateCcw className="h-4 w-4" /> Resetar para 123
      </Button>
    </div>
  );
}
