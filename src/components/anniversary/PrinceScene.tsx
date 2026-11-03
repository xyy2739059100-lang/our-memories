"use client";

import Image from "next/image";

/**
 * 右侧的小王子星球：水彩云絮 + 星星 + prince.png。
 * 图片本身带白底，用 multiply 混色让边缘融进纸张。
 */
export default function PrinceScene({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
    >
      {/* 水彩云絮 */}
      <div className="absolute -left-6 top-6 h-32 w-32 rounded-full bg-[#bcd2e7]/45 blur-2xl" />
      <div className="absolute bottom-10 -right-4 h-40 w-40 rounded-full bg-[#cfe0ef]/50 blur-3xl" />
      <div className="absolute bottom-24 left-2 h-20 w-24 rounded-full bg-[#e9d9b7]/40 blur-2xl" />

      {/* 散落的金色星星 */}
      {[
        { x: "12%", y: "8%", s: 12, o: 0.8 },
        { x: "78%", y: "16%", s: 9, o: 0.6 },
        { x: "88%", y: "48%", s: 13, o: 0.55 },
        { x: "30%", y: "60%", s: 8, o: 0.45 },
        { x: "6%", y: "44%", s: 7, o: 0.4 },
      ].map((star, index) => (
        <svg
          key={index}
          viewBox="0 0 40 40"
          className="absolute"
          style={{
            left: star.x,
            top: star.y,
            width: star.s,
            height: star.s,
            opacity: star.o,
          }}
        >
          <path
            d="M20 2l4.1 14.1L38 20l-13.9 4L20 38l-4.1-14L2 20l13.9-3.9z"
            fill="#e0bd6c"
          />
        </svg>
      ))}

      <Image
        src="/images/journal/prince.png"
        alt=""
        width={430}
        height={430}
        unoptimized
        className="relative h-auto w-full mix-blend-multiply"
      />
    </div>
  );
}
