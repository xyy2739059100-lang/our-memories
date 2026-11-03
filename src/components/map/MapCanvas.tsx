"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LngLat, MapView } from "@/lib/travel/geo";
import {
  clampView,
  fitView,
  panBy,
  project,
  screenPoint,
  smoothPath,
  unproject,
  viewBoxOf,
  zoomAround,
  ZOOM_RULES,
} from "@/lib/travel/geo";
import type {
  TravelData,
  TravelPhoto,
  TravelSpot,
  TravelTrip,
} from "@/lib/travel/types";
import WatercolorArt from "./WatercolorArt";

export type MapFocus =
  | { nonce: number; kind: "view"; view: MapView }
  | { nonce: number; kind: "fit"; points: LngLat[]; padding?: number }
  | {
      nonce: number;
      kind: "point";
      lng: number;
      lat: number;
      zoom: number;
      /** 让这个点落在容器高度的百分之几处（0.24 = 偏上，给底部卡片留位置） */
      anchorY?: number;
    };

interface MapCanvasProps {
  data: TravelData;
  view: MapView;
  onViewChange: (view: MapView) => void;
  focus: MapFocus | null;
  selected: { kind: "city" | "spot"; id: string } | null;
  onSelectCity: (id: string) => void;
  onSelectSpot: (id: string) => void;
  onClearSelection: () => void;
  /** 量到容器尺寸后回传给页面：导入底图时要按当前视野算经纬度范围 */
  onSizeChange?: (size: { w: number; h: number }) => void;
  children?: React.ReactNode;
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/** 城市名标签放在图钉上面还是下面，避免挤在一起 */
const labelBelow = new Set(["city-hangzhou", "city-xiamen", "city-dali"]);

function photoFor(data: TravelData, id: string): TravelPhoto | undefined {
  return data.photos.find((item) => item.id === id);
}

export default function MapCanvas({
  data,
  view,
  onViewChange,
  focus,
  selected,
  onSelectCity,
  onSelectSpot,
  onClearSelection,
  onSizeChange,
  children,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const viewRef = useRef(view);
  const didFit = useRef(false);

  // 拖动 / 滚轮 / 按钮都读 ref 里最新的视野，避免每次渲染都改 ref
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const selectedTrip = useMemo<TravelTrip | null>(() => {
    if (!selected) return null;
    if (selected.kind === "city") {
      return data.trips.find((trip) => trip.cityId === selected.id) ?? null;
    }
    const point = data.spots.find((spot) => spot.id === selected.id);
    return point
      ? data.trips.find((trip) => trip.id === point.tripId) ?? null
      : null;
  }, [data.spots, data.trips, selected]);

  // 容器尺寸（ResizeObserver），第一次量到尺寸时把城市装进画面
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const update = () => {
      const rect = node.getBoundingClientRect();
      const next = { w: Math.round(rect.width), h: Math.round(rect.height) };
      setSize((current) =>
        current.w === next.w && current.h === next.h ? current : next,
      );
      onSizeChange?.(next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [onSizeChange]);

  useEffect(() => {
    if (didFit.current || size.w === 0 || size.h === 0) return;
    didFit.current = true;
    const cityPoints = data.cities.map((city) => ({
      lng: city.center[1],
      lat: city.center[0],
    }));
    const phone = size.w < 640;
    // 电脑上首屏要看到整张中国地图（省界都露出来）；
    // 手机上横屏空间窄，先贴着六座城市，想看全国再缩小。
    const points = phone
      ? cityPoints
      : [
          ...cityPoints,
          { lng: 73.6, lat: 53.5 },
          { lng: 135.0, lat: 53.5 },
          { lng: 73.6, lat: 18.0 },
          { lng: 135.0, lat: 18.0 },
        ];
    const padding = phone ? 0.08 : 0.06;
    onViewChange(fitView(points, size.w, size.h, padding));
  }, [data.cities, onViewChange, size.h, size.w]);

  // 缩放 / 平移指令（按钮、定位、旅行列表）
  useEffect(() => {
    if (!focus || size.w === 0 || size.h === 0) return;
    let target: MapView;
    if (focus.kind === "fit") {
      target = fitView(focus.points, size.w, size.h, focus.padding ?? 0.24);
    } else if (focus.kind === "point") {
      // 让选中的城市 / 地点出现在偏上的位置，下面的手账卡就不会盖住它
      const zoom = focus.zoom;
      const world = project(focus.lng, focus.lat, zoom);
      // 手机上左边有名牌和快捷按钮，别把城市藏到它们下面
      const anchorRatio =
        size.w < 640
          ? Math.max(focus.anchorY ?? 0.5, 0.28)
          : focus.anchorY ?? 0.5;
      const anchorY = anchorRatio * size.h;
      const center = unproject(
        world.x,
        world.y + (size.h / 2 - anchorY),
        zoom,
      );
      target = clampView({ lng: center.lng, lat: center.lat, zoom });
    } else {
      target = clampView(focus.view);
    }
    const from = viewRef.current;
    const start = performance.now();
    const duration = 680;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      onViewChange(
        clampView({
          lng: from.lng + (target.lng - from.lng) * ease,
          lat: from.lat + (target.lat - from.lat) * ease,
          zoom: from.zoom + (target.zoom - from.zoom) * ease,
        }),
      );
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce, size.w, size.h]);

  /* ---------------- 拖动 / 双指缩放 ---------------- */

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<
    | {
        mode: "drag";
        view: MapView;
        startX: number;
        startY: number;
      }
    | {
        mode: "pinch";
        view: MapView;
        startDist: number;
        startMid: { x: number; y: number };
      }
    | null
  >(null);
  const moved = useRef(false);
  const [dragging, setDragging] = useState(false);

  const beginDrag = (x: number, y: number) => {
    gesture.current = {
      mode: "drag",
      view: viewRef.current,
      startX: x,
      startY: y,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const node = e.currentTarget;
    node.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    setDragging(true);
    if (pointers.current.size === 1) {
      beginDrag(e.clientX, e.clientY);
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        mode: "pinch",
        view: viewRef.current,
        startDist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        startMid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (gesture.current?.mode !== "pinch") {
        gesture.current = {
          mode: "pinch",
          view: viewRef.current,
          startDist: dist,
          startMid: mid,
        };
        return;
      }
      moved.current = true;
      const g = gesture.current;
      const ratio = dist / g.startDist;
      let next = zoomAround(
        g.view,
        g.view.zoom + Math.log2(ratio),
        g.startMid.x - rect.left,
        g.startMid.y - rect.top,
        rect.width,
        rect.height,
      );
      next = panBy(
        next,
        mid.x - g.startMid.x,
        mid.y - g.startMid.y,
        rect.width,
        rect.height,
      );
      onViewChange(next);
      return;
    }

    const g = gesture.current;
    if (!g || g.mode !== "drag") return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (!moved.current && Math.hypot(dx, dy) > 3) moved.current = true;
    if (!moved.current) return;
    onViewChange(panBy(g.view, dx, dy, rect.width, rect.height));
  };

  const endPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (pointers.current.size === 0) {
      gesture.current = null;
      setDragging(false);
      if (!moved.current) onClearSelection();
    } else if (pointers.current.size === 1) {
      const [only] = [...pointers.current.values()];
      beginDrag(only.x, only.y);
      moved.current = true;
    }
  };

  // 滚轮缩放要 preventDefault，所以用原生监听（passive: false）
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      const delta =
        event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      const step = clamp(-delta * 0.0022, -0.9, 0.9);
      onViewChange(
        zoomAround(
          viewRef.current,
          viewRef.current.zoom + step,
          event.clientX - rect.left,
          event.clientY - rect.top,
          rect.width,
          rect.height,
        ),
      );
    };
    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => node.removeEventListener("wheel", handleWheel);
  }, [onViewChange]);

