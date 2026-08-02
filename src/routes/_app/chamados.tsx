import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Send, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/chamados")({
  head: () => ({
    meta: [
      { title: "Chamados de Suporte — Dominion Net" },
      {
        name: "description",
        content: "Acompanhe e responda os chamados abertos pelos assinantes na Área do Cliente.",
      },
      { property: "og:title", content: "Chamados de Suporte — Dominion Net" },
      {
        property: "og:description",
        content: "Central de atendimento e tickets dos clientes do provedor.",
      },
    ],
  }),
  component: ChamadosAdmin,
});

type Status = "aberto" | "em_andamento" | "resolvido" | "fechado";

const statusMeta: Record<Status, { label: string; cls: string }> = {
  aberto: { label: "Aberto", cls: "border-amber-500/50 text-amber-500" },
  em_andamento: { label: "Em andamento", cls: "border-primary/50 text-primary" },
  resolvido: { label: "Resolvido", cls: "border-emerald-500/50 text-emerald-500" },
  fechado: { label: "Fechado", cls: "border-muted-foreground/40 text-muted-foreground" },
};

function ChamadosAdmin() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<"todos" | Status>("todos");
  const [aberto, setAberto] = useState<string | null>(null);
  const [texto, setTexto] = useState("");

  const q = useQuery({
    queryKey: ["chamados-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chamados")
        .select("*, clientes(nome, telefone), chamado_mensagens(id, autor, mensagem, created_at)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const mudarStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("chamados").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["chamados-admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const responder = useMutation({
    mutationFn: async (chamadoId: string) => {
      const msg = texto.trim();
      if (!msg) throw new Error("Escreva uma resposta");
      const { error } = await supabase
        .from("chamado_mensagens")
        .insert({ chamado_id: chamadoId, autor: "suporte", mensagem: msg });
      if (error) throw error;
    },
    onSuccess: () => {
      setTexto("");
      qc.invalidateQueries({ queryKey: ["chamados-admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lista = (q.data ?? []).filter((c) => filtro === "todos" || c.status === filtro);

  return (
    <div className="p-8 space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold tracking-tight">Chamados</h1>
          <p className="text-muted-foreground mt-1">Tickets abertos pelos clientes no portal.</p>
        </div>
        <Select value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="aberto">Abertos</SelectItem>
            <SelectItem value="em_andamento">Em andamento</SelectItem>
            <SelectItem value="resolvido">Resolvidos</SelectItem>
            <SelectItem value="fechado">Fechados</SelectItem>
          </SelectContent>
        </Select>
      </header>

      <div className="grid gap-3">
        {lista.map((c) => {
          const meta = statusMeta[c.status as Status];
          const expandido = aberto === c.id;
          const msgs = (c.chamado_mensagens ?? []).slice().sort((a, b) =>
            a.created_at.localeCompare(b.created_at),
          );
          return (
            <Card key={c.id}>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                  <button className="min-w-0 text-left" onClick={() => setAberto(expandido ? null : c.id)}>
                    <div className="text-[11px] text-muted-foreground">
                      {c.protocolo} • {new Date(c.created_at).toLocaleString("pt-BR")}
                    </div>
                    <div className="truncate font-semibold">{c.assunto}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {c.clientes?.nome ?? "—"} • {c.categoria}
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className={meta.cls}>
                      {meta.label}
                    </Badge>
                    <Select
                      value={c.status}
                      onValueChange={(v) => mudarStatus.mutate({ id: c.id, status: v as Status })}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aberto">Aberto</SelectItem>
                        <SelectItem value="em_andamento">Em andamento</SelectItem>
                        <SelectItem value="resolvido">Resolvido</SelectItem>
                        <SelectItem value="fechado">Fechado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {expandido && (
                  <div className="space-y-3 border-t border-border/50 pt-3">
                    <p className="text-sm whitespace-pre-wrap">{c.descricao}</p>
                    {msgs.map((m) => (
                      <div
                        key={m.id}
                        className={`rounded-lg p-3 text-sm ${
                          m.autor === "suporte" ? "bg-primary/10" : "bg-muted"
                        }`}
                      >
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                          {m.autor === "suporte" ? "Suporte" : "Cliente"} •{" "}
                          {new Date(m.created_at).toLocaleString("pt-BR")}
                        </div>
                        <p className="whitespace-pre-wrap break-words">{m.mensagem}</p>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2">
                      <Textarea
                        rows={2}
                        className="flex-1 min-w-60"
                        placeholder="Responder ao cliente..."
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                      />
                      <Button onClick={() => responder.mutate(c.id)} disabled={responder.isPending}>
                        <Send className="h-4 w-4 mr-1" /> Responder
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {lista.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              <LifeBuoy className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Nenhum chamado encontrado.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
