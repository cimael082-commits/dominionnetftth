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
          return jsonResp(400, { error: "Informe CPF/PPPoE e senha" });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const digits = onlyDigits(identificador);
        let cliente: { id: string; senha_cliente_hash: string | null; status: string } | null =
          null;

        if (digits.length >= 11) {
          const { data } = await supabaseAdmin
            .from("clientes")
            .select("id, senha_cliente_hash, status")
            .eq("cpf_cnpj_norm", digits)
            .maybeSingle();
          if (data) cliente = data;
        }
        if (!cliente) {
          const { data } = await supabaseAdmin
            .from("clientes")
            .select("id, senha_cliente_hash, status")
            .eq("login_pppoe", identificador)
            .maybeSingle();
          if (data) cliente = data;
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
