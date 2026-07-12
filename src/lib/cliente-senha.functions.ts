import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hashClientePassword } from "@/lib/cliente-auth.server";

export const setClientePortalPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { clienteId: string; senha: string | null }) => {
    if (!data?.clienteId) throw new Error("clienteId obrigatório");
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const hash = data.senha && data.senha.length > 0 ? await hashClientePassword(data.senha) : null;
    const { error } = await supabaseAdmin
      .from("clientes")
      .update({ senha_cliente_hash: hash })
      .eq("id", data.clienteId);
    if (error) throw new Error(error.message);
    return { ok: true, reset: hash === null };
  });
