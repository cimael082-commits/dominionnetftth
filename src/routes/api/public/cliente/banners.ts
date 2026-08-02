import { createFileRoute } from "@tanstack/react-router";
import { CLIENTE_CORS, jsonResp, requireCliente } from "@/lib/cliente-auth.server";

export const Route = createFileRoute("/api/public/cliente/banners")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CLIENTE_CORS }),
      GET: async ({ request }) => {
        const clienteId = await requireCliente(request);
        if (!clienteId) return jsonResp(401, { error: "Não autorizado" });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const hoje = new Date().toISOString().slice(0, 10);
        const { data, error } = await supabaseAdmin
          .from("banners")
          .select("id, titulo, descricao, imagem_url, botao_texto, botao_url, tipo, cor, ordem, inicio_em, fim_em")
          .eq("ativo", true)
          .order("ordem", { ascending: true })
          .order("created_at", { ascending: false })
          .limit(20);
        if (error) return jsonResp(500, { error: error.message });

        const vigentes = (data ?? []).filter(
          (b) => (!b.inicio_em || b.inicio_em <= hoje) && (!b.fim_em || b.fim_em >= hoje),
        );

        const banners = await Promise.all(
          vigentes.map(async (b) => {
            let imagem: string | null = null;
            if (b.imagem_url) {
              if (/^https?:\/\//i.test(b.imagem_url)) {
                imagem = b.imagem_url;
              } else {
                const { data: signed } = await supabaseAdmin.storage
                  .from("banners")
                  .createSignedUrl(b.imagem_url, 60 * 60 * 6);
                imagem = signed?.signedUrl ?? null;
              }
            }
            return { ...b, imagem };
          }),
        );

        return jsonResp(200, { banners });
      },
    },
  },
});
