"use client";

import { useMemo } from "react";
import type { MapView, ViewBox } from "@/lib/travel/geo";
import { project, worldSize } from "@/lib/travel/geo";
import type { TravelCity } from "@/lib/travel/types";
import chinaGeo from "@/assets/china-provinces.json";

type Coord = [number, number];

/**
 * 省级轮廓来自 DataV.GeoAtlas（100000_full.json），
 * 由 tools/build-china-geojson.mjs 抽稀成 2 位小数，约 178KB。
 */
type Province = {
  name: string;
  center: number[] | null;
  polygons: number[][][][];
};
const PROVINCES = (chinaGeo as { provinces: Province[] }).provinces;

// 三个接近纸面的底色，轮流铺给各省，营造水彩拼接感
const PROVINCE_FILLS = ["#f9f1e0", "#f5e9cf", "#f7eedb", "#f3e5ca"];

const KOREA: Coord[] = [
  [126.6, 34.4], [126.3, 36.0], [126.6, 37.5], [127.5, 38.6], [128.4, 38.5],
  [129.4, 37.0], [129.3, 35.5], [128.5, 34.7], [127.0, 34.3],
];

const HONSHU: Coord[] = [
  [130.9, 33.9], [131.9, 34.3], [134.0, 34.7], [135.4, 33.7], [136.9, 34.6],
  [138.5, 34.6], [139.8, 35.4], [140.9, 36.4], [141.0, 38.0], [141.9, 40.7],
  [141.4, 41.4], [140.0, 40.3], [139.5, 38.5], [138.0, 37.0], [136.5, 36.3],
  [135.0, 35.6], [133.5, 35.6], [132.0, 34.5],
];

const KYUSHU: Coord[] = [
  [130.2, 31.3], [131.5, 31.6], [131.9, 32.9], [130.8, 33.4], [129.6, 33.0],
  [129.8, 32.0],
];

const HOKKAIDO: Coord[] = [
  [140.0, 42.0], [141.5, 42.3], [143.2, 43.0], [145.5, 43.7], [145.7, 44.8],
  [144.0, 45.5], [142.0, 45.2], [141.0, 44.4], [140.0, 43.2],
];

const YANGTZE: Coord[] = [
  [90.9, 33.2], [96.0, 33.0], [102.0, 30.5], [106.0, 29.5], [110.0, 30.5],
  [114.0, 30.6], [118.0, 31.8], [121.5, 31.4],
];

const YELLOW: Coord[] = [
  [96.5, 35.5], [102.0, 35.8], [106.0, 36.5], [110.0, 35.0], [113.0, 34.8],
  [117.0, 37.0], [119.0, 37.6],
];

const MOUNTAINS: { at: Coord; size: number }[] = [
  { at: [98.0, 31.0], size: 0.55 },
  { at: [101.5, 30.5], size: 0.42 },
  { at: [103.5, 28.5], size: 0.38 },
  { at: [86.0, 33.0], size: 0.5 },
  { at: [90.0, 31.5], size: 0.36 },
  { at: [95.0, 33.6], size: 0.34 },
  { at: [105.5, 34.0], size: 0.3 },
  { at: [112.0, 38.0], size: 0.3 },
  { at: [117.5, 40.5], size: 0.26 },
  { at: [109.0, 25.5], size: 0.28 },
];

const SEAS: { at: Coord; label: string; size: number }[] = [
  { at: [123.5, 33.5], label: "黄 海", size: 12 },
  { at: [124.0, 27.5], label: "东 海", size: 12 },
  { at: [114.5, 17.5], label: "南 海", size: 12 },
  { at: [135.0, 31.5], label: "太 平 洋", size: 10 },
];

/** 网格步长（度）随缩放变密 */
function gridStep(zoom: number) {
  if (zoom < 5.5) return 10;
  if (zoom < 7.5) return 5;
  if (zoom < 9.5) return 1;
  if (zoom < 11.5) return 0.1;
  return 0.02;
}

interface WatercolorArtProps {
  view: MapView;
  box: ViewBox;
  cities: TravelCity[];
}

