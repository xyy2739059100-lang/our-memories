"use client";

import Image from "next/image";
import type {
  TravelCity,
  TravelData,
  TravelPhoto,
  TravelSpot,
  TravelTrip,
} from "@/lib/travel/types";
import { AUTHORS } from "@/lib/travel/types";
import { formatTripRange, tripDays } from "@/lib/travel/geo";

const KIND_LABEL: Record<TravelSpot["kind"], string> = {
  scenic: "风景",
  food: "吃到的",
  stay: "住过",
  other: "走过",
};

interface TripCardProps {
  data: TravelData;
  selection: { kind: "city" | "spot"; id: string };
  onClose: () => void;
  onSelectSpot: (id: string) => void;
  onSelectCity: (id: string) => void;
  onAddPhoto: () => void;
}

function PhotoMount({
  photo,
  rotate = 0,
  className = "",
}: {
  photo: TravelPhoto;
  rotate?: number;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[2px] border border-[#e3d3b6] bg-[#fffdf7] p-1.5 shadow-[0_6px_16px_rgba(120,95,60,0.16)] ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <Image
        src={photo.src}
        alt={photo.caption ?? ""}
        width={photo.width}
        height={photo.height}
        unoptimized
        className="h-full w-full rounded-[1px] object-cover"
      />
    </div>
  );
}

function AuthorChip({ id }: { id: TravelTrip["updatedBy"] }) {
  const author = AUTHORS[id];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="flex h-4 w-4 items-center justify-center rounded-full text-[0.5rem] text-[#fffdf7]"
        style={{ backgroundColor: author.color }}
      >
        {author.short}
      </span>
      <span className="text-[0.62rem] tracking-wide text-[#a89476]">
        {author.name}
      </span>
    </span>
  );
}

