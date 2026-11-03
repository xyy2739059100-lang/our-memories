/**
 * 登录态：一段 HMAC-SHA256 签名的短期 token，放在 HttpOnly Cookie 里。
 * 前端脚本读不到、也改不了；换设备时只要口令正确就能重新登进来。
 * 这里只用 Web Crypto，代理层（proxy）和 Node 路由都能直接用。
 */

export const SESSION_COOKIE = "om_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 天

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

/** 生成登录 token：内容里只有过期时间，改不了也没法伪造 */
export async function createSessionToken(secret: string): Promise<string> {
  const payload = toBase64Url(
    encoder.encode(
      JSON.stringify({
        role: "owner",
        exp: Date.now() + SESSION_MAX_AGE * 1000,
      }),
    ),
  );
  return `${payload}.${await sign(payload, secret)}`;
}

/** 校验 token：签名对不对 + 有没有过期 */
export async function verifySessionToken(
  token: string | undefined,
  secret: string | undefined,
): Promise<boolean> {
  if (!token || !secret) return false;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!payload || !signature) return false;

  const expected = await sign(payload, secret);
  if (signature !== expected) return false;

  const bytes = fromBase64Url(payload);
  if (!bytes) return false;

  try {
    const data = JSON.parse(decoder.decode(bytes)) as { exp?: unknown };
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}
