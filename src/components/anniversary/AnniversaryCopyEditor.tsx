"use client";

import { useState } from "react";
import type { AnniversaryCopy } from "@/lib/anniversary/types";
import { DEFAULT_ANNIVERSARY_COPY } from "@/lib/anniversary/types";

interface CopyEditorProps {
  copy: AnniversaryCopy;
  onClose: () => void;
  onSave: (copy: AnniversaryCopy) => void;
}

const fieldClass =
  "w-full rounded-[8px] border border-[#e6d6b6] bg-[#fffdf9] px-2.5 py-2 text-[0.82rem] text-[#5c4a3a] outline-none transition focus:border-[#d3b47a] focus:ring-2 focus:ring-[#e9d3a4]/50";

/** 左栏那几句可以欣赏的话，允许自己改写（标题 / 手写引文 / 小纸条） */
export default function AnniversaryCopyEditor({
  copy,
  onClose,
  onSave,
}: CopyEditorProps) {
  const [heading, setHeading] = useState(copy.heading);
  const [quote, setQuote] = useState(copy.quote);
  const [note, setNote] = useState(copy.note);

  const canSave = heading.trim().length > 0 && quote.trim().length > 0;

  const submit = () => {
    if (!canSave) return;
    onSave({
      heading: heading.trim(),
      quote: quote.replace(/^\n+|\n+$/g, ""),
      note: note.replace(/^\n+|\n+$/g, ""),
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="关闭页面文案编辑"
        onClick={onClose}
        className="absolute inset-0 bg-[#5c4a3a]/20 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-label="编辑页面文案"
        className="card-show relative z-10 mb-1 w-full max-h-[88svh] overflow-y-auto rounded-t-[18px] border border-[#ecdcbb] bg-[#fdf7ea] px-4 pb-4 pt-3 shadow-[0_-8px_30px_rgba(120,95,60,0.16)] overscroll-contain sm:mb-0 sm:max-w-[400px] sm:rounded-[16px] sm:px-5 sm:pb-5 sm:pt-4 sm:shadow-[0_14px_38px_rgba(120,95,60,0.20)]"
      >
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-0 h-2.5 w-20 -translate-x-1/2 rounded-b-[2px] bg-[#e9d7b4]/80"
        />

        <div className="flex items-center justify-between">
          <h2 className="font-serif text-[1.05rem] text-[#5c4a3a]">
            改一改页面上的句子
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="收起文案编辑"
            className="flex h-7 w-7 items-center justify-center rounded-full text-[#b3a17f] transition hover:bg-[#f2e6d0] hover:text-[#7b6444]"
          >
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5L5 15"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <label className="mt-3 block text-[0.66rem] tracking-[0.14em] text-[#a4916e]">
          大标题
          <input
            id="anniv-copy-heading"
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            maxLength={16}
            placeholder="我们的纪念日"
            className={`mt-1 ${fieldClass}`}
          />
        </label>

        <label className="mt-2.5 block text-[0.66rem] tracking-[0.14em] text-[#a4916e]">
          手写引文（回车换行）
          <textarea
            id="anniv-copy-quote"
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            rows={3}
            maxLength={70}
            placeholder={"有些日子，\n值得被永远记住。"}
            className={`font-hand mt-1 resize-none leading-[1.9] ${fieldClass}`}
          />
        </label>

        <label className="mt-2.5 block text-[0.66rem] tracking-[0.14em] text-[#a4916e]">
          左下小纸条
          <textarea
            id="anniv-copy-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={70}
            placeholder={"和你在一起的每一天，\n都是特别的日子 ♡"}
            className={`font-hand mt-1 resize-none leading-[1.9] ${fieldClass}`}
          />
        </label>

        <div className="mt-3.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setHeading(DEFAULT_ANNIVERSARY_COPY.heading);
              setQuote(DEFAULT_ANNIVERSARY_COPY.quote);
              setNote(DEFAULT_ANNIVERSARY_COPY.note);
            }}
            className="rounded-full border border-[#e6d6b6] bg-[#fffdf9] px-3 py-1.5 text-[0.68rem] text-[#b3a17f] transition hover:text-[#a06b4e]"
          >
            恢复默认文案
          </button>
          <span className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#e6d6b6] bg-[#fffdf9] px-3.5 py-1.5 text-[0.72rem] text-[#8b7d6b] transition hover:text-[#6b5637]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSave}
            className="rounded-full bg-[linear-gradient(135deg,#e9c880_0%,#d4a94f_100%)] px-4 py-1.5 text-[0.72rem] text-[#fffaf0] shadow-[0_4px_12px_rgba(180,140,70,0.28)] transition enabled:hover:brightness-105 disabled:opacity-45"
          >
            保存文案
          </button>
        </div>
      </div>
    </div>
  );
}
