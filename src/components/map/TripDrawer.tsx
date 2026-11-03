"use client";

import Image from "next/image";
import type { TravelData, TravelTrip } from "@/lib/travel/types";
import { formatTripRange, tripDays } from "@/lib/travel/geo";

interface TripDrawerProps {
  data: TravelData;
  open: boolean;
  activeTripId: string | null;
  onSelect: (trip: TravelTrip) => void;
  onClose: () => void;
}

/** 左侧滑出的旅行列表：一次旅行一行，点一下地图就飞过去 */
export default function TripDrawer({
  data,
  open,
  activeTripId,
  onSelect,
  onClose,
}: TripDrawerProps) {
  if (!open) return null;

  const trips = data.trips
    .slice()
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <>
      <button
        type="button"
        aria-label="收起旅行列表"
        onClick={onClose}
        className="absolute inset-0 z-30 cursor-default bg-[#3b3026]/18 backdrop-blur-[1px]"
      />

      <aside className="drawer-in absolute bottom-[4.9rem] left-0 top-0 z-40 flex w-[min(86vw,346px)] flex-col overflow-hidden rounded-r-[20px] border-y border-r border-[#e6d3ae]/70 bg-[#fdf6e8]/96 shadow-[10px_0_34px_rgba(90,70,45,0.14)] backdrop-blur-md">
        <div
          aria-hidden="true"
          className="paper-grain pointer-events-none absolute inset-0 opacity-[0.14]"
        />

        <div className="relative flex items-start justify-between gap-3 px-4 pb-3 pt-5">
          <div>
            <p className="text-[0.56rem] tracking-[0.28em] text-[#c1a472]">
              TRAVEL NOTES
            </p>
            <h2 className="mt-1 font-serif text-[1.1rem] text-[#6b5637]">
              旅行列表
            </h2>
            <p className="mt-1 text-[0.62rem] tracking-wide text-[#a89476]">
              {data.cities.length} 座城市 · {trips.length} 段旅程 ·{" "}
              {data.spots.length} 个地点
            </p>
          </div>
          <button
            type="button"
            aria-label="关闭旅行列表"
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

        <div className="relative flex-1 space-y-2 overflow-y-auto px-3 pb-5">
          {trips.map((trip) => {
            const city = data.cities.find((item) => item.id === trip.cityId);
            const cover = data.photos.find(
              (item) => item.id === trip.coverPhotoIds[0],
            );
            const active = trip.id === activeTripId;
            return (
              <button
                key={trip.id}
                type="button"
                onClick={() => onSelect(trip)}
                className={`group flex w-full items-center gap-3 rounded-[11px] border px-2.5 py-2 text-left transition ${
                  active
                    ? "border-[#d4b078] bg-[#f8edd7]"
                    : "border-[#eadcc4] bg-[#fffdf8]/80 hover:border-[#dcc39a] hover:bg-[#fbf3e3]"
                }`}
              >
                {cover ? (
                  <span className="block h-11 w-11 shrink-0 rotate-[-3deg] rounded-[2px] border border-[#e3d3b6] bg-[#fffdf7] p-[3px] shadow-[0_2px_8px_rgba(120,95,60,0.14)] transition group-hover:rotate-0">
                    <Image
                      src={cover.src}
                      alt=""
                      width={cover.width}
                      height={cover.height}
                      unoptimized
                      className="h-full w-full rounded-[1px] object-cover"
                    />
                  </span>
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[3px] border border-dashed border-[#ddc9a5] text-[#c9a45e]">
                    ✦
                  </span>
                )}

                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-serif text-[0.86rem] text-[#6b5637]">
                      {trip.title}
                    </span>
                    <span className="shrink-0 text-[0.56rem] tracking-wide text-[#b3a08a]">
                      {city?.name}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[0.6rem] tracking-wide text-[#a89476]">
                    {formatTripRange(trip.startDate, trip.endDate)} ·{" "}
                    {tripDays(trip.startDate, trip.endDate)} 天 ·{" "}
                    {trip.spotIds.length} 个地点
                  </span>
                </span>

                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3 shrink-0 text-[#c1a472] transition group-hover:translate-x-0.5"
                  aria-hidden="true"
                >
                  <path d="M7 4.5 12.5 10 7 15.5" />
                </svg>
              </button>
            );
          })}

          <p className="px-2 pt-2 text-center text-[0.58rem] leading-relaxed tracking-wide text-[#b3a08a]">
            也可以直接点地图上的金色城市标记
          </p>
        </div>
      </aside>
    </>
  );
}
