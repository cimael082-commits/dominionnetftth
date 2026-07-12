/// <reference types="google.maps" />
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Zap,
  Route as RouteIcon,
  Box,
  Wrench,
  MapPin,
  Users,
  Activity,
  Layers,
  Search,
  Copy,
  X,
  Trash2,
  Scissors,
  Ruler,
  Save,
  Undo2,
  Plug,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleMaps } from "@/hooks/use-google-maps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const Route = createFileRoute("/_app/mapa")({
  head: () => ({ meta: [{ title: "Mapa da Rede — Dominion Net" }] }),
  component: MapaPage,
});

type LatLng = { lat: number; lng: number };
type InfraStatus = "planejado" | "implantacao" | "ativo" | "desativado";
type RotaTipo = "fibra" | "colibri";

type Cto = {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  portas_totais: number;
  portas_livres: number;
  status: InfraStatus;
};
type Ceo = { id: string; nome: string; latitude: number; longitude: number; status: InfraStatus };
type Rota = {
  id: string;
  nome: string;
  tipo: RotaTipo;
  status: InfraStatus;
  coordenadas: LatLng[];
  cor_cabo?: string | null;
  fibras_qtd?: number | null;
  fibras_usadas?: number | null;
  comprimento_m?: number | null;
  observacoes?: string | null;
};
type Cliente = { id: string; nome: string; latitude: number | null; longitude: number | null; status: string; plano: string | null; online: boolean; ip_atual: string | null; uptime_atual: string | null; ultima_sincronizacao: string | null; login_pppoe: string | null };

type Mode = "none" | "cto" | "ceo" | "rota" | "locate" | "split";

const statusColor: Record<InfraStatus, string> = {
  planejado: "#f59e0b",
  implantacao: "#3b82f6",
  ativo: "#10b981",
  desativado: "#6b7280",
};

const statusLabel: Record<InfraStatus, string> = {
  planejado: "Planejado",
  implantacao: "Em Implantação",
  ativo: "Ativo",
  desativado: "Desativado",
};

const CORES_CABO = [
  "#f59e0b", // laranja
  "#ec4899", // rosa
  "#3b82f6", // azul
  "#10b981", // verde
  "#a855f7", // roxo
  "#ef4444", // vermelho
  "#eab308", // amarelo
  "#0ea5e9", // ciano
  "#111827", // preto
  "#ffffff", // branco
];

function computePathLengthMeters(path: LatLng[]): number {
  if (!path || path.length < 2) return 0;
  const g = (window as unknown as { google?: typeof google }).google;
  if (!g?.maps?.geometry?.spherical) return 0;
  const latlngs = path.map((p) => new g.maps.LatLng(p.lat, p.lng));
  return g.maps.geometry.spherical.computeLength(latlngs);
}

function formatMeters(m: number): string {
  if (!Number.isFinite(m) || m <= 0) return "0 m";
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
}

