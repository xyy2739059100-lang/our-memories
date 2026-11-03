"use client";

import { useState } from "react";
import type { AnniversaryCopy, AnniversaryEvent } from "@/lib/anniversary/types";
import { formatDate } from "@/lib/anniversary/format";

interface AnniversarySettingsProps {
  open: boolean;
  events: AnniversaryEvent[];
  copy: AnniversaryCopy;
  onClose: () => void;
  onCreate: () => void;
  onEdit: (id: string) => void;
  onEditCopy: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onRestoreDemo: () => void;
}

const softButton =
  "rounded-full border border-[#e6d6b6] bg-[#fffdf9] px-3 py-1.5 text-[0.68rem] text-[#8b7d6b] transition hover:text-[#6b5637]";

const armedButton =
  "rounded-full border border-[#d08d7c] bg-[#f6ded8] px-3 py-1.5 text-[0.68rem] text-[#b05a48] transition";

/** 纪念日设置：一条条删掉示例日期，或者整个清空重来 */
export default function AnniversarySettings({
  open,
  events,
  copy,
  onClose,
  onCreate,
  onEdit,
  onEditCopy,
  onDelete,
  onClearAll,
  onRestoreDemo,
}: AnniversarySettingsProps) {
  /** 哪一条正在等第二次确认 */
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="关闭纪念日设置"
        onClick={onClose}
        className="absolute inset-0 bg-[#5c4a3a]/20 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-label="纪念日设置"
        className="card-show relative z-10 mb-1 flex max-h-[88svh] w-full flex-col overflow-hidden rounded-t-[18px] border border-[#ecdcbb] bg-[#fdf7ea] shadow-[0_-8px_30px_rgba(120,95,60,0.16)] sm:mb-0 sm:max-w-[420px] sm:rounded-[16px] sm:shadow-[0_14px_38px_rgba(120,95,60,0.20)]"
      >
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-0 h-2.5 w-20 -translate-x-1/2 rounded-b-[2px] bg-[#e9d7b4]/80"
        />

        <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-4">
          <div>
            <p className="text-[0.54rem] tracking-[0.28em] text-[#c1a472]">
              ANNIVERSARY SETTINGS
            </p>
            <h2 className="mt-1 font-serif text-[1.05rem] text-[#5c4a3a]">
              纪念日设置
            </h2>
            <p className="mt-1 text-[0.6rem] tracking-wide text-[#a89476]">
              示例里那些日期都可以删掉，换成你们自己的
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="收起设置"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#b3a17f] transition hover:bg-[#f2e6d0] hover:text-[#7b6444]"
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

        <div className="flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 pb-3">
          {/* 页面上的句子：可自己改写 */}
          <div className="rounded-[10px] border border-[#eadcc4] bg-[#fffdf8]/85 px-2.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[0.6rem] tracking-wide text-[#a89476]">
                页面上的句子
              </span>
              <button
                type="button"
                onClick={onEditCopy}
                aria-label="编辑页面文案"
                className="shrink-0 rounded-full border border-[#e6d6b6] bg-[#fffdf9] px-2.5 py-1 text-[0.62rem] text-[#8b7d6b] transition hover:text-[#6b5637]"
              >
                改一改
              </button>
            </div>
            <p className="mt-1 truncate font-serif text-[0.82rem] text-[#6b5637]">
              {copy.heading}
            </p>
            <p className="mt-0.5 truncate font-hand text-[0.7rem] text-[#8b7d6b]">
              {copy.quote.replace(/\n/g, " ")}
            </p>
            <p className="mt-0.5 truncate font-hand text-[0.66rem] text-[#a89476]">
              {copy.note.replace(/\n/g, " ")}
            </p>
          </div>

          {events.length === 0 && (
            <p className="rounded-[10px] border border-dashed border-[#ddc9a5] px-3 py-5 text-center text-[0.68rem] leading-relaxed text-[#b3a08a]">
              还没有纪念日，新建一条，或者先把示例放回来。
            </p>
          )}

          {events.map((event) => {
            const armed = pendingId === event.id;
            return (
              <div
                key={event.id}
                className="flex items-center gap-2 rounded-[10px] border border-[#eadcc4] bg-[#fffdf8]/85 px-2.5 py-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.6rem] tracking-wide text-[#a89476]">
                    {formatDate(event.date)}
                  </span>
                  <span className="mt-0.5 block truncate font-serif text-[0.82rem] text-[#6b5637]">
                    {event.title} {event.mark}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() => onEdit(event.id)}
                  aria-label={`编辑纪念日：${event.title}`}
                  className="shrink-0 rounded-full border border-[#e6d6b6] bg-[#fffdf9] px-2.5 py-1 text-[0.62rem] text-[#8b7d6b] transition hover:text-[#6b5637]"
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!armed) {
                      setPendingId(event.id);
                      return;
                    }
                    setPendingId(null);
                    onDelete(event.id);
                  }}
                  aria-label={`删除纪念日：${event.title}`}
                  className={`shrink-0 ${
                    armed
                      ? armedButton
                      : "rounded-full border border-[#e6d6b6] bg-[#fffdf9] px-2.5 py-1 text-[0.62rem] text-[#b3a17f] transition hover:text-[#a06b4e]"
                  }`}
                >
                  {armed ? "再点一次" : "删除"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="border-t border-[#eadcc4] px-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onCreate}
              aria-label="新建纪念日"
              className="rounded-full bg-[linear-gradient(135deg,#e9c880_0%,#d4a94f_100%)] px-3.5 py-1.5 text-[0.7rem] text-[#fffaf0] shadow-[0_4px_12px_rgba(180,140,70,0.24)] transition hover:brightness-105"
            >
              新建纪念日
            </button>
            <button
              type="button"
              onClick={() => {
                if (!confirmClear) {
                  setConfirmClear(true);
                  return;
                }
                setConfirmClear(false);
                onClearAll();
              }}
              aria-label="清空全部纪念日"
              className={confirmClear ? armedButton : softButton}
            >
              {confirmClear ? "再点一次就清空" : "清空全部"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmClear(false);
                onRestoreDemo();
              }}
              aria-label="恢复示例纪念日"
              className={softButton}
            >
              恢复示例
            </button>
          </div>
          <p className="mt-2 text-[0.56rem] leading-relaxed text-[#b3a08a]">
            这些纪念日只存在这台设备里，删掉后可以随时恢复示例。
          </p>
        </div>
      </div>
    </div>
  );
}
