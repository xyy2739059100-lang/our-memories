"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import SiteHeader from "@/components/layout/SiteHeader";
import BackgroundStars from "@/components/layout/BackgroundStars";
import EventCard from "@/components/anniversary/EventCard";
import EventGrid from "@/components/anniversary/EventGrid";
import AnniversarySettings from "@/components/anniversary/AnniversarySettings";
import AnniversaryCopyEditor from "@/components/anniversary/AnniversaryCopyEditor";
import EventEditor, {
  type EditorPayload,
} from "@/components/anniversary/EventEditor";
import PrinceScene from "@/components/anniversary/PrinceScene";
import { createDemoAnniversary } from "@/lib/anniversary/demo";
import { timingOf, todayString } from "@/lib/anniversary/format";
import {
  loadAnniversaryData,
  saveAnniversaryData,
} from "@/lib/anniversary/storage";
import { syncKindFromCloud } from "@/lib/cloud";
import type {
  AnniversaryCopy,
  AnniversaryData,
  AnniversaryPhoto,
  AnniversaryEvent,
} from "@/lib/anniversary/types";
import { DEFAULT_ANNIVERSARY_COPY } from "@/lib/anniversary/types";
import { readImageFile } from "@/lib/image-upload";

type View = "timeline" | "grid";

/** 预渲染阶段的空状态：不能在这里调用 new Date()，日期等挂载后再算 */
const EMPTY_DATA: AnniversaryData = {
  events: [],
  photos: [],
  copy: DEFAULT_ANNIVERSARY_COPY,
};

type DataAction =
  | { type: "hydrate"; data: AnniversaryData; today: string }
  | { type: "upsert"; id: string; payload: EditorPayload }
  | { type: "remove"; id: string }
  | { type: "addPhoto"; eventId: string; photo: AnniversaryPhoto }
  | { type: "toggleRemind"; id: string }
  | { type: "setCopy"; copy: AnniversaryCopy }
  | { type: "clearAll" }
  | { type: "restoreDemo"; data: AnniversaryData };

function anniversaryReducer(
  state: AnniversaryData,
  action: DataAction,
): AnniversaryData {
  switch (action.type) {
    case "hydrate":
      return action.data;

    case "upsert": {
      const today = todayString();
      const exists = state.events.some((event) => event.id === action.id);
      if (exists) {
        return {
          ...state,
          events: state.events.map((event) =>
            event.id === action.id
              ? {
                  ...event,
                  ...action.payload,
                  updatedAt: today,
                  updatedBy: action.payload.authorId,
                }
              : event,
          ),
        };
      }
      const created: AnniversaryEvent = {
        id: action.id,
        ...action.payload,
        photoIds: [],
        updatedAt: today,
        updatedBy: action.payload.authorId,
      };
      return { ...state, events: [created, ...state.events] };
    }

    case "remove":
      return {
        ...state,
        events: state.events.filter((event) => event.id !== action.id),
      };

    case "addPhoto": {
      const target = state.events.find((event) => event.id === action.eventId);
      if (!target) return state;
      return {
        ...state,
        photos: [action.photo, ...state.photos],
        events: state.events.map((event) =>
          event.id === action.eventId
            ? {
                ...event,
                photoIds: [action.photo.id, ...event.photoIds],
                updatedAt: todayString(),
                updatedBy: action.photo.authorId,
              }
            : event,
        ),
      };
    }

    case "toggleRemind":
      return {
        ...state,
        events: state.events.map((event) =>
          event.id === action.id
            ? { ...event, remind: !event.remind, updatedAt: todayString(), updatedBy: "me" }
            : event,
        ),
      };

    case "setCopy":
      return { ...state, copy: action.copy };

    case "clearAll":
      // 清空只清纪念日，页面文案留着
      return { ...state, events: [], photos: [] };

    case "restoreDemo":
      return action.data;

    default:
      return state;
  }
}

/** 「今天」跟数据放在一起：挂载后才算出来，避免预渲染阶段调用 new Date() */
interface PageState {
  data: AnniversaryData;
  today: string | null;
}

