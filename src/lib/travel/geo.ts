/**
 * 手绘地图的投影与视野计算（Web Mercator）。
 * 没有在线瓦片，底图是本地 SVG 水彩纸；坐标、缩放、拖动都是真的。
 */
export const TILE_SIZE = 256;
export const MIN_ZOOM = 4;
export const MAX_ZOOM = 13;

/** 缩放层级 → 显示什么（集中管理，避免页面上到处写魔法数字） */
export const ZOOM_RULES = {
  /** 城市标记一直显示 */
  cityMarkers: MIN_ZOOM,
  /** 城市名字（全国视野就显示，先认出这是哪几座城） */
  cityLabels: MIN_ZOOM,
  /** 城市之间的金色虚线 */
  cityRoute: 5,
  /** 城市里的景点标记 */
  spotMarkers: 9.8,
  /** 景点名字 */
  spotLabels: 11.2,
  /** 景点旁的浮动照片 */
  photoPeek: 10.4,
};

/** 演示区域：中国，防止拖到空白纸上 */
export const BOUNDS = {
  minLng: 72,
  maxLng: 145,
  minLat: 2,
  maxLat: 54,
};

export interface LngLat {
  lng: number;
  lat: number;
}

export interface MapView {
  lng: number;
  lat: number;
  zoom: number;
}

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export function worldSize(zoom: number) {
  return TILE_SIZE * Math.pow(2, zoom);
}

/** 经纬度 → 世界像素（当前缩放级别下的绝对坐标） */
export function project(lng: number, lat: number, zoom: number) {
  const size = worldSize(zoom);
  const clampedLat = clamp(lat, -85, 85);
  const x = ((lng + 180) / 360) * size;
  const sin = Math.sin((clampedLat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size;
  return { x, y };
}

export function unproject(x: number, y: number, zoom: number): LngLat {
  const size = worldSize(zoom);
  const lng = (x / size) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / size;
  const sinh = (Math.exp(n) - Math.exp(-n)) / 2;
  const lat = (Math.atan(sinh) * 180) / Math.PI;
  return { lng, lat };
}

/** 当前视野左上角的 world 坐标 */
export function viewBoxOf(view: MapView, width: number, height: number): ViewBox {
  const center = project(view.lng, view.lat, view.zoom);
  return { x: center.x - width / 2, y: center.y - height / 2, w: width, h: height };
}

/** 经纬度 → 容器内的屏幕像素 */
export function screenPoint(
  lng: number,
  lat: number,
  view: MapView,
  width: number,
  height: number,
) {
  const world = project(lng, lat, view.zoom);
  const box = viewBoxOf(view, width, height);
  return { x: world.x - box.x, y: world.y - box.y };
}

/** 容器像素 → 经纬度 */
export function pointToLngLat(
  px: number,
  py: number,
  view: MapView,
  width: number,
  height: number,
): LngLat {
  const box = viewBoxOf(view, width, height);
  return unproject(box.x + px, box.y + py, view.zoom);
}

export function clampView(view: MapView): MapView {
  return {
    lng: clamp(view.lng, BOUNDS.minLng, BOUNDS.maxLng),
    lat: clamp(view.lat, BOUNDS.minLat, BOUNDS.maxLat),
    zoom: clamp(view.zoom, MIN_ZOOM, MAX_ZOOM),
  };
}

/** 以某个屏幕点为中心缩放，那个点下面的地方保持不动 */
export function zoomAround(
  view: MapView,
  nextZoom: number,
  anchorX: number,
  anchorY: number,
  width: number,
  height: number,
): MapView {
  const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
  const anchor = pointToLngLat(anchorX, anchorY, view, width, height);
  const anchorWorld = project(anchor.lng, anchor.lat, zoom);
  // 若以锚点为中心，它会落在容器正中；再把它偏移回指针所在的像素
  const center = unproject(
    anchorWorld.x - (anchorX - width / 2),
    anchorWorld.y - (anchorY - height / 2),
    zoom,
  );
  return clampView({ lng: center.lng, lat: center.lat, zoom });
}

/** 按屏幕像素平移 */
export function panBy(
  view: MapView,
  dx: number,
  dy: number,
  width: number,
  height: number,
): MapView {
  const box = viewBoxOf(view, width, height);
  const center = unproject(
    box.x + box.w / 2 - dx,
    box.y + box.h / 2 - dy,
    view.zoom,
  );
  return clampView({ ...view, lng: center.lng, lat: center.lat });
}

/** 让一组经纬度刚好装进容器 */
export function fitView(
  points: LngLat[],
  width: number,
  height: number,
  padding = 0.2,
): MapView {
  if (points.length === 0) {
    return { lng: 104, lat: 32, zoom: 5 };
  }
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const point of points) {
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
  }

  let best = MIN_ZOOM;
  for (let zoom = MIN_ZOOM; zoom <= MAX_ZOOM; zoom += 0.05) {
    const a = project(minLng, maxLat, zoom);
    const b = project(maxLng, minLat, zoom);
    const fits =
      b.x - a.x <= width * (1 - padding * 2) &&
      b.y - a.y <= height * (1 - padding * 2);
    if (!fits) break;
    best = zoom;
  }

  return clampView({
    lng: (minLng + maxLng) / 2,
    lat: (minLat + maxLat) / 2,
    zoom: best,
  });
}

/** 把一串点连成柔和的贝塞尔路径（手绘虚线用） */
export function smoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

/** 2026.10.24 + 2026.10.25 → 10.24 – 10.25 */
export function formatTripRange(start: string, end: string) {
  const a = start.slice(5);
  const b = end.slice(5);
  return a === b ? a.replace(/\./g, ".") : `${a} – ${b}`;
}

/** 两段日期差几天（含头含尾） */
export function tripDays(start: string, end: string) {
  const toDate = (value: string) =>
    new Date(value.replace(/\./g, "-") + "T00:00:00").getTime();
  const diff = Math.round((toDate(end) - toDate(start)) / 86400000);
  return Math.max(1, diff + 1);
}

export function todayString() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`;
}
