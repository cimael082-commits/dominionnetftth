/**
 * Verificação de sessão do administrador para as rotas HTTP do Assistente IA.
 *
 * O navegador envia o token da sessão (Authorization: Bearer <access_token>).
 * Só depois de confirmar que o token é válido é que o servidor usa o cliente
 * administrativo para ler os dados do provedor.
 */
import { createClient } from "@supabase/supabase-js";

export type AdminSession = { userId: string; email: string | null };

export async function verificarAdmin(request: Request): Promise<AdminSession | null> {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ??
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
    process.env["SUPABASE_ANON_KEY"];
  if (!url || !key) return null;

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return { userId: data.user.id, email: data.user.email ?? null };
}
