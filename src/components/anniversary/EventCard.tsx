"use client";

import Image from "next/image";
import type { AnniversaryEvent } from "@/lib/anniversary/types";
import { ANNIVERSARY_AUTHORS } from "@/lib/anniversary/types";
import type { EventTiming } from "@/lib/anniversary/format";
import { formatDate } from "@/lib/anniversary/format";

/** 拍立得相框：白边 + 顶部一小段纸胶带 */
export function PhotoMount({
  src,
  alt,
  className = "",
  rotate = -3,
}: {
  src?: string;
  alt: string;
  className?: string;
  rotate?: number;
}) {
  return (
    <div
      className={`relative shrink-0 rounded-[4px] bg-[#fffdf9] p-[3px] shadow-[0_4px_12px_rgba(120,95,60,0.16)] ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[3px] bg-[#efe6d4]">
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            unoptimized
            sizes="120px"
            className="object-cover"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[0.6rem] text-[#b9a888]">
            待添加
          </span>
        )}
      </div>
      {/* 纸胶带 */}
      <span
        aria-hidden="true"
        className="absolute -top-2 left-1/2 h-3 w-9 -translate-x-1/2 rotate-[-4deg] rounded-[1px] bg-[#e9d7b4]/85 shadow-[0_1px_2px_rgba(120,95,60,0.08)]"
      />
    </div>
  );
}

/** 右侧那枚「已过去 / 还有」日期牌 */
function DaysPanel({ timing }: { timing: EventTiming }) {
  const upcoming = timing.state === "upcoming";
  const unknown = timing.state === "unknown";
  return (
    <div
      className={`relative flex w-[5.2rem] shrink-0 flex-col items-center justify-center overflow-hidden rounded-[10px] px-2 py-2 text-center sm:w-[5.6rem] ${
        upcoming
          ? "bg-[linear-gradient(140deg,#eaf1f9_0%,#d6e4f3_100%)] text-[#6d8aa6]"
          : "bg-[linear-gradient(140deg,#fdf2da_0%,#f6e1b4_100%)] text-[#a98a4e]"
      }`}
    >
      {/* 角落的小装饰 */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="absolute -right-1 -top-1 h-5 w-5 opacity-70"
      >
        <path
          d="M12 2l1.9 6.4L20 10.4l-6.1 1.9L12 18.7l-1.9-6.4L4 10.4l6.1-1.9z"
          fill={upcoming ? "#b9cfe6" : "#e6c88f"}
        />
      </svg>
      <span className="text-[0.58rem] tracking-[0.16em]">
        {unknown ? "·" : upcoming ? "还有" : "已过去"}
      </span>
      <span className="font-serif text-[1.32rem] leading-tight sm:text-[1.45rem]">
        {unknown ? "—" : timing.days}
      </span>
      <span className="text-[0.58rem] tracking-[0.16em]">天</span>
      {/* 小飘带 */}
      <span
        aria-hidden="true"
        className={`absolute -bottom-2 -left-3 h-4 w-8 rotate-[-24deg] rounded-[2px] ${
          upcoming ? "bg-[#c3d7ea]/60" : "bg-[#e7cd9a]/60"
        }`}
      />
    </div>
  );
}

interface EventCardProps {
  event: AnniversaryEvent;
  timing: EventTiming;
  cover?: string;
  photoCount: number;
  selected: boolean;
  onSelect: () => void;
}

export default function EventCard({
  event,
  timing,
  cover,
  photoCount,
  selected,
  onSelect,
}: EventCardProps) {
  const author = ANNIVERSARY_AUTHORS[event.authorId];

  return (
    <article
      className={`group relative rounded-[14px] border bg-[#fffdf7]/94 shadow-[0_6px_18px_rgba(120,95,60,0.09)] transition ${
        selected
          ? "border-[#e0bd7d] ring-2 ring-[#e8cb93]/60"
          : "border-[#f0e2c6] hover:border-[#e5cf9f]"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`纪念日：${event.title}`}
        className="flex w-full items-stretch gap-2.5 rounded-[14px] p-2.5 text-left sm:gap-3.5 sm:p-3.5"
      >
        {/* 照片叠了一点点旋转，像贴在手账上 */}
        <div className="flex w-[4.6rem] items-center justify-center sm:w-[6.2rem]">
          <PhotoMount
            src={cover}
            alt={event.title}
            className="h-[4.2rem] w-[4.2rem] sm:h-[5.4rem] sm:w-[5.4rem]"
            rotate={-3.5}
          />
        </div>

        <div className="min-w-0 flex-1 py-0.5">
          <p className="text-[0.66rem] tracking-[0.14em] text-[#b3a17f] sm:text-[0.7rem]">
            {formatDate(event.date)}
          </p>
          <h3 className="mt-0.5 flex items-baseline gap-1 font-serif text-[1rem] text-[#54422f] sm:text-[1.1rem]">
            <span className="truncate">{event.title}</span>
            {event.mark && (
              <span className="shrink-0 text-[0.82rem] text-[#d0a55f]">
                {event.mark}
              </span>
            )}
          </h3>
          <p className="font-hand mt-0.5 line-clamp-2 text-[0.76rem] leading-relaxed text-[#8b7d6b] sm:text-[0.82rem]">
            {event.note}
          </p>

          <div className="mt-1.5 flex items-center gap-2 text-[0.6rem] text-[#b3a888]">
            <span className="flex items-center gap-1">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: author.color }}
              />
              {author.name}的记录
            </span>
            {photoCount > 1 && <span>共 {photoCount} 张照片</span>}
            {event.remind && (
              <span className="flex items-center gap-0.5 text-[#c0a46c]">
                <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3 w-3">
                  <path
                    d="M10 3a4.2 4.2 0 0 1 4.2 4.2c0 4 1.3 5.1 1.3 5.1H4.5s1.3-1.1 1.3-5.1A4.2 4.2 0 0 1 10 3zM8.4 15.2a1.8 1.8 0 0 0 3.2 0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                提醒已开
              </span>
            )}
          </div>
        </div>

        <DaysPanel timing={timing} />
      </button>
    </article>
  );
}
