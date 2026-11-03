import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readAuthConfig } from "@/lib/server/config";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/** 问一下当前是不是已登录 */
export async function GET() {
  const config = readAuthConfig();
  const store = await cookies();
  const authenticated = await verifySessionToken(
    store.get(SESSION_COOKIE)?.value,
    config?.secret,
  );
  return NextResponse.json({ authenticated });
}
