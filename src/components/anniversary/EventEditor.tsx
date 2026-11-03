"use client";

import { useState } from "react";
import type {
  AnniversaryEvent,
  AuthorId,
} from "@/lib/anniversary/types";
import { ANNIVERSARY_AUTHORS, MARKS } from "@/lib/anniversary/types";
import { todayString } from "@/lib/anniversary/format";

export interface EditorPayload {
  title: string;
  date: string;
  note: string;
  mark: string;
  remind: boolean;
  authorId: AuthorId;
}

interface EventEditorProps {
  /** 编辑已有纪念日时传进来，新建时为 null */
  event: AnniversaryEvent | null;
  onClose: () => void;
  onSave: (payload: EditorPayload) => void;
  onDelete?: () => void;
}

const fieldClass =
  "w-full rounded-[8px] border border-[#e6d6b6] bg-[#fffdf9] px-2.5 py-2 text-[0.82rem] text-[#5c4a3a] outline-none transition focus:border-[#d3b47a] focus:ring-2 focus:ring-[#e9d3a4]/50";

export default function EventEditor({
  event,
  onClose,
  onSave,
  onDelete,
}: EventEditorProps) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(event?.date ?? todayString());
  const [note, setNote] = useState(event?.note ?? "");
  const [mark, setMark] = useState<string>(event?.mark ?? "♡");
  const [remind, setRemind] = useState(event?.remind ?? true);
  const [authorId, setAuthorId] = useState<AuthorId>(event?.authorId ?? "me");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canSave = title.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);

  const submit = () => {
    if (!canSave) return;
    onSave({
      title: title.trim(),
      date,
      note: note.trim(),
      mark,
      remind,
      authorId,
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="关闭纪念日编辑"
        onClick={onClose}
        className="absolute inset-0 bg-[#5c4a3a]/20 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-label={event ? "编辑纪念日" : "新建纪念日"}
        className="card-show relative z-10 mb-1 w-full max-h-[88svh] overflow-y-auto rounded-t-[18px] border border-[#ecdcbb] bg-[#fdf7ea] px-4 pb-4 pt-3 shadow-[0_-8px_30px_rgba(120,95,60,0.16)] overscroll-contain sm:mb-0 sm:max-w-[400px] sm:rounded-[16px] sm:px-5 sm:pb-5 sm:pt-4 sm:shadow-[0_14px_38px_rgba(120,95,60,0.20)]"
      >
        {/* 顶部小纸胶带 */}
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-0 h-2.5 w-20 -translate-x-1/2 rounded-b-[2px] bg-[#e9d7b4]/80"
        />

        <div className="flex items-center justify-between">
          <h2 className="font-serif text-[1.05rem] text-[#5c4a3a]">
            {event ? "改一改这个纪念日" : "记下一个纪念日"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="收起"
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
          这是什么日子
          <input
            id="anniv-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="比如：相遇的日子"
            maxLength={20}
            className={`mt-1 ${fieldClass}`}
          />
        </label>

        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <label className="block text-[0.66rem] tracking-[0.14em] text-[#a4916e]">
            那一天
            <input
              id="anniv-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`mt-1 ${fieldClass}`}
            />
          </label>
          <label className="block text-[0.66rem] tracking-[0.14em] text-[#a4916e]">
            谁记的
            <select
              value={authorId}
              onChange={(e) => setAuthorId(e.target.value as AuthorId)}
              className={`mt-1 ${fieldClass}`}
            >
              <option value="me">我</option>
              <option value="her">她</option>
            </select>
          </label>
        </div>

        <label className="mt-2.5 block text-[0.66rem] tracking-[0.14em] text-[#a4916e]">
          想写的话
          <textarea
            id="anniv-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={60}
            placeholder="一句就够，写给以后看"
            className={`font-hand mt-1 resize-none ${fieldClass}`}
          />
        </label>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {MARKS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMark(item)}
                aria-label={`小符号 ${item}`}
                aria-pressed={mark === item}
                className={`flex h-7 w-7 items-center justify-center rounded-full border text-[0.85rem] transition ${
                  mark === item
                    ? "border-[#d9b978] bg-[#f7e8c8]"
                    : "border-[#ecdcbb] bg-[#fffdf9] hover:border-[#ddc496]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setRemind((value) => !value)}
            aria-pressed={remind}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.62rem] transition ${
              remind
                ? "border-[#d9b978] bg-[#f7e8c8] text-[#a1813f]"
                : "border-[#e6d6b6] bg-[#fffdf9] text-[#b3a17f]"
            }`}
          >
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
            {remind ? "提醒我" : "不提醒"}
          </button>
        </div>

        <div className="mt-3.5 flex items-center gap-2">
          {event && onDelete && (
            <button
              type="button"
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  return;
                }
                onDelete();
              }}
              className={`rounded-full border px-3 py-1.5 text-[0.68rem] transition ${
                confirmDelete
                  ? "border-[#d08d7c] bg-[#f6ded8] text-[#b05a48]"
                  : "border-[#e6d6b6] bg-[#fffdf9] text-[#b3a17f] hover:text-[#a06b4e]"
              }`}
            >
              {confirmDelete ? "再点一次就删掉" : "删除"}
            </button>
          )}
          <span className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#e6d6b6] bg-[#fffdf9] px-3.5 py-1.5 text-[0.72rem] text-[#8b7d6b] transition hover:text-[#6b5637]"
          >
            先不写
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSave}
            className="rounded-full bg-[linear-gradient(135deg,#e9c880_0%,#d4a94f_100%)] px-4 py-1.5 text-[0.72rem] text-[#fffaf0] shadow-[0_4px_12px_rgba(180,140,70,0.28)] transition enabled:hover:brightness-105 disabled:opacity-45"
          >
            保存纪念日
          </button>
        </div>

        {event && (
          <p className="mt-2 text-center text-[0.58rem] text-[#bdb094]">
            最近由 {ANNIVERSARY_AUTHORS[event.updatedBy].name} 更新 ·{event.updatedAt}
          </p>
        )}
      </div>
    </div>
  );
}
