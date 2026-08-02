import { createFileRoute } from "@tanstack/react-router";
import {
  CLIENTE_CORS,
  jsonResp,
  onlyDigits,
  signClienteJWT,
  verifyClientePassword,
} from "@/lib/cliente-auth.server";

export const Route = createFileRoute("/api/public/cliente/auth/login")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CLIENTE_CORS }),
      POST: async ({ request }) => {
        let body: { identificador?: string; senha?: string };
        try {
          body = (await request.json()) as { identificador?: string; senha?: string };
        } catch {
          return jsonResp(400, { error: "JSON inválido" });
        }
        const identificador = (body?.identificador ?? "").toString().trim();
        const senha = (body?.senha ?? "").toString();
        if (!identificador || !senha) {
          return jsonResp(400, { error: "Informe CPF ou telefone e a senha" });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const digits = onlyDigits(identificador);
        if (digits.length < 10) {
          return jsonResp(400, { error: "Informe um CPF ou telefone válido" });
        }

        type ClienteAuth = { id: string; senha_cliente_hash: string | null; status: string };
        let cliente: ClienteAuth | null = null;

        // 1) CPF/CNPJ normalizado
        if (digits.length >= 11) {
          const { data } = await supabaseAdmin
            .from("clientes")
            .select("id, senha_cliente_hash, status")
            .eq("cpf_cnpj_norm", digits)
            .maybeSingle();
          if (data) cliente = data;
        }

        // 2) Telefone / WhatsApp — comparação por dígitos (os campos são livres)
        if (!cliente) {
          const { data: lista } = await supabaseAdmin
            .from("clientes")
            .select("id, senha_cliente_hash, status, telefone, whatsapp, cpf_cnpj")
            .limit(5000);
          const alvo = digits.slice(-11);
          const achado = (lista ?? []).find((c) => {
            const cands = [c.telefone, c.whatsapp, c.cpf_cnpj]
              .map((v) => onlyDigits(v ?? ""))
              .filter((v) => v.length >= 10);
            return cands.some((v) => v.slice(-11) === alvo || v === digits);
          });
          if (achado) {
            cliente = {
              id: achado.id,
              senha_cliente_hash: achado.senha_cliente_hash,
              status: achado.status,
            };
          }
        }

        if (!cliente) {
          return jsonResp(404, { error: "Cliente não encontrado" });
        }
        const ok = await verifyClientePassword(senha, cliente.senha_cliente_hash);
        if (!ok) return jsonResp(401, { error: "Senha incorreta" });
        if (cliente.status === "desativado") {
          return jsonResp(403, { error: "Conta desativada. Contate o suporte." });
        }
        const token = await signClienteJWT(cliente.id);
        return jsonResp(200, { token, cliente_id: cliente.id });
      },
    },
  },
});
