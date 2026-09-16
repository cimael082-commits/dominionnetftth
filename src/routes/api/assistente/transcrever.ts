import { createFileRoute } from "@tanstack/react-router";
import { verificarAdmin } from "@/lib/assistente/auth.server";

/** 20 MB — bem abaixo do limite do gateway, evita bufferizar uploads grandes. */
const MAX_BYTES = 20 * 1024 * 1024;

export const Route = createFileRoute("/api/assistente/transcrever")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sessao = await verificarAdmin(request);
        if (!sessao) return new Response("Não autorizado", { status: 401 });

        return new Response(
          JSON.stringify({ error: "Transcrição por IA desativada para reduzir o consumo de créditos." }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        );

        /* Recurso preservado abaixo para futura reativação consciente.
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("LOVABLE_API_KEY não configurada", { status: 500 });

        const form = await request.formData().catch(() => null);
        const audio = form?.get("audio");
        if (!(audio instanceof File) || audio.size === 0) {
          return new Response(JSON.stringify({ error: "Áudio ausente ou vazio" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (audio.size > MAX_BYTES) {
          return new Response(JSON.stringify({ error: "Gravação muito longa" }), {
            status: 413,
            headers: { "Content-Type": "application/json" },
          });
        }

        const upstream = new FormData();
        upstream.append("model", "openai/gpt-4o-mini-transcribe");
        upstream.append("file", audio, "gravacao.wav");
        upstream.append("language", "pt");

        const resposta = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: upstream,
        });

        const corpo = await resposta.text();
        if (!resposta.ok) {
          return new Response(JSON.stringify({ error: corpo || "Falha ao transcrever" }), {
            status: resposta.status,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(corpo, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
        */
      },
    },
  },
});
