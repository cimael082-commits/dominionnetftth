import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { clienteFetch } from "@/lib/cliente-auth";

export const Route = createFileRoute("/_area/cliente/atendimento")({
  component: AtendimentoPage,
});

type Cliente = { nome: string };

function AtendimentoPage() {
  const [cli, setCli] = useState<Cliente | null>(null);
  const [telefone, setTelefone] = useState<string | null>(null);

  useEffect(() => {
    clienteFetch<{ cliente: Cliente }>("/api/public/cliente/me").then((r) => setCli(r.cliente));
    supabase
      .from("configuracoes_empresa")
      .select("telefone")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.telefone) setTelefone(data.telefone);
      });
  }, []);

  const wa = (telefone || "").replace(/\D/g, "");
  const nome = cli?.nome || "cliente";
  const msg = encodeURIComponent(`Olá! Sou ${nome} e preciso de suporte.`);
  const waLink = wa ? `https://wa.me/55${wa}?text=${msg}` : "";
  const telLink = telefone ? `tel:${telefone.replace(/\D/g, "")}` : "";

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Atendimento</h1>
      <Card>
        <CardContent className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Nossa equipe está pronta para ajudar. Escolha um canal:
          </p>
          <Button asChild disabled={!waLink} className="w-full bg-emerald-500 hover:bg-emerald-500/90 text-white">
            <a href={waLink || "#"} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp {telefone ? `(${telefone})` : ""}
            </a>
          </Button>
          {telLink && (
            <Button asChild variant="outline" className="w-full">
              <a href={telLink}>
                <Phone className="h-4 w-4 mr-2" /> Ligar {telefone}
              </a>
            </Button>
          )}
          {!wa && !telLink && (
            <p className="text-xs text-destructive">Contato ainda não configurado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
