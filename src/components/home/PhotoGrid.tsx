"use client";

import Image from "next/image";
import { useState } from "react";
import { demoMemories } from "@/lib/demo-memories";
import PhotoLightbox from "./PhotoLightbox";

export default function PhotoGrid() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-7 sm:gap-y-11">
        {demoMemories.map((memory, index) => (
          <button
            key={memory.id}
            type="button"
            onClick={() => setActiveIndex(index)}
            aria-label={`查看照片：${memory.title}`}
            className="group block text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
          >
            {/* 无边框、无卡片：只保留画面本身 */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#f6ead6]">
              <Image
                src={memory.src}
                alt={memory.alt}
                fill
                sizes="(max-width: 640px) 45vw, 320px"
                unoptimized
                className="object-cover transition duration-[900ms] ease-out group-hover:scale-[1.025]"
              />
            </div>

            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="font-serif text-[15px] tracking-[0.03em] text-[#5a5345] sm:text-base">
                {memory.title}
              </span>
              <span aria-hidden="true" className="h-px flex-1 bg-[#c9a45e]/25" />
              <span className="shrink-0 text-[11px] tracking-wide text-[#a99a80]">
                {memory.date}
              </span>
            </div>
          </button>
        ))}
      </div>

      {activeIndex !== null && (
        <PhotoLightbox
          memories={demoMemories}
          index={activeIndex}
          onClose={() => setActiveIndex(null)}
          onNavigate={setActiveIndex}
        />
      )}
    </>
  );
}
