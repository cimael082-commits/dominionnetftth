import { createFileRoute } from "@tanstack/react-router";
import { CLIENTE_CORS, jsonResp, requireCliente } from "@/lib/cliente-auth.server";

type SupabaseAdmin = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

/** Gera link temporário para um anexo salvo no bucket privado. */
async function signAnexo(admin: SupabaseAdmin, path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await admin.storage.from("chamados").createSignedUrl(path, 60 * 60 * 6);
  return data?.signedUrl ?? null;
}

export const Route = createFileRoute("/api/public/cliente/chamados")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CLIENTE_CORS }),

      GET: async ({ request }) => {
        const clienteId = await requireCliente(request);
        if (!clienteId) return jsonResp(401, { error: "Não autorizado" });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: chamados, error } = await supabaseAdmin
          .from("chamados")
          .select("id, protocolo, assunto, categoria, descricao, status, prioridade, created_at, updated_at")
          .eq("cliente_id", clienteId)
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) return jsonResp(500, { error: error.message });

        const ids = (chamados ?? []).map((c) => c.id);
        const { data: msgs } = ids.length
          ? await supabaseAdmin
              .from("chamado_mensagens")
              .select("id, chamado_id, autor, mensagem, anexo_url, created_at")
              .in("chamado_id", ids)
              .order("created_at", { ascending: true })
          : { data: [] };

        const comLinks = await Promise.all(
          (msgs ?? []).map(async (m) => ({
            ...m,
            anexo: await signAnexo(supabaseAdmin, m.anexo_url),
          })),
        );

        return jsonResp(200, {
          chamados: (chamados ?? []).map((c) => ({
            ...c,
            mensagens: comLinks.filter((m) => m.chamado_id === c.id),
          })),
        });
      },

      POST: async ({ request }) => {
        const clienteId = await requireCliente(request);
        if (!clienteId) return jsonResp(401, { error: "Não autorizado" });

        const body = (await request.json().catch(() => ({}))) as {
          acao?: "novo" | "mensagem";
          chamado_id?: string;
          assunto?: string;
          categoria?: string;
          descricao?: string;
          mensagem?: string;
          anexo_base64?: string;
          anexo_tipo?: string;
        };

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // upload opcional de foto (base64 -> bucket privado)
        let anexoPath: string | null = null;
        if (body.anexo_base64) {
          try {
            const b64 = body.anexo_base64.replace(/^data:[^;]+;base64,/, "");
            const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
            if (bin.byteLength > 6 * 1024 * 1024) {
              return jsonResp(400, { error: "Imagem muito grande (máx. 6MB)" });
            }
            const ext = (body.anexo_tipo || "image/jpeg").split("/")[1] || "jpg";
            const path = `${clienteId}/${crypto.randomUUID()}.${ext}`;
            const { error: upErr } = await supabaseAdmin.storage
              .from("chamados")
              .upload(path, bin, { contentType: body.anexo_tipo || "image/jpeg" });
            if (upErr) return jsonResp(500, { error: upErr.message });
            anexoPath = path;
          } catch {
            return jsonResp(400, { error: "Falha ao processar a imagem" });
          }
        }

        if (body.acao === "mensagem") {
          if (!body.chamado_id) return jsonResp(400, { error: "chamado_id obrigatório" });
          const { data: chamado } = await supabaseAdmin
            .from("chamados")
            .select("id")
            .eq("id", body.chamado_id)
            .eq("cliente_id", clienteId)
            .maybeSingle();
          if (!chamado) return jsonResp(404, { error: "Chamado não encontrado" });

          const { error } = await supabaseAdmin.from("chamado_mensagens").insert({
            chamado_id: body.chamado_id,
            autor: "cliente",
            mensagem: (body.mensagem || "").trim() || null,
            anexo_url: anexoPath,
          });
          if (error) return jsonResp(500, { error: error.message });
          return jsonResp(200, { ok: true });
        }

        const assunto = (body.assunto || "").trim();
        const descricao = (body.descricao || "").trim();
        if (assunto.length < 3 || descricao.length < 5) {
          return jsonResp(400, { error: "Informe assunto e descrição do problema" });
        }

        const { data: novo, error } = await supabaseAdmin
          .from("chamados")
          .insert({
            cliente_id: clienteId,
            assunto,
            descricao,
            categoria: body.categoria || "suporte",
          })
          .select("id, protocolo")
          .single();
        if (error) return jsonResp(500, { error: error.message });

        await supabaseAdmin.from("chamado_mensagens").insert({
          chamado_id: novo.id,
          autor: "cliente",
          mensagem: descricao,
          anexo_url: anexoPath,
        });

        await supabaseAdmin.from("notificacoes").insert({
          cliente_id: clienteId,
          tipo: "chamado",
          titulo: `Chamado ${novo.protocolo} aberto`,
          corpo: `Recebemos sua solicitação "${assunto}". Nossa equipe entrará em contato.`,
        });

        return jsonResp(200, { ok: true, chamado: novo });
      },
    },
  },
});
