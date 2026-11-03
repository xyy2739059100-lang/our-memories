/**
 * 服务端存档：优先写进 Supabase（两个人、多台设备共用同一份），
 * 没配置 Supabase 时退回本地 data/ 目录，方便本机开发。
 */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { dataDirectory } from "./config";

export const DATA_KINDS = ["journal", "travel", "anniversary"] as const;
export type DataKind = (typeof DATA_KINDS)[number];

export interface CloudRecord {
  version: 1;
  savedAt: number;
  payload: unknown;
}

export function isDataKind(value: string): value is DataKind {
  return (DATA_KINDS as readonly string[]).includes(value);
}

const SUPABASE_URL = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "") ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

/** Supabase 配好了就走云端，否则退回本地文件 */
export function usesCloudStore(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

function supabaseHeaders(): Record<string, string> {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };
}

function recordPath(kind: DataKind): string {
  return path.join(path.resolve(dataDirectory()), `${kind}.json`);
}

async function readFromCloud(kind: DataKind): Promise<CloudRecord | null> {
  const url = `${SUPABASE_URL}/rest/v1/records?kind=eq.${encodeURIComponent(kind)}&select=saved_at,payload`;
  const response = await fetch(url, {
    headers: supabaseHeaders(),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`supabase read ${response.status}`);

  const rows = (await response.json()) as Array<{ saved_at?: number; payload?: unknown }>;
  const row = rows?.[0];
  if (!row || typeof row.saved_at !== "number" || row.payload == null) return null;
  return { version: 1, savedAt: row.saved_at, payload: row.payload };
}

async function writeToCloud(kind: DataKind, payload: unknown): Promise<CloudRecord> {
  const record: CloudRecord = { version: 1, savedAt: Date.now(), payload };
  const response = await fetch(`${SUPABASE_URL}/rest/v1/records`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
      // kind 相同就覆盖整行
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ kind, saved_at: record.savedAt, payload }),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`supabase write ${response.status} ${detail}`);
  }
  return record;
}

export async function readRecord(kind: DataKind): Promise<CloudRecord | null> {
  if (usesCloudStore()) {
    try {
      return await readFromCloud(kind);
    } catch {
      return null;
    }
  }

  try {
    const raw = await readFile(recordPath(kind), "utf8");
    const parsed = JSON.parse(raw) as Partial<CloudRecord> | null;
    if (!parsed || typeof parsed.savedAt !== "number" || parsed.payload == null) {
      return null;
    }
    return {
      version: 1,
      savedAt: parsed.savedAt,
      payload: parsed.payload,
    };
  } catch {
    return null;
  }
}

export async function writeRecord(
  kind: DataKind,
  payload: unknown,
): Promise<CloudRecord> {
  if (usesCloudStore()) {
    return writeToCloud(kind, payload);
  }

  const record: CloudRecord = { version: 1, savedAt: Date.now(), payload };
  const file = recordPath(kind);
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, JSON.stringify(record), "utf8");
  await rename(temp, file);
  return record;
}
