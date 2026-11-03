"use client";

import type { TravelPlace } from "@/lib/travel-data";
import { mapPalette as C } from "@/lib/travel-data";

interface MemoryMapProps {
  places: TravelPlace[];
  selectedId: string | null;
  /** 正在编辑的那枚足迹的位置（还没保存时先画个虚线钉子） */
  draft: { x: number; y: number } | null;
  /** 是否处于「点地图选位置」状态 */
  picking: boolean;
  onSelect: (id: string) => void;
  onPickSpot: (x: number, y: number) => void;
}

const W = 640;
const H = 440;

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/** 小松树：地图上的装饰 */
function Pine({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 L0 6" stroke="#b39a74" strokeWidth="1.4" />
      <path d="M0 -9 L4.6 0 L-4.6 0 Z" fill="#aebd9d" />
      <path d="M0 -3 L5.4 7 L-5.4 7 Z" fill="#a2b292" />
    </g>
  );
}

/** 小房子 */
function House({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 L0 -9 L9 -15 L18 -9 L18 0 Z" fill="#f8f0de" stroke="#c8b28c" strokeWidth="1" />
      <path d="M-2.5 -9 L9 -16.5 L20.5 -9" stroke="#c8b28c" strokeWidth="1.2" fill="none" />
      <rect x="7" y="-5" width="4" height="5" fill="#c8b28c" />
    </g>
  );
}

/** 海边小灯塔 */
function Lighthouse({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-3 0 L3 0 L2 -16 L-2 -16 Z" fill="#fbf5e8" stroke="#c8b28c" strokeWidth="0.9" />
      <path d="M-2.4 -6 L2.4 -6" stroke="#c98b78" strokeWidth="2" />
      <path d="M-1.8 -11 L1.8 -11" stroke="#c98b78" strokeWidth="2" />
      <rect x="-2.5" y="-20" width="5" height="4" fill="#e8d4ab" stroke="#c8b28c" strokeWidth="0.8" />
      <path d="M0 -20 L0 -25" stroke="#c9a45e" strokeWidth="0.9" />
      <path d="M-14 -21 L-3 -23 M14 -21 L3 -23" stroke="#dcbf8b" strokeWidth="0.8" opacity="0.8" />
    </g>
  );
}

/** 海面上的小帆船 */
function Sailboat({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-7 0 L7 0 L4.5 4 L-4.5 4 Z" fill="#b98f6b" />
      <path d="M0 -1 L0 -11 L7 -2 Z" fill="#fbf5e8" stroke="#c8b28c" strokeWidth="0.8" />
      <path d="M0 -1 L0 -9 L-6 -2 Z" fill="#f3e3c4" stroke="#c8b28c" strokeWidth="0.8" />
    </g>
  );
}