function MapaPage() {
  const { ready, error } = useGoogleMaps();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<Array<{ id: string; pl: google.maps.Polyline }>>([]);
  const locateMarkerRef = useRef<google.maps.Marker | null>(null);
  const drawingRef = useRef<{ points: LatLng[]; markers: google.maps.Marker[]; polyline: google.maps.Polyline | null }>({
    points: [],
    markers: [],
    polyline: null,
  });
  const [drawingLen, setDrawingLen] = useState(0);

  const [mapStyle, setMapStyle] = useState<"roadmap" | "hybrid">("roadmap");
  const [mode, setMode] = useState<Mode>("none");
  const modeRef = useRef<Mode>("none");
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const [pendingPoint, setPendingPoint] = useState<LatLng | null>(null);
  const [pendingKind, setPendingKind] = useState<"cto" | "ceo" | null>(null);
  const [pendingRoute, setPendingRoute] = useState<LatLng[] | null>(null);
  const [locatedPoint, setLocatedPoint] = useState<LatLng | null>(null);
  const [search, setSearch] = useState("");
  const [editRota, setEditRota] = useState<Rota | null>(null);
  const [editCto, setEditCto] = useState<Cto | null>(null);
  const [editCeo, setEditCeo] = useState<Ceo | null>(null);
  const [splitRota, setSplitRota] = useState<Rota | null>(null);

  const ctosQ = useQuery({
    queryKey: ["map", "ctos"],
    queryFn: async () => {
      const { data, error } = await db.from("ctos").select("*");
      if (error) throw error;
      return (data ?? []) as Cto[];
    },
  });
  const ceosQ = useQuery({
    queryKey: ["map", "ceos"],
    queryFn: async () => {
      const { data, error } = await db.from("ceo_emendas").select("*");
      if (error) throw error;
      return (data ?? []) as Ceo[];
    },
  });
  const rotasQ = useQuery({
    queryKey: ["map", "rotas"],
    queryFn: async () => {
      const { data, error } = await db.from("rotas_fibra").select("*");
      if (error) throw error;
      return (data ?? []) as Rota[];
    },
  });
  const clientesQ = useQuery({
    queryKey: ["map", "clientes"],
    queryFn: async () => {
      const { data, error } = await db
        .from("clientes")
        .select("id,nome,latitude,longitude,status,plano,online,ip_atual,uptime_atual,ultima_sincronizacao,login_pppoe")
        .not("latitude", "is", null)
        .not("longitude", "is", null);
      if (error) throw error;
      return (data ?? []) as Cliente[];
    },
  });

  // Realtime: refresh client markers whenever clientes change (MikroTik sync)
  useEffect(() => {
    const ch = db
      .channel("clientes-online-map")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "clientes" },
        () => {
          clientesQ.refetch();
        },
      )
      .subscribe();
    return () => {
      db.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Init map (only when ready + not initialized yet)
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    mapRef.current = new google.maps.Map(containerRef.current, {
      center: { lat: -9.6658, lng: -35.7353 },
      zoom: 12,
      mapTypeId: mapStyle,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "greedy",
      clickableIcons: false,
    });

    mapRef.current.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const p: LatLng = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      const cur = modeRef.current;
      if (cur === "cto") {
        setPendingKind("cto");
        setPendingPoint(p);
      } else if (cur === "ceo") {
        setPendingKind("ceo");
        setPendingPoint(p);
      } else if (cur === "locate") {
        setLocatedPoint(p);
        if (locateMarkerRef.current) locateMarkerRef.current.setMap(null);
        locateMarkerRef.current = new google.maps.Marker({
          position: p,
          map: mapRef.current!,
          animation: google.maps.Animation.DROP,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: "#10b981",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 3,
          },
        });
      } else if (cur === "rota") {
        const d = drawingRef.current;
        d.points.push(p);
        const m = new google.maps.Marker({
          position: p,
          map: mapRef.current!,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 4.5,
            fillColor: "#f59e0b",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 1.5,
          },
        });
        d.markers.push(m);
        if (d.polyline) d.polyline.setPath(d.points);
        else {
          d.polyline = new google.maps.Polyline({
            path: d.points,
            map: mapRef.current!,
            strokeColor: "#f59e0b",
            strokeWeight: 3,
            strokeOpacity: 0.9,
          });
        }
        setDrawingLen(computePathLengthMeters(d.points));
      }
    });
  }, [ready, mapStyle]);

  useEffect(() => {
    if (mapRef.current) mapRef.current.setMapTypeId(mapStyle);
  }, [mapStyle]);

  // Render layers
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    markersRef.current.forEach((m) => m.setMap(null));
    polylinesRef.current.forEach((p) => p.pl.setMap(null));
    markersRef.current = [];
    polylinesRef.current = [];

    const map = mapRef.current;

    (ctosQ.data ?? []).forEach((c) => {
      const marker = new google.maps.Marker({
        position: { lat: Number(c.latitude), lng: Number(c.longitude) },
        map,
        title: `CTO ${c.nome} — ${c.portas_livres}/${c.portas_totais} livres`,
        icon: {
          path: "M -9 -9 L 9 -9 L 9 9 L -9 9 z",
          fillColor: statusColor[c.status],
          fillOpacity: 1,
          strokeColor: "#0A1628",
          strokeWeight: 2,
          scale: 1,
        },
        label: {
          text: `${c.portas_totais - c.portas_livres}/${c.portas_totais}`,
          color: "#fff",
          fontSize: "9px",
          fontWeight: "700",
        },
      });
      marker.addListener("click", () => setEditCto(c));
      markersRef.current.push(marker);
    });

    (ceosQ.data ?? []).forEach((c) => {
      const marker = new google.maps.Marker({
        position: { lat: Number(c.latitude), lng: Number(c.longitude) },
        map,
        title: `CEO ${c.nome}`,
        icon: {
          path: "M 0 -10 L 10 0 L 0 10 L -10 0 z",
          fillColor: "#a855f7",
          fillOpacity: 1,
          strokeColor: "#0A1628",
          strokeWeight: 2,
          scale: 1,
        },
      });
      marker.addListener("click", () => setEditCeo(c));
      markersRef.current.push(marker);
    });

    (clientesQ.data ?? []).forEach((cl) => {
      if (cl.latitude == null || cl.longitude == null) return;
      const cor = cl.online ? "#10b981" : "#ef4444";
      const marker = new google.maps.Marker({
        position: { lat: Number(cl.latitude), lng: Number(cl.longitude) },
        map,
        title: `${cl.nome} — ${cl.online ? "ONLINE" : "OFFLINE"}`,
        icon: {
          // House / home shape
          path: "M 0 -9 L 9 -1 L 9 8 L 3 8 L 3 2 L -3 2 L -3 8 L -9 8 L -9 -1 Z",
          fillColor: cor,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          scale: 1,
          anchor: new google.maps.Point(0, 4),
        },
        zIndex: cl.online ? 30 : 25,
      });
      const ultSync = cl.ultima_sincronizacao
        ? new Date(cl.ultima_sincronizacao).toLocaleString("pt-BR")
        : "—";
      const info = new google.maps.InfoWindow({
        content: `<div style="color:#0A1628;font-family:system-ui;font-size:12px;min-width:200px"><b>${cl.nome}</b><br/>${cl.plano ?? ""}<br/><b style="color:${cor}">${cl.online ? "● ONLINE" : "● OFFLINE"}</b><br/>PPPoE: ${cl.login_pppoe ?? "—"}<br/>IP: ${cl.ip_atual ?? "—"}<br/>Uptime: ${cl.uptime_atual ?? "—"}<br/>Última sync: ${ultSync}</div>`,
      });
      marker.addListener("click", () => info.open({ map, anchor: marker }));
      markersRef.current.push(marker);
    });

    (rotasQ.data ?? []).forEach((r) => {
      const path = Array.isArray(r.coordenadas) ? r.coordenadas : [];
      if (path.length < 2) return;
      const color = r.cor_cabo || (r.tipo === "colibri" ? "#ec4899" : "#f59e0b");
      const pl = new google.maps.Polyline({
        path,
        map,
        strokeColor: color,
        strokeWeight: 4,
        strokeOpacity: r.status === "desativado" ? 0.4 : 0.95,
        icons: r.status === "planejado"
          ? [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "10px" }]
          : undefined,
        clickable: true,
        zIndex: 20,
      });
      pl.addListener("click", (e: google.maps.PolyMouseEvent) => {
        const cur = modeRef.current;
        if (cur === "split") {
          performSplit(r, e);
        } else {
          setEditRota(r);
        }
      });
      polylinesRef.current.push({ id: r.id, pl });
    });
  }, [ready, ctosQ.data, ceosQ.data, rotasQ.data, clientesQ.data]);

  const cancelDrawing = useCallback(() => {
    const d = drawingRef.current;
    d.markers.forEach((m) => m.setMap(null));
    if (d.polyline) d.polyline.setMap(null);
    drawingRef.current = { points: [], markers: [], polyline: null };
    setDrawingLen(0);
  }, []);

  function undoLastPoint() {
    const d = drawingRef.current;
    if (d.points.length === 0) return;
    d.points.pop();
    const m = d.markers.pop();
    if (m) m.setMap(null);
    if (d.polyline) d.polyline.setPath(d.points);
    setDrawingLen(computePathLengthMeters(d.points));
  }

  function finishRoute() {
    const pts = [...drawingRef.current.points];
    if (pts.length < 2) {
      toast.error("Adicione ao menos 2 pontos à rota");
      return;
    }
    setPendingRoute(pts);
  }

  function toggleMode(m: Mode) {
    if (m === "rota" && mode === "rota") { finishRoute(); return; }
    if (mode === "rota" && m !== "rota") cancelDrawing();
    if (m === "locate" && mode === "locate") {
      if (locateMarkerRef.current) { locateMarkerRef.current.setMap(null); locateMarkerRef.current = null; }
      setLocatedPoint(null);
    }
    if (m === "split" && !splitRota) {
      toast.info("Abra uma rota primeiro e clique em 'Dividir'.");
      return;
    }
    setMode(mode === m ? "none" : m);
  }

  const qc = useQueryClient();
  async function performSplit(r: Rota, e: google.maps.PolyMouseEvent) {
    const path = Array.isArray(r.coordenadas) ? r.coordenadas : [];
    if (!e.latLng || path.length < 3) {
      toast.error("Rota muito curta para dividir");
      return;
    }
    const click = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    // Find nearest vertex index (not endpoints)
    let bestIdx = 1;
    let bestDist = Infinity;
    for (let i = 1; i < path.length - 1; i++) {
      const d = Math.hypot(path[i].lat - click.lat, path[i].lng - click.lng);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    const partA = path.slice(0, bestIdx + 1);
    const partB = path.slice(bestIdx);
    const lenA = computePathLengthMeters(partA);
    const lenB = computePathLengthMeters(partB);
    const baseCor = r.cor_cabo ?? "#f59e0b";
    const baseFibras = r.fibras_qtd ?? 12;
    try {
      const { error: e1 } = await db.from("rotas_fibra").insert([
        {
          nome: `${r.nome} A`,
          tipo: r.tipo,
          status: r.status,
          coordenadas: partA,
          cor_cabo: baseCor,
          fibras_qtd: baseFibras,
          fibras_usadas: r.fibras_usadas ?? 0,
          comprimento_m: lenA,
          observacoes: r.observacoes ?? null,
        },
        {
          nome: `${r.nome} B`,
          tipo: r.tipo,
          status: r.status,
          coordenadas: partB,
          cor_cabo: baseCor,
          fibras_qtd: baseFibras,
          fibras_usadas: r.fibras_usadas ?? 0,
          comprimento_m: lenB,
          observacoes: r.observacoes ?? null,
        },
      ]);
      if (e1) throw e1;
      const { error: e2 } = await db.from("rotas_fibra").delete().eq("id", r.id);
      if (e2) throw e2;
      toast.success("Rota dividida em 2 partes");
      setSplitRota(null);
      setMode("none");
      qc.invalidateQueries({ queryKey: ["map"] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const kpis = useMemo(() => {
    const rotas = rotasQ.data ?? [];
    const ctos = ctosQ.data ?? [];
    const clientes = clientesQ.data ?? [];
    const online = clientes.filter((c) => c.online).length;
    return {
      clientes: clientes.length,
      online,
      offline: clientes.length - online,
      ctos: ctos.length,
      rotas: rotas.length,
      metros: Math.round(rotas.reduce((s, r) => s + (Number(r.comprimento_m) || computePathLengthMeters(r.coordenadas ?? [])), 0)),
      fibras: rotas.reduce((s, r) => s + (r.fibras_qtd ?? 0), 0),
      livres: ctos.reduce((s, c) => s + (c.portas_livres ?? 0), 0),
      pdas: ctos.reduce((s, c) => s + (c.portas_totais - c.portas_livres), 0),
      ativas: ctos.filter((c) => c.status === "ativo").length,
    };
  }, [rotasQ.data, ctosQ.data, clientesQ.data]);

  async function handleSearch() {
    const q = search.trim();
    if (!q || !mapRef.current) return;
    const { data } = await db
      .from("clientes")
      .select("id,nome,latitude,longitude")
      .not("latitude", "is", null)
      .or(`nome.ilike.%${q}%,cpf_cnpj.ilike.%${q}%,endereco.ilike.%${q}%`)
      .limit(1);
    const found = data?.[0];
    if (!found) {
      toast.error("Cliente não localizado ou sem coordenadas");
      return;
    }
    mapRef.current.panTo({ lat: Number(found.latitude), lng: Number(found.longitude) });
    mapRef.current.setZoom(17);
  }

  if (error) {
    return (
      <div className="p-8 text-sm text-destructive">
        Erro ao carregar Google Maps: {error}
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full">
      <div ref={containerRef} className={cn(
        "absolute inset-0",
        (mode === "locate" || mode === "cto" || mode === "ceo" || mode === "rota" || mode === "split") && "cursor-crosshair",
      )} />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-muted-foreground">
          Carregando mapa...
        </div>
      )}

      {/* Search bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[min(520px,calc(100%-2rem))]">
        <div className="relative">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Buscar cliente, CTO, rota, caixa..."
            className="h-11 rounded-full shadow-lg bg-background/95 backdrop-blur border-border pr-11"
          />
          <button
            onClick={handleSearch}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
            aria-label="Buscar"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Left panel */}
      <div className="absolute top-4 left-4 z-10 w-64 space-y-3">
        <Panel title="Ferramentas">
          <ToolBtn
            active={mode === "rota"}
            iconBg="#f59e0b"
            icon={<RouteIcon className="h-3.5 w-3.5" />}
            label={mode === "rota" && drawingRef.current.points.length >= 2 ? "Concluir rota" : "Desenhar Rota"}
            onClick={() => toggleMode("rota")}
          />
          <ToolBtn
            active={mode === "cto"}
            iconBg="#8B5A2B"
            icon={<Box className="h-3.5 w-3.5" />}
            label="CTO"
            onClick={() => toggleMode("cto")}
          />
          <ToolBtn
            active={mode === "ceo"}
            iconBg="#a855f7"
            icon={<Wrench className="h-3.5 w-3.5" />}
            label="Caixa (CEO)"
            onClick={() => toggleMode("ceo")}
          />
          <ToolBtn
            active={mode === "locate"}
            iconBg="#10b981"
            icon={<MapPin className="h-3.5 w-3.5" />}
            label="Localizar Cliente"
            onClick={() => toggleMode("locate")}
          />
          {mode === "rota" && (
            <div className="mt-1 rounded-md bg-muted/40 px-2 py-1.5 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Pontos:</span>
                <span className="font-mono font-semibold">{drawingRef.current.points.length}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Metragem:</span>
                <span className="font-mono font-semibold">{formatMeters(drawingLen)}</span>
              </div>
              <div className="flex gap-1 pt-1">
                <button
                  onClick={undoLastPoint}
                  className="flex-1 flex items-center justify-center gap-1 rounded bg-background border border-border px-2 py-1 text-[11px] hover:bg-muted"
                >
                  <Undo2 className="h-3 w-3" /> Desfazer
                </button>
                <button
                  onClick={() => { cancelDrawing(); setMode("none"); }}
                  className="flex-1 rounded bg-background border border-border px-2 py-1 text-[11px] hover:bg-muted text-muted-foreground"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
          {mode === "locate" && (
            <p className="text-[10px] text-muted-foreground px-2 pt-1">
              Clique no mapa para capturar a coordenada.
            </p>
          )}
          {mode === "split" && splitRota && (
            <div className="mt-1 rounded-md bg-orange-500/10 border border-orange-500/30 px-2 py-1.5 text-[11px]">
              <div className="font-semibold text-orange-500 mb-0.5">Modo Dividir</div>
              <div className="text-muted-foreground">Clique num vértice de <b>{splitRota.nome}</b> para dividir.</div>
              <button
                onClick={() => { setSplitRota(null); setMode("none"); }}
                className="mt-1 w-full rounded bg-background border border-border px-2 py-0.5 hover:bg-muted text-muted-foreground"
              >
                Cancelar
              </button>
            </div>
          )}
        </Panel>

        <Panel title="Mapa">
          <div className="flex gap-1 rounded-md bg-muted p-1">
            <button
              onClick={() => setMapStyle("roadmap")}
              className={cn(
                "flex-1 text-xs rounded px-2 py-1.5 transition-colors",
                mapStyle === "roadmap" ? "bg-primary text-primary-foreground" : "hover:bg-background",
              )}
            >
              Rua
            </button>
            <button
              onClick={() => setMapStyle("hybrid")}
              className={cn(
                "flex-1 text-xs rounded px-2 py-1.5 transition-colors",
                mapStyle === "hybrid" ? "bg-primary text-primary-foreground" : "hover:bg-background",
              )}
            >
              <Layers className="h-3 w-3 inline mr-1" />
              Satélite
            </button>
          </div>
        </Panel>

        <Panel title="Legenda">
          <LegendRow color={statusColor.planejado} label="Planejado" dashed />
          <LegendRow color={statusColor.implantacao} label="Em Implantação" />
          <LegendRow color={statusColor.ativo} label="Ativo" />
          <LegendRow color={statusColor.desativado} label="Desativado" dashed />
          <div className="mt-2 pt-2 border-t border-border/50 space-y-1.5">
            <LegendMarker shape="square" color="#8B5A2B" label="CTO" />
            <LegendMarker shape="diamond" color="#a855f7" label="CEO/Emenda" />
            <LegendMarker shape="house" color="#10b981" label="Cliente ONLINE" />
            <LegendMarker shape="house" color="#ef4444" label="Cliente OFFLINE" />
          </div>
        </Panel>
      </div>

      {/* Locate coord card */}
      {locatedPoint && (
        <div className="absolute top-24 right-4 z-10 w-72 rounded-lg border border-border bg-background/95 backdrop-blur shadow-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="font-semibold text-sm">Coordenada</div>
            </div>
            <button
              onClick={() => {
                setLocatedPoint(null);
                if (locateMarkerRef.current) { locateMarkerRef.current.setMap(null); locateMarkerRef.current = null; }
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Latitude</div>
            <div className="font-mono text-sm">{locatedPoint.lat.toFixed(6)}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2">Longitude</div>
            <div className="font-mono text-sm">{locatedPoint.lng.toFixed(6)}</div>
          </div>
          <Button
            className="w-full"
            size="sm"
            onClick={async () => {
              const txt = `${locatedPoint.lat.toFixed(6)}, ${locatedPoint.lng.toFixed(6)}`;
              try {
                await navigator.clipboard.writeText(txt);
                toast.success("Coordenada copiada", { description: txt });
              } catch {
                toast.error("Não foi possível copiar");
              }
            }}
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar para colar no cliente
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            Cole no campo "Localização (lat, lng)" ao cadastrar o cliente.
          </p>
        </div>
      )}

      {/* KPI bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-lg border border-border bg-background/95 backdrop-blur shadow-xl px-2 py-1.5">
        <div className="flex items-stretch divide-x divide-border/60">
          <Kpi icon={<Users />} value={kpis.clientes} label="Clientes" tone="text-cyan-400" />
          <Kpi icon={<Activity />} value={kpis.online} label="Online" tone="text-emerald-400" />
          <Kpi icon={<Activity />} value={kpis.offline} label="Offline" tone="text-rose-500" />
          <Kpi icon={<Box />} value={kpis.ctos} label="CTOs" tone="text-amber-600" />
          <Kpi icon={<RouteIcon />} value={kpis.rotas} label="Rotas" tone="text-orange-400" />
          <Kpi icon={<Ruler />} value={formatMeters(kpis.metros)} label="Metragem" tone="text-sky-400" />
          <Kpi icon={<Zap />} value={kpis.fibras} label="Fibras" tone="text-yellow-400" />
          <Kpi icon={<Activity />} value={kpis.livres} label="P. Livres" tone="text-emerald-400" />
          <Kpi icon={<Plug />} value={kpis.pdas} label="P. Usadas" tone="text-rose-400" />
          <Kpi icon={<Activity />} value={kpis.ativas} label="Ativas" tone="text-emerald-400" />
        </div>
      </div>

      <CtoCeoDialog
        open={!!pendingPoint}
        kind={pendingKind}
        point={pendingPoint}
        onClose={() => { setPendingPoint(null); setPendingKind(null); setMode("none"); }}
      />
      <RotaDialog
        points={pendingRoute}
        onClose={(saved) => {
          setPendingRoute(null);
          if (saved) { cancelDrawing(); setMode("none"); }
        }}
      />
      <EditRotaDialog
        rota={editRota}
        onClose={() => setEditRota(null)}
        onSplit={(r) => { setEditRota(null); setSplitRota(r); setMode("split"); }}
      />
      <EditCtoDialog
        cto={editCto}
        onClose={() => setEditCto(null)}
      />
      <EditCeoDialog
        ceo={editCeo}
        onClose={() => setEditCeo(null)}
      />
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background/95 backdrop-blur shadow-lg p-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 pb-1.5">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ToolBtn({
  icon,
  iconBg,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
        active ? "bg-primary/15 ring-1 ring-primary/40" : "hover:bg-muted",
      )}
    >
      <span
        className="h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-white shadow-sm"
        style={{ background: iconBg }}
      >
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function LegendRow({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className="h-1 w-6 rounded"
        style={{
          background: dashed ? `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 8px)` : color,
        }}
      />
      <span>{label}</span>
    </div>
  );
}

function LegendMarker({ shape, color, label }: { shape: "square" | "diamond" | "circle" | "line" | "house"; color: string; label: string }) {
  if (shape === "house") {
    return (
      <div className="flex items-center gap-2 text-xs">
        <svg width="14" height="14" viewBox="-10 -10 20 20" aria-hidden>
          <path d="M 0 -9 L 9 -1 L 9 8 L 3 8 L 3 2 L -3 2 L -3 8 L -9 8 L -9 -1 Z" fill={color} stroke="#fff" strokeWidth="1.5" />
        </svg>
        <span>{label}</span>
      </div>
    );
  }
  const style: React.CSSProperties = { background: color };
  const cls =
    shape === "square" ? "h-3 w-3 rounded-sm" :
    shape === "diamond" ? "h-3 w-3 rotate-45" :
    shape === "circle" ? "h-3 w-3 rounded-full" :
    "h-0.5 w-4";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={cls} style={style} />
      <span>{label}</span>
    </div>
  );
}

function Kpi({ icon, value, label, tone }: { icon: React.ReactNode; value: number | string; label: string; tone: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-1 min-w-[60px]">
      <span className={cn("h-4 w-4 mb-0.5", tone)}>{icon}</span>
      <span className="text-lg font-bold leading-none whitespace-nowrap">{value}</span>
      <span className="text-[9px] text-muted-foreground leading-tight text-center mt-0.5">{label}</span>
    </div>
  );
}

function CtoCeoDialog({ open, kind, point, onClose }: { open: boolean; kind: "cto" | "ceo" | null; point: LatLng | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [status, setStatus] = useState<InfraStatus>("ativo");
  const [portas, setPortas] = useState("8");

  useEffect(() => {
    if (open) { setNome(""); setStatus("ativo"); setPortas("8"); }
  }, [open]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!point || !kind) return;
      const base = { nome, latitude: point.lat, longitude: point.lng, status };
      if (kind === "cto") {
        const p = parseInt(portas) || 8;
        const { error } = await db.from("ctos").insert({ ...base, portas_totais: p, portas_livres: p });
        if (error) throw error;
      } else {
        const { error } = await db.from("ceo_emendas").insert(base);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(kind === "cto" ? "CTO adicionada" : "CEO/Emenda adicionada");
      qc.invalidateQueries({ queryKey: ["map"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{kind === "cto" ? "Nova CTO" : "Nova CEO/Emenda"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome / Identificação</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex: CTO-01" />
          </div>
          {kind === "cto" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Portas</Label>
              <Select value={portas} onValueChange={setPortas}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[4, 8, 16, 24, 32].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} portas</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as InfraStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planejado">Planejado</SelectItem>
                <SelectItem value="implantacao">Em Implantação</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="desativado">Desativado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {point && (
            <div className="text-xs text-muted-foreground">
              Lat: {point.lat.toFixed(6)} · Lng: {point.lng.toFixed(6)}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => nome.trim() ? mut.mutate() : toast.error("Informe o nome")} disabled={mut.isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RotaDialog({ points, onClose }: { points: LatLng[] | null; onClose: (saved: boolean) => void }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<RotaTipo>("fibra");
  const [fibrasQtd, setFibrasQtd] = useState("12");
  const [fibrasUsadas, setFibrasUsadas] = useState("0");
  const [corCabo, setCorCabo] = useState("#f59e0b");
  const [status, setStatus] = useState<InfraStatus>("planejado");
  const [observacoes, setObservacoes] = useState("");

  const comprimento = useMemo(() => (points ? computePathLengthMeters(points) : 0), [points]);

  useEffect(() => {
    if (points) {
      setNome(""); setTipo("fibra"); setFibrasQtd("12"); setFibrasUsadas("0");
      setCorCabo("#f59e0b"); setStatus("planejado"); setObservacoes("");
    }
  }, [points]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!points) return;
      const { error } = await db.from("rotas_fibra").insert({
        nome,
        tipo,
        status,
        coordenadas: points,
        fibras_qtd: parseInt(fibrasQtd) || 12,
        fibras_usadas: Math.max(0, parseInt(fibrasUsadas) || 0),
        cor_cabo: corCabo,
        comprimento_m: Math.round(comprimento * 100) / 100,
        observacoes: observacoes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rota salva");
      qc.invalidateQueries({ queryKey: ["map"] });
      onClose(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!points} onOpenChange={(v) => !v && onClose(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Rota de Fibra</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Metragem calculada:</span>
            <span className="font-mono font-bold text-primary">{formatMeters(comprimento)}</span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Nome da Rota *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Cabo Rua Goiás" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Fibras Total</Label>
              <Select value={fibrasQtd} onValueChange={setFibrasQtd}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[6, 12, 24, 36, 48, 72, 96, 144].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} fibras</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fibras Usadas</Label>
              <Input
                type="number"
                min={0}
                max={parseInt(fibrasQtd) || 12}
                value={fibrasUsadas}
                onChange={(e) => setFibrasUsadas(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Cor do Cabo</Label>
            <ColorPicker value={corCabo} onChange={setCorCabo} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as RotaTipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fibra">Fibra</SelectItem>
                  <SelectItem value="colibri">Cabo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as InfraStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planejado">Planejado</SelectItem>
                  <SelectItem value="implantacao">Em Implantação</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="desativado">Desativado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Observações</Label>
            <Textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Notas sobre a rota (opcional)"
            />
          </div>

          <div className="text-[10px] text-muted-foreground">
            {points?.length ?? 0} ponto(s) desenhado(s)
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>Cancelar</Button>
          <Button
            onClick={() => nome.trim() ? mut.mutate() : toast.error("Informe o nome da rota")}
            disabled={mut.isPending}
          >
            {mut.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap rounded-md border border-input bg-background p-1.5">
      {CORES_CABO.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            "h-6 w-6 rounded-full border transition-transform",
            value === c ? "ring-2 ring-offset-1 ring-offset-background ring-primary scale-110" : "border-border/60",
          )}
          style={{ background: c }}
          aria-label={c}
        />
      ))}
    </div>
  );
}

function EditRotaDialog({ rota, onClose, onSplit }: { rota: Rota | null; onClose: () => void; onSplit: (r: Rota) => void }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<RotaTipo>("fibra");
  const [fibrasQtd, setFibrasQtd] = useState("12");
  const [fibrasUsadas, setFibrasUsadas] = useState("0");
  const [corCabo, setCorCabo] = useState("#f59e0b");
  const [status, setStatus] = useState<InfraStatus>("ativo");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (rota) {
      setNome(rota.nome);
      setTipo(rota.tipo);
      setFibrasQtd(String(rota.fibras_qtd ?? 12));
      setFibrasUsadas(String(rota.fibras_usadas ?? 0));
      setCorCabo(rota.cor_cabo ?? "#f59e0b");
      setStatus(rota.status);
      setObservacoes(rota.observacoes ?? "");
    }
  }, [rota]);

  const comprimento = useMemo(() => (rota ? Number(rota.comprimento_m) || computePathLengthMeters(rota.coordenadas ?? []) : 0), [rota]);
  const total = parseInt(fibrasQtd) || 0;
  const usadas = Math.min(total, Math.max(0, parseInt(fibrasUsadas) || 0));
  const livres = Math.max(0, total - usadas);

  const save = useMutation({
    mutationFn: async () => {
      if (!rota) return;
      const { error } = await db.from("rotas_fibra").update({
        nome,
        tipo,
        status,
        cor_cabo: corCabo,
        fibras_qtd: total,
        fibras_usadas: usadas,
        comprimento_m: Math.round(comprimento * 100) / 100,
        observacoes: observacoes || null,
      }).eq("id", rota.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rota atualizada");
      qc.invalidateQueries({ queryKey: ["map"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      if (!rota) return;
      const { error } = await db.from("rotas_fibra").delete().eq("id", rota.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rota removida");
      qc.invalidateQueries({ queryKey: ["map"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!rota) return null;

  return (
    <Dialog open={!!rota} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RouteIcon className="h-5 w-5" style={{ color: corCabo }} />
            Editar Rota
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <StatBox label="Metragem" value={formatMeters(comprimento)} tone="text-sky-500" />
            <StatBox label="Fibras livres" value={`${livres}/${total}`} tone="text-emerald-500" />
            <StatBox label="Fibras usadas" value={`${usadas}`} tone="text-rose-500" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Fibras Total</Label>
              <Select value={fibrasQtd} onValueChange={setFibrasQtd}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[6, 12, 24, 36, 48, 72, 96, 144].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} fibras</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fibras Usadas</Label>
              <Input
                type="number"
                min={0}
                max={total}
                value={fibrasUsadas}
                onChange={(e) => setFibrasUsadas(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Cor do Cabo</Label>
            <ColorPicker value={corCabo} onChange={setCorCabo} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as RotaTipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fibra">Fibra</SelectItem>
                  <SelectItem value="colibri">Cabo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as InfraStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planejado">Planejado</SelectItem>
                  <SelectItem value="implantacao">Em Implantação</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="desativado">Desativado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Observações</Label>
            <Textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <Button
            variant="outline"
            className="mr-auto"
            onClick={() => onSplit(rota)}
          >
            <Scissors className="h-4 w-4" /> Dividir
          </Button>
          <Button
            variant="destructive"
            onClick={() => { if (confirm(`Excluir rota "${rota.nome}"?`)) del.mutate(); }}
          >
            <Trash2 className="h-4 w-4" /> Excluir
          </Button>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="h-4 w-4" /> Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("font-bold text-sm", tone)}>{value}</div>
    </div>
  );
}

type Porta = {
  id: string;
  cto_id: string;
  porta_numero: number;
  cliente_id: string | null;
  observacao: string | null;
};

function EditCtoDialog({ cto, onClose }: { cto: Cto | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [status, setStatus] = useState<InfraStatus>("ativo");
  const [portasTotais, setPortasTotais] = useState("8");

  useEffect(() => {
    if (cto) {
      setNome(cto.nome);
      setStatus(cto.status);
      setPortasTotais(String(cto.portas_totais));
    }
  }, [cto]);

  const portasQ = useQuery({
    queryKey: ["cto_portas", cto?.id],
    enabled: !!cto,
    queryFn: async () => {
      const { data, error } = await db
        .from("cto_portas")
        .select("*")
        .eq("cto_id", cto!.id)
        .order("porta_numero");
      if (error) throw error;
      return (data ?? []) as Porta[];
    },
  });

  const clientesQ = useQuery({
    queryKey: ["all-clientes-select"],
    queryFn: async () => {
      const { data, error } = await db.from("clientes").select("id,nome").order("nome");
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string }[];
    },
  });

  const saveDados = useMutation({
    mutationFn: async () => {
      if (!cto) return;
      const { error } = await db.from("ctos").update({
        nome,
        status,
        portas_totais: parseInt(portasTotais) || cto.portas_totais,
      }).eq("id", cto.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("CTO atualizada");
      qc.invalidateQueries({ queryKey: ["map"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const savePorta = useMutation({
    mutationFn: async (p: { id: string; cliente_id: string | null; observacao: string | null }) => {
      const { error } = await db.from("cto_portas").update({
        cliente_id: p.cliente_id,
        observacao: p.observacao,
      }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cto_portas", cto?.id] });
      qc.invalidateQueries({ queryKey: ["map"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      if (!cto) return;
      const { error } = await db.from("ctos").delete().eq("id", cto.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("CTO removida");
      qc.invalidateQueries({ queryKey: ["map"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!cto) return null;

  return (
    <Dialog open={!!cto} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Box className="h-5 w-5 text-amber-700" />
            CTO {cto.nome}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="portas">
          <TabsList>
            <TabsTrigger value="portas"><Plug className="h-4 w-4" /> Portas</TabsTrigger>
            <TabsTrigger value="dados">Dados</TabsTrigger>
          </TabsList>

          <TabsContent value="portas" className="space-y-2">
            <div className="text-xs text-muted-foreground">
              Vincule cada porta a um cliente. As portas livres são recalculadas automaticamente.
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left p-2 w-14">#</th>
                    <th className="text-left p-2">Cliente</th>
                    <th className="text-left p-2">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {(portasQ.data ?? []).map((p) => (
                    <PortaRow
                      key={p.id}
                      porta={p}
                      clientes={clientesQ.data ?? []}
                      onSave={(patch) => savePorta.mutate({ id: p.id, ...patch })}
                    />
                  ))}
                  {(!portasQ.data || portasQ.data.length === 0) && (
                    <tr><td colSpan={3} className="p-4 text-center text-muted-foreground text-xs">
                      {portasQ.isLoading ? "Carregando..." : "Sem portas configuradas."}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="dados" className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as InfraStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planejado">Planejado</SelectItem>
                    <SelectItem value="implantacao">Em Implantação</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="desativado">Desativado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Portas Totais</Label>
                <Input
                  type="number"
                  min={1}
                  value={portasTotais}
                  onChange={(e) => setPortasTotais(e.target.value)}
                  disabled
                  title="Alterar portas totais é feito recriando a CTO"
                />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Lat: {Number(cto.latitude).toFixed(6)} · Lng: {Number(cto.longitude).toFixed(6)}
            </div>
            <div className="flex justify-between pt-2">
              <Button
                variant="destructive"
                onClick={() => { if (confirm(`Excluir CTO ${cto.nome}?`)) del.mutate(); }}
              >
                <Trash2 className="h-4 w-4" /> Excluir CTO
              </Button>
              <Button onClick={() => saveDados.mutate()} disabled={saveDados.isPending}>
                <Save className="h-4 w-4" /> Salvar dados
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PortaRow({
  porta,
  clientes,
  onSave,
}: {
  porta: Porta;
  clientes: { id: string; nome: string }[];
  onSave: (patch: { cliente_id: string | null; observacao: string | null }) => void;
}) {
  const [clienteId, setClienteId] = useState<string>(porta.cliente_id ?? "__none");
  const [obs, setObs] = useState<string>(porta.observacao ?? "");
  const occupied = clienteId !== "__none";

  useEffect(() => {
    setClienteId(porta.cliente_id ?? "__none");
    setObs(porta.observacao ?? "");
  }, [porta.id, porta.cliente_id, porta.observacao]);

  const dirty = (clienteId === "__none" ? null : clienteId) !== porta.cliente_id
    || (obs || null) !== (porta.observacao || null);

  return (
    <tr className="border-t border-border/50">
      <td className="p-2">
        <span className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-bold",
          occupied ? "bg-rose-500/15 text-rose-500 ring-1 ring-rose-500/30" : "bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30",
        )}>
          {porta.porta_numero}
        </span>
      </td>
      <td className="p-2">
        <Select value={clienteId} onValueChange={setClienteId}>
          <SelectTrigger className="h-8"><SelectValue placeholder="Livre" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">— Livre —</SelectItem>
            {clientes.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="p-2">
        <div className="flex gap-1.5">
          <Input
            className="h-8"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Notas..."
          />
          {dirty && (
            <Button
              size="sm"
              className="h-8 px-2 shrink-0"
              onClick={() => onSave({ cliente_id: clienteId === "__none" ? null : clienteId, observacao: obs || null })}
            >
              <Save className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

function EditCeoDialog({ ceo, onClose }: { ceo: Ceo | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [status, setStatus] = useState<InfraStatus>("ativo");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  useEffect(() => {
    if (ceo) {
      setNome(ceo.nome);
      setStatus(ceo.status);
      setLat(String(ceo.latitude));
      setLng(String(ceo.longitude));
    }
  }, [ceo]);

  const save = useMutation({
    mutationFn: async () => {
      if (!ceo) return;
      const patch: Record<string, unknown> = { nome, status };
      const nLat = parseFloat(lat);
      const nLng = parseFloat(lng);
      if (!Number.isNaN(nLat)) patch.latitude = nLat;
      if (!Number.isNaN(nLng)) patch.longitude = nLng;
      const { error } = await db.from("ceo_emendas").update(patch).eq("id", ceo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("CEO atualizada");
      qc.invalidateQueries({ queryKey: ["map"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      if (!ceo) return;
      const { error } = await db.from("ceo_emendas").delete().eq("id", ceo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("CEO removida");
      qc.invalidateQueries({ queryKey: ["map"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!ceo) return null;

  return (
    <Dialog open={!!ceo} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-purple-500" />
            Editar CEO/Emenda
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome / Identificação</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as InfraStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planejado">Planejado</SelectItem>
                <SelectItem value="implantacao">Em Implantação</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="desativado">Desativado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Latitude</Label>
              <Input value={lat} onChange={(e) => setLat(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Longitude</Label>
              <Input value={lng} onChange={(e) => setLng(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <Button
            variant="destructive"
            className="mr-auto"
            onClick={() => { if (confirm(`Excluir CEO "${ceo.nome}"?`)) del.mutate(); }}
          >
            <Trash2 className="h-4 w-4" /> Excluir
          </Button>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => nome.trim() ? save.mutate() : toast.error("Informe o nome")} disabled={save.isPending}>
            <Save className="h-4 w-4" /> Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
