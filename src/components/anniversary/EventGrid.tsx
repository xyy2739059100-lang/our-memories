"use client";

import Image from "next/image";
import type { AnniversaryEvent } from "@/lib/anniversary/types";
import type { EventTiming } from "@/lib/anniversary/format";

interface EventGridProps {
  events: AnniversaryEvent[];
  timingOf: (date: string) => EventTiming;
  coverOf: (event: AnniversaryEvent) => string | undefined;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** 「纪念日」标签页：把每个日子摊成一枚小卡片，一眼看清还有多少天 */
export default function EventGrid({
  events,
  timingOf,
  coverOf,
  selectedId,
  onSelect,
}: EventGridProps) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {events.map((event) => {
        const timing = timingOf(event.date);
        const upcoming = timing.state === "upcoming";
        const [year, month, day] = event.date.split("-");
        const selected = selectedId === event.id;
        const cover = coverOf(event);

        return (
          <button
            key={event.id}
            type="button"
            onClick={() => onSelect(event.id)}
            aria-pressed={selected}
            aria-label={`纪念日卡片：${event.title}`}
            className={`group relative overflow-hidden rounded-[13px] border bg-[#fffdf7]/94 p-3 text-left shadow-[0_5px_16px_rgba(120,95,60,0.08)] transition ${
              selected
                ? "border-[#e0bd7d] ring-2 ring-[#e8cb93]/60"
                : "border-[#f0e2c6] hover:border-[#e5cf9f]"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-serif text-[1.18rem] leading-none text-[#5e4a34]">
                  {month}.{day}
                </p>
                <p className="mt-1 text-[0.58rem] tracking-[0.16em] text-[#b3a17f]">
                  {year} 年
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[0.6rem] ${
                  upcoming
                    ? "bg-[#e2edf8] text-[#6d8aa6]"
                    : "bg-[#f8ebcf] text-[#a98a4e]"
                }`}
              >
                {upcoming ? "还有 " : "已过去 "}
                {timing.days} 天
              </span>
            </div>

            <p className="mt-2 flex items-baseline gap-1 font-serif text-[0.92rem] text-[#54422f]">
              <span className="truncate">{event.title}</span>
              {event.mark && (
                <span className="shrink-0 text-[0.76rem] text-[#d0a55f]">
                  {event.mark}
                </span>
              )}
            </p>
            <p className="font-hand mt-0.5 line-clamp-1 text-[0.72rem] text-[#8b7d6b]">
              {event.note}
            </p>

            <div className="relative mt-2 h-16 overflow-hidden rounded-[6px] bg-[#efe6d4]">
              {cover ? (
                <Image
                  src={cover}
                  alt={event.title}
                  fill
                  unoptimized
                  sizes="240px"
                  className="object-cover transition duration-500 group-hover:scale-[1.04]"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-[0.6rem] text-[#b9a888]">
                  还没有照片
                </span>
              )}
              {event.remind && (
                <span className="absolute bottom-1 right-1 rounded-full bg-[#fffdf7]/85 px-1.5 py-0.5 text-[0.55rem] text-[#b08a48]">
                  提醒
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
