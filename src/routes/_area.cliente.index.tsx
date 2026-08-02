import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  Info,
  Radio,
  MessageCircle,
  LifeBuoy,
  Gift,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BannerCarousel } from "@/components/banner-carousel";
import { clienteFetch } from "@/lib/cliente-auth";
import { formatBRL } from "@/lib/status-utils";


export const Route = createFileRoute("/_area/cliente/")({
  component: HomeCliente,
});

const SUPORTE_WHATSAPP = "5582993823246";
const suporteUrl = `https://wa.me/${SUPORTE_WHATSAPP}?text=${encodeURIComponent(
  "Olá! Preciso de suporte da Dominion Net 5G.",
)}`;

type Cliente = {
  id: string;
  nome: string;
  plano: string | null;
  valor_mensalidade: number | null;
  dia_vencimento: number | null;
  status: string;
  online: boolean | null;
  ip_atual: string | null;
  uptime_atual: string | null;
  ultima_sincronizacao: string | null;
};
type Parcela = {
  id: string;
  numero_parcela: number;
  valor: number;
  data_vencimento: string;
  status: string;
};

function HomeCliente() {
  const navigate = useNavigate();
  const [cli, setCli] = useState<Cliente | null>(null);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setLoading(true);
      setErro(null);
      try {
        // O cadastro do cliente é o dado essencial da tela; o financeiro é
        // secundário e não deve derrubar a página inteira se falhar.
        const me = await clienteFetch<{ cliente: Cliente }>("/api/public/cliente/me");
        if (!ativo) return;
        setCli(me.cliente);
        try {
          const fin = await clienteFetch<{ parcelas: Parcela[] }>(
            "/api/public/cliente/financeiro",
          );
          if (ativo) setParcelas(fin.parcelas ?? []);
        } catch {
          if (ativo) setParcelas([]);
        }
      } catch (e) {
        if (!ativo) return;
        const msg = e instanceof Error ? e.message : "Falha ao carregar seus dados";
        if (/sess[aã]o expirada/i.test(msg)) {
          navigate({ to: "/cliente/login", replace: true });
          return;
        }
        setErro(msg);
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [navigate, tentativa]);

  if (loading) return <div className="text-sm text-muted-foreground">Carregando...</div>;
  if (!cli)
    return (
      <Card className="border-destructive/40">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-destructive font-semibold">
            <AlertTriangle className="h-5 w-5" /> Não foi possível carregar seus dados
          </div>
          <p className="text-xs text-muted-foreground">
            {erro ?? "Verifique sua conexão e tente novamente."}
          </p>
          <Button size="sm" onClick={() => setTentativa((t) => t + 1)}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );


  const pendentes = parcelas.filter((p) => p.status !== "pago");
  const proxima = pendentes[0];
  const atrasadas = pendentes.filter((p) => p.status === "vencido");
  const online = cli.online === true;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-muted-foreground">Olá,</div>
        <h1 className="text-2xl font-bold tracking-tight">{cli.nome.split(" ")[0]}</h1>
      </div>

      <BannerCarousel />



      <Card className={online ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/40 bg-red-500/5"}>
        <CardContent className="p-4 flex items-center gap-3">
          <div
            className={`h-10 w-10 rounded-full flex items-center justify-center text-xl ${
              online ? "bg-emerald-500/15" : "bg-red-500/15"
            }`}
            aria-hidden
          >
            {online ? "🟢" : "🔴"}
          </div>
          <div className="flex-1">
            <div className="font-semibold">
              {online ? "Internet Online" : "Internet Offline"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {online
                ? `IP ${cli.ip_atual ?? "-"} • ${cli.uptime_atual ?? "-"}`
                : "Se o problema persistir, contate o suporte"}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button asChild size="lg" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">
        <a href={suporteUrl} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="h-5 w-5 mr-2" /> 📲 Falar com Suporte
        </a>
      </Button>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/cliente/financeiro">
          <Card className="hover:border-primary/60 transition-colors">
            <CardContent className="p-4">
              <Wallet className="h-5 w-5 text-primary mb-2" />
              <div className="text-[11px] text-muted-foreground">Próxima fatura</div>
              <div className="text-lg font-bold">
                {proxima ? formatBRL(Number(proxima.valor)) : "—"}
              </div>
              {proxima && (
                <div className="text-[11px] text-muted-foreground">
                  Vence {new Date(proxima.data_vencimento + "T00:00").toLocaleDateString("pt-BR")}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
        <Link to="/cliente/financeiro">
          <Card className={atrasadas.length > 0 ? "border-red-500/60" : ""}>
            <CardContent className="p-4">
              {atrasadas.length > 0 ? (
                <AlertTriangle className="h-5 w-5 text-red-500 mb-2" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 mb-2" />
              )}
              <div className="text-[11px] text-muted-foreground">Atrasadas</div>
              <div className="text-lg font-bold">{atrasadas.length}</div>
              <div className="text-[11px] text-muted-foreground">
                {atrasadas.length > 0 ? "regularize agora" : "tudo em dia"}
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/cliente/wifi">
          <Card>
            <CardContent className="p-4">
              <Wifi className="h-5 w-5 text-primary mb-2" />
              <div className="text-[11px] text-muted-foreground">Wi-Fi</div>
              <div className="text-sm font-semibold">Ver SSID e senha</div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/cliente/plano">
          <Card>
            <CardContent className="p-4">
              <Radio className="h-5 w-5 text-primary mb-2" />
              <div className="text-[11px] text-muted-foreground">Meu Plano</div>
              <div className="text-sm font-semibold">{cli.plano || "Ver detalhes"}</div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/cliente/avisos">
          <Card>
            <CardContent className="p-4">
              <Info className="h-5 w-5 text-primary mb-2" />
              <div className="text-[11px] text-muted-foreground">Avisos</div>
              <div className="text-sm font-semibold">Central de comunicados</div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/cliente/chamados">
          <Card>
            <CardContent className="p-4">
              <LifeBuoy className="h-5 w-5 text-primary mb-2" />
              <div className="text-[11px] text-muted-foreground">Chamados</div>
              <div className="text-sm font-semibold">Abrir e acompanhar</div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/cliente/indique">
          <Card>
            <CardContent className="p-4">
              <Gift className="h-5 w-5 text-primary mb-2" />
              <div className="text-[11px] text-muted-foreground">Indique e ganhe</div>
              <div className="text-sm font-semibold">Desconto na mensalidade</div>
            </CardContent>
          </Card>
        </Link>
      </div>


      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
        <CardContent className="p-5 space-y-3 text-sm leading-relaxed">
          <p className="font-bold text-base">🚀 Chegou a internet que conecta você ao melhor da tecnologia! 🚀</p>
          <p>🌐 <span className="font-semibold">Dominion Net 5G</span> — internet rápida, estável e feita para sua casa.</p>

          <div>
            <p className="font-semibold mb-1">Confira nossos planos:</p>
            <ul className="space-y-1.5">
              <li>⚡ <span className="font-medium">Plano Internet 50 Mega</span> — 💰 R$ 49,90/mês</li>
              <li>🎬 <span className="font-medium">Internet + Netflix</span> — 💰 R$ 70,00/mês</li>
              <li>🍿 <span className="font-medium">Filmes e Séries</span> — 💰 R$ 90,00/mês</li>
              <li>📺 <span className="font-medium">TV por Assinatura</span> — 💰 R$ 130,00/mês</li>
            </ul>
          </div>

          <ul className="space-y-0.5">
            <li>✅ Internet rápida</li>
            <li>✅ Estabilidade para todos os dispositivos</li>
            <li>✅ Atendimento especializado</li>
          </ul>

          <div className="pt-2 border-t border-border/40">
            <p className="font-semibold">📲 Suporte WhatsApp:</p>
            <a href={suporteUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
              (82) 99382-3246
            </a>
          </div>

          <div>
            <p className="font-semibold">🕒 Horários:</p>
            <p>Segunda a sexta: 08:00 às 20:00</p>
            <p>Sábado: 08:00 às 17:00</p>
            <p>Domingo: 09:00 às 12:00</p>
          </div>

          <p className="text-center font-semibold pt-2">
            🌐 Dominion Net 5G<br />
            <span className="text-xs font-normal text-muted-foreground">
              Conectando você ao mundo com velocidade e qualidade!
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
