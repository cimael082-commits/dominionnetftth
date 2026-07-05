/// <reference types="google.maps" />
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Zap,
  Route as RouteIcon,
  Box,
  Package,
  UserSearch,
  Users,
  Activity,
  Layers,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleMaps } from "@/hooks/use-google-maps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
type Rota = { id: string; nome: string; tipo: RotaTipo; status: InfraStatus; coordenadas: LatLng[] };
type Cliente = { id: string; nome: string; latitude: number | null; longitude: number | null; status: string; plano: string | null };

type Mode = "none" | "cto" | "ceo" | "rota";

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

const rotaColor: Record<RotaTipo, string> = {
  fibra: "#f59e0b",
  colibri: "#ec4899",
};

function MapaPage() {
  const { ready, error } = useGoogleMaps();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const drawingRef = useRef<{ points: LatLng[]; markers: google.maps.Marker[]; polyline: google.maps.Polyline | null }>({
    points: [],
    markers: [],
    polyline: null,
  });

  const [mapStyle, setMapStyle] = useState<"roadmap" | "hybrid">("roadmap");
  const [mode, setMode] = useState<Mode>("none");
  const modeRef = useRef<Mode>("none");
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const [pendingPoint, setPendingPoint] = useState<LatLng | null>(null);
  const [pendingKind, setPendingKind] = useState<"cto" | "ceo" | null>(null);
  const [pendingRoute, setPendingRoute] = useState<LatLng[] | null>(null);
  const [search, setSearch] = useState("");

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
        .select("id,nome,latitude,longitude,status,plano")
        .not("latitude", "is", null)
        .not("longitude", "is", null);
      if (error) throw error;
      return (data ?? []) as Cliente[];
    },
  });

  // Init map
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    mapRef.current = new google.maps.Map(containerRef.current, {
      center: { lat: -9.6658, lng: -35.7353 }, // Maceió
      zoom: 12,
      mapTypeId: mapStyle,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "greedy",
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
      } else if (cur === "rota") {
        const d = drawingRef.current;
        d.points.push(p);
        const m = new google.maps.Marker({
          position: p,
          map: mapRef.current!,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 4,
            fillColor: "#f59e0b",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 1,
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
      }
    });
  }, [ready, mapStyle]);

  // Update map style
  useEffect(() => {
    if (mapRef.current) mapRef.current.setMapTypeId(mapStyle);
  }, [mapStyle]);

  // Render markers/polylines
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    markersRef.current.forEach((m) => m.setMap(null));
    polylinesRef.current.forEach((p) => p.setMap(null));
    markersRef.current = [];
    polylinesRef.current = [];

    const map = mapRef.current;

    // CTOs — squares
    (ctosQ.data ?? []).forEach((c) => {
      const marker = new google.maps.Marker({
        position: { lat: Number(c.latitude), lng: Number(c.longitude) },
        map,
        title: `CTO ${c.nome}`,
        icon: {
          path: "M -8 -8 L 8 -8 L 8 8 L -8 8 z",
          fillColor: statusColor[c.status],
          fillOpacity: 1,
          strokeColor: "#0A1628",
          strokeWeight: 2,
          scale: 1,
        },
      });
      const info = new google.maps.InfoWindow({
        content: `<div style="color:#0A1628;font-family:system-ui;font-size:12px">
          <b>CTO ${c.nome}</b><br/>
          Status: ${statusLabel[c.status]}<br/>
          Portas livres: ${c.portas_livres}/${c.portas_totais}
        </div>`,
      });
      marker.addListener("click", () => info.open({ map, anchor: marker }));
      markersRef.current.push(marker);
    });

    // CEOs — diamonds
    (ceosQ.data ?? []).forEach((c) => {
      const marker = new google.maps.Marker({
        position: { lat: Number(c.latitude), lng: Number(c.longitude) },
        map,
        title: `CEO ${c.nome}`,
        icon: {
          path: "M 0 -9 L 9 0 L 0 9 L -9 0 z",
          fillColor: "#a855f7",
          fillOpacity: 1,
          strokeColor: "#0A1628",
          strokeWeight: 2,
          scale: 1,
        },
      });
      const info = new google.maps.InfoWindow({
        content: `<div style="color:#0A1628;font-family:system-ui;font-size:12px"><b>CEO/Emenda ${c.nome}</b><br/>Status: ${statusLabel[c.status]}</div>`,
      });
      marker.addListener("click", () => info.open({ map, anchor: marker }));
      markersRef.current.push(marker);
    });

    // Clientes — small green circles
    (clientesQ.data ?? []).forEach((cl) => {
      if (cl.latitude == null || cl.longitude == null) return;
      const marker = new google.maps.Marker({
        position: { lat: Number(cl.latitude), lng: Number(cl.longitude) },
        map,
        title: cl.nome,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: cl.status === "ativo" ? "#10b981" : "#6b7280",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 1.5,
        },
      });
      const info = new google.maps.InfoWindow({
        content: `<div style="color:#0A1628;font-family:system-ui;font-size:12px"><b>${cl.nome}</b><br/>${cl.plano ?? ""}<br/>Status: ${cl.status}</div>`,
      });
      marker.addListener("click", () => info.open({ map, anchor: marker }));
      markersRef.current.push(marker);
    });

    // Rotas
    (rotasQ.data ?? []).forEach((r) => {
      const path = Array.isArray(r.coordenadas) ? r.coordenadas : [];
      if (path.length < 2) return;
      const pl = new google.maps.Polyline({
        path,
        map,
        strokeColor: rotaColor[r.tipo],
        strokeWeight: 3,
        strokeOpacity: r.status === "desativado" ? 0.4 : 0.9,
        icons: r.status === "planejado" ? [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "10px" }] : undefined,
      });
      polylinesRef.current.push(pl);
    });
  }, [ready, ctosQ.data, ceosQ.data, rotasQ.data, clientesQ.data]);

  function cancelDrawing() {
    const d = drawingRef.current;
    d.markers.forEach((m) => m.setMap(null));
    if (d.polyline) d.polyline.setMap(null);
    drawingRef.current = { points: [], markers: [], polyline: null };
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
    if (m === "rota" && mode === "rota") {
      finishRoute();
      return;
    }
    if (mode === "rota" && m !== "rota") cancelDrawing();
    setMode(mode === m ? "none" : m);
  }

  const kpis = useMemo(() => {
    const rotas = rotasQ.data ?? [];
    const ctos = ctosQ.data ?? [];
    return {
      clientes: (clientesQ.data ?? []).length,
      ctos: ctos.length,
      rotas: rotas.length,
      fibras: rotas.filter((r) => r.tipo === "fibra").length,
      livres: ctos.reduce((s, c) => s + (c.portas_livres ?? 0), 0),
      pdas: ctos.reduce((s, c) => s + (c.portas_totais - c.portas_livres), 0),
      ativas: ctos.filter((c) => c.status === "ativo").length,
      planejadas: ctos.filter((c) => c.status === "planejado").length,
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
      <div ref={containerRef} className="absolute inset-0" />
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
            <UserSearch className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Left panel */}
      <div className="absolute top-4 left-4 z-10 w-64 space-y-3">
        <Panel title="Ferramentas">
          <ToolBtn active={mode === "rota" ? "active" : "idle"} icon={<Zap />} label={mode === "rota" ? "Concluir rota" : "Motor"} onClick={() => toggleMode("rota")} />
          <ToolBtn active={mode === "rota" ? "active" : "idle"} icon={<RouteIcon />} label="Desenhar Rota" onClick={() => toggleMode("rota")} />
          <ToolBtn active={mode === "cto" ? "active" : "idle"} icon={<Box />} label="CTO" onClick={() => toggleMode("cto")} />
          <ToolBtn active={mode === "ceo" ? "active" : "idle"} icon={<Package />} label="Caixa (CEO)" onClick={() => toggleMode("ceo")} />
          <ToolBtn icon={<UserSearch />} label="Localizar Cliente" onClick={() => document.querySelector<HTMLInputElement>('input[placeholder^="Buscar"]')?.focus()} />
          {mode === "rota" && drawingRef.current.points.length > 0 && (
            <button
              onClick={() => { cancelDrawing(); setMode("none"); }}
              className="w-full text-xs text-muted-foreground hover:text-foreground py-1"
            >
              Cancelar desenho
            </button>
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
            <LegendMarker shape="square" color="#f59e0b" label="CTO" />
            <LegendMarker shape="diamond" color="#a855f7" label="CEO/Emenda" />
            <LegendMarker shape="circle" color="#10b981" label="Cliente" />
          </div>
        </Panel>

        <Panel title="Rotas">
          <LegendMarker shape="line" color={rotaColor.fibra} label="Fibra" />
          <LegendMarker shape="line" color={rotaColor.colibri} label="Colibri" />
        </Panel>
      </div>

      {/* KPI bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-lg border border-border bg-background/95 backdrop-blur shadow-xl px-2 py-1.5">
        <div className="flex items-stretch divide-x divide-border/60">
          <Kpi icon={<Users />} value={kpis.clientes} label="Clientes" tone="text-cyan-400" />
          <Kpi icon={<Box />} value={kpis.ctos} label="CTOs" tone="text-blue-400" />
          <Kpi icon={<RouteIcon />} value={kpis.rotas} label="Rotas" tone="text-orange-400" />
          <Kpi icon={<Zap />} value={kpis.fibras} label="Fibras" tone="text-yellow-400" />
          <Kpi icon={<Activity />} value={kpis.livres} label="P. Livres" tone="text-emerald-400" />
          <Kpi icon={<Zap />} value={kpis.pdas} label="P. das" tone="text-rose-400" />
          <Kpi icon={<Activity />} value={kpis.ativas} label="Ativa" tone="text-emerald-400" />
          <Kpi icon={<Package />} value={kpis.planejadas} label="Planejadas" tone="text-amber-400" />
        </div>
      </div>

      {/* Dialogs */}
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

function ToolBtn({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active?: "active" | "idle" }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
        active === "active" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
      )}
    >
      <span className="h-4 w-4">{icon}</span>
      {label}
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

function LegendMarker({ shape, color, label }: { shape: "square" | "diamond" | "circle" | "line"; color: string; label: string }) {
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

function Kpi({ icon, value, label, tone }: { icon: React.ReactNode; value: number; label: string; tone: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-1 min-w-[60px]">
      <span className={cn("h-4 w-4 mb-0.5", tone)}>{icon}</span>
      <span className="text-lg font-bold leading-none">{value}</span>
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
              <Input type="number" min={1} value={portas} onChange={(e) => setPortas(e.target.value)} />
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
  const [status, setStatus] = useState<InfraStatus>("planejado");

  useEffect(() => {
    if (points) { setNome(""); setTipo("fibra"); setStatus("planejado"); }
  }, [points]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!points) return;
      const { error } = await db.from("rotas_fibra").insert({
        nome, tipo, status, coordenadas: points,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova rota ({points?.length ?? 0} pontos)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex: Backbone Centro" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as RotaTipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fibra">Fibra</SelectItem>
                  <SelectItem value="colibri">Colibri</SelectItem>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>Cancelar</Button>
          <Button onClick={() => nome.trim() ? mut.mutate() : toast.error("Informe o nome")} disabled={mut.isPending}>
            Salvar rota
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
