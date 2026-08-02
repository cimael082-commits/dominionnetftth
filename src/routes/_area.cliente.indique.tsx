import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Gift, Copy, Share2, Users } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { clienteFetch } from "@/lib/cliente-auth";

export const Route = createFileRoute("/_area/cliente/indique")({
  component: IndiquePage,
});

type Indicacao = {
  id: string;
  nome_indicado: string;
  telefone_indicado: string;
  status: "pendente" | "contatado" | "convertido" | "descartado";
  created_at: string;
};

const statusLabel: Record<Indicacao["status"], string> = {
  pendente: "Pendente",
  contatado: "Em contato",
  convertido: "Convertido 🎉",
  descartado: "Não elegível",
};

function IndiquePage() {
  const [codigo, setCodigo] = useState("");
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function load() {
    try {
      const r = await clienteFetch<{ codigo: string; indicacoes: Indicacao[] }>(
        "/api/public/cliente/indicacoes",
      );
      setCodigo(r.codigo);
      setIndicacoes(r.indicacoes);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function enviar() {
    if (nome.trim().length < 3 || telefone.trim().length < 8) {
      toast.error("Informe nome e telefone do amigo.");
      return;
    }
    setEnviando(true);
    try {
      await clienteFetch("/api/public/cliente/indicacoes", {
        method: "POST",
        body: JSON.stringify({ nome: nome.trim(), telefone: telefone.trim() }),
      });
      toast.success("Indicação enviada! Nossa equipe entrará em contato.");
      setNome("");
      setTelefone("");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  const link = typeof window !== "undefined" ? `${window.location.origin}/cliente/login?ref=${codigo}` : "";
  const convertidas = indicacoes.filter((i) => i.status === "convertido").length;

  async function compartilhar() {
    const texto = `Venha para a Dominion Net 5G! Use meu código ${codigo} e ganhe desconto: ${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Dominion Net 5G", text: texto, url: link });
        return;
      } catch {
        /* usuário cancelou o compartilhamento */
      }
    }
    navigator.clipboard.writeText(texto);
    toast.success("Convite copiado!");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Indique e ganhe</h1>

      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="p-5 space-y-3 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/15 text-primary flex items-center justify-center ring-1 ring-primary/30">
            <Gift className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted-foreground">
            Indique amigos e ganhe <strong className="text-foreground">desconto na mensalidade</strong> a
            cada indicação que virar cliente.
          </p>
          <div className="rounded-lg border border-dashed border-primary/40 bg-background/60 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Seu código</div>
            <div className="text-2xl font-black tracking-widest text-primary">{codigo || "—"}</div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                navigator.clipboard.writeText(codigo);
                toast.success("Código copiado!");
              }}
            >
              <Copy className="h-4 w-4 mr-1" /> Copiar
            </Button>
            <Button className="flex-1" onClick={compartilhar}>
              <Share2 className="h-4 w-4 mr-1" /> Compartilhar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Indicar agora</h2>
          <div className="space-y-1.5">
            <Label>Nome do amigo</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp</Label>
            <Input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(82) 90000-0000"
              inputMode="tel"
            />
          </div>
          <Button className="w-full" onClick={enviar} disabled={enviando}>
            {enviando ? "Enviando..." : "Enviar indicação"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" /> Minhas indicações
            </h2>
            <span className="text-xs text-muted-foreground">{convertidas} convertida(s)</span>
          </div>
          {indicacoes.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma indicação ainda.</p>
          )}
          {indicacoes.map((i) => (
            <div
              key={i.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border/60 p-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{i.nome_indicado}</div>
                <div className="text-[11px] text-muted-foreground">
                  {i.telefone_indicado} • {new Date(i.created_at).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <Badge variant="outline" className="shrink-0">
                {statusLabel[i.status]}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
