import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Megaphone, Send, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/avisos")({
  head: () => ({ meta: [{ title: "Avisos — Dominion Net" }] }),
  component: AdminAvisos,
});

type Aviso = { id: string; titulo: string; mensagem: string; tipo: string; destino: string; created_at: string };

function AdminAvisos() {
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [tipo, setTipo] = useState("comunicado");
  const [destino, setDestino] = useState("all");
  const [saving, setSaving] = useState(false);
  const [lista, setLista] = useState<Aviso[]>([]);

  async function load() {
    const { data } = await supabase
      .from("avisos")
      .select("id, titulo, mensagem, tipo, destino, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    setLista((data as Aviso[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function enviar() {
    if (!titulo.trim() || !mensagem.trim()) {
      toast.error("Preencha título e mensagem");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("avisos").insert({
      titulo: titulo.trim(),
      mensagem: mensagem.trim(),
      tipo,
      destino,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Aviso publicado para os clientes");
    setTitulo(""); setMensagem("");
    load();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" /> Avisos aos clientes
        </h1>
        <p className="text-sm text-muted-foreground">Comunicados exibidos na Área do Cliente.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Publicar novo aviso</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="comunicado">Comunicado</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                  <SelectItem value="promocional">Promocional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Destino</Label>
              <Select value={destino} onValueChange={setDestino}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Manutenção programada" maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea rows={5} value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Detalhes do aviso..." maxLength={2000} />
          </div>
          <Button onClick={enviar} disabled={saving}>
            <Send className="h-4 w-4 mr-2" /> {saving ? "Publicando..." : "Publicar"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Últimos avisos</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {lista.length === 0 && <p className="text-sm text-muted-foreground">Nenhum aviso publicado ainda.</p>}
          {lista.map((a) => (
            <div key={a.id} className="rounded-lg border border-border/60 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline">{a.tipo}</Badge>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(a.created_at).toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="text-sm font-semibold">{a.titulo}</div>
              <div className="text-xs text-muted-foreground whitespace-pre-wrap">{a.mensagem}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
