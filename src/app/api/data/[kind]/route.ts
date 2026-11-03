import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { readAuthConfig } from "@/lib/server/config";
import { isDataKind, readRecord, writeRecord } from "@/lib/server/store";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

type RouteContext = { params: Promise<{ kind: string }> };

async function isSignedIn(): Promise<boolean> {
  const config = readAuthConfig();
  if (!config) return false;
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value, config.secret);
}

/** 拉取某个页面的云端存档 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { kind } = await context.params;
  if (!isDataKind(kind)) {
    return NextResponse.json({ error: "没有这种存档" }, { status: 404 });
  }
  if (!(await isSignedIn())) {
    return NextResponse.json({ error: "还没登录" }, { status: 401 });
  }

  const record = await readRecord(kind);
  return NextResponse.json(
    { savedAt: record?.savedAt ?? 0, payload: record?.payload ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** 覆盖保存某个页面的云端存档 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { kind } = await context.params;
  if (!isDataKind(kind)) {
    return NextResponse.json({ error: "没有这种存档" }, { status: 404 });
  }
  if (!(await isSignedIn())) {
    return NextResponse.json({ error: "还没登录" }, { status: 401 });
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const payload = (body as { payload?: unknown } | null)?.payload;
  if (payload == null || typeof payload !== "object") {
    return NextResponse.json({ error: "存档内容不对" }, { status: 400 });
  }

  try {
    const record = await writeRecord(kind, payload);
    return NextResponse.json({ ok: true, savedAt: record.savedAt });
  } catch {
    return NextResponse.json({ error: "服务器写不进存档" }, { status: 500 });
  }
}
