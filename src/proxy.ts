import { NextResponse, type NextRequest } from "next/server";
import { readAuthConfig } from "@/lib/server/config";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/** 需要登录才能看的页面 */
const PROTECTED_PATHS = new Set(["/", "/anniversary", "/journal", "/map"]);

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const config = readAuthConfig();
  const authenticated = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
    config?.secret,
  );

  if (pathname === "/login") {
    if (!authenticated) return NextResponse.next();
    const home = request.nextUrl.clone();
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home);
  }

  if (!PROTECTED_PATHS.has(pathname)) return NextResponse.next();

  if (!authenticated) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/anniversary", "/journal", "/map"],
};
