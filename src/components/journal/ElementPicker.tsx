"use client";

import { useState } from "react";
import Image from "next/image";
import type { JournalAsset } from "@/lib/journal-data";
import { photoAssets, stickerAssets } from "@/lib/journal-data";
import type { PageSide } from "@/lib/journal-editor";

interface ElementPickerProps {
  kind: "photo" | "sticker";
  /** 新素材放到哪一页 */
  side: PageSide;
  onSideChange: (side: PageSide) => void;
  onPick: (asset: JournalAsset) => void;
  /** 上传自己手机 / 电脑里的照片或贴纸（阶段五） */
  onUpload: (file: File) => Promise<void>;
  onClose: () => void;
}

const sideLabels: Record<PageSide, string> = { left: "左页", right: "右页" };

export default function ElementPicker({
  kind,
  side,
  onSideChange,
  onPick,
  onUpload,
  onClose,
}: ElementPickerProps) {
  const assets = kind === "photo" ? photoAssets : stickerAssets;
  const [busy, setBusy] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 清空 value，这样同一张照片可以再选一次
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      await onUpload(file);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label={kind === "photo" ? "选择图片" : "选择贴纸"}
      className="absolute bottom-full right-0 z-30 mb-3 w-[15rem] rounded-[12px] border border-[#e3d3b6] bg-[#fffdf7]/97 p-3 shadow-[0_10px_26px_rgba(130,105,72,0.20)] backdrop-blur-sm lg:bottom-auto lg:right-full lg:top-0 lg:mb-0 lg:mr-3"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="font-serif text-[0.78rem] text-[#7b6444]">
          {kind === "photo" ? "选择一张照片" : "选择一枚贴纸"}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          className="flex h-5 w-5 items-center justify-center rounded-full text-[#a8926f] transition hover:bg-[#f3e7d0] hover:text-[#7b6444]"
        >
          ×
        </button>
      </div>

      {/* 放到哪一页 */}
      <div className="mb-2.5 flex items-center justify-between rounded-[8px] bg-[#f5ead6]/70 px-1.5 py-1">
        <span className="pl-1 text-[0.6rem] text-[#9d8e78]">放到</span>
        <div className="flex gap-1">
          {(["left", "right"] as PageSide[]).map((target) => (
            <button
              key={target}
              type="button"
              onClick={() => onSideChange(target)}
              aria-pressed={side === target}
              className={`rounded-full px-2.5 py-[3px] text-[0.62rem] transition ${
                side === target
                  ? "bg-[#e8d4ab] text-[#6b5637] shadow-[inset_0_0_0_1px_rgba(190,164,118,0.7)]"
                  : "text-[#9d8e78] hover:bg-[#f2e4c9]"
              }`}
            >
              {sideLabels[target]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <label
          className={`group flex flex-col items-center gap-1 rounded-[8px] p-1.5 transition hover:bg-[#f7eedc] ${
            busy ? "cursor-wait opacity-70" : "cursor-pointer"
          }`}
        >
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFile}
            disabled={busy}
          />
          <span className="relative flex h-11 w-full items-center justify-center overflow-hidden rounded-[5px] border border-dashed border-[#d8c4a3] bg-[#fbf4e6]">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className={`h-4 w-4 text-[#b39a74] transition group-hover:scale-[1.06] ${
                busy ? "animate-pulse" : ""
              }`}
            >
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="text-[0.62rem] text-[#8b7a62]">
            {busy ? "处理中…" : "上传"}
          </span>
        </label>

        {assets.map((asset) => (
          <button
            key={asset.key}
            type="button"
            onClick={() => onPick(asset)}
            className="group flex flex-col items-center gap-1 rounded-[8px] p-1.5 transition hover:bg-[#f7eedc]"
          >
            <span className="relative flex h-11 w-full items-center justify-center overflow-hidden rounded-[5px] border border-[#e7dac2]/70 bg-[#f6eddd]">
              <Image
                src={asset.src}
                alt={asset.label}
                width={asset.iw}
                height={asset.ih}
                unoptimized
                className="max-h-full w-auto max-w-full object-contain transition group-hover:scale-[1.06]"
              />
            </span>
            <span className="text-[0.62rem] text-[#8b7a62]">{asset.label}</span>
          </button>
        ))}
      </div>

      <p className="mt-2 text-[0.6rem] leading-relaxed text-[#a89476]">
        选好后会放在{sideLabels[side]}，之后可以拖动、缩放。
      </p>
    </div>
  );
}
