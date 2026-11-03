import { NextResponse, type NextRequest } from "next/server";
import { CONFIG_MISSING_MESSAGE, readAuthConfig } from "@/lib/server/config";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
} from "@/lib/session";

/** 口令换登录态：核对通过后写一张 HttpOnly Cookie，前端读不到内容。 */
export async function POST(request: NextRequest) {
  const config = readAuthConfig();
  if (!config) {
    return NextResponse.json({ error: CONFIG_MISSING_MESSAGE }, { status: 503 });
  }

  let passcode = "";
  try {
    const body = (await request.json()) as { passcode?: unknown } | null;
    passcode = typeof body?.passcode === "string" ? body.passcode.trim() : "";
  } catch {
    passcode = "";
  }

  if (!passcode) {
    return NextResponse.json({ error: "请输入访问口令" }, { status: 400 });
  }
  if (passcode !== config.passcode) {
    return NextResponse.json({ error: "口令不对，再试一次" }, { status: 401 });
  }

  const token = await createSessionToken(config.secret);
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