export default function WatercolorArt({ view, box, cities }: WatercolorArtProps) {
  const zoom = view.zoom;

  // 只依赖缩放级别：拖动（改变 view.lng/lat）不会重算底图
  const { art } = useMemo(() => {
    const p = (lng: number, lat: number) => project(lng, lat, zoom);
    const toPath = (coords: Coord[], close = true) => {
      const d = coords
        .map(([lng, lat], index) => {
          const point = p(lng, lat);
          return `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
        })
        .join(" ");
      return close ? `${d} Z` : d;
    };

    const step = gridStep(zoom);
    const stepX = Math.abs(p(step, 30).x - p(0, 30).x);
    const stepY = Math.abs(p(0, 30).y - p(0, 30 + step).y);
    const size = worldSize(zoom);

    const mountain = (lng: number, lat: number, scale: number, key: string) => {
      const bottom = p(lng, lat);
      const halfW = Math.abs(p(lng + scale, lat).x - bottom.x);
      const peak = p(lng, lat + scale * 0.8);
      const height = bottom.y - peak.y;
      const capY = peak.y + height * 0.3;
      const capHalf = halfW * 0.32;
      return (
        <g key={key}>
          <path
            d={`M ${bottom.x - halfW} ${bottom.y} L ${bottom.x} ${peak.y} L ${bottom.x + halfW} ${bottom.y} Z`}
            fill="#e9d8b9"
            stroke="#cdb691"
            strokeWidth="0.9"
          />
          <path
            d={`M ${bottom.x} ${peak.y} L ${bottom.x + halfW} ${bottom.y} L ${bottom.x + halfW * 0.1} ${bottom.y} Z`}
            fill="#dfcbaa"
            opacity="0.6"
          />
          <path
            d={`M ${bottom.x - capHalf} ${capY} L ${bottom.x} ${peak.y} L ${bottom.x + capHalf} ${capY} L ${bottom.x + capHalf * 0.5} ${capY + height * 0.07} L ${bottom.x} ${capY - height * 0.04} L ${bottom.x - capHalf * 0.5} ${capY + height * 0.07} Z`}
            fill="#fdf8ec"
          />
        </g>
      );
    };

    const cityGrids: React.ReactNode[] = [];
    if (zoom >= 9.8) {
      const spacing = 0.02;
      const half = 0.075;
      cities.forEach((city) => {
        const [lat, lng] = city.center;
        const lines: React.ReactNode[] = [];
        for (let dr = -half; dr <= half; dr += spacing) {
          const a = p(lng - half, lat + dr);
          const b = p(lng + half, lat + dr);
          lines.push(
            <line
              key={`${city.id}-lat-${dr.toFixed(3)}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#bfa981"
              strokeWidth="0.8"
              opacity="0.18"
            />,
          );
        }
        for (let dl = -half; dl <= half; dl += spacing) {
          const a = p(lng + dl, lat - half);
          const b = p(lng + dl, lat + half);
          lines.push(
            <line
              key={`${city.id}-lng-${dl.toFixed(3)}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#bfa981"
              strokeWidth="0.8"
              opacity="0.18"
            />,
          );
        }
        const topLeft = p(lng - half, lat + half);
        const bottomRight = p(lng + half, lat - half);
        cityGrids.push(
          <g key={city.id}>
            <rect
              x={topLeft.x}
              y={topLeft.y}
              width={bottomRight.x - topLeft.x}
              height={bottomRight.y - topLeft.y}
              fill="#efe0c2"
              opacity="0.35"
            />
            <rect
              x={topLeft.x}
              y={topLeft.y}
              width={bottomRight.x - topLeft.x}
              height={bottomRight.y - topLeft.y}
              fill="none"
              stroke="#cbb28c"
              strokeWidth="0.7"
              strokeDasharray="3 4"
              opacity="0.5"
            />
            {lines}
          </g>,
        );
      });
    }

    // 各省轮廓：同一份 path 同时用于投影阴影与正面
    const provincePaths = PROVINCES.map((province) => ({
      name: province.name,
      d: province.polygons
        .map((rings) => rings.map((ring) => toPath(ring as Coord[])).join(" "))
        .join(" "),
    }));

    const node = (
      <>
        {/* 经纬网：用 pattern，拖动时自动跟着走 */}
        <defs>
          <pattern
            id="map-grid"
            width={stepX}
            height={stepY}
            patternUnits="userSpaceOnUse"
            x={size / 2}
          >
            <path
              d={`M 0 0 L 0 ${stepY} M 0 0 L ${stepX} 0`}
              stroke="#c9b48c"
              strokeWidth="0.7"
              strokeDasharray="2 6"
              opacity="0.35"
            />
          </pattern>
          <linearGradient id="map-land" x1="0" y1="0" x2="0.45" y2="1">
            <stop offset="0%" stopColor="#f9f1e0" />
            <stop offset="100%" stopColor="#f0e1c3" />
          </linearGradient>
        </defs>

        <rect
          x={-size}
          y={-size}
          width={size * 3}
          height={size * 3}
          fill="url(#map-grid)"
          opacity="0.5"
        />

        {/* 海面的水彩晕染 */}
        <ellipse cx={p(124, 30).x} cy={p(124, 30).y} rx={Math.abs(p(128, 30).x - p(124, 30).x)} ry={Math.abs(p(124, 27).y - p(124, 30).y)} fill="#bdd7e8" opacity="0.45" />
        <ellipse cx={p(121, 22).x} cy={p(121, 22).y} rx={Math.abs(p(125, 22).x - p(121, 22).x)} ry={Math.abs(p(121, 19.5).y - p(121, 22).y)} fill="#b8d2e5" opacity="0.35" />

        {/* 岛屿（朝鲜半岛 / 日本，作装饰） */}
        {[KOREA, HONSHU, KYUSHU, HOKKAIDO].map((shape, index) => (
          <path
            key={`island-${index}`}
            d={toPath(shape)}
            fill="#f2e4c8"
            stroke="#cbb28c"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        ))}

        {/* 省级陆地：纸边阴影 + 正面（数据来自 DataV.GeoAtlas） */}
        <g transform="translate(2 4)" opacity="0.5">
          {provincePaths.map((province) => (
            <path
              key={`shadow-${province.name}`}
              d={province.d}
              fill="#ddc9a8"
              fillRule="evenodd"
            />
          ))}
        </g>
        {provincePaths.map((province, index) => (
          <path
            key={`province-${province.name}`}
            d={province.d}
            fill={PROVINCE_FILLS[index % PROVINCE_FILLS.length]}
            stroke="#c9b18a"
            strokeWidth="0.8"
            strokeLinejoin="round"
            fillRule="evenodd"
          />
        ))}

        {/* 河流 */}
        <path
          d={toPath(YANGTZE, false)}
          fill="none"
          stroke="#a9c7dc"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d={toPath(YELLOW, false)}
          fill="none"
          stroke="#a9c7dc"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.8"
        />

        {/* 山 */}
        {MOUNTAINS.map((item, index) =>
          mountain(item.at[0], item.at[1], item.size, `mt-${index}`),
        )}

        {/* 城市街网 */}
        {cityGrids}

        {/* 低缩放时的海名 */}
        {zoom < 8 && (
          <g fill="#9db6c6" fontFamily="KaiTi, STKaiti, serif" letterSpacing="3">
            {SEAS.map((sea) => {
              const point = p(sea.at[0], sea.at[1]);
              return (
                <text
                  key={sea.label}
                  x={point.x}
                  y={point.y}
                  fontSize={sea.size}
                  textAnchor="middle"
                  opacity="0.75"
                >
                  {sea.label}
                </text>
              );
            })}
          </g>
        )}
      </>
    );

    return { art: node };
  }, [zoom, cities]);

  return (
    <svg
      aria-hidden="true"
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      width={box.w}
      height={box.h}
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
    >
      {art}
    </svg>
  );
}
