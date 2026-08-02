import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Waves } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { getClienteToken, setClienteToken } from "@/lib/cliente-auth";

export const Route = createFileRoute("/cliente/login")({
  head: () => ({
    meta: [
      { title: "Área do Cliente — Dominion Net" },
      { name: "description", content: "Acesse sua conta Dominion Net para ver faturas, PIX, avisos e status da conexão." },
    ],
  }),
  component: LoginCliente,
});

function LoginCliente() {
  const navigate = useNavigate();
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getClienteToken()) navigate({ to: "/cliente", replace: true });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/public/cliente/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identificador, senha }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) throw new Error(data.error || "Falha no login");
      setClienteToken(data.token, remember);
      toast.success("Bem-vindo!");
      navigate({ to: "/cliente", replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,oklch(0.3_0.1_245)_0%,transparent_50%),radial-gradient(circle_at_85%_90%,oklch(0.3_0.12_260)_0%,transparent_55%)]" />
      <Card className="w-full max-w-md relative border-border/60 bg-card/85 backdrop-blur">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <Waves className="h-7 w-7" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Área do Cliente</CardTitle>
            <CardDescription>Dominion Net — acesse sua conta</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ident">CPF ou telefone</Label>
              <Input
                id="ident"
                inputMode="numeric"
                autoComplete="username"
                required
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                placeholder="Ex.: 123.456.789-00 ou (82) 99999-9999"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                autoComplete="current-password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
              <Checkbox
                checked={remember}
                onCheckedChange={(v) => setRemember(v === true)}
              />
              Permanecer conectado
            </label>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            <div className="text-xs text-center text-muted-foreground pt-2">
              Login com Google/Facebook em breve. <br />
              Esqueceu a senha? Contate o suporte no WhatsApp.
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
