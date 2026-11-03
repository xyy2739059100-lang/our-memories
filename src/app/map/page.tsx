"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import SiteHeader from "@/components/layout/SiteHeader";
import MapCanvas, { type MapFocus } from "@/components/map/MapCanvas";
import MapSettings from "@/components/map/MapSettings";
import TripCard from "@/components/map/TripCard";
import TripDrawer from "@/components/map/TripDrawer";
import { demoTravelData } from "@/lib/travel/demo";
import { clampView, pointToLngLat, todayString, tripDays } from "@/lib/travel/geo";
import type { MapView } from "@/lib/travel/geo";
import type {
  TravelData,
  TravelMapImage,
  TravelPhoto,
  TravelTrip,
} from "@/lib/travel/types";
import {
  loadTravelData,
  saveTravelData,
} from "@/lib/travel/storage";
import { readImageFile } from "@/lib/image-upload";
import { syncKindFromCloud } from "@/lib/cloud";

/** 首屏先给一个全国范围的视野，MapCanvas 量到尺寸后会自己 fit 到 6 座城市 */
const INITIAL_VIEW: MapView = { lng: 112, lat: 33, zoom: 4.6 };

type Selection = { kind: "city" | "spot"; id: string } | null;

type DataAction =
  | { type: "hydrate"; data: TravelData }
  | { type: "addPhotoToSpot"; spotId: string; photo: TravelPhoto }
  | { type: "addPhotoToTrip"; tripId: string; photo: TravelPhoto }
  | { type: "deleteCity"; id: string }
  | { type: "clearAll" }
  | { type: "restoreDemo" }
  | { type: "setMapImage"; image: TravelMapImage | null };

/** 删掉一座城市：它的旅行、地点、被这些记录引用的照片一起清掉 */
function withoutCity(state: TravelData, cityId: string): TravelData {
  const trips = state.trips.filter((trip) => trip.cityId === cityId);
  const spots = state.spots.filter((spot) => spot.cityId === cityId);
  const photoIds = new Set<string>();
  for (const spot of spots) spot.photoIds.forEach((id) => photoIds.add(id));
  for (const trip of trips) trip.coverPhotoIds.forEach((id) => photoIds.add(id));

  return {
    ...state,
    cities: state.cities.filter((city) => city.id !== cityId),
    trips: state.trips.filter((trip) => trip.cityId !== cityId),
    spots: state.spots.filter((spot) => spot.cityId !== cityId),
    photos: state.photos.filter((photo) => !photoIds.has(photo.id)),
  };
}

function dataReducer(state: TravelData, action: DataAction): TravelData {
  switch (action.type) {
    case "hydrate":
      return action.data;

    case "deleteCity":
      return withoutCity(state, action.id);

    case "clearAll":
      return {
        ...state,
        cities: [],
        trips: [],
        spots: [],
        photos: [],
      };

    case "restoreDemo":
      return {
        cities: demoTravelData.cities.map((city) => ({ ...city })),
        trips: demoTravelData.trips.map((trip) => ({
          ...trip,
          spotIds: [...trip.spotIds],
          coverPhotoIds: [...trip.coverPhotoIds],
          participants: [...trip.participants],
        })),
        spots: demoTravelData.spots.map((spot) => ({
          ...spot,
          photoIds: [...spot.photoIds],
        })),
        photos: demoTravelData.photos.map((photo) => ({ ...photo })),
        // 自己导入的地图留着
        mapImage: state.mapImage ?? null,
      };

    case "setMapImage":
      return { ...state, mapImage: action.image };

    case "addPhotoToSpot": {
      const target = state.spots.find((spot) => spot.id === action.spotId);
      if (!target) return state;
      return {
        ...state,
        photos: [action.photo, ...state.photos],
        spots: state.spots.map((spot) =>
          spot.id === action.spotId
            ? { ...spot, photoIds: [action.photo.id, ...spot.photoIds] }
            : spot,
        ),
        trips: state.trips.map((trip) =>
          trip.id === target.tripId
            ? {
                ...trip,
                updatedAt: todayString(),
                updatedBy: action.photo.authorId,
              }
            : trip,
        ),
      };
    }

    case "addPhotoToTrip":
      return {
        ...state,
        photos: [action.photo, ...state.photos],
        trips: state.trips.map((trip) =>
          trip.id === action.tripId
            ? {
                ...trip,
                coverPhotoIds: [action.photo.id, ...trip.coverPhotoIds],
                updatedAt: todayString(),
                updatedBy: action.photo.authorId,
              }
            : trip,
        ),
      };

    default:
      return state;
  }
}

