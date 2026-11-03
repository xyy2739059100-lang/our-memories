"use client";

import { useState } from "react";
import Image from "next/image";
import type { JournalEntry } from "@/lib/journal-data";
import { entryElementCount } from "@/lib/journal-data";

interface JournalSidebarProps {
  entries: JournalEntry[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, title: string) => void;
  /** 清掉本地存档，恢复自带的示例手账 */
  onReset: () => void;
}

/**
 * 没有封面图的新手账：用页面里的元素实时拼一张迷你跨页预览，
 * 让缩略图和里面的内容对得上。
 */
function MiniSpread({ entry }: { entry: JournalEntry }) {
  const spread = entry.spreads[0];
  const pages = [
    { start: 2, elements: spread.left },
    { start: 52, elements: spread.right },
  ];
  // 卡片宽度里单页占 46%（留出书脊和边缘）
  const pageW = 46;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(150deg,#faf3e4_0%,#f1e6d2_100%)]">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#e3d5bb]/70"
      />
      {pages.map(({ start, elements }) =>
        elements
          .filter((el) => el.src)
          .slice(0, 5)
          .map((el) => (
            <Image
              key={el.id}
              src={el.src as string}
              alt=""
              width={el.iw ?? 300}
              height={el.ih ?? 300}
              unoptimized
              className="absolute h-auto select-none"
              style={{
                left: `${start + (el.x * pageW) / 100}%`,
                top: `${el.y}%`,
                width: `${(el.w * pageW) / 100}%`,
                mixBlendMode: el.type === "paper" ? "multiply" : undefined,
              }}
            />
          )),
      )}
    </div>
  );
}

/** 单本手账：缩略图 + 可双击改名的标题 */
function EntryItem({
  entry,
  active,
  onSelect,
  onRename,
}: {
  entry: JournalEntry;
  active: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(entry.title);
  const hasContent = entryElementCount(entry) > 0;

  const startRename = () => {
    setDraft(entry.title);
    setRenaming(true);
  };

  const commitRename = () => {
    setRenaming(false);
    const next = draft.trim();
    if (next && next !== entry.title) onRename(entry.id, next);
  };

  return (
    <li className="shrink-0 lg:shrink">
      <div
        className={`flex w-[80px] flex-col items-center gap-1.5 rounded-[8px] p-1.5 transition lg:w-full ${
          active
            ? "bg-[#f2e6c8]/80 shadow-[inset_0_0_0_1px_rgba(216,193,150,0.7)]"
            : "hover:bg-[#f6eedd]/70"
        }`}
      >
        <button
          type="button"
          onClick={() => onSelect(entry.id)}
          aria-label={`打开手账「${entry.title}」`}
          className="tap-expand w-full"
        >
          <div className="relative aspect-[164/75] w-full overflow-hidden rounded-[4px]">
            {entry.cover ? (
              <Image
                src={entry.cover}
                alt={`${entry.title} 缩略图`}
                fill
                unoptimized
                sizes="120px"
                className="object-cover"
                style={{ mixBlendMode: "multiply" }}
              />
            ) : hasContent ? (
              <MiniSpread entry={entry} />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(150deg,#faf3e4_0%,#f1e6d2_100%)] text-[0.6rem] text-[#b3a086]">
                空白页
              </div>
            )}
            {/* 缩略图边缘做旧描边 */}
            <div className="pointer-events-none absolute inset-0 rounded-[4px] shadow-[inset_0_0_0_1px_rgba(190,168,134,0.5)]" />
          </div>
        </button>

        {renaming ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setDraft(entry.title);
                setRenaming(false);
              }
            }}
            aria-label="手账标题"
            maxLength={16}
            className="font-hand w-full rounded-[4px] border border-[#d8c4a3] bg-[#fffdf7] px-1 py-0.5 text-center text-[0.72rem] leading-none text-[#6b5b45] outline-none focus:border-[#c9a86b]"
          />
        ) : (
          <div className="flex max-w-full items-center gap-0.5">
            <button
              type="button"
              onClick={() => onSelect(entry.id)}
              onDoubleClick={startRename}
              title="双击可以改名"
              className="tap-expand font-hand max-w-[62px] truncate text-[0.72rem] leading-none text-[#6b5b45] lg:max-w-[92px]"
            >
              {entry.title}
            </button>
            {active && (
              <button
                type="button"
                onClick={startRename}
                aria-label="修改手账标题"
                title="修改标题"
                className="tap-expand flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[0.55rem] text-[#a8906a] transition hover:bg-[#f3e3c4] hover:text-[#7b6444]"
              >
                ✎
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export default function JournalSidebar({
  entries,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onReset,
}: JournalSidebarProps) {
  return (
    <aside className="flex w-full flex-col lg:w-[132px] lg:shrink-0">
      {/* 新建手账按钮 */}
      <div className="relative">
        {/* 金色回形针 */}
        <svg
          aria-hidden="true"
          viewBox="0 0 40 92"
          className="absolute -right-1 -top-3 z-10 h-8 w-auto rotate-[10deg] drop-shadow-[0_1px_2px_rgba(120,95,60,0.2)]"
        >
          <path
            d="M26 8 C12 8 8 20 8 34 L8 66 C8 78 14 86 22 86 C30 86 33 78 33 68 L33 30 C33 20 29 15 24 15 C19 15 17 20 17 28 L17 62"
            fill="none"
            stroke="#c9a86b"
            strokeWidth="4.6"
            strokeLinecap="round"
          />
        </svg>
        <button
          type="button"
          onClick={onCreate}
          className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-[9px] border border-[#ddc9a8] bg-[#fffdf8]/95 py-2.5 text-[0.8rem] text-[#6b5b45] shadow-[0_1px_3px_rgba(140,115,80,0.10)] transition hover:bg-[#fdf7ea] hover:shadow-[0_2px_6px_rgba(140,115,80,0.16)]"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#a8906a]" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          新建手账
        </button>
      </div>

      {/* 分隔线 */}
      <div aria-hidden="true" className="my-3 h-px w-full bg-[#e0d2b8]/70" />

      <p className="mb-2 px-0.5 text-[0.68rem] tracking-[0.08em] text-[#9d8e78]">
        我的手账
      </p>

      {/* 手账列表 */}
      <ul className="flex flex-row gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:gap-3 lg:overflow-visible lg:pb-0">
        {entries.map((entry) => (
          <EntryItem
            key={entry.id}
            entry={entry}
            active={entry.id === activeId}
            onSelect={onSelect}
            onRename={onRename}
          />
        ))}
      </ul>

      <button
        type="button"
        onClick={onReset}
        className="tap-expand mt-3 self-start text-[0.62rem] text-[#a89476] underline decoration-[#c9b48c]/60 underline-offset-2 transition hover:text-[#7b6444]"
      >
        恢复示例手账
      </button>
    </aside>
  );
}
