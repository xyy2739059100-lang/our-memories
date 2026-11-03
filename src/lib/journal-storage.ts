/**
 * 手账的本地保存。
 * 目前没有服务器，改动会自动存在这台设备的 localStorage 里，
 * 换设备 / 清理浏览器数据会丢失，后面接上云端存储再补。
 *
 * 版本 3：一本书支持多张跨页（spreads）。
 * 老版本存在 localStorage 里的 leftPage / rightPage 会在读取时
 * 自动合成第 1 张跨页，不会丢用户的内容。
 */
import type { JournalElement, JournalEntry, JournalSpread } from "./journal-data";
import { queuePush } from "./cloud";

const KEY = "our-memories:journal:v1";
const VERSION = 3;

export interface JournalSnapshot {
  entries: JournalEntry[];
  activeId: string;
  /** 当前打开的是第几张跨页（从 0 开始） */
  activeSpread: number;
}

interface StoredPayload extends JournalSnapshot {
  version: number;
  savedAt: number;
}

const asElements = (value: unknown): JournalElement[] =>
  Array.isArray(value) ? (value as JournalElement[]) : [];

function normalizeSpread(raw: unknown, entryId: string, index: number): JournalSpread {
  const spread = (raw ?? {}) as Partial<JournalSpread>;
  return {
    id: typeof spread.id === "string" && spread.id ? spread.id : `${entryId}-s${index + 1}`,
    left: asElements(spread.left),
    right: asElements(spread.right),
  };
}

/** 把一条存档（无论新旧）整理成当前结构 */
function normalizeEntry(raw: unknown, index: number): JournalEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Partial<JournalEntry> & {
    leftPage?: unknown;
    rightPage?: unknown;
  };

  const id =
    typeof entry.id === "string" && entry.id
      ? entry.id
      : `entry-restored-${index + 1}`;
  const title =
    typeof entry.title === "string" && entry.title.trim()
      ? entry.title
      : "未命名手账";
  const cover = typeof entry.cover === "string" ? entry.cover : "";

  let spreads: JournalSpread[] = [];
  if (Array.isArray(entry.spreads) && entry.spreads.length > 0) {
    spreads = entry.spreads.map((spread, i) => normalizeSpread(spread, id, i));
  } else if (Array.isArray(entry.leftPage) || Array.isArray(entry.rightPage)) {
    // 老版本：一本书只有左右两页 → 当成第 1 张跨页
    spreads = [
      {
        id: `${id}-s1`,
        left: asElements(entry.leftPage),
        right: asElements(entry.rightPage),
      },
    ];
  }

  if (spreads.length === 0) {
    spreads = [{ id: `${id}-s1`, left: [], right: [] }];
  }

  return {
    id,
    title,
    cover,
    spreads,
    paperTemplate:
      entry.paperTemplate === "kraft" ||
      entry.paperTemplate === "ruled" ||
      entry.paperTemplate === "grid"
        ? entry.paperTemplate
        : "watercolor",
    pageMargin:
      entry.pageMargin === "narrow" || entry.pageMargin === "wide"
        ? entry.pageMargin
        : "normal",
  };
}

/** 读取上次保存的手账；没有或数据坏了就返回 null */
export function loadJournalSnapshot(): JournalSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as
      | {
          entries?: unknown;
          activeId?: unknown;
          activeSpread?: unknown;
        }
      | null;
    if (!data || !Array.isArray(data.entries)) return null;

    const entries = data.entries
      .map((entry, index) => normalizeEntry(entry, index))
      .filter((entry): entry is JournalEntry => entry !== null);
    if (entries.length === 0) return null;

    const activeId =
      typeof data.activeId === "string" &&
      entries.some((entry) => entry.id === data.activeId)
        ? data.activeId
        : entries[0].id;

    const activeEntry = entries.find((entry) => entry.id === activeId) ?? entries[0];
    const rawSpread = Number(data.activeSpread);
    const activeSpread = Number.isFinite(rawSpread)
      ? Math.min(
          Math.max(0, Math.floor(rawSpread)),
          activeEntry.spreads.length - 1,
        )
      : 0;

    return { entries, activeId, activeSpread };
  } catch {
    return null;
  }
}

export type SaveResult = "saved" | "quota" | "error";

/** 写入本地；照片太多导致空间不足时返回 quota，方便页面提示 */
export function saveJournalSnapshot(snapshot: JournalSnapshot): SaveResult {
  if (typeof window === "undefined") return "error";
  try {
    const payload: StoredPayload = {
      version: VERSION,
      savedAt: Date.now(),
      entries: snapshot.entries,
      activeId: snapshot.activeId,
      activeSpread: snapshot.activeSpread,
    };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
    queuePush("journal", payload);
    return "saved";
  } catch (error) {
    const quota =
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" ||
        error.name === "NS_ERROR_DOM_QUOTA_REACHED");
    return quota ? "quota" : "error";
  }
}

export function clearJournalSnapshot() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* 忽略 */
  }
}
