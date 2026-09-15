import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_area/cliente/teste-internet")({
  head: () => ({
    meta: [
      { title: "Teste de Internet — Dominion Net" },
      {
        name: "description",
        content: "Teste a velocidade da sua conexão de internet na Central do Cliente Dominion Net.",
      },
      { property: "og:title", content: "Teste de Internet — Dominion Net" },
      {
        property: "og:description",
        content: "Teste a velocidade da sua conexão na Central do Cliente Dominion Net.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TesteInternetPage,
});

function TesteInternetPage() {
  return (
    <section aria-labelledby="teste-internet-title" className="space-y-4">
      <header>
        <h1 id="teste-internet-title" className="text-2xl font-bold">
          Teste de Internet
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Meça a velocidade da sua conexão.
        </p>
      </header>

      <iframe
        src="https://maceivelocidade.lovable.app"
        title="Teste de Velocidade"
        allow="geolocation"
        className="h-[750px] min-h-[720px] w-full rounded-lg border-0 bg-card"
      />
    </section>
  );
}