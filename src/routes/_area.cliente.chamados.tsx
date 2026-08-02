import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LifeBuoy, Plus, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clienteFetch } from "@/lib/cliente-auth";

export const Route = createFileRoute("/_area/cliente/chamados")({
  component: ChamadosPage,
});

type Mensagem = {
  id: string;
  autor: "cliente" | "suporte";
  mensagem: string | null;
  anexo: string | null;
  created_at: string;
};
type Chamado = {
  id: string;
  protocolo: string;
  assunto: string;
  categoria: string;
  status: "aberto" | "em_andamento" | "resolvido" | "fechado";
  created_at: string;
  mensagens: Mensagem[];
};

const statusMeta: Record<Chamado["status"], { label: string; cls: string }> = {
  aberto: { label: "Aberto", cls: "border-amber-500/50 text-amber-500" },
  em_andamento: { label: "Em andamento", cls: "border-primary/50 text-primary" },
  resolvido: { label: "Resolvido", cls: "border-emerald-500/50 text-emerald-500" },
  fechado: { label: "Fechado", cls: "border-muted-foreground/40 text-muted-foreground" },
};

const SUPORTE_WHATSAPP = "5582993823246";

/** Converte um arquivo de imagem em base64 para envio à API. */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem"));
    reader.readAsDataURL(file);
  });
}

function ChamadosPage() {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoAberto, setNovoAberto] = useState(false);
  const [assunto, setAssunto] = useState("");
  const [categoria, setCategoria] = useState("suporte");
  const [descricao, setDescricao] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  const [resposta, setResposta] = useState("");

  async function load() {
    try {
      const r = await clienteFetch<{ chamados: Chamado[] }>("/api/public/cliente/chamados");
      setChamados(r.chamados);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function abrirChamado() {
    if (assunto.trim().length < 3 || descricao.trim().length < 5) {
      toast.error("Preencha assunto e descrição.");
      return;
    }
    setEnviando(true);
    try {
      const anexo = foto ? await fileToBase64(foto) : undefined;
      await clienteFetch("/api/public/cliente/chamados", {
        method: "POST",
        body: JSON.stringify({
          acao: "novo",
          assunto: assunto.trim(),
          categoria,
          descricao: descricao.trim(),
          anexo_base64: anexo,
          anexo_tipo: foto?.type,
        }),
      });
      toast.success("Chamado aberto! Acompanhe o andamento aqui.");
      setAssunto("");
      setDescricao("");
      setFoto(null);
      setNovoAberto(false);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  async function responder(chamadoId: string, arquivo?: File | null) {
    if (!resposta.trim() && !arquivo) return;
    setEnviando(true);
    try {
      const anexo = arquivo ? await fileToBase64(arquivo) : undefined;
      await clienteFetch("/api/public/cliente/chamados", {
        method: "POST",
        body: JSON.stringify({
          acao: "mensagem",
          chamado_id: chamadoId,
          mensagem: resposta.trim(),
          anexo_base64: anexo,
          anexo_tipo: arquivo?.type,
        }),
      });
      setResposta("");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h1 className="truncate text-xl font-bold">Meus chamados</h1>
        <Button size="sm" onClick={() => setNovoAberto((v) => !v)}>
          {novoAberto ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          {novoAberto ? "Cancelar" : "Abrir chamado"}
        </Button>
      </div>

      <Button
        asChild
        variant="outline"
        className="w-full border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
      >
        <a
          href={`https://wa.me/${SUPORTE_WHATSAPP}?text=${encodeURIComponent("Olá! Preciso de suporte.")}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Conversar pelo WhatsApp
        </a>
      </Button>

      {novoAberto && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1.5">
              <Label>Assunto</Label>
              <Input
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                placeholder="Ex.: Internet lenta à noite"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="suporte">Suporte técnico</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="mudanca">Mudança de endereço</SelectItem>
                  <SelectItem value="upgrade">Upgrade de plano</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição do problema</Label>
              <Textarea
                rows={4}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Conte o que está acontecendo..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                <Paperclip className="h-3.5 w-3.5" /> Enviar foto (opcional)
              </Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button className="w-full" onClick={abrirChamado} disabled={enviando}>
              <Send className="h-4 w-4 mr-2" /> {enviando ? "Enviando..." : "Abrir chamado"}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading && <div className="text-sm text-muted-foreground">Carregando...</div>}
      {!loading && chamados.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            <LifeBuoy className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Você ainda não abriu nenhum chamado.
          </CardContent>
        </Card>
      )}

      {chamados.map((c) => {
        const meta = statusMeta[c.status];
        const expandido = aberto === c.id;
        return (
          <Card key={c.id}>
            <CardContent className="p-4 space-y-3">
              <button
                className="w-full text-left grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3"
                onClick={() => setAberto(expandido ? null : c.id)}
              >
                <div className="min-w-0">
                  <div className="text-[11px] text-muted-foreground">
                    Protocolo {c.protocolo} • {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </div>
                  <div className="truncate font-semibold">{c.assunto}</div>
                  <div className="text-xs text-muted-foreground capitalize">{c.categoria}</div>
                </div>
                <Badge variant="outline" className={meta.cls}>
                  {meta.label}
                </Badge>
              </button>

              {expandido && (
                <div className="space-y-3 border-t border-border/60 pt-3">
                  {c.mensagens.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-lg p-3 text-sm ${
                        m.autor === "cliente" ? "bg-primary/10" : "bg-muted"
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                        {m.autor === "cliente" ? "Você" : "Suporte"} •{" "}
                        {new Date(m.created_at).toLocaleString("pt-BR")}
                      </div>
                      {m.mensagem && <p className="whitespace-pre-wrap break-words">{m.mensagem}</p>}
                      {m.anexo && (
                        <a href={m.anexo} target="_blank" rel="noopener noreferrer">
                          <img
                            src={m.anexo}
                            alt="Anexo do chamado"
                            loading="lazy"
                            className="mt-2 max-h-48 rounded-md border border-border/60"
                          />
                        </a>
                      )}
                    </div>
                  ))}

                  {c.status !== "fechado" && (
                    <div className="space-y-2">
                      <Textarea
                        rows={2}
                        placeholder="Escreva uma mensagem..."
                        value={resposta}
                        onChange={(e) => setResposta(e.target.value)}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          className="flex-1 min-w-40"
                          onChange={(e) => responder(c.id, e.target.files?.[0] ?? null)}
                        />
                        <Button size="sm" disabled={enviando} onClick={() => responder(c.id)}>
                          <Send className="h-3.5 w-3.5 mr-1" /> Enviar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