const EMPTY_PAGE: PageState = { data: EMPTY_DATA, today: null };

function pageReducer(state: PageState, action: DataAction): PageState {
  if (action.type === "hydrate") {
    return { data: action.data, today: action.today };
  }
  return { ...state, data: anniversaryReducer(state.data, action) };
}

/* ---------------- 右侧的奶油白小按钮 ---------------- */

function GhostAction({
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
      className="tap-expand flex items-center gap-1.5 rounded-full border border-[#e6d3ae]/85 bg-[#fffdf7]/93 px-2.5 py-2 text-[#a4895f] shadow-[0_3px_12px_rgba(120,95,60,0.10)] backdrop-blur transition hover:-translate-y-0.5 hover:text-[#7b6444] sm:px-3"
    >
      <span className="shrink-0">{children}</span>
      <span className="whitespace-nowrap text-[0.64rem] tracking-wide">{label}</span>
    </button>
  );
}

const iconClass = "h-[15px] w-[15px]";

/** 文案可编辑的小铅笔提示（桌面悬停才明显，手机上一直淡淡地露着） */
function EditPencil() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="h-3 w-3 shrink-0 text-[#d3ae6c] opacity-60 transition group-hover:opacity-100 sm:opacity-0"
    >
      <path
        d="M4.2 15.8l.9-3.6 7.6-7.6 2.7 2.7-7.6 7.6-3.6.9z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M11.6 5.7l2.7 2.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ---------------- 顶部分页 ---------------- */

function TabButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`tap-expand flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[0.72rem] tracking-wide transition ${
        active
          ? "bg-[linear-gradient(135deg,#e9c880_0%,#d2a548_100%)] text-[#fffaf0] shadow-[0_4px_12px_rgba(180,140,70,0.28)]"
          : "border border-[#e6d3ae]/85 bg-[#fffdf7]/85 text-[#a4895f] hover:text-[#7b6444]"
      }`}
    >
      {children}
      {label}
    </button>
  );
}

