"use client";

/* R3F 每帧插值必须直接改 ref 里的可变对象，逐帧 setState 会拖垮渲染 */
/* eslint-disable react-hooks/immutability */

import { Canvas, useFrame } from "@react-three/fiber";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent as ReactPointerEvent, RefObject } from "react";
import * as THREE from "three";
import { planetQuotes } from "@/lib/quotes";
import { createPlanetTextures, type PlanetTextures } from "./planet-texture";

type Motion = {
  yaw: number;
  pitch: number;
  tiltX: number;
  tiltY: number;
  targetTiltX: number;
  targetTiltY: number;
  dragging: boolean;
  hover: boolean;
  reduced: boolean;
};

const burstDots = [
  { tx: -52, ty: -30 },
  { tx: 46, ty: -40 },
  { tx: 62, ty: 10 },
  { tx: -60, ty: 20 },
  { tx: 18, ty: -64 },
  { tx: -20, ty: 54 },
];

/** 大气层：只做边缘的冷蓝菲涅尔，不用后期 bloom */
function Atmosphere() {
  return (
    <mesh scale={1.12}>
      <sphereGeometry args={[1, 48, 48]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        vertexShader={`
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vView = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }
        `}
        fragmentShader={`
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            float rim = pow(1.0 - abs(dot(vNormal, vView)), 3.0);
            gl_FragColor = vec4(0.60, 0.69, 0.82, rim * 0.55);
          }
        `}
      />
    </mesh>
  );
}

/** 一条雾霾蓝细环，交给深度测试决定球前 / 球后 */
function OrbitRing() {
  return (
    <mesh rotation={[1.33, 0.04, -0.16]}>
      <torusGeometry args={[1.24, 0.008, 3, 220]} />
      <meshBasicMaterial color="#93aac4" transparent opacity={0.9} depthWrite={false} />
    </mesh>
  );
}

function PlanetMesh({
  textures,
  motion,
}: {
  textures: PlanetTextures;
  motion: RefObject<Motion>;
}) {
  const spin = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const step = Math.min(delta, 0.05);
    const m = motion.current;

    if (!m.reduced) m.yaw += (m.hover ? 0.088 : 0.045) * step;
    if (!m.dragging) m.pitch += (0 - m.pitch) * Math.min(1, step * 3.2);

    const ease = Math.min(1, step * 5.5);
    m.tiltX += (m.targetTiltX - m.tiltX) * ease;
    m.tiltY += (m.targetTiltY - m.tiltY) * ease;

    if (spin.current) spin.current.rotation.y = m.yaw;
    if (tilt.current) {
      tilt.current.rotation.x = m.pitch + m.tiltX;
      tilt.current.rotation.y = m.tiltY;
    }
  });

  return (
    <group ref={tilt}>
      <group ref={spin} rotation={[0.1, 0, -0.06]}>
        <mesh>
          <sphereGeometry args={[1, 72, 72]} />
          <meshStandardMaterial
            map={textures.map}
            bumpMap={textures.bump}
            bumpScale={0.05}
            roughness={0.92}
            metalness={0}
          />
        </mesh>
      </group>
      <OrbitRing />
      <Atmosphere />
    </group>
  );
}

function Prince() {
  return (
    <>
      {/* 坐在球顶的小王子：水彩原图直接叠在球面上，白底靠 multiply 融掉 */}
      <span aria-hidden="true" className="planet-prince">
        <Image
          src="/images/journal/prince.png"
          alt=""
          width={195}
          height={263}
          unoptimized
        />
      </span>

      {/* 玻璃罩里的玫瑰，放在小王子左侧 */}
      <span aria-hidden="true" className="planet-rose">
        <Image
          src="/images/journal/rose-dome.png"
          alt=""
          width={132}
          height={144}
          unoptimized
        />
      </span>
    </>
  );
}

/** 评估一次是否值得跑 3D：没有 WebGL 或设备较弱就直接用静态海报 */
function detectRenderMode(): "3d" | "static" {
  try {
    const canvas = document.createElement("canvas");
    const webgl = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    const cores = navigator.hardwareConcurrency ?? 8;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    return webgl && cores > 4 && memory > 4 ? "3d" : "static";
  } catch {
    return "static";
  }
}

