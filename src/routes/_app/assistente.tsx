import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  Bot,
  Loader2,
  Mic,
  Send,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { supabase } from "@/integrations/supabase/client";
import { iniciarGravacao, type Gravador } from "@/lib/audio-gravacao";
import { openWhatsapp } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/assistente")({
  head: () => ({
    meta: [
      { title: "Assistente IA — Dominion Net" },
      {
        name: "description",
        content:
          "Converse por voz ou texto com o assistente do provedor: clientes, financeiro, rede FTTH, MikroTik e chamados em tempo real.",
      },
      { property: "og:title", content: "Assistente IA — Dominion Net" },
      {
        property: "og:description",
        content: "Gerencie o provedor conversando: consultas e ações em linguagem natural.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssistentePage,
});

type AcaoSistema = {
  tipo:
    | "abrir_ficha"
    | "editar_cliente"
    | "whatsapp"
    | "mapa"
    | "segunda_via"
    | "filtrar_offline"
    | "filtrar_inadimplentes"
    | "relatorio_inadimplencia";
  clienteId?: string;
  rotulo: string;
};

const SUGESTOES = [
  "Quais clientes estão offline agora?",
  "Quem venceu hoje?",
  "Liste os clientes com mais de duas mensalidades em atraso",
  "Qual foi o faturamento deste mês?",
  "Quantos chamados estão abertos?",
  "Qual plano tem mais assinantes?",
];

/** Extrai o texto puro de uma mensagem do AI SDK (partes do tipo text). */
function textoDaMensagem(m: UIMessage): string {
  return m.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .trim();
}

/** Ações emitidas pelo modelo nesta mensagem. */
function acoesDaMensagem(m: UIMessage): AcaoSistema[] {
  const acoes: AcaoSistema[] = [];
  for (const parte of m.parts as Array<{ type: string; state?: string; output?: unknown }>) {
    if (parte.type !== "tool-acao_no_sistema" || parte.state !== "output-available") continue;
    const saida = parte.output as { acao?: AcaoSistema } | undefined;
    if (saida?.acao?.tipo && saida.acao.rotulo) acoes.push(saida.acao);
  }
  return acoes;
}

/** Ferramentas em execução, para mostrar o que a IA está consultando. */
function ferramentasEmUso(m: UIMessage): string[] {
  return (m.parts as Array<{ type: string; state?: string }>)
    .filter((p) => p.type.startsWith("tool-") && p.state !== "output-available" && p.state !== "output-error")
    .map((p) => p.type.replace("tool-", "").replace(/_/g, " "));
}

async function tokenAtual(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function AssistentePage() {
  const navigate = useNavigate();
  const [entrada, setEntrada] = useState("");
  const [vozAtiva, setVozAtiva] = useState(true);
  const [gravando, setGravando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);

  const gravadorRef = useRef<Gravador | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fimRef = useRef<HTMLDivElement | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/assistente/chat",
        // O token da sessão é resolvido a cada envio para nunca ir vencido.
        headers: async (): Promise<Record<string, string>> => {
          const token = await tokenAtual();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    [],
  );

  /** Fala a resposta usando o TTS do servidor. */
  const falar = useCallback(async (texto: string) => {
    if (!texto) return;
    try {
      const token = await tokenAtual();
      if (!token) return;
      const resposta = await fetch("/api/assistente/voz", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ texto }),
      });
      if (!resposta.ok) return;
      const blob = await resposta.blob();
      const url = URL.createObjectURL(blob);
      audioRef.current?.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play().catch(() => undefined);
    } catch {
      // Falha de áudio nunca deve quebrar a conversa em texto.
    }
  }, []);

  const salvar = useCallback(async (role: "user" | "assistant", content: string) => {
    if (!content.trim()) return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { error } = await supabase
      .from("assistente_mensagens")
      .insert({ user_id: data.user.id, role, content });
    if (error) console.error("Falha ao salvar a mensagem:", error.message);
  }, []);

  const { messages, setMessages, sendMessage, status, error, stop } = useChat({
    transport,
    onFinish: ({ message }) => {
      const texto = textoDaMensagem(message);
      void salvar("assistant", texto);
      if (vozAtiva) void falar(texto);
    },
    onError: (e) => toast.error(e.message || "Falha ao falar com o assistente"),
  });

  const ocupado = status === "submitted" || status === "streaming";

  // Histórico persistido (uma única conversa contínua por administrador).
  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data: sessao } = await supabase.auth.getUser();
      if (!sessao.user) {
        if (ativo) setCarregandoHistorico(false);
        return;
      }
      const { data, error: erro } = await supabase
        .from("assistente_mensagens")
        .select("id,role,content,created_at")
        .eq("user_id", sessao.user.id)
        .order("created_at", { ascending: true })
        .limit(200);
      if (!ativo) return;
      if (erro) {
        toast.error("Não foi possível carregar o histórico");
      } else if (data?.length) {
        setMessages(
          data.map((m) => ({
            id: m.id,
            role: m.role === "user" ? "user" : "assistant",
            parts: [{ type: "text", text: m.content }],
          })) as UIMessage[],
        );
      }
      setCarregandoHistorico(false);
    })();
    return () => {
      ativo = false;
    };
  }, [setMessages]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, ocupado]);

  useEffect(() => {
    if (!ocupado && !transcrevendo) textareaRef.current?.focus();
  }, [ocupado, transcrevendo]);

  const enviar = useCallback(
    async (texto: string) => {
      const limpo = texto.trim();
      if (!limpo || ocupado) return;
      setEntrada("");
      void salvar("user", limpo);
      await sendMessage({ text: limpo });
    },
    [ocupado, salvar, sendMessage],
  );

  const alternarMicrofone = useCallback(async () => {
    if (gravando) {
      const gravador = gravadorRef.current;
      gravadorRef.current = null;
      setGravando(false);
      if (!gravador) return;

      const blob = await gravador.parar();
      if (blob.size < 2048) {
        toast.error("Gravação vazia. Tente falar novamente.");
        return;
      }

      setTranscrevendo(true);
      try {
        const token = await tokenAtual();
        const form = new FormData();
        form.append("audio", blob, "gravacao.wav");
        const resposta = await fetch("/api/assistente/transcrever", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: form,
        });
        const corpo = (await resposta.json()) as { text?: string; error?: string };
        if (!resposta.ok || !corpo.text?.trim()) {
          toast.error(corpo.error || "Não consegui entender o áudio");
          return;
        }
        await enviar(corpo.text);
      } catch {
        toast.error("Falha ao enviar o áudio");
      } finally {
        setTranscrevendo(false);
      }
      return;
    }

    try {
      gravadorRef.current = await iniciarGravacao();
      setGravando(true);
    } catch {
      toast.error("Permita o acesso ao microfone para falar com o assistente");
    }
  }, [enviar, gravando]);

  const executarAcao = useCallback(
    async (acao: AcaoSistema) => {
      switch (acao.tipo) {
        case "abrir_ficha":
          if (acao.clienteId) navigate({ href: `/clientes/${acao.clienteId}` });
          return;
        case "editar_cliente":
          if (acao.clienteId) navigate({ href: `/clientes/${acao.clienteId}?edit=1` });
          return;
        case "segunda_via":
          navigate({ href: acao.clienteId ? `/clientes/${acao.clienteId}` : "/carnes" });
          return;
        case "mapa":
          navigate({ href: acao.clienteId ? `/mapa?cliente=${acao.clienteId}` : "/mapa" });
          return;
        case "filtrar_offline":
          navigate({ href: "/roteadores" });
          return;
        case "filtrar_inadimplentes":
        case "relatorio_inadimplencia":
          navigate({ href: "/financeiro" });
          return;
        case "whatsapp": {
          if (!acao.clienteId) return;
          const { data } = await supabase
            .from("clientes")
            .select("telefone,whatsapp")
            .eq("id", acao.clienteId)
            .maybeSingle();
          if (!data || !openWhatsapp(data)) toast.error("Cliente sem número válido cadastrado");
          return;
        }
      }
    },
    [navigate],
  );

  const limparHistorico = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { error: erro } = await supabase
      .from("assistente_mensagens")
      .delete()
      .eq("user_id", data.user.id);
    if (erro) {
      toast.error("Não foi possível limpar a conversa");
      return;
    }
    setMessages([]);
    toast.success("Conversa limpa");
  }, [setMessages]);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bot className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Assistente IA</h1>
            <p className="text-sm text-muted-foreground">
              Pergunte por voz ou texto sobre clientes, financeiro, rede e chamados.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={vozAtiva ? "secondary" : "outline"}
            size="sm"
            onClick={() => {
              if (vozAtiva) audioRef.current?.pause();
              setVozAtiva((v) => !v);
            }}
          >
            {vozAtiva ? <Volume2 className="mr-2 size-4" /> : <VolumeX className="mr-2 size-4" />}
            {vozAtiva ? "Voz ligada" : "Voz desligada"}
          </Button>
          <Button variant="outline" size="sm" onClick={limparHistorico}>
            <Trash2 className="mr-2 size-4" />
            Limpar
          </Button>
        </div>
      </header>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          {carregandoHistorico ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" /> Carregando conversa…
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Bot className="size-7" />
              </span>
              <div>
                <p className="font-medium text-foreground">Como posso ajudar hoje?</p>
                <p className="text-sm text-muted-foreground">
                  Fale naturalmente — eu consulto o sistema antes de responder.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGESTOES.map((s) => (
                  <Button key={s} variant="outline" size="sm" onClick={() => void enviar(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const texto = textoDaMensagem(m);
              const acoes = acoesDaMensagem(m);
              const ferramentas = ferramentasEmUso(m);
              const doUsuario = m.role === "user";
              return (
                <div
                  key={m.id}
                  className={cn("flex gap-3", doUsuario ? "flex-row-reverse" : "flex-row")}
                >
                  <span
                    className={cn(
                      "mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg",
                      doUsuario ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
                    )}
                  >
                    {doUsuario ? <UserIcon className="size-4" /> : <Bot className="size-4" />}
                  </span>
                  <div className={cn("max-w-[85%] space-y-2", doUsuario && "items-end text-right")}>
                    {doUsuario ? (
                      <p className="inline-block whitespace-pre-wrap rounded-2xl bg-primary px-4 py-2 text-left text-primary-foreground">
                        {texto}
                      </p>
                    ) : (
                      <>
                        {ferramentas.length > 0 && (
                          <Shimmer className="text-sm">{`Consultando ${ferramentas.join(", ")}…`}</Shimmer>
                        )}
                        {texto && (
                          <p className="whitespace-pre-wrap text-foreground">{texto}</p>
                        )}
                        {acoes.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {acoes.map((a, i) => (
                              <Button
                                key={`${a.tipo}-${i}`}
                                size="sm"
                                variant="secondary"
                                onClick={() => void executarAcao(a)}
                              >
                                {a.rotulo}
                              </Button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {status === "submitted" && <Shimmer className="text-sm">Pensando…</Shimmer>}
          {error && (
            <p className="text-sm text-destructive">
              {error.message || "Falha na comunicação com o assistente."}
            </p>
          )}
          <div ref={fimRef} />
        </CardContent>
      </Card>

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void enviar(entrada);
        }}
      >
        <Textarea
          ref={textareaRef}
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void enviar(entrada);
            }
          }}
          placeholder={gravando ? "Gravando… toque no microfone para enviar" : "Pergunte alguma coisa…"}
          rows={2}
          className="min-h-[52px] resize-none"
          disabled={transcrevendo}
        />
        <Button
          type="button"
          size="icon"
          variant={gravando ? "destructive" : "outline"}
          onClick={() => void alternarMicrofone()}
          disabled={transcrevendo || ocupado}
          aria-label={gravando ? "Parar gravação" : "Falar com o assistente"}
        >
          {transcrevendo ? (
            <Loader2 className="size-4 animate-spin" />
          ) : gravando ? (
            <Square className="size-4" />
          ) : (
            <Mic className="size-4" />
          )}
        </Button>
        {ocupado ? (
          <Button type="button" size="icon" variant="secondary" onClick={() => stop()} aria-label="Parar resposta">
            <Square className="size-4" />
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={!entrada.trim()} aria-label="Enviar mensagem">
            <Send className="size-4" />
          </Button>
        )}
      </form>
    </div>
  );
}
