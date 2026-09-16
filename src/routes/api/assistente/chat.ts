import { createFileRoute } from "@tanstack/react-router";
import { verificarAdmin } from "@/lib/assistente/auth.server";

export const Route = createFileRoute("/api/assistente/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sessao = await verificarAdmin(request);
        if (!sessao) return new Response("Não autorizado", { status: 401 });

        return Response.json(
          { error: "Assistente IA desativado para reduzir o consumo de créditos." },
          { status: 503 },
        );
      },
    },
  },
});
