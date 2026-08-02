import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

import { toast } from "sonner";

export const Route = createFileRoute("/_app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Dominion Net" }] }),
  component: ConfigPage,
});

function ConfigPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["empresa"],
    queryFn: async () => {
      const { data } = await supabase.from("configuracoes_empresa").select("*").limit(1).single();
      return data;
    },
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const [promoAtivo, setPromoAtivo] = useState(true);
  useEffect(() => {
    if (q.data) {
      setForm({
        nome_empresa: q.data.nome_empresa ?? "",
        cnpj: q.data.cnpj ?? "",
        telefone: q.data.telefone ?? "",
        endereco: q.data.endereco ?? "",
        cidade: q.data.cidade ?? "",
        pix_chave: q.data.pix_chave ?? "",
        pix_tipo: q.data.pix_tipo ?? "email",
        pix_beneficiario: q.data.pix_beneficiario ?? "",
        pix_cidade: q.data.pix_cidade ?? "",
        portal_promo_titulo: q.data.portal_promo_titulo ?? "",
        portal_promo_texto: q.data.portal_promo_texto ?? "",
        portal_promo_rodape: q.data.portal_promo_rodape ?? "",
        portal_suporte_whatsapp: q.data.portal_suporte_whatsapp ?? "",
      });
      setPromoAtivo(q.data.portal_promo_ativo ?? true);
    }
  }, [q.data]);


  const save = useMutation({
    mutationFn: async () => {
      if (!q.data) return;
      const { error } = await supabase
        .from("configuracoes_empresa")
        .update({ ...form, portal_promo_ativo: promoAtivo } as never)
        .eq("id", q.data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["empresa"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-1">Dados da empresa e chave Pix usados nos carnês.</p>
      </header>

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">Empresa</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nome"><Input value={form.nome_empresa ?? ""} onChange={(e) => set("nome_empresa", e.target.value)} /></Field>
          <Field label="CNPJ"><Input value={form.cnpj ?? ""} onChange={(e) => set("cnpj", e.target.value)} /></Field>
          <Field label="Telefone"><Input value={form.telefone ?? ""} onChange={(e) => set("telefone", e.target.value)} /></Field>
          <Field label="Cidade"><Input value={form.cidade ?? ""} onChange={(e) => set("cidade", e.target.value)} /></Field>
          <Field label="Endereço" full><Input value={form.endereco ?? ""} onChange={(e) => set("endereco", e.target.value)} /></Field>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">Chave Pix (usada nos carnês)</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Chave Pix" full><Input value={form.pix_chave ?? ""} onChange={(e) => set("pix_chave", e.target.value)} /></Field>
          <Field label="Beneficiário"><Input value={form.pix_beneficiario ?? ""} onChange={(e) => set("pix_beneficiario", e.target.value)} /></Field>
          <Field label="Cidade Pix"><Input value={form.pix_cidade ?? ""} onChange={(e) => set("pix_cidade", e.target.value)} /></Field>
        </div>
        <p className="text-xs text-muted-foreground">
          A cidade do Pix deve ter no máximo 15 caracteres, sem acentos.
        </p>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold">Texto promocional — Área do Cliente</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Este conteúdo aparece no início do portal do assinante.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Exibir</Label>
            <Switch checked={promoAtivo} onCheckedChange={setPromoAtivo} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Título" full>
            <Input value={form.portal_promo_titulo ?? ""} onChange={(e) => set("portal_promo_titulo", e.target.value)} />
          </Field>
          <Field label="Texto (uma linha por item)" full>
            <Textarea
              rows={14}
              value={form.portal_promo_texto ?? ""}
              onChange={(e) => set("portal_promo_texto", e.target.value)}
            />
          </Field>
          <Field label="WhatsApp de suporte (só números, com DDI)">
            <Input
              value={form.portal_suporte_whatsapp ?? ""}
              onChange={(e) => set("portal_suporte_whatsapp", e.target.value.replace(/\D/g, ""))}
              placeholder="5582993823246"
            />
          </Field>
          <Field label="Rodapé">
            <Input value={form.portal_promo_rodape ?? ""} onChange={(e) => set("portal_promo_rodape", e.target.value)} />
          </Field>
        </div>
      </Card>



      <Button size="lg" onClick={() => save.mutate()} disabled={save.isPending}>
        <Save className="h-4 w-4" /> Salvar alterações
      </Button>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-1.5 ${full ? "col-span-2" : ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