export default function AnniversaryPage() {
  const [page, dispatch] = useReducer(pageReducer, EMPTY_PAGE);
  const { data, today } = page;
  const [view, setView] = useState<View>("timeline");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorId, setEditorId] = useState<string | null | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copyEditorOpen, setCopyEditorOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  // 进页面先读本地存档；之后每次改动自动存回去
  const quotaWarned = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const snapshot = loadAnniversaryData();
    dispatch({
      type: "hydrate",
      data: snapshot ?? createDemoAnniversary(),
      today: todayString(),
    });

    // 登录后：云端有更新的存档就先拉下来，覆盖本机这份
    void (async () => {
      const changed = await syncKindFromCloud("anniversary");
      if (!changed || cancelled) return;
      dispatch({
        type: "hydrate",
        data: loadAnniversaryData() ?? createDemoAnniversary(),
        today: todayString(),
      });
    })();

    return () => {
      cancelled = true;
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  /** 所有「还有 / 已过去」都从同一个今天算，避免每张卡片各算各的 */
  const timing = useCallback(
    (date: string) => timingOf(date, today),
    [today],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      const result = saveAnniversaryData(data);
      if (result === "quota" && !quotaWarned.current) {
        quotaWarned.current = true;
        showToast("本地空间不够了，先删掉几张照片吧");
      }
      if (result === "saved") quotaWarned.current = false;
    }, 400);
    return () => clearTimeout(timer);
  }, [data, showToast]);

  // 时间轴按日期倒序：即将到来的浮动到最上面
  const events = useMemo(
    () => data.events.slice().sort((a, b) => b.date.localeCompare(a.date)),
    [data.events],
  );

  const photoMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const photo of data.photos) map.set(photo.id, photo.src);
    return map;
  }, [data.photos]);

  const coverOf = useCallback(
    (event: AnniversaryEvent) => {
      for (const id of event.photoIds) {
        const src = photoMap.get(id);
        if (src) return src;
      }
      return undefined;
    },
    [photoMap],
  );

  const selected = useMemo(
    () => events.find((event) => event.id === selectedId) ?? null,
    [events, selectedId],
  );

  const upcoming = useMemo(
    () =>
      events
        .filter((event) => timing(event.date).state === "upcoming")
        .sort((a, b) => timing(a.date).days - timing(b.date).days)[0] ?? null,
    [events, timing],
  );

  /** 添加照片的目标：选中的那个，否则最近要来的那个 */
  const photoTarget = selected ?? upcoming ?? events[0] ?? null;

  const editingEvent =
    editorId === undefined
      ? null
      : events.find((event) => event.id === editorId) ?? null;

  const openEditor = (id: string | null) => {
    setEditorId(id);
  };

  const closeEditor = () => setEditorId(undefined);

  const handleSave = (payload: EditorPayload) => {
    if (editorId === undefined) return;
    const id = editorId ?? `anniv-${Date.now()}`;
    dispatch({ type: "upsert", id, payload });
    setSelectedId(id);
    closeEditor();
    showToast(editorId ? "纪念日改好了" : "已记下这个日子");
  };

  const handleDelete = () => {
    if (!editorId) return;
    dispatch({ type: "remove", id: editorId });
    setSelectedId(null);
    closeEditor();
    showToast("纪念日已删掉");
  };

  /* ---------------- 纪念日设置：一条条删 / 清空 / 恢复示例 ---------------- */

  const openSettings = () => {
    setSettingsOpen(true);
  };

  const deleteEvent = (id: string) => {
    const event = events.find((item) => item.id === id);
    dispatch({ type: "remove", id });
    if (selectedId === id) setSelectedId(null);
    showToast(`「${event?.title ?? "这条纪念日"}」已删掉`);
  };

  const clearAllEvents = () => {
    dispatch({ type: "clearAll" });
    setSelectedId(null);
    showToast("纪念日已全部清空，可以开始记新的了");
  };

  /** 页面上的句子：标题 / 引文 / 小纸条，随时可改 */
  const copy = data.copy ?? DEFAULT_ANNIVERSARY_COPY;

  const restoreDemo = () => {
    const demo = createDemoAnniversary();
    // 只恢复纪念日，用户自己写的句子保留
    dispatch({ type: "restoreDemo", data: { ...demo, copy } });
    setSelectedId(null);
    showToast("示例纪念日已经放回来了");
  };

  const handleCopySave = (next: AnniversaryCopy) => {
    dispatch({ type: "setCopy", copy: next });
    setCopyEditorOpen(false);
    showToast("页面上的句子已经换好了");
  };

  const toggleRemind = () => {
    if (selected) {
      dispatch({ type: "toggleRemind", id: selected.id });
      showToast(
        selected.remind
          ? `「${selected.title}」的提醒已关掉`
          : `「${selected.title}」的提醒已打开`,
      );
      return;
    }
    if (!upcoming) {
      showToast("先点一个纪念日吧");
      return;
    }
    dispatch({ type: "toggleRemind", id: upcoming.id });
    showToast(`「${upcoming.title}」的提醒已经打开`);
  };

  const requestPhoto = () => {
    if (!photoTarget) {
      showToast("先点一个纪念日，再添加照片");
      return;
    }
    fileRef.current?.click();
  };

  const handleFile = async (file: File | undefined) => {
    if (!file || !photoTarget) return;
    try {
      const uploaded = await readImageFile(file);
      const photo: AnniversaryPhoto = {
        id: `anniv-photo-${Date.now()}`,
        src: uploaded.src,
        width: uploaded.width,
        height: uploaded.height,
        caption: photoTarget.title,
        authorId: "me",
      };
      dispatch({ type: "addPhoto", eventId: photoTarget.id, photo });
      showToast(`照片已经贴到「${photoTarget.title}」`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "这张照片没能读出来");
    }
  };

  return (
    <section className="relative isolate min-h-svh overflow-hidden bg-[#f7edda] pb-28 lg:pb-24">
      {/* 底色与水彩晕染 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            "radial-gradient(110% 52% at 50% -10%, rgba(184,206,229,0.42) 0%, rgba(184,206,229,0) 62%)",
            "radial-gradient(60% 38% at 92% 78%, rgba(178,201,224,0.30) 0%, rgba(178,201,224,0) 62%)",
            "radial-gradient(52% 34% at 2% 88%, rgba(226,206,167,0.26) 0%, rgba(226,206,167,0) 60%)",
            "linear-gradient(180deg, #f8efdd 0%, #f5ead5 56%, #f2e6cd 100%)",
          ].join(","),
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-8 top-24 h-28 w-[38%] rounded-full bg-white/45 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[4%] top-10 h-24 w-[28%] rounded-full bg-white/40 blur-3xl"
      />
      <BackgroundStars />

      {/* 小王子星球：桌面作为独立的右栏，与左侧文案、中间时间轴三等分，不在悬浮 */}
      <div className="relative z-10 mx-auto w-full max-w-[1180px] px-5 pt-5 sm:px-7 lg:px-8">
        <SiteHeader showBack />

        {/* 分页 + 右侧快捷按钮 */}
        <div className="relative mt-4 flex items-center justify-between gap-3 sm:mt-5">
          <p className="hidden text-[0.62rem] tracking-[0.3em] text-[#bda87f] sm:block">
            ANNIVERSARY NOTES
          </p>

          <div className="flex items-center gap-2">
            <TabButton
              active={view === "timeline"}
              label="时间轴"
              onClick={() => setView("timeline")}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true" className={iconClass}>
                <rect
                  x="3"
                  y="4.5"
                  width="14"
                  height="12"
                  rx="2.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M3 8.5h14M7 3v3M13 3v3"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </TabButton>
            <TabButton
              active={view === "grid"}
              label="纪念日"
              onClick={() => setView("grid")}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true" className={iconClass}>
                <path
                  d="M10 16.2S3.6 12.4 2.6 8.6A3.7 3.7 0 0 1 10 6.4a3.7 3.7 0 0 1 7.4 2.2c-1 3.8-7.4 7.6-7.4 7.6z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
            </TabButton>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-5 lg:mt-2 lg:flex-row lg:items-start lg:justify-between lg:gap-7">
          {/* 左栏：标题与引文 */}
          <aside className="lg:w-[230px] lg:shrink-0 lg:pt-6">
            <h1 className="relative inline-block font-serif text-[1.75rem] leading-tight tracking-[0.02em] text-[#5c4a3a] sm:text-[2.2rem] lg:text-[2.05rem]">
              <button
                type="button"
                onClick={() => setCopyEditorOpen(true)}
                aria-label="编辑页面标题"
                title="点一下就能改标题"
                className="tap-expand group text-left transition hover:text-[#8a6a45]"
              >
                {copy.heading}
                {/* 铅笔绝对定位在标题外侧，不占宽度，避免标题被挤换行 */}
                <span className="absolute -right-4 top-0.5">
                  <EditPencil />
                </span>
              </button>
              <svg
                aria-hidden="true"
                viewBox="0 0 220 12"
                className="absolute -bottom-1.5 left-0 h-2.5 w-full text-[#d9b978]"
                preserveAspectRatio="none"
              >
                <path
                  d="M2 8C40 4 92 2 132 4c30 1.5 58 3 86 2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  opacity="0.85"
                />
              </svg>
            </h1>

            <button
              type="button"
              onClick={() => setCopyEditorOpen(true)}
              aria-label="编辑手写引文"
              title="点一下就能改这句话"
              className="tap-expand group relative mt-5 block w-full pr-6 text-left transition hover:text-[#6b5a44]"
            >
              <span className="font-hand whitespace-pre-line text-[0.92rem] leading-[2] text-[#8b7d6b] sm:text-[0.98rem]">
                {copy.quote}
              </span>
              <span className="absolute right-0 top-0">
                <EditPencil />
              </span>
            </button>

            <div className="mt-4 flex items-start gap-2">
              <div className="w-16 shrink-0 sm:w-20">
                <Image
                  src="/images/journal/rose-dome.png"
                  alt="罩在玻璃罩里的玫瑰"
                  width={96}
                  height={110}
                  unoptimized
                  className="h-auto w-full"
                />
              </div>
            </div>

            {/* 左下的小纸条（桌面） */}
            <div className="mt-3 hidden rounded-[12px] border border-[#efe0c2] bg-[#fffdf7]/84 px-3 py-2.5 shadow-[0_4px_14px_rgba(120,95,60,0.07)] lg:block">
              <div className="flex items-start gap-2">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#d3ae6c]"
                >
                  <path
                    d="M12 2l2 6.6L20 11l-6 2.4L12 20l-2-6.6L4 11l6-2.4z"
                    fill="currentColor"
                    opacity="0.85"
                  />
                </svg>
                <button
                  type="button"
                  onClick={() => setCopyEditorOpen(true)}
                  aria-label="编辑小纸条文案"
                  title="点一下就能改这句话"
                  className="tap-expand group relative flex-1 pr-5 text-left"
                >
                  <span className="font-hand block whitespace-pre-line text-[0.74rem] leading-[1.75] text-[#8b7d6b]">
                    {copy.note}
                  </span>
                  <span className="absolute right-0 top-0">
                    <EditPencil />
                  </span>
                </button>
              </div>
            </div>
          </aside>

          {/* 中间：快捷按钮 + 时间轴 / 卡片 */}
          <div className="min-w-0 flex-1 lg:max-w-[540px] xl:max-w-[560px]">
            <div className="mb-3 flex flex-wrap items-center gap-2 sm:mb-4 lg:justify-end">
              <GhostAction label="添加照片" onClick={requestPhoto}>
                <svg viewBox="0 0 24 24" aria-hidden="true" className={iconClass}>
                  <rect
                    x="3"
                    y="5"
                    width="18"
                    height="14"
                    rx="2.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  />
                  <circle
                    cx="9"
                    cy="10"
                    r="1.6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M4.5 16.5l4.4-4 3.6 3.2 3-2.6 4 3.4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </GhostAction>
              <GhostAction label="纪念日设置" onClick={openSettings}>
                <svg viewBox="0 0 24 24" aria-hidden="true" className={iconClass}>
                  <path
                    d="M12 3.2l2.3 5 5.4 0.7-3.9 3.8 0.9 5.4-4.7-2.5-4.7 2.5 0.9-5.4L3.9 8.9 9.3 8.2z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                </svg>
              </GhostAction>
              <GhostAction label="提醒我" onClick={toggleRemind}>
                <svg viewBox="0 0 24 24" aria-hidden="true" className={iconClass}>
                  <path
                    d="M12 4a5 5 0 0 1 5 5c0 4.8 1.6 6.2 1.6 6.2H5.4S7 13.8 7 9a5 5 0 0 1 5-5zM9.8 18.4a2.3 2.3 0 0 0 4.4 0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </GhostAction>
            </div>

            {events.length === 0 ? (
              <div className="rounded-[14px] border border-dashed border-[#ddc9a5]/80 bg-[#fffdf7]/70 px-5 py-7 text-center">
                <p className="font-serif text-[1rem] text-[#6b5637]">
                  还没有纪念日
                </p>
                <p className="mt-1.5 text-[0.7rem] leading-relaxed text-[#a89476]">
                  示例日期已经清空了，记一个属于你们的日子吧。
                </p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditor(null)}
                    aria-label="记下一个纪念日"
                    className="rounded-full bg-[linear-gradient(135deg,#e9c880_0%,#d4a94f_100%)] px-3.5 py-1.5 text-[0.7rem] text-[#fffaf0] shadow-[0_4px_12px_rgba(180,140,70,0.24)] transition hover:brightness-105"
                  >
                    记下一个
                  </button>
                  <button
                    type="button"
                    onClick={restoreDemo}
                    aria-label="重新放回示例纪念日"
                    className="rounded-full border border-[#e6d6b6] bg-[#fffdf9] px-3.5 py-1.5 text-[0.7rem] text-[#8b7d6b] transition hover:text-[#6b5637]"
                  >
                    恢复示例
                  </button>
                </div>
              </div>
            ) : view === "timeline" ? (
              <div className="relative pl-5 sm:pl-7">
                <span
                  aria-hidden="true"
                  className="absolute bottom-4 left-[5px] top-4 w-px border-l border-dashed border-[#ddc79b] sm:left-[7px]"
                />
                <div className="space-y-2.5 sm:space-y-3">
                  {events.map((event, index) => (
                    <div key={event.id} className="relative">
                      <span
                        aria-hidden="true"
                        className={`absolute -left-[18px] top-8 h-2.5 w-2.5 rounded-full border sm:-left-[24px] ${
                          selectedId === event.id
                            ? "border-[#d3ae6c] bg-[#e8c274] shadow-[0_0_0_3px_rgba(232,194,116,0.28)]"
                            : "border-[#d9bd85] bg-[#fdf2e2]"
                        }`}
                      />
                      <EventCard
                        event={event}
                        timing={timing(event.date)}
                        cover={coverOf(event)}
                        photoCount={event.photoIds.length}
                        selected={selectedId === event.id}
                        onSelect={() => {
                          setSelectedId(event.id);
                          if (index === 0 && !selected) {
                            showToast("点「添加照片」就能贴到这张卡上");
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EventGrid
                events={events}
                timingOf={timing}
                coverOf={coverOf}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}

            {/* 移动端的小纸条 */}
            <div className="mt-4 rounded-[12px] border border-[#efe0c2] bg-[#fffdf7]/84 px-3 py-2.5 shadow-[0_4px_14px_rgba(120,95,60,0.07)] lg:hidden">
              <div className="flex items-start gap-2">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#d3ae6c]"
                >
                  <path
                    d="M12 2l2 6.6L20 11l-6 2.4L12 20l-2-6.6L4 11l6-2.4z"
                    fill="currentColor"
                    opacity="0.85"
                  />
                </svg>
                <button
                  type="button"
                  onClick={() => setCopyEditorOpen(true)}
                  aria-label="编辑小纸条文案"
                  title="点一下就能改这句话"
                  className="tap-expand group relative flex-1 pr-5 text-left"
                >
                  <span className="font-hand block whitespace-pre-line text-[0.74rem] leading-[1.75] text-[#8b7d6b]">
                    {copy.note}
                  </span>
                  <span className="absolute right-0 top-0">
                    <EditPencil />
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* 右栏：小王子与星球，只在桌面出现，给右侧留白一个落点 */}
          <div className="hidden lg:block lg:w-[210px] lg:shrink-0 lg:pt-8 xl:w-[250px]">
            <PrinceScene />
          </div>
        </div>
      </div>

      {/* 隐藏的照片选择器 */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        aria-label="选择要添加的照片"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void handleFile(file);
        }}
      />

      {settingsOpen && (
        <AnniversarySettings
          open={settingsOpen}
          events={events}
          copy={copy}
          onClose={() => setSettingsOpen(false)}
          onCreate={() => {
            setSettingsOpen(false);
            openEditor(null);
          }}
          onEdit={(id) => {
            setSettingsOpen(false);
            openEditor(id);
          }}
          onEditCopy={() => {
            setSettingsOpen(false);
            setCopyEditorOpen(true);
          }}
          onDelete={deleteEvent}
          onClearAll={clearAllEvents}
          onRestoreDemo={restoreDemo}
        />
      )}

      {copyEditorOpen && (
        <AnniversaryCopyEditor
          copy={copy}
          onClose={() => setCopyEditorOpen(false)}
          onSave={handleCopySave}
        />
      )}

      {editorId !== undefined && (
        <EventEditor
          event={editingEvent}
          onClose={closeEditor}
          onSave={handleSave}
          onDelete={editingEvent ? handleDelete : undefined}
        />
      )}

      {/* 轻提示 */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[5.6rem] z-50 flex justify-center px-4">
          <p className="card-show rounded-full border border-[#e6d3ae]/80 bg-[#fffaf0]/96 px-4 py-1.5 text-[0.72rem] text-[#8b7d6b] shadow-[0_6px_18px_rgba(120,95,60,0.12)] backdrop-blur">
            {toast}
          </p>
        </div>
      )}
    </section>
  );
}
