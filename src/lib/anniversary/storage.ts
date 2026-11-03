/**
 * 纪念日数据存在这台设备的 localStorage 里（演示阶段不接云端）。
 * 事件 + 照片整体存成一个版本化快照，方便以后迁移。
 */
import type { AnniversaryData } from "./types";
import { DEFAULT_ANNIVERSARY_COPY } from "./types";
import { queuePush } from "../cloud";

const KEY = "our-memories:anniversary:v2";
const VERSION = 3;

interface StoredPayload {
  version: number;
  savedAt: number;
  data: AnniversaryData;
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** 老存档没有 copy（v2），补上默认文案；字段坏了也退回默认 */
function normalizeCopy(value: unknown): AnniversaryData["copy"] {
  const raw = value as Partial<AnniversaryData["copy"]> | null;
  const heading =
    typeof raw?.heading === "string" && raw.heading.trim()
      ? raw.heading.trim()
      : DEFAULT_ANNIVERSARY_COPY.heading;
  const quote =
    typeof raw?.quote === "string" && raw.quote.trim()
      ? raw.quote
      : DEFAULT_ANNIVERSARY_COPY.quote;
  const note =
    typeof raw?.note === "string" && raw.note.trim()
      ? raw.note
      : DEFAULT_ANNIVERSARY_COPY.note;
  return { heading, quote, note };
}

export function loadAnniversaryData(): AnniversaryData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw) as Partial<StoredPayload> | null;
    const data = payload?.data;
    if (!data || !isArray(data.events) || !isArray(data.photos)) return null;
    return {
      events: data.events.filter(
        (event) => event && typeof event.id === "string",
      ),
      photos: data.photos.filter(
        (photo) => photo && typeof photo.id === "string",
      ),
      copy: normalizeCopy(data.copy),
    };
  } catch {
    return null;
  }
}

export type AnniversarySaveResult = "saved" | "quota" | "error";

export function saveAnniversaryData(
  data: AnniversaryData,
): AnniversarySaveResult {
  if (typeof window === "undefined") return "error";
  try {
    const payload: StoredPayload = {
      version: VERSION,
      savedAt: Date.now(),
      data,
    };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
    queuePush("anniversary", payload);
    return "saved";
  } catch (error) {
    const quota =
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" ||
        error.name === "NS_ERROR_DOM_QUOTA_REACHED");
    return quota ? "quota" : "error";
  }
}

export function clearAnniversaryData() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* 忽略 */
  }
}
