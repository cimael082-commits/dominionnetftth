import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ClipboardList,
  RefreshCw,
  Trash2,
  Download,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  AlertOctagon,
  CalendarClock,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/logs")({
  head: () => ({
    meta: [
      { title: "Logs do Sistema — Dominion Net" },
      {
        name: "description",
        content:
          "Registro centralizado de eventos do sistema: login, sincronização MikroTik, clientes online/offline e erros de API.",
      },
      { property: "og:title", content: "Logs do Sistema — Dominion Net" },
      {
        property: "og:description",
        content: "Consulte, filtre e exporte todos os eventos registrados pelo sistema.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LogsPage,
});

/* ------------------------------------------------------------------ tipos */

interface LogRow {
  id: string;
  data_hora: string;
  tipo: string;
  categoria: string;
  origem: string | null;
  cliente_id: string | null;
  cliente_nome: string | null;
  usuario: string | null;
  descricao: string;
  equipamento: string | null;
  ip: string | null;
  status: string;
}

const TIPOS = ["INFO", "SUCESSO", "ALERTA", "ERRO", "CRITICO"] as const;
const CATEGORIAS = [
  "Sistema",
  "MikroTik",
  "OLT",
  "ONU",
  "API",
  "Financeiro",
  "Cliente",
  "Login",
  "Seguranca",
  "Rede",
] as const;

/** Cada tipo tem cor própria para leitura rápida na tabela. */
const tipoMeta: Record<string, { label: string; badge: string }> = {
  INFO: { label: "INFO", badge: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  SUCESSO: { label: "SUCESSO", badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  ALERTA: { label: "ALERTA", badge: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  ERRO: { label: "ERRO", badge: "bg-red-500/15 text-red-300 border-red-500/30" },
  CRITICO: { label: "CRÍTICO", badge: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30" },
};

const PAGINA = 50;

type PeriodoFiltro = "hoje" | "ontem" | "7d" | "30d" | "todos";

function limitesPeriodo(p: PeriodoFiltro): { de?: string; ate?: string } {
  const agora = new Date();
  const inicioDeHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const dia = 86_400_000;
  switch (p) {
    case "hoje":
      return { de: inicioDeHoje.toISOString() };
    case "ontem":
      return {
        de: new Date(inicioDeHoje.getTime() - dia).toISOString(),
        ate: inicioDeHoje.toISOString(),
      };
    case "7d":
      return { de: new Date(inicioDeHoje.getTime() - 6 * dia).toISOString() };
    case "30d":
      return { de: new Date(inicioDeHoje.getTime() - 29 * dia).toISOString() };
    default:
      return {};
  }
}

function fmtData(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR");
}

/* ---------------------------------------------------------------- página */

function LogsPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  const [linhas, setLinhas] = useState<LogRow[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [temMais, setTemMais] = useState(false);

  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [tipo, setTipo] = useState<string>("todos");
  const [categoria, setCategoria] = useState<string>("todas");
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("7d");
  const [ordem, setOrdem] = useState<"recentes" | "antigos">("recentes");

  const [resumo, setResumo] = useState({ total: 0, erros: 0, alertas: 0, hoje: 0 });
  const [excluindo, setExcluindo] = useState<LogRow | null>(null);
  const [excluindoTudo, setExcluindoTudo] = useState(false);

  // Debounce da busca — evita uma consulta por tecla digitada.
  useEffect(() => {
    const t = window.setTimeout(() => setBuscaAplicada(busca.trim()), 350);
    return () => window.clearTimeout(t);
  }, [busca]);

  useEffect(() => {
    if (!user) return;
    let ativo = true;
    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data }) => {
        if (ativo) setIsAdmin(data === true);
      });
    return () => {
      ativo = false;
    };
  }, [user]);

  /** Monta a consulta base já com todos os filtros aplicados. */
  const montarQuery = useCallback(() => {
    let q = supabase
      .from("logs")
      .select(
        "id,data_hora,tipo,categoria,origem,cliente_id,cliente_nome,usuario,descricao,equipamento,ip,status",
      );

    const { de, ate } = limitesPeriodo(periodo);
    if (de) q = q.gte("data_hora", de);
    if (ate) q = q.lt("data_hora", ate);
    if (tipo !== "todos") q = q.eq("tipo", tipo);
    if (categoria !== "todas") q = q.eq("categoria", categoria);
    if (buscaAplicada) {
      const s = `%${buscaAplicada}%`;
      q = q.or(
        `descricao.ilike.${s},cliente_nome.ilike.${s},usuario.ilike.${s},equipamento.ilike.${s},origem.ilike.${s},ip.ilike.${s}`,
      );
    }
    return q.order("data_hora", { ascending: ordem === "antigos" });
  }, [periodo, tipo, categoria, buscaAplicada, ordem]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await montarQuery().range(0, PAGINA - 1);
    setCarregando(false);
    if (error) {
      toast.error("Não foi possível carregar os logs", { description: error.message });
      return;
    }
    const rows = (data as LogRow[]) ?? [];
    setLinhas(rows);
    setTemMais(rows.length === PAGINA);
  }, [montarQuery]);

  const carregarMais = useCallback(async () => {
    setCarregandoMais(true);
    const inicio = linhas.length;
    const { data, error } = await montarQuery().range(inicio, inicio + PAGINA - 1);
    setCarregandoMais(false);
    if (error) {
      toast.error("Falha ao carregar mais registros", { description: error.message });
      return;
    }
    const rows = (data as LogRow[]) ?? [];
    setLinhas((prev) => [...prev, ...rows]);
    setTemMais(rows.length === PAGINA);
  }, [montarQuery, linhas.length]);

  const carregarResumo = useCallback(async () => {
    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);
    const iso = inicioHoje.toISOString();
    const contar = async (aplicar: (q: ReturnType<typeof base>) => ReturnType<typeof base>) => {
      const { count } = await aplicar(base());
      return count ?? 0;
    };
    function base() {
      return supabase.from("logs").select("id", { count: "exact", head: true });
    }
    const [total, erros, alertas, hoje] = await Promise.all([
      contar((q) => q),
      contar((q) => q.in("tipo", ["ERRO", "CRITICO"])),
      contar((q) => q.eq("tipo", "ALERTA")),
      contar((q) => q.gte("data_hora", iso)),
    ]);
    setResumo({ total, erros, alertas, hoje });
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);
  useEffect(() => {
    carregarResumo();
  }, [carregarResumo]);

  // Tempo real: novo log entra na tela sem recarregar a página.
  const carregarRef = useRef(carregar);
  carregarRef.current = carregar;
  const resumoRef = useRef(carregarResumo);
  resumoRef.current = carregarResumo;
  useEffect(() => {
    const canal = supabase
      .channel("logs-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "logs" }, () => {
        carregarRef.current();
        resumoRef.current();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  const ultimoEvento = useMemo(() => {
    if (linhas.length === 0) return null;
    return ordem === "recentes" ? linhas[0] : linhas[linhas.length - 1];
  }, [linhas, ordem]);

  /* ------------------------------------------------------------ exclusão */

  async function excluirUm() {
    if (!excluindo) return;
    const { error } = await supabase.from("logs").delete().eq("id", excluindo.id);
    if (error) {
      toast.error("Falha ao excluir", { description: error.message });
      return;
    }
    toast.success("Registro excluído");
    setExcluindo(null);
    carregar();
    carregarResumo();
  }

  async function excluirTodos() {
    const { error } = await supabase
      .from("logs")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    setExcluindoTudo(false);
    if (error) {
      toast.error("Falha ao excluir os logs", { description: error.message });
      return;
    }
    toast.success("Todos os logs foram excluídos");
    carregar();
    carregarResumo();
  }

  /* ---------------------------------------------------------- exportação */

  /** Carrega até 5000 registros com os filtros atuais para exportar. */
  async function dadosParaExportar(): Promise<LogRow[]> {
    const { data, error } = await montarQuery().range(0, 4999);
    if (error) {
      toast.error("Falha ao preparar a exportação", { description: error.message });
      return [];
    }
    return (data as LogRow[]) ?? [];
  }

  const COLUNAS = [
    "Data/Hora",
    "Tipo",
    "Categoria",
    "Origem",
    "Cliente",
    "Usuário",
    "Descrição",
    "Equipamento",
    "IP",
    "Status",
  ];

  function paraMatriz(rows: LogRow[]): string[][] {
    return rows.map((l) => [
      fmtData(l.data_hora),
      l.tipo,
      l.categoria,
      l.origem ?? "—",
      l.cliente_nome ?? "—",
      l.usuario ?? "—",
      l.descricao,
      l.equipamento ?? "—",
      l.ip ?? "—",
      l.status,
    ]);
  }

  function baixar(conteudo: BlobPart, nome: string, mime: string) {
    const url = URL.createObjectURL(new Blob([conteudo], { type: mime }));
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    a.click();
    URL.revokeObjectURL(url);
  }

  const carimbo = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");

  async function exportarCsv() {
    const rows = await dadosParaExportar();
    if (rows.length === 0) return;
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [COLUNAS, ...paraMatriz(rows)].map((l) => l.map(esc).join(";")).join("\r\n");
    // BOM garante acentuação correta ao abrir no Excel.
    baixar("\uFEFF" + csv, `logs-${carimbo()}.csv`, "text/csv;charset=utf-8");
    toast.success(`${rows.length} registros exportados em CSV`);
  }

  async function exportarExcel() {
    const rows = await dadosParaExportar();
    if (rows.length === 0) return;
    const escHtml = (v: string) =>
      v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const thead = `<tr>${COLUNAS.map((c) => `<th>${escHtml(c)}</th>`).join("")}</tr>`;
    const tbody = paraMatriz(rows)
      .map((l) => `<tr>${l.map((c) => `<td>${escHtml(c)}</td>`).join("")}</tr>`)
      .join("");
    const html = `<html><head><meta charset="utf-8" /></head><body><table border="1">${thead}${tbody}</table></body></html>`;
    baixar("\uFEFF" + html, `logs-${carimbo()}.xls`, "application/vnd.ms-excel;charset=utf-8");
    toast.success(`${rows.length} registros exportados em Excel`);
  }

  async function exportarPdf() {
    const rows = await dadosParaExportar();
    if (rows.length === 0) return;
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const larguras = [30, 18, 22, 30, 38, 38, 62, 26, 24];
    const cabecalho = COLUNAS.slice(0, 9);
    let y = 18;

    const escreverCabecalho = () => {
      doc.setFontSize(13);
      doc.text("Logs do Sistema — Dominion Net", 10, 12);
      doc.setFontSize(7);
      let x = 10;
      doc.setFont("helvetica", "bold");
      cabecalho.forEach((c, i) => {
        doc.text(c, x, y);
        x += larguras[i] ?? 20;
      });
      doc.setFont("helvetica", "normal");
      y += 4;
    };

    escreverCabecalho();
    for (const linha of paraMatriz(rows)) {
      if (y > 195) {
        doc.addPage();
        y = 18;
        escreverCabecalho();
      }
      let x = 10;
      linha.slice(0, 9).forEach((celula, i) => {
        const largura = larguras[i] ?? 20;
        const texto = doc.splitTextToSize(celula, largura - 2)[0] ?? "";
        doc.text(String(texto), x, y);
        x += largura;
      });
      y += 4.2;
    }
    doc.setFontSize(7);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 10, 203);
    doc.save(`logs-${carimbo()}.pdf`);
    toast.success(`${rows.length} registros exportados em PDF`);
  }

  /* -------------------------------------------------------------- render */

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Logs do Sistema</h1>
            <p className="text-sm text-muted-foreground">
              Eventos registrados automaticamente, em tempo real.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => { carregar(); carregarResumo(); }}>
            <RefreshCw className={cn("h-4 w-4", carregando && "animate-spin")} />
            Atualizar
          </Button>
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={exportarCsv}>
                <Download className="h-4 w-4" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportarExcel}>
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={exportarPdf}>
                <FileText className="h-4 w-4" /> PDF
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setExcluindoTudo(true)}>
                <Trash2 className="h-4 w-4" /> Excluir todos
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Resumo */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <ResumoCard titulo="Total de logs" valor={resumo.total} icone={ClipboardList} />
        <ResumoCard titulo="Erros" valor={resumo.erros} icone={AlertOctagon} cor="text-red-400" />
        <ResumoCard titulo="Alertas" valor={resumo.alertas} icone={AlertTriangle} cor="text-amber-400" />
        <ResumoCard titulo="Eventos hoje" valor={resumo.hoje} icone={CalendarClock} cor="text-sky-400" />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Activity className="h-4 w-4" /> Último evento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ultimoEvento ? (
              <div className="space-y-1">
                <div className="truncate text-sm font-medium">{ultimoEvento.descricao}</div>
                <div className="text-xs text-muted-foreground">{fmtData(ultimoEvento.data_hora)}</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Nenhum evento</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="grid grid-cols-1 gap-3 pt-6 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            placeholder="Pesquisar cliente, usuário, equipamento, IP ou palavra-chave..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="lg:col-span-2"
          />
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {TIPOS.map((t) => (
                <SelectItem key={t} value={t}>{tipoMeta[t]?.label ?? t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {CATEGORIAS.map((c) => (
                <SelectItem key={c} value={c}>{c === "Seguranca" ? "Segurança" : c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ordem} onValueChange={(v) => setOrdem(v as "recentes" | "antigos")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recentes">Mais recentes</SelectItem>
              <SelectItem value="antigos">Mais antigos</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-5">
            {([
              ["hoje", "Hoje"],
              ["ontem", "Ontem"],
              ["7d", "Últimos 7 dias"],
              ["30d", "Últimos 30 dias"],
              ["todos", "Todos"],
            ] as const).map(([valor, rotulo]) => (
              <Button
                key={valor}
                size="sm"
                variant={periodo === valor ? "default" : "outline"}
                onClick={() => setPeriodo(valor)}
              >
                {rotulo}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Data/Hora</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Categoria</th>
                  <th className="px-3 py-2">Origem</th>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Usuário</th>
                  <th className="px-3 py-2">Descrição</th>
                  <th className="px-3 py-2">Equipamento</th>
                  <th className="px-3 py-2">Status</th>
                  {isAdmin && <th className="px-3 py-2 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {carregando && linhas.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">
                      Carregando registros...
                    </td>
                  </tr>
                )}
                {!carregando && linhas.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">
                      Nenhum log encontrado com os filtros atuais.
                    </td>
                  </tr>
                )}
                {linhas.map((l) => (
                  <tr key={l.id} className="border-b border-border/60 hover:bg-muted/30">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                      {fmtData(l.data_hora)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="outline"
                        className={cn("border", tipoMeta[l.tipo]?.badge ?? "")}
                      >
                        {tipoMeta[l.tipo]?.label ?? l.tipo}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {l.categoria === "Seguranca" ? "Segurança" : l.categoria}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{l.origem ?? "—"}</td>
                    <td className="px-3 py-2">{l.cliente_nome ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{l.usuario ?? "—"}</td>
                    <td className="px-3 py-2">{l.descricao}</td>
                    <td className="px-3 py-2 text-muted-foreground">{l.equipamento ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{l.status}</td>
                    {isAdmin && (
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Excluir registro"
                          onClick={() => setExcluindo(l)}
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {temMais && (
            <div className="flex justify-center border-t border-border p-3">
              <Button variant="outline" size="sm" onClick={carregarMais} disabled={carregandoMais}>
                {carregandoMais ? "Carregando..." : "Carregar mais"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este registro?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluirUm}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={excluindoTudo} onOpenChange={setExcluindoTudo}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir TODOS os logs?</AlertDialogTitle>
            <AlertDialogDescription>
              Todo o histórico de eventos será apagado permanentemente. Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluirTodos}>Excluir tudo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ResumoCard({
  titulo,
  valor,
  icone: Icone,
  cor,
}: {
  titulo: string;
  valor: number;
  icone: React.ComponentType<{ className?: string }>;
  cor?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Icone className={cn("h-4 w-4", cor)} /> {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold tracking-tight", cor)}>
          {valor.toLocaleString("pt-BR")}
        </div>
      </CardContent>
    </Card>
  );
}
