/**
 * 云端同步自检：只回布尔值和错误摘要，不暴露任何密钥。
 * 打开 /api/health 就能看出 Supabase 到底通不通。
 */
import { NextResponse } from "next/server";
import { usesCloudStore } from "@/lib/server/store";

function maskSecret(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!key) return "missing";
  const prefix = key.slice(0, 12);
  return `${prefix}... (${key.length} chars)`;
}

export async function GET() {
  const cloud = usesCloudStore();
  const info: Record<string, unknown> = {
    cloudStore: cloud,
    supabaseUrl: process.env.SUPABASE_URL?.trim() ?? "missing",
    serviceKey: maskSecret(),
    passcode: process.env.OM_PASSCODE ? "set" : "missing",
    sessionSecret: process.env.OM_SESSION_SECRET ? "set" : "missing",
  };

  if (cloud) {
    const base = process.env.SUPABASE_URL!.trim().replace(/\/+$/, "");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();
    try {
      const response = await fetch(`${base}/rest/v1/records?select=kind&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
      });
      info.tableStatus = response.status;
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        info.error = text.slice(0, 300);
      } else {
        const rows = (await response.json()) as unknown[];
        info.rows = Array.isArray(rows) ? rows.length : -1;
      }
    } catch (error) {
      info.error = String(error).slice(0, 300);
    }
  }

  return NextResponse.json(info, { headers: { "Cache-Control": "no-store" } });
}
