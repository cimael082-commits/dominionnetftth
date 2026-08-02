import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search as SearchIcon, User, Pencil, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { clienteStatusMeta, formatBRL, type ClienteStatus } from "@/lib/status-utils";
import { EditClienteDialog } from "@/components/EditClienteDialog";
import { WhatsappButton } from "@/components/whatsapp-button";

export const Route = createFileRoute("/_app/pesquisa")({
  head: () => ({
    meta: [
      { title: "Pesquisa de clientes — Dominion Net" },
      {
        name: "description",
        content:
          "Pesquisa instantânea de assinantes por nome, CPF/CNPJ, telefone ou código do cliente.",
      },
    ],
  }),
  component: PesquisaPage,
});

type ClienteRow = NonNullable<Parameters<typeof EditClienteDialog>[0]["cliente"]>;

/** Detecta se o termo parece um código/UUID de cliente. */
function isCodigo(term: string) {
  return /^[0-9a-f-]{6,}$/i.test(term) && /[0-9a-f]{6}/i.test(term);
}

function PesquisaPage() {
  const [term, setTerm] = useState("");
  const [editing, setEditing] = useState<ClienteRow | null>(null);

  const q = useQuery({
    queryKey: ["pesquisa", term],
    enabled: term.trim().length >= 1,
    queryFn: async () => {
      const t = term.trim();
      const s = `%${t}%`;
      // Também aceita busca só por dígitos (telefone/CPF formatados no cadastro)
      const filters = [
        `nome.ilike.${s}`,
        `cpf_cnpj.ilike.${s}`,
        `cpf_cnpj_norm.ilike.${s}`,
        `telefone.ilike.${s}`,
        `whatsapp.ilike.${s}`,
        `login_pppoe.ilike.${s}`,
        `codigo_indicacao.ilike.${s}`,
        `endereco.ilike.${s}`,
        `bairro.ilike.${s}`,
        `cidade.ilike.${s}`,
      ];
      if (isCodigo(t)) filters.push(`id.eq.${t}`);

      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .or(filters.join(","))
        .order("nome")
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as ClienteRow[];
    },
  });

  const results = q.data ?? [];

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Pesquisa</h1>
        <p className="text-muted-foreground mt-1">
          Nome, CPF/CNPJ, telefone, login PPPoE, código, endereço ou bairro. Clique no
          resultado para abrir a ficha completa e editar.
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

      {term.trim().length < 1 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Comece a digitar para ver os resultados instantaneamente.
        </p>
      ) : q.isLoading ? (
        <p className="text-muted-foreground">Buscando...</p>
      ) : results.length > 0 ? (
        <div className="space-y-2">
          {results.map((c) => {
            const m = clienteStatusMeta[c.status as ClienteStatus];
            return (
              <Card
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => setEditing(c)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setEditing(c);
                  }
                }}
                className="p-4 cursor-pointer hover:border-primary/60 hover:bg-accent/30 transition-colors flex items-center gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center ring-1 ring-primary/30 shrink-0">
                  <User className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold truncate">{c.nome}</span>
                    <WhatsappButton
                      cliente={c}
                      message={`Olá ${c.nome}, aqui é da Dominion Net.`}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[c.telefone, c.cpf_cnpj, c.endereco, c.bairro]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <div className="font-semibold text-primary">
                    {formatBRL(c.valor_mensalidade)}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${m.badge}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} /> {m.label}
                  </span>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(c);
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
                    >
                      <Pencil className="h-3 w-3" /> Editar
                    </button>
                    <Link
                      to="/clientes/$id"
                      params={{ id: c.id }}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
                    >
                      <ExternalLink className="h-3 w-3" /> Ficha
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-8">Nenhum resultado.</p>
      )}

      <EditClienteDialog
        cliente={editing}
        open={editing !== null}
        onOpenChange={(v) => {
          if (!v) setEditing(null);
        }}
      />
    </div>
  );
}
