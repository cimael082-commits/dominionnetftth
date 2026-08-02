import { createFileRoute } from "@tanstack/react-router";
import { CLIENTE_CORS, jsonResp, requireCliente } from "@/lib/cliente-auth.server";

export const Route = createFileRoute("/api/public/cliente/me")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CLIENTE_CORS }),
      GET: async ({ request }) => {
        const clienteId = await requireCliente(request);
        if (!clienteId) return jsonResp(401, { error: "Não autorizado" });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("clientes")
          .select(
            "id, nome, cpf_cnpj, telefone, whatsapp, email, endereco, bairro, cidade, cep, plano, valor_mensalidade, dia_vencimento, status, login_pppoe, online, ip_atual, uptime_atual, ultima_sincronizacao, wifi_ssid, wifi_senha, ssid_wifi, senha_wifi",
          )
          .eq("id", clienteId)
          .maybeSingle();
        if (error || !data) return jsonResp(404, { error: "Cliente não encontrado" });
        // O painel administrativo grava em ssid_wifi/senha_wifi; a área do cliente
        // consome wifi_ssid/wifi_senha. Normalizamos os dois pares aqui.
        const cliente = {
          ...data,
          wifi_ssid: data.wifi_ssid ?? data.ssid_wifi ?? null,
          wifi_senha: data.wifi_senha ?? data.senha_wifi ?? null,
        };
        return jsonResp(200, { cliente });
      },
    },
  },
});
