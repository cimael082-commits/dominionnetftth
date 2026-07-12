const TOKEN_KEY = "dominion_cliente_token";

export function getClienteToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function setClienteToken(token: string, persist: boolean) {
  if (typeof window === "undefined") return;
  clearClienteToken();
  (persist ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
}

export function clearClienteToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export async function clienteFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = getClienteToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(path, { ...init, headers });
  if (res.status === 401) {
    clearClienteToken();
    throw new Error("Sessão expirada");
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new Error((data as { error?: string })?.error || `Erro ${res.status}`);
  return data as T;
}
