import { createFileRoute } from "@tanstack/react-router";
import { verificarAdmin } from "@/lib/assistente/auth.server";

/** Limite de caracteres lidos em voz alta por requisição. */
const MAX_TEXTO = 1200;

export const Route = createFileRoute("/api/assistente/voz")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sessao = await verificarAdmin(request);
        if (!sessao) return new Response("Não autorizado", { status: 401 });

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("LOVABLE_API_KEY não configurada", { status: 500 });

        let texto = "";
        try {
          const body = (await request.json()) as { texto?: unknown };
          texto = typeof body.texto === "string" ? body.texto.trim().slice(0, MAX_TEXTO) : "";
        } catch {
          return new Response("Corpo inválido", { status: 400 });
        }
        if (!texto) return new Response("texto é obrigatório", { status: 400 });

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            input: texto,
            voice: "alloy",
            response_format: "mp3",
            instructions:
              "Fale em português do Brasil, em ritmo natural e tom profissional de atendimento técnico.",
          }),
        });

        if (!upstream.ok) {
          const detalhe = await upstream.text().catch(() => "");
          return new Response(detalhe || "Falha ao gerar áudio", { status: upstream.status });
        }

        return new Response(upstream.body, {
          headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