  /* ---------------- 屏幕坐标 ---------------- */

  const box = viewBoxOf(view, size.w || 1, size.h || 1);

  const cityPoints = useMemo(
    () =>
      data.cities.map((city) => ({
        city,
        point: screenPoint(
          city.center[1],
          city.center[0],
          view,
          size.w,
          size.h,
        ),
      })),
    [data.cities, size.h, size.w, view],
  );

  const spotPoints = useMemo(
    () =>
      data.spots.map((spot) => ({
        spot,
        point: screenPoint(spot.lng, spot.lat, view, size.w, size.h),
      })),
    [data.spots, size.h, size.w, view],
  );

  /** 城市之间按时间先后连一条金色虚线 */
  const cityRoute = useMemo(() => {
    if (view.zoom < ZOOM_RULES.cityRoute) return "";
    const ordered = data.trips
      .slice()
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    const points: { x: number; y: number }[] = [];
    for (const trip of ordered) {
      const city = data.cities.find((item) => item.id === trip.cityId);
      if (!city) continue;
      const point = screenPoint(city.center[1], city.center[0], view, size.w, size.h);
      if (!points.some((item) => Math.hypot(item.x - point.x, item.y - point.y) < 6)) {
        points.push(point);
      }
    }
    return points.length > 1 ? smoothPath(points) : "";
  }, [data.cities, data.trips, size.h, size.w, view]);

