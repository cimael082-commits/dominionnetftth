import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Home,
  Wallet,
  Bell,
  Wifi,
  MessageCircle,
  LogOut,
  User as UserIcon,
  Waves,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearClienteToken, getClienteToken } from "@/lib/cliente-auth";

export const Route = createFileRoute("/_area")({
  ssr: false,
  component: AreaLayout,
});

const nav = [
  { to: "/cliente", label: "Início", icon: Home },
  { to: "/cliente/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/cliente/conexao", label: "Conexão", icon: Waves },
  { to: "/cliente/wifi", label: "Wi-Fi", icon: Wifi },
  { to: "/cliente/avisos", label: "Avisos", icon: Bell },
  { to: "/cliente/atendimento", label: "Suporte", icon: MessageCircle },
] as const;

function AreaLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getClienteToken()) {
      navigate({ to: "/cliente/login", replace: true });
    } else {
      setReady(true);
    }
  }, [navigate]);

  if (!ready) return null;

  function sair() {
    clearClienteToken();
    navigate({ to: "/cliente/login", replace: true });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-card/80 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary ring-1 ring-primary/40">
              <Waves className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold">Dominion Net</div>
              <div className="text-[10px] text-muted-foreground">Área do Cliente</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/cliente/perfil"
              className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-accent"
              aria-label="Perfil"
            >
              <UserIcon className="h-4 w-4" />
            </Link>
            <button
              onClick={sair}
              className="rounded-full p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24">
        <div className="mx-auto max-w-3xl px-4 py-5">
          <Outlet />
        </div>
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-3xl grid grid-cols-6">
          {nav.map((n) => {
            const active =
              n.to === "/cliente"
                ? pathname === "/cliente"
                : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