/** 地图底图：海、山、湖、松林、罗盘都画在同一张纸上 */
function MapArt({ route }: { route: string }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="map-paper" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#fbf3e2" />
          <stop offset="58%" stopColor="#f6ecd6" />
          <stop offset="100%" stopColor="#eddfc3" />
        </linearGradient>
        <linearGradient id="map-sea" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#d3e7f3" />
          <stop offset="100%" stopColor="#b4d1e4" />
        </linearGradient>
        <radialGradient id="map-forest" cx="0.5" cy="0.5" r="0.7">
          <stop offset="0%" stopColor="#dfe4cf" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#dfe4cf" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 纸 */}
      <rect width={W} height={H} fill="url(#map-paper)" />

      {/* 很淡的经纬格 */}
      <g stroke="#d7c4a2" strokeWidth="0.6" opacity="0.3">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={`v${i}`} x1={i * 80} y1={0} x2={i * 80} y2={H} />
        ))}
        {[1, 2, 3, 4].map((i) => (
          <line key={`h${i}`} x1={0} y1={i * 88} x2={W} y2={i * 88} />
        ))}
      </g>

      {/* 陆地的水彩起伏 */}
      <path
        d="M0 296 C58 262 116 282 186 258 C258 234 322 264 414 242 C496 222 574 248 640 232 L640 0 L0 0 Z"
        fill="#f2e4c8"
        opacity="0.9"
      />
      <path
        d="M58 186 C78 132 148 108 212 126 C276 144 306 176 292 200 C252 214 170 210 118 200 C78 192 54 196 58 186 Z"
        fill="#eedcba"
        opacity="0.85"
      />
      <path
        d="M132 306 C152 236 244 206 344 218 C442 230 528 204 584 242 C602 288 556 312 494 318 C408 326 328 312 252 308 C192 306 142 322 132 306 Z"
        fill="#eede9f"
        opacity="0.18"
      />
      <path
        d="M140 302 C162 240 248 214 344 226 C436 238 518 212 572 246"
        stroke="#ddc9a4"
        strokeWidth="1.1"
        fill="none"
        opacity="0.65"
      />

      {/* 等高线 */}
      <g stroke="#dcc9a7" strokeWidth="0.9" fill="none" opacity="0.6">
        <path d="M86 122 C158 94 246 98 318 118" strokeDasharray="3 5" />
        <path d="M106 146 C174 120 252 124 316 142" strokeDasharray="3 5" />
        <path d="M372 208 C424 192 472 202 514 222" strokeDasharray="3 5" />
        <path d="M214 334 C286 320 372 326 448 338" strokeDasharray="3 5" />
      </g>

      {/* 海 */}
      <path
        d="M0 318 C68 306 122 330 188 322 C256 314 306 344 372 336 C446 327 520 348 640 334 L640 440 L0 440 Z"
        fill="url(#map-sea)"
      />
      {/* 沙滩边 */}
      <path
        d="M0 318 C68 306 122 330 188 322 C256 314 306 344 372 336 C446 327 520 348 640 334"
        stroke="#e6d4ae"
        strokeWidth="5"
        fill="none"
        opacity="0.85"
      />
      <path
        d="M0 318 C68 306 122 330 188 322 C256 314 306 344 372 336 C446 327 520 348 640 334"
        stroke="#a9c3d6"
        strokeWidth="1.4"
        fill="none"
      />
      {/* 海浪 */}
      <g stroke="#9dbcce" strokeWidth="1.2" fill="none" opacity="0.8">
        <path d="M34 376 q12 -8 24 0 t24 0" />
        <path d="M116 406 q12 -8 24 0 t24 0" />
        <path d="M456 380 q12 -8 24 0 t24 0" />
        <path d="M534 410 q12 -8 24 0 t24 0" />
        <path d="M222 414 q12 -8 24 0 t24 0" />
      </g>

      {/* 小岛 + 帆船 + 灯塔 */}
      <ellipse cx="302" cy="382" rx="27" ry="9" fill="#e9dcbf" />
      <ellipse cx="302" cy="382" rx="27" ry="9" fill="none" stroke="#d5c1a0" strokeWidth="0.9" />
      <Pine x={295} y={376} s={0.9} />
      <Pine x={310} y={378} s={0.7} />
      <Sailboat x={112} y={360} />
      <Sailboat x={486} y={396} />
      <Lighthouse x={604} y={316} />

      {/* 山 */}
      <path d="M462 172 L506 82 L550 172 Z" fill="#e5d2ae" />
      <path d="M506 82 L550 172 L516 172 Z" fill="#dcc7a1" opacity="0.75" />
      <path d="M491 112 L506 82 L521 112 L514 118 L506 110 L498 118 Z" fill="#fdf8ec" />
      <path d="M520 176 L552 114 L584 176 Z" fill="#decaa6" />
      <path d="M552 114 L584 176 L560 176 Z" fill="#d3bd95" opacity="0.7" />
      <path d="M538 139 L552 114 L566 139 L560 144 L552 138 L544 144 Z" fill="#fbf5e8" />
      <path d="M408 178 L438 124 L468 178 Z" fill="#e9d9bb" />
      <path d="M438 124 L468 178 L446 178 Z" fill="#dfceab" opacity="0.7" />
      <path d="M424 150 L438 124 L452 150 L446 154 L438 149 L430 154 Z" fill="#fcf7eb" />
      {/* 山脊虚线 */}
      <path
        d="M506 84 L526 146 M552 116 L566 158 M438 126 L452 164"
        stroke="#cbb48f"
        strokeWidth="0.8"
        strokeDasharray="2 3"
        fill="none"
        opacity="0.7"
      />

      {/* 湖 + 河 */}
      <ellipse cx="212" cy="240" rx="47" ry="24" fill="#d3e4f0" stroke="#b9d1e2" strokeWidth="1.2" />
      <ellipse cx="212" cy="240" rx="36" ry="17" fill="none" stroke="#c3d9e8" strokeWidth="0.9" />
      <path d="M188 242 q11 -6 22 0 t22 0" stroke="#bcd4e5" strokeWidth="1" fill="none" />
      <path
        d="M212 264 C222 288 244 298 258 318"
        stroke="#bcd6e7"
        strokeWidth="2"
        fill="none"
        opacity="0.9"
      />

      {/* 小树林 */}
      <ellipse cx="392" cy="272" rx="86" ry="34" fill="url(#map-forest)" />
      <Pine x={330} y={252} s={1.05} />
      <Pine x={352} y={266} s={0.85} />
      <Pine x={312} y={274} s={0.8} />
      <Pine x={382} y={242} s={0.95} />
      <Pine x={402} y={258} s={0.8} />
      <Pine x={428} y={252} s={0.9} />
      <Pine x={452} y={266} s={0.75} />
      <Pine x={558} y={232} s={0.9} />
      <Pine x={576} y={248} s={0.75} />
      <Pine x={148} y={282} s={0.85} />
      <Pine x={166} y={294} s={0.7} />

      {/* 小村子 */}
      <House x={424} y={298} />
      <House x={446} y={284} s={0.9} />
      <House x={406} y={282} s={0.8} />

      {/* 手写的几个字 */}
      <g fill="#a08e74" fontFamily="KaiTi, STKaiti, serif">
        <text x="448" y="206" fontSize="13" letterSpacing="2">山</text>
        <text x="40" y="404" fontSize="13" letterSpacing="2">海</text>
        <text x="164" y="284" fontSize="12" letterSpacing="1">湖</text>
        <text x="404" y="316" fontSize="10" letterSpacing="1" opacity="0.85">村子</text>
      </g>

      {/* 罗盘 */}
      <g transform="translate(586 394)">
        <circle r="25" fill="#f9f1e0" stroke="#c9b48c" strokeWidth="1.2" />
        <circle r="18" fill="none" stroke="#d8c3a0" strokeWidth="0.8" />
        <path
          d="M0 -20 L3.4 -3.4 L20 0 L3.4 3.4 L0 20 L-3.4 3.4 L-20 0 L-3.4 -3.4 Z"
          fill="none"
          stroke="#c9a45e"
          strokeWidth="1.2"
        />
        <path d="M0 -13 L0 13" stroke="#d8bf94" strokeWidth="0.8" />
        <path d="M-13 0 L13 0" stroke="#d8bf94" strokeWidth="0.8" />
        <circle r="2.2" fill="#c9a45e" />
        <text y="-28" textAnchor="middle" fontSize="8.5" fill="#a08e74">北</text>
      </g>

      {/* 比例尺 */}
      <g transform="translate(38 414)" stroke="#b7a488" fill="none" strokeWidth="1">
        <line x1="0" y1="0" x2="72" y2="0" />
        <line x1="0" y1="-3" x2="0" y2="3" />
        <line x1="36" y1="-3" x2="36" y2="3" />
        <line x1="72" y1="-3" x2="72" y2="3" />
        <text x="80" y="4" fontSize="9" fill="#a08e74" fontFamily="KaiTi, STKaiti, serif">
          一起走过
        </text>
      </g>

      {/* 左上角的地图纸签（手机上太小，先藏起来） */}
      <g transform="translate(26 26)" className="hidden md:block">
        <rect width="156" height="46" rx="5" fill="#fbf4e4" stroke="#cdb691" strokeWidth="1" opacity="0.94" />
        <rect x="4" y="4" width="148" height="38" rx="3" fill="none" stroke="#e0d0b2" strokeWidth="0.7" />
        <text
          x="78"
          y="21"
          textAnchor="middle"
          fontSize="13"
          letterSpacing="3"
          fill="#8b7145"
          fontFamily="KaiTi, STKaiti, serif"
        >
          我们的旅行地图
        </text>
        <text
          x="78"
          y="35"
          textAnchor="middle"
          fontSize="7"
          letterSpacing="3.4"
          fill="#b3a08a"
        >
          OUR JOURNEY TOGETHER
        </text>
      </g>

      {/* 四角的小星星 */}
      <g fill="#c9a45e" opacity="0.55">
        <g transform="translate(610 38) scale(0.6)">
          <path d="M0 -10 L2.2 -2.2 L10 0 L2.2 2.2 L0 10 L-2.2 2.2 L-10 0 L-2.2 -2.2 Z" />
        </g>
      </g>

      {/* 内框虚线 */}
      <rect
        x="11"
        y="11"
        width={W - 22}
        height={H - 22}
        rx="7"
        fill="none"
        stroke="#cbb18a"
        strokeWidth="0.8"
        strokeDasharray="7 5"
        opacity="0.45"
      />

      {/* 走过的路线 */}
      {route && (
        <path
          d={route}
          fill="none"
          stroke={C.gold}
          strokeWidth="1.9"
          strokeDasharray="3 6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.92"
        />
      )}
    </svg>
  );
}