  /** 选中的这次旅行里，地点之间的虚线 */
  const spotRoute = useMemo(() => {
    if (!selectedTrip || view.zoom < ZOOM_RULES.spotMarkers) return "";
    const points = selectedTrip.spotIds
      .map((id) => data.spots.find((spot) => spot.id === id))
      .filter((spot): spot is TravelSpot => Boolean(spot))
      .map((spot) => screenPoint(spot.lng, spot.lat, view, size.w, size.h));
    return points.length > 1 ? smoothPath(points) : "";
  }, [data.spots, selectedTrip, size.h, size.w, view]);

  /** 选中城市 / 地点旁浮出来的两张照片 */
  const peek = useMemo(() => {
    if (!selected || view.zoom < ZOOM_RULES.photoPeek) return null;
    const anchorSpot =
      selected.kind === "spot"
        ? data.spots.find((spot) => spot.id === selected.id)
        : null;
    const anchorCity = data.cities.find(
      (city) => city.id === (anchorSpot ? anchorSpot.cityId : selected.id),
    );
    if (!anchorCity) return null;
    const lng = anchorSpot ? anchorSpot.lng : anchorCity.center[1];
    const lat = anchorSpot ? anchorSpot.lat : anchorCity.center[0];
    const point = screenPoint(lng, lat, view, size.w, size.h);
    const tripPhotos = selectedTrip?.coverPhotoIds
      .map((id) => photoFor(data, id))
      .filter((item): item is TravelPhoto => Boolean(item)) ?? [];
    const photos = (anchorSpot
      ? anchorSpot.photoIds.map((id) => photoFor(data, id))
      : tripPhotos
    )
      .filter((item): item is TravelPhoto => Boolean(item))
      .slice(0, 2);
    if (photos.length === 0) return null;
    return { point, photos };
  }, [data, selected, selectedTrip, size.h, size.w, view]);

  const showCityLabels = view.zoom >= ZOOM_RULES.cityLabels;
  const showSpots = view.zoom >= ZOOM_RULES.spotMarkers;
  const showSpotLabels = view.zoom >= ZOOM_RULES.spotLabels;
  const activeSpot = selected?.kind === "spot" ? selected.id : null;
  const activeCity = selected?.kind === "city" ? selected.id : null;

  /** 自己导入的底图：铺在它对应的经纬度范围上，跟着缩放一起变 */
  const mapImageRect = useMemo(() => {
    const image = data.mapImage;
    if (!image) return null;
    const topLeft = project(image.bounds.minLng, image.bounds.maxLat, view.zoom);
    const bottomRight = project(image.bounds.maxLng, image.bounds.minLat, view.zoom);
    return {
      x: topLeft.x,
      y: topLeft.y,
      w: bottomRight.x - topLeft.x,
      h: bottomRight.y - topLeft.y,
    };
  }, [data.mapImage, view.zoom]);

