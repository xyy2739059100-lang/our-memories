import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/** 退出：把登录 Cookie 置空 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
