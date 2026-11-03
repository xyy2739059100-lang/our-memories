"use client";

import Image from "next/image";
import type { TravelPhoto } from "@/lib/travel-data";

export interface PlaceDraft {
  /** 正在改哪一条；null 表示新增 */
  id: string | null;
  name: string;
  spot: string;
  /** 日期控件的值，形如 2025-06-18 */
  date: string;
  /** 用字符串存，输入框清空时不会变成 0 */
  days: string;
  note: string;
  x: number;
  y: number;
  photo?: TravelPhoto;
}

interface PlaceEditorProps {
  draft: PlaceDraft;
  picking: boolean;
  busy: boolean;
  onChange: (patch: Partial<PlaceDraft>) => void;
  onPickPhoto: (file: File) => void;
  onClearPhoto: () => void;
  onTogglePicking: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const fieldClass =
  "w-full rounded-[7px] border border-[#e0d0b4] bg-[#fffaf0] px-2.5 py-1.5 text-[0.78rem] text-[#6b5637] outline-none transition placeholder:text-[#bcaa90] focus:border-[#c9a86b]";

const labelClass = "mb-1 block text-[0.62rem] tracking-wide text-[#9d8e78]";

export default function PlaceEditor({
  draft,
  picking,
  busy,
  onChange,
  onPickPhoto,
  onClearPhoto,
  onTogglePicking,
  onSave,
  onCancel,
}: PlaceEditorProps) {
  const canSave = draft.name.trim().length > 0 && !busy;

  return (
    <div className="rounded-[13px] border border-[#e3d3b6] bg-[#fffdf7]/95 p-3.5 shadow-[0_8px_24px_rgba(130,105,72,0.14)]">
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div>
          <p className="font-serif text-[0.92rem] text-[#6b5637]">
            {draft.id ? "改一改这段足迹" : "记下一个地方"}
          </p>
          <p className="mt-1 text-[0.6rem] text-[#a89476]">
            先在地图上点一下，钉子会跟着你走
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="取消编辑"
          className="flex h-5 w-5 items-center justify-center rounded-full text-[#a8926f] transition hover:bg-[#f3e7d0] hover:text-[#7b6444]"
        >
          ×
        </button>
      </div>

      <div className="space-y-2">
        <div>
          <label htmlFor="place-name" className={labelClass}>
            地名
          </label>
          <input
            id="place-name"
            value={draft.name}
            maxLength={12}
            placeholder="比如：大理"
            onChange={(e) => onChange({ name: e.target.value })}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="place-spot" className={labelClass}>
            具体一点（可留空）
          </label>
          <input
            id="place-spot"
            value={draft.spot}
            maxLength={14}
            placeholder="比如：洱海边"
            onChange={(e) => onChange({ spot: e.target.value })}
            className={fieldClass}
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label htmlFor="place-date" className={labelClass}>
              出发日期
            </label>
            <input
              id="place-date"
              type="date"
              value={draft.date}
              onChange={(e) => onChange({ date: e.target.value })}
              className={fieldClass}
            />
          </div>
          <div className="w-[4.5rem]">
            <label htmlFor="place-days" className={labelClass}>
              几天
            </label>
            <input
              id="place-days"
              type="number"
              min={1}
              max={60}
              value={draft.days}
              onChange={(e) => onChange({ days: e.target.value })}
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="place-note" className={labelClass}>
            一句话小记
          </label>
          <textarea
            id="place-note"
            value={draft.note}
            rows={2}
            maxLength={90}
            placeholder="那天发生了什么？"
            onChange={(e) => onChange({ note: e.target.value })}
            className={`${fieldClass} resize-none leading-relaxed`}
          />
          <p className="mt-1 text-right text-[0.56rem] text-[#bcaa90]">
            {draft.note.length}/90
          </p>
        </div>

        <div>
          <span className={labelClass}>照片（可留空）</span>
          <div className="flex items-center gap-2">
            {draft.photo ? (
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[5px] border border-[#e6d7bd] bg-[#f6eddd]">
                <Image
                  src={draft.photo.src}
                  alt="这枚足迹的照片"
                  width={draft.photo.iw}
                  height={draft.photo.ih}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              </span>
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[5px] border border-dashed border-[#d8c4a3] bg-[#fbf4e6] text-[#b39a74]">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
                  <path
                    d="M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v11A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  />
                  <path d="M4.5 16.5l4.6-4.4 3.2 3 3-3.6 4.2 4.8" fill="none" stroke="currentColor" strokeWidth="1.3" />
                </svg>
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <label
                  className={`inline-flex cursor-pointer items-center rounded-full border border-[#e0d0b4] bg-[#fffaf0] px-2.5 py-[3px] text-[0.62rem] text-[#8b7a62] transition hover:bg-[#f3e7d0] ${
                    busy ? "cursor-wait opacity-70" : ""
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={busy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) onPickPhoto(file);
                    }}
                  />
                  {busy ? "处理中…" : draft.photo ? "换一张" : "上传照片"}
                </label>
                {draft.photo && (
                  <button
                    type="button"
                    onClick={onClearPhoto}
                    className="text-[0.6rem] text-[#b08a75] transition hover:text-[#a0654f]"
                  >
                    去掉
                  </button>
                )}
              </div>
              <p className="mt-0.5 text-[0.56rem] leading-relaxed text-[#bcaa90]">
                会自动压小，只存在这台设备上
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[8px] bg-[#f5ead6]/70 px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[0.62rem] text-[#9d8e78]">
              位置 {draft.x.toFixed(1)}% · {draft.y.toFixed(1)}%
            </span>
            <button
              type="button"
              onClick={onTogglePicking}
              aria-pressed={picking}
              className={`rounded-full border px-2.5 py-[3px] text-[0.62rem] transition ${
                picking
                  ? "border-[#c9a45e] bg-[#e8d4ab] text-[#6b5637]"
                  : "border-[#ddc9a5] bg-[#fffaf0] text-[#8b7a62] hover:bg-[#f2e4c9]"
              }`}
            >
              {picking ? "正在选位置…" : "在地图上选位置"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="flex-1 rounded-full bg-[#e5cfa4] py-[7px] text-[0.72rem] text-[#6b5637] shadow-[inset_0_0_0_1px_rgba(190,164,118,0.6)] transition hover:bg-[#dfc692] disabled:cursor-not-allowed disabled:opacity-55"
        >
          保存这枚足迹
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-[#e0d0b4] px-3.5 py-[7px] text-[0.7rem] text-[#8b7a62] transition hover:bg-[#f5ead6]"
        >
          取消
        </button>
      </div>
    </div>
  );
}
