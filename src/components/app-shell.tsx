import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/mapa", label: "Mapa da Rede", icon: Map },
  { to: "/roteadores", label: "Roteadores", icon: RouterIcon },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/carnes", label: "Carnês", icon: FileText },
  { to: "/chamados", label: "Chamados", icon: LifeBuoy },
  { to: "/banners", label: "Banners", icon: ImageIcon },
  { to: "/avisos", label: "Avisos", icon: Megaphone },
  { to: "/pesquisa", label: "Pesquisa", icon: Search },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;


export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex w-full bg-background">
      <aside className="w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary ring-1 ring-primary/40">
              <Waves className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold tracking-tight">Dominion Net</div>
              <div className="text-[11px] text-muted-foreground">Gestão FTTH</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const active =
              pathname === item.to ||
              (item.to !== "/dashboard" && pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/15 text-primary font-medium ring-1 ring-primary/25"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={signOut}
          className="m-3 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
