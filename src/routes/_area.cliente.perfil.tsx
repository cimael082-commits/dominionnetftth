import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { User, MapPin, Mail, Phone, Hash, Gift } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { clienteFetch } from "@/lib/cliente-auth";

export const Route = createFileRoute("/_area/cliente/perfil")({
  component: PerfilPage,
});

type Cliente = {
  nome: string;
  cpf_cnpj: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  plano: string | null;
  login_pppoe: string | null;
};

function PerfilPage() {
  const [cli, setCli] = useState<Cliente | null>(null);
  useEffect(() => {
    clienteFetch<{ cliente: Cliente }>("/api/public/cliente/me").then((r) => setCli(r.cliente));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Meu perfil</h1>
      <Card>
        <CardContent className="p-4 space-y-3">
          <Row icon={User} label="Nome" value={cli?.nome} />
          <Row icon={Hash} label="CPF/CNPJ" value={cli?.cpf_cnpj} />
          <Row icon={Mail} label="E-mail" value={cli?.email} />
          <Row icon={Phone} label="Telefone" value={cli?.telefone} />
          <Row
            icon={MapPin}
            label="Endereço"
            value={
              cli
                ? [cli.endereco, cli.bairro, cli.cidade && `${cli.cidade}${cli.estado ? "/" + cli.estado : ""}`, cli.cep]
                    .filter(Boolean)
                    .join(", ")
                : ""
            }
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 space-y-3">
          <Row icon={Hash} label="Plano" value={cli?.plano} />
          {/* Credencial técnica: ocultada por privacidade. */}
          <Row icon={User} label="Login PPPoE" value="********" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">Aparência</div>
            <p className="text-xs text-muted-foreground">Alternar entre modo claro e escuro.</p>
          </div>
          <ThemeToggle className="border border-border/60" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">Indique e ganhe</div>
            <p className="text-xs text-muted-foreground">Ganhe desconto indicando amigos.</p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/cliente/indique">
              <Gift className="h-3.5 w-3.5 mr-1" /> Ver
            </Link>
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Para alterar dados cadastrais, fale com o suporte.
      </p>
    </div>
  );
}


function Row({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm font-medium break-words">{value || "—"}</div>
      </div>
    </div>
  );
}
