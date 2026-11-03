/**
 * 旅行数据保存在这台设备的 localStorage 里（演示阶段不接云端）。
 * 四张表整体存成一个版本化快照，方便以后迁移。
 */
import type { TravelData, TravelMapImage } from "./types";
import { queuePush } from "../cloud";

const KEY = "our-memories:travel:v2";
const VERSION = 2;

interface StoredPayload {
  version: number;
  savedAt: number;
  data: TravelData;
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** 导入的底图也可能是老存档里没有的字段，宽一点校验就行 */
function isMapImage(value: unknown): value is TravelMapImage {
  if (!value || typeof value !== "object") return false;
  const image = value as Partial<TravelMapImage>;
  const bounds = image.bounds;
  if (typeof image.src !== "string" || !image.src) return false;
  if (!bounds || typeof bounds !== "object") return false;
  return (
    [bounds.minLng, bounds.maxLng, bounds.minLat, bounds.maxLat].every(
      (item) => typeof item === "number" && Number.isFinite(item),
    ) &&
    bounds.maxLng > bounds.minLng &&
    bounds.maxLat > bounds.minLat
  );
}

/** 读上次的旅行数据；没有或者结构不对就返回 null */
export function loadTravelData(): TravelData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw) as Partial<StoredPayload> | null;
    const data = payload?.data;
    if (
      !data ||
      !isArray(data.cities) ||
      !isArray(data.trips) ||
      !isArray(data.spots) ||
      !isArray(data.photos)
    ) {
      return null;
    }
    return {
      cities: data.cities.filter((city) => city && typeof city.id === "string"),
      trips: data.trips.filter((trip) => trip && typeof trip.id === "string"),
      spots: data.spots.filter((spot) => spot && typeof spot.id === "string"),
      photos: data.photos.filter(
        (photo) => photo && typeof photo.id === "string",
      ),
      mapImage: isMapImage(data.mapImage) ? data.mapImage : null,
    };
  } catch {
    return null;
  }
}

export type TravelSaveResult = "saved" | "quota" | "error";

export function saveTravelData(data: TravelData): TravelSaveResult {
  if (typeof window === "undefined") return "error";
  try {
    const payload: StoredPayload = {
      version: VERSION,
      savedAt: Date.now(),
      data,
    };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
    queuePush("travel", payload);
    return "saved";
  } catch (error) {
    const quota =
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" ||
        error.name === "NS_ERROR_DOM_QUOTA_REACHED");
    return quota ? "quota" : "error";
  }
}

export function clearTravelData() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* 忽略 */
  }
}
