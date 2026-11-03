/**
 * 旅行地图的本地保存（阶段七）。
 * 和手账一样先存在这台设备的 localStorage，换设备 / 清浏览器数据会丢。
 */
import type { TravelPlace } from "./travel-data";

const KEY = "our-memories:map:v1";
const VERSION = 1;

interface StoredPayload {
  version: number;
  savedAt: number;
  places: TravelPlace[];
}

function looksLikePlace(value: unknown): value is TravelPlace {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<TravelPlace>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.date === "string" &&
    typeof item.x === "number" &&
    typeof item.y === "number"
  );
}

/** 读取上次保存的足迹；没有或数据坏了就返回 null */
export function loadTravelPlaces(): TravelPlace[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<StoredPayload> | null;
    if (!data || !Array.isArray(data.places)) return null;
    const places = data.places.filter(looksLikePlace);
    return places.length > 0 ? places : null;
  } catch {
    return null;
  }
}

export type SaveResult = "saved" | "quota" | "error";

/** 写入本地；照片太多撑爆空间时返回 quota，方便页面提示 */
export function saveTravelPlaces(places: TravelPlace[]): SaveResult {
  if (typeof window === "undefined") return "error";
  try {
    const payload: StoredPayload = {
      version: VERSION,
      savedAt: Date.now(),
      places,
    };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
    return "saved";
  } catch (error) {
    const quota =
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" ||
        error.name === "NS_ERROR_DOM_QUOTA_REACHED");
    return quota ? "quota" : "error";
  }
}

export function clearTravelPlaces() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* 忽略 */
  }
}
