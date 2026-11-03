"use client";

import Image from "next/image";
import { useEffect } from "react";
import type { MemoryPhoto } from "@/lib/demo-memories";

interface PhotoLightboxProps {
  memories: MemoryPhoto[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function PhotoLightbox({
  memories,
  index,
  onClose,
  onNavigate,
}: PhotoLightboxProps) {
  const memory = memories[index];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft") {
        onNavigate((index - 1 + memories.length) % memories.length);
      } else if (event.key === "ArrowRight") {
        onNavigate((index + 1) % memories.length);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [index, memories.length, onClose, onNavigate]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-brown/70 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`照片预览：${memory.title}`}
    >
      <div
        className="w-full max-w-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-cream shadow-2xl">
          <Image
            src={memory.src}
            alt={memory.alt}
            fill
            sizes="(max-width: 768px) 92vw, 768px"
            unoptimized
            className="object-cover"
            priority
          />

          {/* 关闭 */}
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭照片预览"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-brown/45 text-cream transition-colors hover:bg-brown/65 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6 L18 18 M18 6 L6 18" />
            </svg>
          </button>

          {/* 上一张 */}
          <button
            type="button"
            onClick={() => onNavigate((index - 1 + memories.length) % memories.length)}
            aria-label="上一张照片"
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-brown/35 text-cream transition-colors hover:bg-brown/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5 L8 12 L15 19" />
            </svg>
          </button>

          {/* 下一张 */}
          <button
            type="button"
            onClick={() => onNavigate((index + 1) % memories.length)}
            aria-label="下一张照片"
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-brown/35 text-cream transition-colors hover:bg-brown/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5 L16 12 L9 19" />
            </svg>
          </button>
        </div>

        {/* 说明 */}
        <div className="mt-3 flex items-end justify-between gap-4 px-1">
          <div>
            <p className="text-[11px] tracking-[0.2em] text-gold-light">
              {memory.date}
            </p>
            <p className="mt-1 font-serif text-lg text-cream">{memory.title}</p>
          </div>
          <p className="shrink-0 text-xs text-cream/70">
            {index + 1} / {memories.length}
          </p>
        </div>
      </div>
    </div>
  );
}
