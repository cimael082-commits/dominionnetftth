import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search as SearchIcon, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { clienteStatusMeta, formatBRL, type ClienteStatus } from "@/lib/status-utils";

export const Route = createFileRoute("/_app/pesquisa")({
  head: () => ({ meta: [{ title: "Pesquisa — Dominion Net" }] }),
  component: PesquisaPage,
});

function PesquisaPage() {
  const [term, setTerm] = useState("");

  const q = useQuery({
    queryKey: ["pesquisa", term],
    enabled: term.trim().length >= 2,
    queryFn: async () => {
      const s = `%${term.trim()}%`;
      const { data } = await supabase
        .from("clientes")
        .select("id,nome,cpf_cnpj,telefone,endereco,bairro,cidade,plano,valor_mensalidade,status")
        .or(
          `nome.ilike.${s},cpf_cnpj.ilike.${s},telefone.ilike.${s},whatsapp.ilike.${s},endereco.ilike.${s},bairro.ilike.${s},cidade.ilike.${s}`,
        )
        .limit(50);
      return data ?? [];
    },
  });

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Pesquisa</h1>
        <p className="text-muted-foreground mt-1">
          Localize clientes por nome, telefone, CPF, endereço ou bairro.
        </p>
      </header>

      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          className="pl-12 h-14 text-base"
          autoFocus
          placeholder="Digite para pesquisar..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>

      {term.trim().length < 2 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Digite pelo menos 2 caracteres.
        </p>
      ) : q.isLoading ? (
        <p className="text-muted-foreground">Buscando...</p>
      ) : q.data && q.data.length > 0 ? (
        <div className="space-y-2">
          {q.data.map((c) => {
            const m = clienteStatusMeta[c.status as ClienteStatus];
            return (
              <Link key={c.id} to="/clientes/$id" params={{ id: c.id }}>
                <Card className="p-4 hover:border-primary/60 hover:bg-accent/30 transition-colors flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center ring-1 ring-primary/30">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{c.nome}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[c.telefone, c.cpf_cnpj, c.endereco, c.bairro].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-primary">{formatBRL(c.valor_mensalidade)}</div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${m.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} /> {m.label}
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-8">Nenhum resultado.</p>
      )}
    </div>
  );
}