export default function PlanetScene({ onReady }: { onReady?: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  // 组件是 ssr:false 动态加载的，首帧就在浏览器里，可直接惰性求值
  const [mode] = useState<"3d" | "static">(detectRenderMode);
  const [burstKey, setBurstKey] = useState(0);
  const [quote, setQuote] = useState<string | null>(null);
  const quoteIndex = useRef(0);
  const quoteTimer = useRef<number | null>(null);

  const motion = useRef<Motion>({
    yaw: 0,
    pitch: 0,
    tiltX: 0,
    tiltY: 0,
    targetTiltX: 0,
    targetTiltY: 0,
    dragging: false,
    hover: false,
    reduced: false,
  });
  const drag = useRef({ active: false, moved: false, x: 0, y: 0 });

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    motion.current.reduced = query.matches;
    const onChange = (event: MediaQueryListEvent) => {
      motion.current.reduced = event.matches;
    };
    query.addEventListener("change", onChange);

    return () => {
      query.removeEventListener("change", onChange);
      if (quoteTimer.current) window.clearTimeout(quoteTimer.current);
    };
  }, []);

  const textures = useMemo(() => (mode === "3d" ? createPlanetTextures() : null), [mode]);

  useEffect(() => (textures ? textures.dispose : undefined), [textures]);

  const fireBurst = () => {
    setBurstKey((key) => key + 1);
    quoteIndex.current = (quoteIndex.current + 1) % planetQuotes.length;
    setQuote(planetQuotes[quoteIndex.current]);
    if (quoteTimer.current) window.clearTimeout(quoteTimer.current);
    quoteTimer.current = window.setTimeout(() => setQuote(null), 5200);
  };

  const handlePointerEnter = () => {
    motion.current.hover = true;
  };

  const handlePointerLeave = () => {
    motion.current.hover = false;
    if (drag.current.active) return;
    motion.current.targetTiltX = 0;
    motion.current.targetTiltY = 0;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = {
      active: true,
      moved: false,
      x: event.clientX,
      y: event.clientY,
    };
    motion.current.dragging = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const m = motion.current;

    if (drag.current.active) {
      const dx = event.clientX - drag.current.x;
      const dy = event.clientY - drag.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) drag.current.moved = true;

      m.yaw += dx * 0.0045;
      m.pitch = Math.max(-0.55, Math.min(0.55, m.pitch + dy * 0.0035));
      drag.current.x = event.clientX;
      drag.current.y = event.clientY;
      return;
    }

    const wrap = wrapRef.current;
    if (!wrap || m.reduced) return;
    const rect = wrap.getBoundingClientRect();
    m.targetTiltY = ((event.clientX - rect.left) / rect.width - 0.5) * 0.24;
    m.targetTiltX = ((event.clientY - rect.top) / rect.height - 0.5) * -0.18;
  };

  const endDrag = () => {
    if (!drag.current.active) return;
    const moved = drag.current.moved;
    drag.current.active = false;
    motion.current.dragging = false;
    if (!moved) fireBurst();
  };

  const handlePointerCancel = () => {
    drag.current.active = false;
    motion.current.dragging = false;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fireBurst();
    }
  };

  return (
    <div
      ref={wrapRef}
      className="relative mx-auto aspect-square w-full max-w-[540px] cursor-grab select-none active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d8b56e]/70"
      style={{ touchAction: "pan-y" }}
      role="button"
      tabIndex={0}
      aria-label="B612 星球，可拖动旋转；点击点亮星光并读一句小王子的话"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handlePointerCancel}
      onKeyDown={handleKeyDown}
    >
      {/* 球体四周的冷雾光 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[88%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(196,216,238,0.32) 0%, rgba(196,216,238,0.12) 46%, rgba(196,216,238,0) 70%)",
          filter: "blur(18px)",
        }}
      />

      {mode === "3d" && textures && (
        <Canvas
          flat
          frameloop="always"
          dpr={[1, 1.75]}
          camera={{ position: [0, 0, 4.53], fov: 32 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          style={{ position: "absolute", inset: 0 }}
          onCreated={() => {
            requestAnimationFrame(() => requestAnimationFrame(() => onReady?.()));
          }}
        >
          {/* flat 关了色调映射，光照强度必须收着给，否则浅色球面直接过曝成白球 */}
          <ambientLight intensity={0.36} color="#f1f5fb" />
          <directionalLight position={[2.6, 3.2, 4.2]} intensity={0.85} color="#fbf8f4" />
          <directionalLight position={[-3.2, -1.4, -2.2]} intensity={0.22} color="#9db6d8" />
          <PlanetMesh textures={textures} motion={motion} />
        </Canvas>
      )}

      <Prince />

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
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* 球下方一行淡字 */}
      <div className="pointer-events-none absolute inset-x-0 -bottom-9 flex h-12 items-start justify-center px-4">
        <p
          aria-live="polite"
          className={`max-w-[22rem] text-center font-serif text-[13px] leading-6 tracking-[0.05em] text-[#9a8b76] transition-opacity duration-700 ${
            quote ? "opacity-100" : "opacity-0"
          }`}
        >
          {quote ?? ""}
        </p>
      </div>
    </div>
  );
}