  return (
    <div
      ref={containerRef}
      role="presentation"
      data-zoom={Number(view.zoom.toFixed(2))}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onDoubleClick={(e) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        onViewChange(
          zoomAround(
            viewRef.current,
            viewRef.current.zoom + 1,
            e.clientX - rect.left,
            e.clientY - rect.top,
            rect.width,
            rect.height,
          ),
        );
      }}
      className={`absolute inset-0 touch-none select-none overflow-hidden bg-[#cfe4f0] ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      style={{ backgroundColor: "#cfe4f0" }}
    >
      {size.w > 0 && (
        <>
          {mapImageRect ? (
            <svg
              aria-label="导入的地图底图"
              viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full touch-none"
            >
              <image
                href={data.mapImage?.src}
                x={mapImageRect.x}
                y={mapImageRect.y}
                width={mapImageRect.w}
                height={mapImageRect.h}
                preserveAspectRatio="none"
              />
            </svg>
          ) : (
            <WatercolorArt view={view} box={box} cities={data.cities} />
          )}

          {/* 纸面颗粒 + 奶油色晕影，让底图和整站同一张纸 */}
          <div
            aria-hidden="true"
            className="paper-grain pointer-events-none absolute inset-0 opacity-[0.14]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(120% 80% at 50% 45%, rgba(247,238,219,0) 40%, rgba(247,238,219,0.55) 100%)",
            }}
          />

          {/* 城市之间 / 地点之间的金色虚线 */}
          {(cityRoute || spotRoute) && (
            <svg
              aria-hidden="true"
              viewBox={`0 0 ${size.w} ${size.h}`}
              className="pointer-events-none absolute inset-0 h-full w-full"
            >
              {cityRoute && (
                <path
                  d={cityRoute}
                  fill="none"
                  stroke="#c9a45e"
                  strokeWidth="1.6"
                  strokeDasharray="4 7"
                  strokeLinecap="round"
                  opacity={view.zoom >= ZOOM_RULES.spotMarkers ? 0.35 : 0.8}
                />
              )}
              {spotRoute && (
                <path
                  d={spotRoute}
                  fill="none"
                  stroke="#c98b78"
                  strokeWidth="1.5"
                  strokeDasharray="3 6"
                  strokeLinecap="round"
                  opacity="0.85"
                />
              )}
            </svg>
          )}

          {/* 城市图钉 */}
          {cityPoints.map(({ city, point }) => {
            const active = activeCity === city.id;
            const mentioned = selectedTrip?.cityId === city.id;
            return (
              <button
                key={city.id}
                type="button"
                aria-label={`查看${city.name}的旅行`}
                aria-pressed={active}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCity(city.id);
                }}
                className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 touch-manipulation"
                style={{ left: point.x, top: point.y }}
              >
                <span className="relative flex items-center justify-center">
                  {/* 小圆点外面套一圈透明的点击热区，手机上也好按 */}
                  <span
                    aria-hidden="true"
                    className="absolute -inset-[14px] rounded-full"
                  />
                  {!active && (
                    <span
                      aria-hidden="true"
                      className="absolute h-[26px] w-[26px] animate-ping rounded-full bg-[#c9a45e]/25"
                      style={{ animationDuration: "3.2s" }}
                    />
                  )}
                  <span
                    className={`relative flex h-[18px] w-[18px] items-center justify-center rounded-full border transition group-hover:scale-110 ${
                      active
                        ? "border-[#b5806a] bg-[#c98b78] text-[#2f2a22]"
                        : mentioned
                          ? "border-[#b08a48] bg-[#e3c68c]"
                          : "border-[#b08a48] bg-[#f3ddb2]"
                    }`}
                    style={{
                      boxShadow: active
                        ? "0 0 12px rgba(201,139,120,0.65)"
                        : "0 0 12px rgba(201,164,94,0.7)",
                    }}
                  >
                    <span
                      className={`h-[5px] w-[5px] rounded-full ${
                        active ? "bg-[#fffaf0]" : "bg-[#a8823f]"
                      }`}
                    />
                  </span>
                </span>

                {(showCityLabels || active) && !showSpots && (
                  <span
                    className={`absolute whitespace-nowrap rounded-[4px] border px-1.5 py-[1px] text-[0.6rem] tracking-wide shadow-[0_1px_4px_rgba(120,95,60,0.14)] ${
                      active
                        ? "border-[#d6ab95] bg-[#fffaf0] text-[#8b5f45]"
                        : "border-[#e0cba1]/70 bg-[#fffdf7]/90 text-[#8b7145]"
                    } ${
                      labelBelow.has(city.id)
                        ? "left-1/2 top-full mt-1.5 -translate-x-1/2"
                        : "left-1/2 bottom-full mb-1.5 -translate-x-1/2"
                    }`}
                  >
                    {city.name}
                  </span>
                )}
              </button>
            );
          })}

          {/* 地点图钉（拍立得） */}
          {showSpots &&
            spotPoints.map(({ spot, point }) => {
              const active = activeSpot === spot.id;
              const photo = spot.photoIds
                .map((id) => photoFor(data, id))
                .find(Boolean);
              return (
                <button
                  key={spot.id}
                  type="button"
                  aria-label={`打开${spot.name}的照片和回忆`}
                  aria-pressed={active}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSpot(spot.id);
                  }}
                  className="group absolute z-30 -translate-x-1/2 -translate-y-full touch-manipulation"
                  style={{ left: point.x, top: point.y }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute -inset-2 rounded-full"
                  />
                  <span
                    className={`block w-[34px] rounded-[2px] border bg-[#fffdf7] p-[3px] shadow-[0_3px_10px_rgba(120,95,60,0.25)] transition group-hover:-translate-y-0.5 ${
                      active
                        ? "border-[#c98b78] ring-2 ring-[#c98b78]/40"
                        : "border-[#ddc9a5]"
                    }`}
                    style={{ transform: `rotate(${spot.order % 2 === 0 ? 3 : -3}deg)` }}
                  >
                    {photo ? (
                      <Image
                        src={photo.src}
                        alt={photo.caption ?? spot.name}
                        width={photo.width}
                        height={photo.height}
                        unoptimized
                        className="h-[30px] w-full rounded-[1px] object-cover"
                      />
                    ) : (
                      <span className="flex h-[30px] w-full items-center justify-center rounded-[1px] bg-[#f4e7d0] text-[#b08a48]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#c9a45e]" />
                      </span>
                    )}
                  </span>
                  {(showSpotLabels || active) && (
                    <span
                      className={`absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-[4px] px-1.5 py-[1px] text-[0.58rem] tracking-wide shadow-[0_1px_4px_rgba(120,95,60,0.14)] ${
                        active
                          ? "bg-[#fffaf0] font-medium text-[#8b5f45]"
                          : "bg-[#fffdf7]/88 text-[#8b7a62]"
                      }`}
                    >
                      {spot.name}
                    </span>
                  )}
                </button>
              );
            })}

          {/* 选中地点旁浮出来的照片 */}
          {peek && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute z-10 hidden select-none md:block"
              style={{ left: peek.point.x, top: peek.point.y }}
            >
              {peek.photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="absolute w-[78px] rounded-[2px] border border-[#e3d3b6] bg-[#fffdf7] p-[3px] shadow-[0_6px_16px_rgba(120,95,60,0.2)]"
                  style={{
                    left: index === 0 ? -96 : 26,
                    top: index === 0 ? -104 : -78,
                    transform: `rotate(${index === 0 ? -9 : 7}deg)`,
                  }}
                >
                  <Image
                    src={photo.src}
                    alt=""
                    width={photo.width}
                    height={photo.height}
                    unoptimized
                    className="h-[74px] w-full rounded-[1px] object-cover"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute -top-2 left-1/2 h-3 w-8 -translate-x-1/2 rotate-[-4deg] bg-[#efe0c2]/85"
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {children}
    </div>
  );
}
