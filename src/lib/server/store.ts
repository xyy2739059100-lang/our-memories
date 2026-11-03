/**
 * 服务端存档：每个页面一份 JSON 文件，写在 data/ 目录里。
 * 先写临时文件再 rename，断电或并发时不会留下半截文件。
 * 这个目录不在 public/ 下，浏览器直接访问不到。
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

function recordPath(kind: DataKind): string {
  return path.join(path.resolve(dataDirectory()), `${kind}.json`);
}

export async function readRecord(kind: DataKind): Promise<CloudRecord | null> {
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
  const record: CloudRecord = { version: 1, savedAt: Date.now(), payload };
  const file = recordPath(kind);
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, JSON.stringify(record), "utf8");
  await rename(temp, file);
  return record;
}
