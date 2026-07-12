import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const DEFAULT_PASSWORD = "123";

function getSecret() {
  const s = process.env.CLIENTE_JWT_SECRET;
  if (!s) throw new Error("CLIENTE_JWT_SECRET não configurada");
  return new TextEncoder().encode(s);
}

export async function signClienteJWT(clienteId: string): Promise<string> {
  return await new SignJWT({ sub: clienteId, kind: "cliente" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("60d")
    .sign(getSecret());
}

export async function verifyClienteJWT(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.kind !== "cliente" || typeof payload.sub !== "string") return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export async function verifyClientePassword(input: string, hash: string | null): Promise<boolean> {
  const raw = (input ?? "").toString();
  if (!hash) return raw === DEFAULT_PASSWORD;
  try {
    return await bcrypt.compare(raw, hash);
  } catch {
    return false;
  }
}

export async function hashClientePassword(pw: string): Promise<string> {
  return await bcrypt.hash(pw, 10);
}

export function getBearer(request: Request): string | null {
  const h = request.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

export async function requireCliente(request: Request): Promise<string | null> {
  const t = getBearer(request);
  if (!t) return null;
  return await verifyClienteJWT(t);
}

export const CLIENTE_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
} as const;

export function jsonResp(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CLIENTE_CORS },
  });
}

export function onlyDigits(v: string) {
  return (v ?? "").replace(/\D/g, "");
}