export default function MemoryMap({
  places,
  selectedId,
  draft,
  picking,
  onSelect,
  onPickSpot,
}: MemoryMapProps) {
  // 路线按足迹顺序连起来，坐标换算成 viewBox 尺寸
  const route =
    places.length > 1
      ? places
          .map(
            (place, index) =>
              `${index === 0 ? "M" : "L"} ${(place.x / 100) * W} ${(place.y / 100) * H}`,
          )
          .join(" ")
      : "";

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!picking) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 8, 92);
    const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 12, 86);
    onPickSpot(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  };

  return (
    <div
      role="presentation"
      onClick={handleClick}
      className={`relative w-full overflow-hidden rounded-[13px] border border-[#cdb691]/60 bg-[#f5ebd5] shadow-[0_14px_34px_rgba(120,100,72,0.18)] ${
        picking ? "cursor-crosshair" : ""
      }`}
      style={{ aspectRatio: `${W} / ${H}` }}
    >
      <MapArt route={route} />

      {/* 纸面颗粒，让地图和整页在同一张纸上 */}
      <div aria-hidden="true" className="paper-grain pointer-events-none absolute inset-0 opacity-[0.16]" />

      {/* 左上角的纸胶带 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-3 -top-2 h-6 w-[4.5rem] rotate-[-9deg] rounded-[2px] border border-[#ddc9a5]/70 bg-[#f2e3c4]/85"
      />

      {/* 右上角计数 */}
      <span className="pointer-events-none absolute right-3 top-3 rounded-full border border-[#ddc9a5]/80 bg-[#fffdf7]/85 px-2.5 py-[3px] text-[0.6rem] tracking-wide text-[#8b7a62]">
        {places.length} 枚足迹
      </span>

      {/* 选位置提示 */}
      {picking && (
        <div className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed border-[#c9a45e]/80 bg-[#fffdf7]/92 px-2.5 py-[3px] text-[0.62rem] text-[#8b7145]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#c9a45e]" />
          点地图选位置
        </div>
      )}

      {/* 图钉 */}
      {places.map((place, index) => {
        const active = selectedId === place.id;
        return (
          <button
            key={place.id}
            type="button"
            aria-label={`查看${place.name}${place.spot ? `·${place.spot}` : ""}`}
            aria-pressed={active}
            onClick={(e) => {
              // 选位置状态下让点击冒泡到地图上
              if (picking) return;
              e.stopPropagation();
              onSelect(place.id);
            }}
            className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 touch-manipulation"
            style={{ left: `${place.x}%`, top: `${place.y}%` }}
          >
            <span
              className={`mx-auto flex h-[27px] w-[27px] items-center justify-center rounded-full border text-[0.64rem] shadow-[0_2px_5px_rgba(120,95,60,0.22)] transition group-hover:-translate-y-0.5 ${
                active
                  ? "border-[#b5806a] bg-[#c98b78] text-[#fffaf0]"
                  : "border-[#c9a86b] bg-[#fffaf0] text-[#8b7145]"
              }`}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span
              className={`absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-[4px] px-1.5 py-[1px] text-[0.6rem] leading-tight tracking-wide shadow-[0_1px_3px_rgba(120,95,60,0.12)] ${
                active
                  ? "bg-[#fffaf0] font-medium text-[#8b5f45]"
                  : "bg-[#fffdf7]/88 text-[#8b7a62]"
              }`}
            >
              {place.name}
            </span>
          </button>
        );
      })}

      {/* 编辑中的临时钉子 */}
      {draft && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${draft.x}%`, top: `${draft.y}%` }}
        >
          <span className="flex h-[27px] w-[27px] animate-pulse items-center justify-center rounded-full border-2 border-dashed border-[#c98b78] bg-[#fffaf0]/95">
            <span className="h-2 w-2 rounded-full bg-[#c98b78]" />
          </span>
          <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-[4px] bg-[#fffaf0]/90 px-1.5 py-[1px] text-[0.58rem] text-[#a06a55]">
            新足迹
          </span>
        </div>
      )}

      {/* 没有足迹时的引导 */}
      {places.length === 0 && !draft && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
          <p className="font-hand text-[0.95rem] text-[#8b7a62]">还没有钉下第一个地方</p>
          <p className="text-[0.68rem] text-[#a89476]">点右上角「记下一个地方」开始吧</p>
        </div>
      )}
    </div>
  );
}