/** 叠放的小照片：点开城市或地点后浮出的手账卡 */
export default function TripCard({
  data,
  selection,
  onClose,
  onSelectSpot,
  onSelectCity,
  onAddPhoto,
}: TripCardProps) {
  const spot: TravelSpot | null =
    selection.kind === "spot"
      ? data.spots.find((item) => item.id === selection.id) ?? null
      : null;
  const city: TravelCity | null = data.cities.find(
    (item) => item.id === (spot ? spot.cityId : selection.id),
  ) ?? null;
  const trip: TravelTrip | null = spot
    ? data.trips.find((item) => item.id === spot.tripId) ?? null
    : data.trips.find((item) => item.cityId === city?.id) ?? null;

  if (!city || !trip) return null;

  const photos = (
    spot
      ? spot.photoIds.map((id) => data.photos.find((item) => item.id === id))
      : trip.coverPhotoIds.map((id) =>
          data.photos.find((item) => item.id === id),
        )
  ).filter((item): item is TravelPhoto => Boolean(item));

  const spots = trip.spotIds
    .map((id) => data.spots.find((item) => item.id === id))
    .filter((item): item is TravelSpot => Boolean(item));
  const otherSpots = spots.filter((item) => item.id !== spot?.id);

  return (
    <div className="relative">
      {/* 顶端纸胶带 */}
      <span
        aria-hidden="true"
        className="absolute -top-2 left-1/2 z-10 h-4 w-16 -translate-x-1/2 rotate-[-3deg] border border-[#e6d5b4]/60 bg-[#f2e3c4]/72 backdrop-blur-[1px]"
      />

      <div className="relative overflow-hidden rounded-[15px] border border-[#e3d3b6] bg-[#fffdf7]/96 shadow-[0_12px_34px_rgba(120,95,60,0.20)]">
        <div
          aria-hidden="true"
          className="paper-grain pointer-events-none absolute inset-0 opacity-[0.12]"
        />

        <div className="relative px-3.5 pb-3.5 pt-3.5 sm:px-4 sm:pb-4 sm:pt-4">
          {/* 标题 */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.56rem] tracking-[0.28em] text-[#c1a472]">
                {spot ? KIND_LABEL[spot.kind] : "OUR TRIP"}
              </p>
              <h2 className="mt-1 font-serif text-[1.12rem] leading-tight text-[#6b5637]">
                {spot ? spot.name : trip.title}
              </h2>
              <p className="mt-1.5 text-[0.64rem] tracking-wide text-[#a89476]">
                {spot
                  ? `${spot.visitedAt} · ${city.name}`
                  : `${formatTripRange(trip.startDate, trip.endDate)} · ${city.name} · ${tripDays(
                      trip.startDate,
                      trip.endDate,
                    )} 天`}
              </p>
            </div>
            <button
              type="button"
              aria-label="收起"
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

          {/* 照片 */}
          {photos.length > 0 && (
            <div className="mt-3 flex items-center gap-2 overflow-visible pl-1 pt-1">
              <PhotoMount
                photo={photos[0]}
                rotate={-2.5}
                className="h-[5.4rem] w-[7.4rem] shrink-0 sm:h-[6.6rem] sm:w-[9rem]"
              />
              {photos[1] && (
                <PhotoMount
                  photo={photos[1]}
                  rotate={3}
                  className="mt-2 h-[4.1rem] w-[5.2rem] shrink-0 sm:mt-3 sm:h-[5rem] sm:w-[6.4rem]"
                />
              )}
              <span className="text-[0.58rem] tracking-wide text-[#bdad94]">
                共 {photos.length} 张
              </span>
            </div>
          )}

          {/* 一句话 / 手写小记 */}
          <p className="mt-3 font-serif text-[0.78rem] leading-relaxed text-[#7b6444]">
            「{spot ? spot.note : trip.summary}」
          </p>

          {/* 旅行日记 */}
          {!spot && (
            <div className="mt-2.5 rounded-[8px] border border-dashed border-[#ddcaa8] bg-[#fbf3e3]/70 px-2.5 py-2 sm:mt-3 sm:px-3 sm:py-2.5">
              <p className="text-[0.55rem] tracking-[0.22em] text-[#c1a472]">
                旅行日记
              </p>
              <p className="font-hand mt-1.5 text-[0.74rem] leading-[1.62] text-[#6f5c44] sm:text-[0.78rem] sm:leading-[1.75]">
                {trip.journal}
              </p>
            </div>
          )}

          {/* 这次旅行的地点 */}
          {(spot ? otherSpots : spots).length > 0 && (
            <div className="mt-3">
              <p className="text-[0.55rem] tracking-[0.22em] text-[#c1a472]">
                {spot ? "同一次旅行的其他地点" : "这一路去过的地方"}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(spot ? otherSpots : spots).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectSpot(item.id)}
                    className="rounded-full border border-[#e0cba1]/70 bg-[#fbf3e3]/80 px-2 py-[3px] text-[0.62rem] tracking-wide text-[#8b7145] transition hover:border-[#c9a45e] hover:bg-[#f6ecd4]"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 底部：共同署名 + 操作 */}
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-dashed border-[#e6d7bd] pt-2.5 sm:mt-3.5">
            <div className="flex items-center gap-2">
              {trip.participants.map((id) => (
                <AuthorChip key={id} id={id} />
              ))}
              <span className="hidden text-[0.58rem] text-[#bdad94] sm:inline">
                · 最近由{AUTHORS[trip.updatedBy].name}更新
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {spot && (
                <button
                  type="button"
                  onClick={() => onSelectCity(city.id)}
                  className="rounded-full border border-[#e0cba1]/80 bg-[#fffdf7] px-2 py-[3px] text-[0.6rem] tracking-wide text-[#a4895f] transition hover:text-[#7b6444]"
                >
                  看{city.name}
                </button>
              )}
              <button
                type="button"
                onClick={onAddPhoto}
                className="rounded-full border border-[#d8bb85]/80 bg-[#f8eed8] px-2.5 py-[4px] text-[0.6rem] tracking-wide text-[#8b6a38] transition hover:bg-[#f3e2c2]"
              >
                ＋ 添加照片
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