/* ---------------- 奶油白悬浮按钮 ---------------- */

function MapAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="tap-expand group flex h-10 w-10 items-center justify-center rounded-full border border-[#e6d3ae]/80 bg-[#fffdf7]/93 text-[#a4895f] shadow-[0_3px_12px_rgba(120,95,60,0.10)] backdrop-blur transition hover:text-[#7b6444] sm:h-11 sm:w-auto sm:justify-start sm:gap-2 sm:px-3"
    >
      <span className="shrink-0">{children}</span>
      <span className="hidden whitespace-nowrap text-[0.62rem] tracking-wide sm:inline">
        {label}
      </span>
    </button>
  );
}

function ZoomButton({
  label,
  onClick,
  last = false,
  children,
}: {
  label: string;
  onClick: () => void;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-11 w-11 items-center justify-center bg-transparent text-[#a4895f] transition hover:bg-[#f6ecd4]/80 hover:text-[#7b6444] ${
        last ? "" : "border-b border-[#efe3cd]"
      }`}
    >
      {children}
    </button>
  );
}

const iconClass = "h-[18px] w-[18px]";

export default function MapPage() {
  const [data, dispatch] = useReducer(dataReducer, demoTravelData);
  const [view, setView] = useState<MapView>(INITIAL_VIEW);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mapFileRef = useRef<HTMLInputElement | null>(null);
  /** MapCanvas 量到的容器尺寸，导入底图时用来算经纬度范围 */
  const [mapSize, setMapSize] = useState({ w: 0, h: 0 });

  const handleSizeChange = useCallback((size: { w: number; h: number }) => {
    setMapSize((current) =>
      current.w === size.w && current.h === size.h ? current : size,
    );
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  // 进页面读本地存档；之后每次改动自动存回去
  useEffect(() => {
    let cancelled = false;
    const snapshot = loadTravelData();
    if (snapshot) dispatch({ type: "hydrate", data: snapshot });

    // 登录后：云端有更新的存档就先拉下来，覆盖本机这份
    void (async () => {
      const changed = await syncKindFromCloud("travel");
      if (!changed || cancelled) return;
      const remote = loadTravelData();
      if (remote) dispatch({ type: "hydrate", data: remote });
    })();

    return () => {
      cancelled = true;
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const quotaWarned = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      const result = saveTravelData(data);
      if (result === "quota" && !quotaWarned.current) {
        quotaWarned.current = true;
        showToast("本地空间不够了，先删掉几张照片吧");
      }
      if (result === "saved") quotaWarned.current = false;
    }, 400);
    return () => clearTimeout(timer);
  }, [data, showToast]);

  const flyToView = useCallback((next: MapView) => {
    setFocus({ nonce: Date.now(), kind: "view", view: next });
  }, []);

  /** 飞到某个点，并把它放在画面偏上的位置，给底部手账卡让出空间 */
  const flyToPoint = useCallback(
    (lng: number, lat: number, zoom: number, anchorY = 0.17) => {
      setFocus({ nonce: Date.now(), kind: "point", lng, lat, zoom, anchorY });
    },
    [],
  );

  const fitAll = useCallback(
    (message?: string) => {
      setFocus((current) => {
        const cityPoints = data.cities.map((city) => ({
          lng: city.center[1],
          lat: city.center[0],
        }));
        const phone =
          typeof window !== "undefined" && window.innerWidth < 640;
        return {
          nonce: (current?.nonce ?? 0) + 1,
          kind: "fit",
          points: phone
            ? cityPoints
            : [
                ...cityPoints,
                { lng: 73.6, lat: 53.5 },
                { lng: 135.0, lat: 53.5 },
                { lng: 73.6, lat: 18.0 },
                { lng: 135.0, lat: 18.0 },
              ],
          padding: phone ? 0.2 : 0.06,
        };
      });
      if (message) showToast(message);
    },
    [data.cities, showToast],
  );

  // 城市 / 景点：选中 → 打开手账卡 → 飞到对应层级
  const openCity = useCallback(
    (id: string) => {
      const city = data.cities.find((item) => item.id === id);
      if (!city) return;
      setSelection({ kind: "city", id });
      setDrawerOpen(false);
      flyToPoint(city.center[1], city.center[0], city.defaultZoom, 0.17);
    },
    [data.cities, flyToPoint],
  );

  const openSpot = useCallback(
    (id: string) => {
      const spot = data.spots.find((item) => item.id === id);
      if (!spot) return;
      setSelection({ kind: "spot", id });
      setDrawerOpen(false);
      flyToPoint(
        spot.lng,
        spot.lat,
        Math.max(view.zoom, 11.6),
        0.17,
      );
    },
    [data.spots, flyToPoint, view.zoom],
  );

  const openTrip = useCallback(
    (trip: TravelTrip) => {
      openCity(trip.cityId);
      showToast(`${trip.title} · ${tripDays(trip.startDate, trip.endDate)} 天`);
    },
    [openCity, showToast],
  );

  const locate = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      fitAll("这个浏览器不支持定位，先看全部城市");
      return;
    }
    showToast("正在找你现在的位置…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lng = position.coords.longitude;
        const lat = position.coords.latitude;
        // 演示范围只覆盖中国，跑到范围外就先回到全国视野
        if (lng < 72 || lng > 145 || lat < 2 || lat > 54) {
          fitAll("你现在不在这次旅行的范围里，先看全部城市");
          return;
        }
        flyToView(clampView({ lng, lat, zoom: 9.4 }));
        showToast("已回到你现在的位置");
      },
      () => fitAll("没法确定位置，先看全部城市"),
      { timeout: 6000, maximumAge: 60000 },
    );
  };

  const zoomBy = (step: number) => {
    flyToView(clampView({ ...view, zoom: view.zoom + step }));
  };

  /* ---------------- 添加照片 ---------------- */

  const requestPhoto = () => {
    if (!selection) {
      showToast("先点一个城市或地点，再把照片放进去");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selection) return;

    const image = await readImageFile(file).catch((error: unknown) => {
      showToast(error instanceof Error ? error.message : "图片处理失败了");
      return null;
    });
    if (!image) return;

    const photo: TravelPhoto = {
      id: `ph-upload-${Date.now()}`,
      src: image.src,
      width: image.width,
      height: image.height,
      caption: file.name,
      takenAt: todayString(),
      authorId: "me",
    };

    if (selection.kind === "spot") {
      const spot = data.spots.find((item) => item.id === selection.id);
      dispatch({ type: "addPhotoToSpot", spotId: selection.id, photo });
      showToast(`照片已放进「${spot?.name ?? "这个地点"}」`);
      return;
    }

    const trip = data.trips.find((item) => item.cityId === selection.id);
    if (!trip) {
      showToast("这座城市还没有旅行记录");
      return;
    }
    dispatch({ type: "addPhotoToTrip", tripId: trip.id, photo });
    showToast(`照片已放进「${trip.title}」`);
  };

  /* ---------------- 地图设置：导入底图 / 删除内容 ---------------- */

  /** 把导入的图片铺在「现在看到的」这块范围里，接下来的拖动缩放都照旧 */
  const handleMapFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const image = await readImageFile(file).catch((error: unknown) => {
      showToast(error instanceof Error ? error.message : "这张图没能读出来");
      return null;
    });
    if (!image) return;

    const width = mapSize.w || 1280;
    const height = mapSize.h || 720;
    const topLeft = pointToLngLat(0, 0, view, width, height);
    const bottomRight = pointToLngLat(width, height, view, width, height);

    dispatch({
      type: "setMapImage",
      image: {
        src: image.src,
        width: image.width,
        height: image.height,
        bounds: {
          minLng: topLeft.lng,
          maxLng: bottomRight.lng,
          minLat: bottomRight.lat,
          maxLat: topLeft.lat,
        },
        label: file.name,
      },
    });
    showToast("底图已经铺好了，拖动或缩放试试");
  };

  const removeMapImage = () => {
    dispatch({ type: "setMapImage", image: null });
    showToast("已恢复手绘水彩底图");
  };

  const deleteCity = (id: string) => {
    const city = data.cities.find((item) => item.id === id);
    dispatch({ type: "deleteCity", id });
    setSelection(null);
    showToast(`${city?.name ?? "这座城市"}的记录已经删掉`);
  };

  const clearAll = () => {
    dispatch({ type: "clearAll" });
    setSelection(null);
    setDrawerOpen(false);
    showToast("旅行内容已清空，可以导入自己的地图");
  };

  const restoreDemo = () => {
    dispatch({ type: "restoreDemo" });
    setSelection(null);
    setDrawerOpen(false);
    // 城市回来了，顺手把视野装回全部城市
    setFocus({
      nonce: Date.now(),
      kind: "fit",
      points: demoTravelData.cities.map((city) => ({
        lng: city.center[1],
        lat: city.center[0],
      })),
      padding: 0.24,
    });
    showToast("示例内容已经放回来了");
  };

  /* ---------------- 派生数据 ---------------- */

  const activeTripId = useMemo(() => {
    if (!selection) return null;
    if (selection.kind === "city") {
      return data.trips.find((trip) => trip.cityId === selection.id)?.id ?? null;
    }
    return data.spots.find((spot) => spot.id === selection.id)?.tripId ?? null;
  }, [data.spots, data.trips, selection]);

  const cardSelection = selection;

  return (
    <section className="relative isolate h-[calc(100svh-6rem)] min-h-[540px] overflow-hidden bg-[#cfe4f0]">
      <MapCanvas
        data={data}
        view={view}
        onViewChange={setView}
        focus={focus}
        selected={selection}
        onSelectCity={openCity}
        onSelectSpot={openSpot}
        onClearSelection={() => setSelection(null)}
        onSizeChange={handleSizeChange}
      />

      {/* 顶部奶油渐变，让品牌和地图自然过渡 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[7.5rem]"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(247,237,219,0.96) 0%, rgba(247,237,219,0.66) 45%, rgba(247,237,219,0) 100%)",
        }}
      />

      {/* 品牌 + 返回（固定 1180 宽，和其余页面同一位置） */}
      <div className="pointer-events-auto absolute inset-x-0 top-0 z-20">
        <div className="mx-auto w-full max-w-[1180px] px-5 pt-5 sm:px-7 lg:px-8">
          <SiteHeader showBack />
        </div>
      </div>

      {/* 左上：地图小名牌 */}
      <div className="absolute left-4 top-[5.1rem] z-20 rounded-[12px] border border-[#e6d3ae]/80 bg-[#fffdf7]/92 px-3 py-2 shadow-[0_4px_14px_rgba(120,95,60,0.10)] backdrop-blur sm:left-7 sm:top-[6.3rem] sm:px-3.5">
        <p className="font-serif text-[0.8rem] leading-tight text-[#6b5637]">
          我们的旅行足迹
        </p>
        <p className="mt-0.5 text-[0.55rem] tracking-wide text-[#a89476] sm:text-[0.6rem]">
          {data.cities.length} 座城市 · {data.trips.length} 段旅程 ·{" "}
          {data.spots.length} 个地点
        </p>
        <p className="mt-0.5 text-[0.54rem] tracking-wide text-[#b3a08a]">
          {data.mapImage ? "底图：自己导入的地图" : "底图：水彩省界"}
        </p>
        <p className="mt-1 text-[0.52rem] tracking-wide text-[#b3a08a] sm:hidden">
          点金色标记看城市 · 双指可缩放
        </p>
      </div>

      {/* 左侧：快捷操作 */}
      <div className="absolute left-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2 sm:left-7">
        <MapAction label="添加照片" onClick={requestPhoto}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={iconClass}
            aria-hidden="true"
          >
            <rect x="3" y="5" width="18" height="14" rx="2.2" />
            <circle cx="8.6" cy="10" r="1.4" />
            <path d="M5 17.2l4.2-4.2 3 3 3.2-4.2 4.1 5.4" />
          </svg>
        </MapAction>
        <MapAction label="旅行列表" onClick={() => setDrawerOpen(true)}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={iconClass}
            aria-hidden="true"
          >
            <path d="M8 6h12M8 12h12M8 18h8" />
            <circle cx="4.2" cy="6" r="1" fill="currentColor" stroke="none" />
            <circle cx="4.2" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="4.2" cy="18" r="1" fill="currentColor" stroke="none" />
          </svg>
        </MapAction>
        <MapAction label="回到当前位置" onClick={locate}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={iconClass}
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="6.2" />
            <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
            <path d="M12 2.6v3.2M12 18.2v3.2M2.6 12h3.2M18.2 12h3.2" />
          </svg>
        </MapAction>
        <MapAction
          label="地图设置"
          onClick={() => {
            setDrawerOpen(false);
            setSettingsOpen(true);
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={iconClass}
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3.1" />
            <path d="M12 3.2v2.1M12 18.7v2.1M3.2 12h2.1M18.7 12h2.1M5.8 5.8l1.5 1.5M16.7 16.7l1.5 1.5M18.2 5.8l-1.5 1.5M7.3 16.7l-1.5 1.5" />
          </svg>
        </MapAction>
      </div>

      {/* 右侧：放大 / 缩小 / 定位（手机上落到右下角，别压住苏州、杭州的金色标记；打开手账卡时被卡片自然盖住） */}
      <div className="map-zoom-stack z-20 flex flex-col overflow-hidden rounded-full border border-[#e6d3ae]/80 bg-[#fffdf7]/93 shadow-[0_4px_16px_rgba(120,95,60,0.12)] backdrop-blur">
        <ZoomButton label="放大" onClick={() => zoomBy(1)}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            className={iconClass}
            aria-hidden="true"
          >
            <path d="M12 5.5v13M5.5 12h13" />
          </svg>
        </ZoomButton>
        <ZoomButton label="缩小" onClick={() => zoomBy(-1)}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            className={iconClass}
            aria-hidden="true"
          >
            <path d="M5.5 12h13" />
          </svg>
        </ZoomButton>
        <ZoomButton
          label="看全部城市"
          onClick={() => fitAll("回到全部城市的视野")}
          last
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={iconClass}
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="7.4" />
            <path d="M14.9 9.1l-1.8 4.2-4.2 1.8 1.8-4.2z" fill="currentColor" stroke="none" />
          </svg>
        </ZoomButton>
      </div>

      {/* 底部提示（桌面端） */}
      <p className="pointer-events-none absolute bottom-3 left-1/2 z-10 hidden -translate-x-1/2 rounded-full border border-[#e6d3ae]/60 bg-[#fffdf7]/78 px-3 py-1 text-[0.58rem] tracking-wide text-[#9a8b76] backdrop-blur sm:block">
        拖动地图 · 滚轮或双指缩放 · 放大后会出现城市里的景点
      </p>

      {/* 手账式详情卡：桌面居中下方，移动端底部抽屉 */}
      {cardSelection && (
        <div className="card-show absolute inset-x-2 bottom-2 z-30 max-h-[57svh] overflow-y-auto overscroll-contain px-1.5 pb-1 pt-2.5 md:inset-x-auto md:bottom-4 md:left-1/2 md:w-[430px] md:-translate-x-1/2 md:max-h-[calc(100svh-12rem)]">
          <TripCard
            data={data}
            selection={cardSelection}
            onClose={() => setSelection(null)}
            onSelectSpot={openSpot}
            onSelectCity={openCity}
            onAddPhoto={requestPhoto}
          />
        </div>
      )}

      {/* 旅行列表 */}
      <TripDrawer
        data={data}
        open={drawerOpen}
        activeTripId={activeTripId}
        onSelect={openTrip}
        onClose={() => setDrawerOpen(false)}
      />

      {/* 地图设置：导入底图 / 删掉示例内容 */}
      <MapSettings
        data={data}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onImportMap={() => mapFileRef.current?.click()}
        onRemoveMap={removeMapImage}
        onDeleteCity={deleteCity}
        onClearAll={clearAll}
        onRestoreDemo={restoreDemo}
      />

      {/* 地图空了的时候给个起步提示 */}
      {data.cities.length === 0 && !settingsOpen && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-6">
          <div className="pointer-events-auto w-[min(92vw,320px)] rounded-[16px] border border-[#e6d3ae]/85 bg-[#fffdf7]/95 px-5 py-4 text-center shadow-[0_10px_28px_rgba(120,95,60,0.14)] backdrop-blur">
            <p className="font-serif text-[1rem] text-[#6b5637]">
              这张地图还是空的
            </p>
            <p className="mt-1.5 text-[0.66rem] leading-relaxed text-[#a89476]">
              导入一张自己的地图当底图，或者先把示例内容放回来。
            </p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => mapFileRef.current?.click()}
                aria-label="导入地图底图"
                className="rounded-full bg-[linear-gradient(135deg,#e9c880_0%,#d4a94f_100%)] px-3.5 py-1.5 text-[0.7rem] text-[#fffaf0] shadow-[0_4px_12px_rgba(180,140,70,0.24)] transition hover:brightness-105"
              >
                导入地图
              </button>
              <button
                type="button"
                onClick={restoreDemo}
                aria-label="恢复示例内容"
                className="rounded-full border border-[#e6d6b6] bg-[#fffdf9] px-3.5 py-1.5 text-[0.7rem] text-[#8b7d6b] transition hover:text-[#6b5637]"
              >
                恢复示例内容
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 隐藏的照片 / 底图选择器 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        aria-label="选择要添加的照片"
        style={{ display: "none" }}
        onChange={handleFile}
      />
      <input
        ref={mapFileRef}
        type="file"
        accept="image/*"
        aria-label="选择要作为底图的地图图片"
        style={{ display: "none" }}
        onChange={handleMapFile}
      />

      {toast && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed bottom-28 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#e3d3b6] bg-[#fffdf7]/95 px-4 py-2 text-[0.74rem] text-[#7b6444] shadow-[0_6px_18px_rgba(130,105,72,0.18)]"
        >
          {toast}
        </div>
      )}
    </section>
  );
}
