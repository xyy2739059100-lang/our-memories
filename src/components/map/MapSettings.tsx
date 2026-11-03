"use client";

import { useState } from "react";
import type { TravelData } from "@/lib/travel/types";
import { formatTripRange } from "@/lib/travel/geo";

interface MapSettingsProps {
  data: TravelData;
  open: boolean;
  onClose: () => void;
  onImportMap: () => void;
  onRemoveMap: () => void;
  onDeleteCity: (id: string) => void;
  onClearAll: () => void;
  onRestoreDemo: () => void;
}

const cardButton =
  "rounded-full border border-[#e6d6b6] bg-[#fffdf9] px-3 py-1.5 text-[0.68rem] text-[#8b7d6b] transition hover:text-[#6b5637]";

const dangerButton =
  "rounded-full border border-[#e6d6b6] bg-[#fffdf9] px-3 py-1.5 text-[0.68rem] text-[#b3a17f] transition hover:text-[#a06b4e]";

const armedButton =
  "rounded-full border border-[#d08d7c] bg-[#f6ded8] px-3 py-1.5 text-[0.68rem] text-[#b05a48] transition";

/** 地图设置：导入自己的底图、删掉示例城市 / 旅程 / 地点 */
export default function MapSettings({
  data,
  open,
  onClose,
  onImportMap,
  onRemoveMap,
  onDeleteCity,
  onClearAll,
  onRestoreDemo,
}: MapSettingsProps) {
  /** 哪一座城市正在等第二次确认 */
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="收起地图设置"
        onClick={onClose}
        className="absolute inset-0 z-30 cursor-default bg-[#3b3026]/18 backdrop-blur-[1px]"
      />

      <aside className="drawer-in absolute bottom-[4.9rem] left-0 top-0 z-40 flex w-[min(88vw,360px)] flex-col overflow-hidden rounded-r-[20px] border-y border-r border-[#e6d3ae]/70 bg-[#fdf6e8]/96 shadow-[10px_0_34px_rgba(90,70,45,0.14)] backdrop-blur-md">
        <div
          aria-hidden="true"
          className="paper-grain pointer-events-none absolute inset-0 opacity-[0.14]"
        />

        <div className="relative flex items-start justify-between gap-3 px-4 pb-3 pt-5">
          <div>
            <p className="text-[0.56rem] tracking-[0.28em] text-[#c1a472]">
              MAP SETTINGS
            </p>
            <h2 className="mt-1 font-serif text-[1.1rem] text-[#6b5637]">
              地图设置
            </h2>
            <p className="mt-1 text-[0.62rem] tracking-wide text-[#a89476]">
              底图、城市和旅程都可以自己换掉
            </p>
          </div>
          <button
            type="button"
            aria-label="关闭地图设置"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#e6d3ae]/80 bg-[#fffdf7] text-[#b79a6c] transition hover:text-[#7b6444]"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
            </svg>
          </button>
        </div>

        <div className="relative flex-1 space-y-4 overflow-y-auto px-3 pb-5">
          {/* 底图 */}
          <section className="rounded-[12px] border border-[#eadcc4] bg-[#fffdf8]/85 px-3 py-3">
            <p className="text-[0.62rem] tracking-[0.14em] text-[#a4916e]">
              底图
            </p>
            <p className="mt-1.5 text-[0.72rem] leading-relaxed text-[#7b6444]">
              {data.mapImage
                ? `正在用你导入的地图：${data.mapImage.label ?? "自己导入的地图"}`
                : "现在用的是手绘水彩底图"}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onImportMap}
                aria-label="导入自己的地图"
                className="rounded-full bg-[linear-gradient(135deg,#e9c880_0%,#d4a94f_100%)] px-3.5 py-1.5 text-[0.68rem] text-[#fffaf0] shadow-[0_4px_12px_rgba(180,140,70,0.24)] transition hover:brightness-105"
              >
                导入地图
              </button>
              {data.mapImage && (
                <button
                  type="button"
                  onClick={onRemoveMap}
                  aria-label="恢复手绘底图"
                  className={cardButton}
                >
                  恢复手绘底图
                </button>
              )}
            </div>
            <p className="mt-2 text-[0.58rem] leading-relaxed text-[#b3a08a]">
              导入的图片会铺在你现在的视野范围里，拖动、缩放都照旧。
            </p>
          </section>

          {/* 城市 */}
          <section>
            <div className="flex items-baseline justify-between px-1">
              <p className="text-[0.62rem] tracking-[0.14em] text-[#a4916e]">
                城市与旅程
              </p>
              <span className="text-[0.56rem] text-[#b3a08a]">
                {data.cities.length} 座 · {data.spots.length} 个地点
              </span>
            </div>

            <div className="mt-2 space-y-1.5">
              {data.cities.length === 0 && (
                <p className="rounded-[10px] border border-dashed border-[#ddc9a5] px-3 py-4 text-center text-[0.66rem] leading-relaxed text-[#b3a08a]">
                  还没有城市记录，导入地图后可以慢慢加。
                </p>
              )}

              {data.cities.map((city) => {
                const trip = data.trips.find((item) => item.cityId === city.id);
                const armed = pendingId === city.id;
                const spotCount = data.spots.filter(
                  (spot) => spot.cityId === city.id,
                ).length;
                return (
                  <div
                    key={city.id}
                    className="flex items-center gap-2 rounded-[10px] border border-[#eadcc4] bg-[#fffdf8]/85 px-2.5 py-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-1.5">
                        <span className="truncate font-serif text-[0.82rem] text-[#6b5637]">
                          {city.name}
                        </span>
                        <span className="shrink-0 text-[0.56rem] text-[#b3a08a]">
                          {city.region}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[0.58rem] text-[#a89476]">
                        {trip
                          ? `${trip.title} · ${formatTripRange(trip.startDate, trip.endDate)}`
                          : "还没有旅行记录"}
                        {spotCount > 0 ? ` · ${spotCount} 个地点` : ""}
                      </span>
                    </span>

                    <button
                      type="button"
                      aria-label={
                        armed
                          ? `再点一次删除${city.name}`
                          : `删除${city.name}的记录`
                      }
                      onClick={() => {
                        if (!armed) {
                          setPendingId(city.id);
                          return;
                        }
                        setPendingId(null);
                        onDeleteCity(city.id);
                      }}
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

            <p className="mt-2 px-1 text-[0.56rem] leading-relaxed text-[#b3a08a]">
              删掉一座城市，会连同这趟旅程、里面的地点和照片一起删掉。
            </p>
          </section>

          {/* 整体 */}
          <section className="rounded-[12px] border border-[#eadcc4] bg-[#fffdf8]/85 px-3 py-3">
            <p className="text-[0.62rem] tracking-[0.14em] text-[#a4916e]">
              整套内容
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-label="清空全部旅行内容"
                onClick={() => {
                  if (!confirmClear) {
                    setConfirmClear(true);
                    return;
                  }
                  setConfirmClear(false);
                  onClearAll();
                }}
                className={confirmClear ? armedButton : dangerButton}
              >
                {confirmClear ? "再点一次就清空" : "清空全部"}
              </button>
              <button
                type="button"
                aria-label="恢复示例旅行内容"
                onClick={() => {
                  setConfirmClear(false);
                  onRestoreDemo();
                }}
                className={cardButton}
              >
                恢复示例内容
              </button>
            </div>
            <p className="mt-2 text-[0.58rem] leading-relaxed text-[#b3a08a]">
              这些内容只存在这台设备里，清空后导入的地图会留着。
            </p>
          </section>
        </div>
      </aside>
    </>
  );
}
