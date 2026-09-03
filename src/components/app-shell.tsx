import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  Wallet,
  FileText,
  Search,
  LogOut,
  Waves,
  Settings,
  Map,
  Megaphone,
  Router as RouterIcon,
  LifeBuoy,
  ImageIcon,
  Bot,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/assistente", label: "Assistente IA", icon: Bot },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/mapa", label: "Mapa da Rede", icon: Map },
  { to: "/roteadores", label: "Roteadores", icon: RouterIcon },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/carnes", label: "Carnês", icon: FileText },
  { to: "/chamados", label: "Chamados", icon: LifeBuoy },
  { to: "/banners", label: "Banners", icon: ImageIcon },
  { to: "/avisos", label: "Avisos", icon: Megaphone },
  { to: "/pesquisa", label: "Pesquisa", icon: Search },
  { to: "/logs", label: "Logs", icon: ClipboardList },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

/** Chave de persistência do estado do menu no navegador. */
const STORAGE_KEY = "dn:sidebar-collapsed";

/**
 * Lê a preferência salva. Em telas pequenas o padrão é recolhido,
 * para dar mais área ao mapa sem exigir ação do usuário.
 */
function readInitialCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "1") return true;
    if (saved === "0") return false;
  } catch {
    /* localStorage indisponível (modo privado) — usa o padrão */
  }
  return window.innerWidth < 768;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  // Inicia expandido no SSR e sincroniza após a hidratação, evitando mismatch.
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsed(readInitialCollapsed());
    setHydrated(true);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignora falha de persistência */
      }
      return next;
    });
  }, []);

  // Mapas (Google Maps/Leaflet) recalculam o canvas ao receber resize;
  // disparamos ao fim da animação para o mapa ocupar o novo espaço.
  useEffect(() => {
    if (!hydrated) return;
    const t = window.setTimeout(() => window.dispatchEvent(new Event("resize")), 320);
    return () => window.clearTimeout(t);
  }, [collapsed, hydrated]);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex w-full bg-background">
      <aside
        data-collapsed={collapsed ? "true" : "false"}
        className={cn(
          "relative shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col",
          "transition-[width] duration-300 ease-in-out",
          collapsed ? "w-16" : "w-64",
        )}
      >
        {/* Botão de recolher/expandir — fica na borda direita, à altura de Financeiro */}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Abrir menu" : "Recolher menu"}
          aria-expanded={!collapsed}
          title={collapsed ? "Abrir menu" : "Recolher menu"}
          className="absolute -right-3 top-1/2 z-30 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-md transition-colors hover:bg-sidebar-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        <div className={cn("border-b border-sidebar-border", collapsed ? "p-3" : "p-5")}>
          <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary ring-1 ring-primary/40">
              <Waves className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate font-bold tracking-tight">Dominion Net</div>
                <div className="text-[11px] text-muted-foreground">Gestão FTTH</div>
              </div>
            )}
          </div>
        </div>

        <nav className={cn("flex-1 space-y-1 overflow-y-auto", collapsed ? "p-2" : "p-3")}>
          {nav.map((item) => {
            const active =
              pathname === item.to ||
              (item.to !== "/dashboard" && pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md py-2 text-sm transition-colors",
                  collapsed ? "justify-center px-0" : "px-3",
                  active
                    ? "bg-primary/15 text-primary font-medium ring-1 ring-primary/25"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={signOut}
          title={collapsed ? "Sair" : undefined}
          className={cn(
            "m-3 flex items-center gap-3 rounded-md py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            collapsed ? "justify-center px-0" : "px-3",
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && "Sair"}
        </button>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto">{children}</main>
    </div>
  );
}
