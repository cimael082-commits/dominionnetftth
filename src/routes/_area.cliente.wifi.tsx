import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wifi, Eye, EyeOff, Copy } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { clienteFetch } from "@/lib/cliente-auth";

export const Route = createFileRoute("/_area/cliente/wifi")({
  component: WifiPage,
});

type Cliente = { wifi_ssid: string | null; wifi_senha: string | null };

function WifiPage() {
  const [cli, setCli] = useState<Cliente | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    clienteFetch<{ cliente: Cliente }>("/api/public/cliente/me").then((r) => setCli(r.cliente));
  }, []);

  function copy(v: string | null | undefined) {
    if (!v) return;
    navigator.clipboard.writeText(v);
    toast.success("Copiado!");
  }

  const ssid = cli?.wifi_ssid;
  const senha = cli?.wifi_senha;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Dados da rede Wi-Fi</h1>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center ring-1 ring-primary/30">
              <Wifi className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Rede (SSID)</div>
              <div className="text-lg font-bold">{ssid || "Não cadastrada"}</div>
            </div>
            {ssid && (
              <Button size="icon" variant="ghost" className="ml-auto" onClick={() => copy(ssid)}>
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="rounded-lg border border-border/60 bg-background/40 p-3">
            <div className="text-xs text-muted-foreground mb-1">Senha</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-base break-all">
                {senha ? (show ? senha : "•".repeat(Math.min(senha.length, 14))) : "Não cadastrada"}
              </div>
              {senha && (
                <>
                  <Button size="icon" variant="ghost" onClick={() => setShow((s) => !s)}>
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => copy(senha)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {!ssid && !senha && (
            <p className="text-xs text-muted-foreground">
              Suas credenciais Wi-Fi ainda não foram cadastradas pelo suporte. Fale com nossa equipe pelo WhatsApp.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
