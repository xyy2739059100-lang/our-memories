"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import HeroBackdrop from "./HeroBackdrop";
import SiteHeader from "@/components/layout/SiteHeader";

const PlanetScene = dynamic(() => import("./PlanetScene"), { ssr: false });

/** 3D 就绪前的静态海报，保证首屏先有一个安静的球 */
function PlanetPoster() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <div
        className="relative aspect-square w-[77.8%] overflow-hidden rounded-full"
        style={{
          background:
            "radial-gradient(circle at 31% 24%, #f6f9fc 0%, #dfe7f1 22%, #c4d0df 50%, #aab8cb 74%, #96a6bb 100%)",
          boxShadow:
            "inset -14px -16px 40px rgba(58, 74, 98, 0.22), inset 12px 12px 28px rgba(255, 255, 255, 0.3), 0 28px 60px rgba(112, 128, 150, 0.14)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 62% 56% at 29% 22%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 70%)",
          }}
        />
      </div>
      <svg
        className="absolute left-1/2 top-1/2 h-[56%] w-[96%] -translate-x-1/2 -translate-y-1/2"
        viewBox="0 0 200 120"
        fill="none"
      >
        <ellipse
          cx="100"
          cy="60"
          rx="96"
          ry="30"
          stroke="rgba(147, 170, 196, 0.6)"
          strokeWidth="1"
          transform="rotate(-9 100 60)"
        />
      </svg>
    </div>
  );
}

export default function HeroSection() {
  const [ready, setReady] = useState(false);

  return (
    <section className="relative isolate flex min-h-svh w-full flex-col overflow-hidden bg-[#fbf7ef]">
      <HeroBackdrop />

      {/* 顶部：品牌 + 头像（全站固定几何） */}
      <div className="relative z-10 w-full">
        <div className="mx-auto w-full max-w-[1180px] px-5 pt-5 sm:px-7 lg:px-8">
          <SiteHeader />
        </div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1180px] flex-1 px-5 pb-[6.5rem] pt-6 sm:px-7 md:pb-[7rem] lg:px-8">
        {/* 38% 文案 / 12% 留白 / 50% 星球 */}
        <div className="flex flex-1 flex-col justify-center gap-10 md:grid md:grid-cols-[38fr_12fr_50fr] md:items-center md:gap-0">
          <div className="w-full md:max-w-[430px]">
            <p className="text-[12px] tracking-[0.34em] text-[#c1a472]">
              欢迎来到我们的
            </p>

            <h1 className="mt-3 font-serif text-[2.75rem] font-medium leading-[1.08] tracking-[0.02em] text-[#4f4a3e] sm:text-[3.4rem] md:text-[3.9rem] lg:text-[4.25rem]">
              B612 星球
            </h1>

            <div aria-hidden="true" className="mt-7 h-px w-12 bg-[#d8b56e]/55" />

            <blockquote className="mt-7 max-w-[21rem]">
              <p className="font-serif text-[16px] leading-[1.95] tracking-[0.03em] text-[#82735c] sm:text-[17px] md:text-[18px]">
                “ 你在你的星球上，是独一无二的。 ”
              </p>
              <p className="mt-2.5 text-[11px] tracking-[0.2em] text-[#a99a80]">
                —— 《小王子》
              </p>
            </blockquote>

            <a
              href="#memories"
              className="tap-expand group mt-9 inline-flex min-h-[44px] items-center gap-2.5 rounded-full border px-5 text-[13px] tracking-[0.12em] text-[#5b5245] transition-[transform,background-color] duration-300 hover:-translate-y-0.5 active:translate-y-0"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.62)",
                borderColor: "rgba(214, 193, 155, 0.5)",
                backdropFilter: "blur(16px) saturate(1.2)",
                boxShadow: "0 1px 2px rgba(120, 95, 60, 0.05)",
              }}
            >
              <span>探索我们的回忆</span>
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-[#b0915a] transition-transform duration-300 group-hover:translate-y-0.5"
                aria-hidden="true"
              >
                <path d="M10 3.5v13M4.8 11.3 10 16.5l5.2-5.2" />
              </svg>
            </a>
          </div>

          {/* 中间 12% 留白（桌面） */}
          <div className="hidden md:order-2 md:block" aria-hidden="true" />

          <div className="relative order-2 mt-2 w-full md:order-3 md:mt-0">
            <div className="relative mx-auto w-full max-w-[290px] md:max-w-[540px]">
              <div
                className={`absolute inset-0 transition-opacity duration-500 ${
                  ready ? "opacity-0" : "opacity-100"
                }`}
              >
                <PlanetPoster />
              </div>
              <PlanetScene onReady={() => setReady(true)} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
