"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { planetQuotes } from "@/lib/quotes";

/** 点击时四散的星点方向（相对球心，单位 px） */
const burstDots = [
  { tx: -58, ty: -34 },
  { tx: 52, ty: -44 },
  { tx: 68, ty: 12 },
  { tx: -66, ty: 22 },
  { tx: 20, ty: -70 },
  { tx: -22, ty: 60 },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** 陨石坑：坑心偏左上的亮面 + 一圈白 rim，转动时最容易被眼睛读成"球面" */
const craters = [
  { x: 118, y: 156, r: 50 },
  { x: 306, y: 118, r: 28 },
  { x: 518, y: 214, r: 56 },
  { x: 188, y: 302, r: 24 },
  { x: 424, y: 352, r: 46 },
  { x: 540, y: 466, r: 30 },
];

/** 球面贴片：一块方形纹理。两张完全相同的贴片并排、整体左移一格即无缝循环。 */
function GlobeTile({ kind }: { kind: "land" | "cloud" }) {
  if (kind === "cloud") {
    return (
      <div className="globe-tile">
        <svg viewBox="0 0 600 600" preserveAspectRatio="none" aria-hidden="true">
          <g fill="#ffffff" opacity="0.6" style={{ filter: "blur(5px)" }}>
            <ellipse cx="140" cy="168" rx="62" ry="17" transform="rotate(-9 140 168)" />
            <ellipse cx="212" cy="196" rx="40" ry="12" transform="rotate(5 212 196)" />
            <ellipse cx="356" cy="250" rx="56" ry="15" transform="rotate(8 356 250)" />
            <ellipse cx="124" cy="340" rx="48" ry="14" transform="rotate(-6 124 340)" />
            <ellipse cx="300" cy="392" rx="54" ry="14" transform="rotate(7 300 392)" />
            <ellipse cx="470" cy="430" rx="42" ry="12" transform="rotate(-9 470 430)" />
            <ellipse cx="200" cy="508" rx="50" ry="13" transform="rotate(6 200 508)" />
            <ellipse cx="520" cy="140" rx="32" ry="10" transform="rotate(-5 520 140)" />
          </g>
        </svg>
      </div>
    );
  }

  return (
    <div className="globe-tile">
      <svg viewBox="0 0 600 600" preserveAspectRatio="none" aria-hidden="true">
        {/* 水彩分层：远处晕开的淡色 → 陆块主体 → 高光碎块 → 深色暗礁 → 海岸细点 */}
        <g fill="#93a9cd" opacity="0.22" style={{ filter: "blur(13px)" }}>
          <ellipse cx="150" cy="170" rx="106" ry="82" transform="rotate(-12 150 170)" />
          <ellipse cx="252" cy="232" rx="74" ry="56" transform="rotate(16 252 232)" />
          <ellipse cx="420" cy="300" rx="100" ry="72" transform="rotate(14 420 300)" />
          <ellipse cx="200" cy="430" rx="80" ry="58" transform="rotate(8 200 430)" />
          <ellipse cx="518" cy="420" rx="50" ry="36" transform="rotate(-18 518 420)" />
          <ellipse cx="344" cy="92" rx="56" ry="40" transform="rotate(-6 344 92)" />
        </g>
        <g fill="#6583b1" opacity="0.6" style={{ filter: "blur(3.5px)" }}>
          <ellipse cx="152" cy="172" rx="92" ry="68" transform="rotate(-12 152 172)" />
          <ellipse cx="254" cy="234" rx="58" ry="42" transform="rotate(16 254 234)" />
          <ellipse cx="418" cy="298" rx="86" ry="58" transform="rotate(14 418 298)" />
          <ellipse cx="202" cy="428" rx="66" ry="45" transform="rotate(8 202 428)" />
          <ellipse cx="516" cy="418" rx="38" ry="26" transform="rotate(-18 516 418)" />
          <ellipse cx="338" cy="96" rx="46" ry="31" transform="rotate(-6 338 96)" />
        </g>
        <g fill="#9cb2d2" opacity="0.55" style={{ filter: "blur(2.5px)" }}>
          <ellipse cx="188" cy="200" rx="42" ry="26" transform="rotate(-12 188 200)" />
          <ellipse cx="408" cy="282" rx="36" ry="22" transform="rotate(14 408 282)" />
          <ellipse cx="228" cy="420" rx="30" ry="18" transform="rotate(8 228 420)" />
          <ellipse cx="316" cy="176" rx="26" ry="15" transform="rotate(-14 316 176)" />
          <ellipse cx="500" cy="392" rx="20" ry="12" transform="rotate(10 500 392)" />
          <ellipse cx="326" cy="86" rx="24" ry="13" transform="rotate(-6 326 86)" />
        </g>
        <g fill="#496a9c" opacity="0.36" style={{ filter: "blur(1.6px)" }}>
          <ellipse cx="130" cy="236" rx="16" ry="10" transform="rotate(-8 130 236)" />
          <ellipse cx="356" cy="330" rx="20" ry="12" transform="rotate(12 356 330)" />
          <ellipse cx="236" cy="474" rx="14" ry="9" transform="rotate(-6 236 474)" />
          <ellipse cx="474" cy="256" rx="12" ry="7" transform="rotate(14 474 256)" />
        </g>
        <g fill="#5f7dab" opacity="0.34" style={{ filter: "blur(1px)" }}>
          <circle cx="88" cy="118" r="2.6" />
          <circle cx="112" cy="252" r="1.8" />
          <circle cx="206" cy="120" r="2.2" />
          <circle cx="282" cy="268" r="2.4" />
          <circle cx="330" cy="222" r="1.6" />
          <circle cx="392" cy="376" r="2.6" />
          <circle cx="448" cy="214" r="2" />
          <circle cx="496" cy="332" r="1.8" />
          <circle cx="160" cy="384" r="2.2" />
          <circle cx="268" cy="500" r="2.4" />
          <circle cx="546" cy="176" r="2" />
          <circle cx="60" cy="314" r="1.6" />
        </g>
      </svg>
      {/* 陨石坑：用渐变的碗形 + 一圈内阴影，读成"凹下去的坑"而不是白圈 */}
      {craters.map((c) => (
        <span
          key={`${c.x}-${c.y}`}
          className="globe-crater"
          style={{
            left: `${(c.x / 6).toFixed(2)}%`,
            top: `${(c.y / 6).toFixed(2)}%`,
            width: `${((c.r * 2) / 6).toFixed(2)}%`,
          }}
        />
      ))}
    </div>
  );
}

export default function InteractivePlanet() {
  const stageRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const reducedRef = useRef(false);

  const anim = useRef({
    tiltX: 0,
    tiltY: 0,
    shiftX: 0,
    shiftY: 0,
    scale: 1,
    targetTiltX: 0,
    targetTiltY: 0,
    targetShiftX: 0,
    targetShiftY: 0,
    targetScale: 1,
  });
  const drag = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
  });

  const [burstKey, setBurstKey] = useState(0);
  const [quote, setQuote] = useState<string | null>(null);
  const lastQuoteAt = useRef(0);
  const quoteIndex = useRef(0);
  const quoteTimer = useRef<number | null>(null);

  // 倾斜 / 视差的统一缓动循环：直接写 DOM，避免每帧触发 React 重渲染
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedRef.current = query.matches;
    const onChange = (event: MediaQueryListEvent) => {
      reducedRef.current = event.matches;
    };
    query.addEventListener("change", onChange);

    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (!reducedRef.current) {
        const state = anim.current;
        const ease = Math.min(1, dt * 8);
        state.tiltX += (state.targetTiltX - state.tiltX) * ease;
        state.tiltY += (state.targetTiltY - state.tiltY) * ease;
        state.shiftX += (state.targetShiftX - state.shiftX) * ease;
        state.shiftY += (state.targetShiftY - state.shiftY) * ease;
        state.scale += (state.targetScale - state.scale) * ease;

        if (tiltRef.current) {
          tiltRef.current.style.transform =
            `translate3d(${state.shiftX.toFixed(1)}px, ${state.shiftY.toFixed(1)}px, 0) ` +
            `rotateX(${state.tiltX.toFixed(2)}deg) rotateY(${state.tiltY.toFixed(2)}deg) ` +
            `scale(${state.scale.toFixed(3)})`;
        }
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      query.removeEventListener("change", onChange);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (quoteTimer.current) window.clearTimeout(quoteTimer.current);
    };
  }, []);

  const triggerBurst = () => {
    setBurstKey((key) => key + 1);

    const now = Date.now();
    if (now - lastQuoteAt.current < 1200) return;
    lastQuoteAt.current = now;

    quoteIndex.current = (quoteIndex.current + 1) % planetQuotes.length;
    setQuote(planetQuotes[quoteIndex.current]);

    if (quoteTimer.current) window.clearTimeout(quoteTimer.current);
    quoteTimer.current = window.setTimeout(() => setQuote(null), 4500);
  };

  const resetTilt = () => {
    const state = anim.current;
    state.targetTiltX = 0;
    state.targetTiltY = 0;
    state.targetShiftX = 0;
    state.targetShiftY = 0;
    state.targetScale = 1;
  };

  const handlePointerEnter = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && !reducedRef.current) {
      anim.current.targetScale = 1.025;
    }
  };

  const handlePointerLeave = () => {
    if (!drag.current.active) resetTilt();
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reducedRef.current) return;

    if (drag.current.active) {
      const dx = event.clientX - drag.current.startX;
      const dy = event.clientY - drag.current.startY;
      if (Math.abs(dx) + Math.abs(dy) > 6) drag.current.moved = true;

      anim.current.targetTiltY = clamp(dx * 0.16, -15, 15);
      anim.current.targetTiltX = clamp(-dy * 0.12, -11, 11);
      anim.current.targetShiftX = clamp(dx * 0.12, -14, 14);
      anim.current.targetShiftY = clamp(dy * 0.08, -10, 10);
      return;
    }

    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width - 0.5;
    const ny = (event.clientY - rect.top) / rect.height - 0.5;

    anim.current.targetTiltY = nx * 13;
    anim.current.targetTiltX = -ny * 9;
    anim.current.targetShiftX = nx * 7;
    anim.current.targetShiftY = ny * 5;
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerUp = () => {
    if (!drag.current.active) return;
    const moved = drag.current.moved;
    drag.current.active = false;
    resetTilt();
    if (!moved) triggerBurst();
  };

  const handlePointerCancel = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    resetTilt();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      triggerBurst();
    }
  };

  return (
    <div className="relative w-full select-none">
      {/* 球体背后的暖光 */}
      <div
        aria-hidden="true"
        className="hb-halo pointer-events-none absolute left-1/2 top-1/2 h-[74%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,246,225,0.95)_0%,rgba(247,229,192,0.55)_45%,rgba(247,229,192,0)_72%)] blur-[18px]"
      />

      <div
        ref={stageRef}
        className="planet-stage relative aspect-square w-full cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold/70"
        style={{ touchAction: "pan-y" }}
        role="button"
        tabIndex={0}
        aria-label="B612 立体星球，正在缓慢自转；点击点亮星光并听一句小王子的话"
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handlePointerCancel}
        onKeyDown={handleKeyDown}
      >
        <div ref={tiltRef} className="planet-tilt">
          <div className="planet-float">
            <div className="globe-wrap">
              {/* 金色星轨：后半段在球后，前半弧压在球上 */}
              <div aria-hidden="true" className="globe-ring" />
              <div aria-hidden="true" className="globe-ring globe-ring-front" />
              <div aria-hidden="true" className="globe-atmo" />

              {/* 球体本体：圆形裁切 + 两层球面纹理滚动（大陆 52s / 云 34s） */}
              <div aria-hidden="true" className="planet-globe">
                <div className="globe-track">
                  <GlobeTile kind="land" />
                  <GlobeTile kind="land" />
                </div>
                <div className="globe-track globe-track-clouds">
                  <GlobeTile kind="cloud" />
                  <GlobeTile kind="cloud" />
                </div>
                <div className="globe-cap" />
                <div className="globe-grain" />
                <div className="globe-light" />
                <div className="globe-shadow" />
                <div className="globe-rim" />
              </div>

              {/* 小王子：坐在星球边缘，黄围巾飘向左侧 */}
              <span aria-hidden="true" className="planet-prince">
                <svg viewBox="0 0 60 88" fill="none">
                  {/* 飘起的两截黄围巾 */}
                  <path d="M23 27c-8 1-14-1-19-6l4.5-4c4 4 9 5 15 4z" fill="#f0c463" />
                  <path d="M22 30c-9 3-15 2-21-3l4-5c5 4 11 5 17 2z" fill="#e2ab42" />
                  {/* 两条腿垂在球面外 */}
                  <path d="M32 58c2.4 8 3.6 15 4 22" stroke="#6d5c46" strokeWidth="7" strokeLinecap="round" />
                  <path d="M29 58c-2.6 6-4.8 12-6.2 18" stroke="#63543f" strokeWidth="6.4" strokeLinecap="round" />
                  <ellipse cx="36.6" cy="82.6" rx="5.4" ry="3.4" fill="#4e4033" />
                  <ellipse cx="22.6" cy="78.4" rx="4.8" ry="3.2" fill="#4e4033" />
                  {/* 绿色外套 */}
                  <path
                    d="M21 32c0-4 4.5-7 10-7s10 3 10 7l-2.5 24c-.2 3-3.4 5-7.5 5s-7.3-2-7.5-5z"
                    fill="#7c8d6a"
                  />
                  {/* 撑在球面上的手臂 */}
                  <path d="M39 36c2.4 2 3.4 4.6 2.8 7.6" stroke="#7c8d6a" strokeWidth="3.2" strokeLinecap="round" />
                  <circle cx="41.6" cy="45.4" r="2.2" fill="#f7ddb0" />
                  {/* 头与乱糟糟的金发 */}
                  <circle cx="31" cy="17" r="8.6" fill="#f7ddb0" />
                  <path
                    d="M22.4 16.5c-1-6 3.8-10.5 9-10.5 4.8 0 9 3.6 9.6 8.2-2.4-2-5.6-3-9.6-3-3.6 0-6.8 1.6-9 5.3z"
                    fill="#e7c172"
                  />
                  <path
                    d="M25 9.4 23 6M30 6.6l-.6-3M36.6 8.4l2-2.6"
                    stroke="#dcb25f"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx="34.6" cy="17.6" r="1" fill="#5a4a38" />
                  {/* 围在脖子上的围巾 */}
                  <path d="M22 26c5 4 13 4 18 0l1.5 4.5c-6.5 4.5-14.5 4.5-21 0z" fill="#e9b64f" />
                </svg>
              </span>

              {/* 那朵玫瑰 */}
              <span aria-hidden="true" className="planet-rose">
                <svg viewBox="0 0 30 46" fill="none">
                  <path d="M15 45V21" stroke="#7d8a63" strokeWidth="1.6" />
                  <path d="M15 36c-3.4-2.2-6.6-2.2-8.6-.6 1-2.2 4.2-3.2 8.6-1.9" fill="#8b9a6c" />
                  <path d="M15 30c3.4-2.2 6.6-2.2 8.6-.6-1-2.2-4.2-3.2-8.6-1.9" fill="#8b9a6c" />
                  <circle cx="15" cy="14" r="7.2" fill="#cf5b46" />
                  <circle cx="15" cy="14" r="4.7" fill="#dd7c64" />
                  <circle cx="15" cy="13.4" r="2.2" fill="#f0a891" />
                  <path d="M9.4 17.4c1.6 1.4 3.6 2 5.6 1.8" stroke="#b84a37" strokeWidth="1" strokeLinecap="round" />
                </svg>
              </span>


              <span
                aria-hidden="true"
                className="globe-spark"
                style={{ top: "12%", left: "80%", animationDelay: "0s" }}
              />
              <span
                aria-hidden="true"
                className="globe-spark"
                style={{
                  top: "70%",
                  left: "7%",
                  width: 4,
                  height: 4,
                  animationDelay: "1.4s",
                }}
              />
              <span
                aria-hidden="true"
                className="globe-spark"
                style={{
                  top: "6%",
                  left: "26%",
                  width: 5,
                  height: 5,
                  animationDelay: "2.6s",
                }}
              />
            </div>
          </div>
        </div>

        {/* 点击星光 */}
        <div key={burstKey} className="planet-burst" aria-hidden="true">
          <span className="planet-burst-glow" />
          <span className="planet-burst-ring" />
          {burstDots.map((dot, index) => (
            <span
              key={index}
              className="planet-burst-star"
              style={
                {
                  "--tx": `${dot.tx}px`,
                  "--ty": `${dot.ty}px`,
                  animationDelay: `${index * 40}ms`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>

      {/* 小王子短句：淡奶白底衬，保证压在星球/云上时依然清楚 */}
      <div
        aria-live="polite"
        className={`pointer-events-none absolute bottom-[14%] left-1/2 w-[78%] max-w-[320px] -translate-x-1/2 rounded-[1.4rem] bg-[#fdf8ee]/72 px-4 py-2.5 text-center backdrop-blur-[2px] transition-all duration-700 md:bottom-[3%] md:left-[-15%] md:w-[42%] md:max-w-[300px] md:-translate-x-0 md:text-left ${
          quote ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        {quote && (
          <>
            <span
              aria-hidden="true"
              className="mb-2 inline-block h-[5px] w-[5px] rotate-45 bg-[#d8b56e]"
            />
            <p className="font-serif text-[15px] leading-7 text-[#7b6a52] sm:text-base">
              {quote}
            </p>
            <p className="mt-1 text-[11px] tracking-[0.22em] text-[#b3a08a]">
              —— 《小王子》
            </p>
          </>
        )}
      </div>
    </div>
  );
}
