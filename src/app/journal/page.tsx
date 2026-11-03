"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import Image from "next/image";
import SiteHeader from "@/components/layout/SiteHeader";
import BackgroundStars from "@/components/layout/BackgroundStars";
import JournalSidebar from "@/components/journal/JournalSidebar";
import JournalToolbar from "@/components/journal/JournalToolbar";
import JournalBook, { type BookTurn } from "@/components/journal/JournalBook";
import ElementPicker from "@/components/journal/ElementPicker";
import { editorReducer, initialEditorState } from "@/lib/journal-editor";
import type { JournalAsset } from "@/lib/journal-data";
import {
  entryElementCount,
  journalEntries,
  spreadElementCount,
} from "@/lib/journal-data";
import {
  clearJournalSnapshot,
  loadJournalSnapshot,
  saveJournalSnapshot,
} from "@/lib/journal-storage";
import { readImageFile } from "@/lib/image-upload";
import { syncKindFromCloud } from "@/lib/cloud";

export default function JournalPage() {
  const [state, dispatch] = useReducer(editorReducer, initialEditorState);
  const active =
    state.entries.find((entry) => entry.id === state.activeId) ?? state.entries[0];
  const spreadIndex = Math.min(state.activeSpread, active.spreads.length - 1);
  const spread = active.spreads[spreadIndex];

  const [picker, setPicker] = useState<"photo" | "sticker" | null>(null);
  /** 书本缩放（100% – 300%）与专注欣赏模式 */
  const [zoom, setZoom] = useState(1);
  const [focusMode, setFocusMode] = useState(false);
  /** 正在翻页：动画结束后才真正切到目标跨页 */
  const [turn, setTurn] = useState<BookTurn | null>(null);
  const turnRef = useRef<BookTurn | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 刚新建的文字元素 id：交给编辑部去自动聚焦 */
  const [autoEditId, setAutoEditId] = useState<string | null>(null);

  /** 标题内联编辑（记的是哪一本，切换手账后自然收起） */
  const [titleEditId, setTitleEditId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const editingTitle = titleEditId === active.id;

  /** 手账「更多」菜单（保存 / 导出 / 版面 / 删除） */
  const [menuOpen, setMenuOpen] = useState(false);
  /** 删除确认弹窗（红色危险操作，二次确认） */
  const [confirmDelete, setConfirmDelete] = useState(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }, []);

  const beginTitleEdit = () => {
    setTitleDraft(active.title);
    setTitleEditId(active.id);
  };

  const commitTitle = () => {
    setTitleEditId(null);
    const next = titleDraft.trim();
    if (!next || next === active.title) return;
    dispatch({ type: "renameEntry", id: active.id, title: next });
    showToast("标题已改好");
  };

  /* ---------------- 翻页（一本书多张跨页） ---------------- */

  /** 请求翻到第 index 张跨页：中间页有 3D 翻页动画，系统减少动效时直接切换 */
  const requestSpread = useCallback(
    (index: number) => {
      if (turnRef.current) return;
      const total = active.spreads.length;
      if (index < 0 || index >= total || index === spreadIndex) return;

      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (reduceMotion || Math.abs(index - spreadIndex) > 1) {
        dispatch({ type: "goSpread", index });
        return;
      }

      const nextTurn: BookTurn = {
        direction: index > spreadIndex ? "next" : "prev",
        from: spreadIndex,
        to: index,
        nonce: Date.now(),
      };
      turnRef.current = nextTurn;
      setTurn(nextTurn);
    },
    [active.spreads.length, spreadIndex],
  );

  const handleTurnDone = useCallback(() => {
    const current = turnRef.current;
    if (!current) return;
    turnRef.current = null;
    dispatch({ type: "goSpread", index: current.to });
    setTurn(null);
  }, []);

  const switchEntry = (id: string) => {
    turnRef.current = null;
    setTurn(null);
    dispatch({ type: "switchEntry", id });
  };

  // 键盘 ← / → 翻页（输入框里打字时不触发），Esc 退出专注欣赏
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "Escape") {
        setFocusMode(false);
        setMenuOpen(false);
        setConfirmDelete(false);
        return;
      }
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        requestSpread(spreadIndex + (event.key === "ArrowRight" ? 1 : -1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestSpread, spreadIndex]);

  // 「更多」菜单：点外面关掉（Esc 由全局键盘处理）
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[role="dialog"][aria-label="手账菜单"]')) return;
      if (target.closest('button[title="更多操作"]')) return;
      setMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  // 阶段五：进页面先读本地存档，之后每次改动自动存回去
  const quotaWarned = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const snapshot = loadJournalSnapshot();
    if (snapshot) dispatch({ type: "hydrate", ...snapshot });

    // 登录后：云端有更新的存档就先拉下来，覆盖本机这份
    void (async () => {
      const changed = await syncKindFromCloud("journal");
      if (!changed || cancelled) return;
      const remote = loadJournalSnapshot();
      if (remote) dispatch({ type: "hydrate", ...remote });
    })();

    return () => {
      cancelled = true;
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const result = saveJournalSnapshot({
        entries: state.entries,
        activeId: state.activeId,
        activeSpread: state.activeSpread,
      });
      if (result === "quota" && !quotaWarned.current) {
        quotaWarned.current = true;
        showToast("本地空间不够了，先删掉几张照片吧");
      }
      if (result === "saved") quotaWarned.current = false;
    }, 400);
    return () => clearTimeout(timer);
  }, [state.entries, state.activeId, state.activeSpread, showToast]);

  const handleTool = (toolId: string) => {
    if (toolId === "photo" || toolId === "sticker") {
      setPicker((current) => (current === toolId ? null : toolId));
      return;
    }

    if (toolId === "text") {
      setPicker(null);
      const id = `text-${Date.now()}`;
      dispatch({
        type: "add",
        side: state.activeSide,
        element: {
          id,
          type: "text",
          x: 22,
          y: 40,
          w: 52,
          content: "写下今天的心情…",
          size: 3.4,
          color: "#5f7488",
          // 新加的压在示例图片之上，避免刚放上去就被盖住
          z: 24,
        },
      });
      // 新建后直接进入输入状态，键盘一打就能覆盖示例文案
      setAutoEditId(id);
      // 元素挂载完就把标记清掉，免得下次切回来又自动弹输入框
      window.setTimeout(() => setAutoEditId(null), 1000);
      showToast(
        `已添加文字（${state.activeSide === "left" ? "左页" : "右页"}），直接打字就行`,
      );
      return;
    }

    if (toolId === "undo") {
      setPicker(null);
      dispatch({ type: "undo" });
      showToast("已撤销上一步");
      return;
    }

    showToast("抠图功能正在开发中");
  };

  const handlePick = (asset: JournalAsset) => {
    dispatch({
      type: "add",
      side: state.activeSide,
      element: {
        id: `${asset.key}-${Date.now()}`,
        type: asset.type,
        x: 24,
        y: 30,
        w: asset.defaultW,
        src: asset.src,
        iw: asset.iw,
        ih: asset.ih,
        alt: asset.label,
        z: 24,
      },
    });
    setPicker(null);
    showToast(
      `已放到${state.activeSide === "left" ? "左页" : "右页"}，拖动可换位置，右下角可缩放`,
    );
  };

  /** 阶段五：把手机 / 电脑里的照片或贴纸压小后放进手账 */
  const handleUpload = async (file: File, kind: "photo" | "sticker") => {
    const image = await readImageFile(file).catch((error: unknown) => {
      showToast(error instanceof Error ? error.message : "图片处理失败了");
      return null;
    });
    if (!image) return;

    if (kind === "sticker") {
      dispatch({
        type: "add",
        side: state.activeSide,
        element: {
          id: `sticker-${Date.now()}`,
          type: "photo",
          x: 32,
          y: 30,
          w: 20,
          src: image.src,
          iw: image.width,
          ih: image.height,
          alt: file.name,
          rotate: 0,
          z: 24,
        },
      });
      setPicker(null);
      showToast(
        `贴纸已放到${state.activeSide === "left" ? "左页" : "右页"}，拖动就能摆放`,
      );
      return;
    }

    const portrait = image.height >= image.width;
    dispatch({
      type: "add",
      side: state.activeSide,
      element: {
        id: `upload-${Date.now()}`,
        type: "photo",
        x: portrait ? 26 : 18,
        y: 22,
        w: portrait ? 32 : 46,
        src: image.src,
        iw: image.width,
        ih: image.height,
        alt: file.name,
        frame: true,
        rotate: -2,
        z: 24,
      },
    });
    setPicker(null);
    showToast(
      `照片已放进${state.activeSide === "left" ? "左页" : "右页"}，拖动就能摆放`,
    );
  };

  const handleReset = () => {
    clearJournalSnapshot();
    turnRef.current = null;
    setTurn(null);
    setZoom(1);
    setFocusMode(false);
    dispatch({
      type: "hydrate",
      entries: journalEntries,
      activeId: journalEntries[0].id,
      activeSpread: 0,
    });
    showToast("已恢复示例手账");
  };

  /** 手动保存：立刻写进本地存档（自动保存仍在后台兜底） */
  const handleSave = useCallback(() => {
    const result = saveJournalSnapshot({
      entries: state.entries,
      activeId: state.activeId,
      activeSpread: state.activeSpread,
    });
    setMenuOpen(false);
    if (result === "quota") {
      showToast("本地空间不够了，先删掉几张照片吧");
      return;
    }
    showToast("已保存到本地");
  }, [state.entries, state.activeId, state.activeSpread, showToast]);

  /** 删除当前这本手账（弹窗二次确认后才执行） */
  const handleDeleteEntry = () => {
    setConfirmDelete(false);
    dispatch({ type: "deleteEntry", id: active.id });
    showToast("这本手账已删除");
  };

  return (
    <section className="relative isolate overflow-hidden bg-[#f6ecda] lg:min-h-svh">
      {/* 底色渐变 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            "radial-gradient(120% 55% at 50% -12%, rgba(180,203,226,0.40) 0%, rgba(180,203,226,0) 62%)",
            "radial-gradient(70% 40% at 96% 96%, rgba(178,201,224,0.30) 0%, rgba(178,201,224,0) 60%)",
            "radial-gradient(60% 34% at 4% 98%, rgba(178,201,224,0.24) 0%, rgba(178,201,224,0) 62%)",
            "linear-gradient(180deg, #f7eddb 0%, #f5e9d4 55%, #f2e6ce 100%)",
          ].join(","),
        }}
      />
      {/* 水彩云絮 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 top-2 h-24 w-[42%] rounded-full bg-white/50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[6%] top-0 h-20 w-[30%] rounded-full bg-white/40 blur-3xl"
      />

      <BackgroundStars />

      {/* 左下：带玫瑰的星球 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 hidden w-[23%] max-w-[330px] lg:block"
      >
        <Image
          src="/images/journal/planet-left.png"
          alt=""
          width={250}
          height={102}
          unoptimized
          className="h-auto w-full"
          style={{ mixBlendMode: "multiply" }}
        />
      </div>

      {/* 右下：城堡剪影 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 hidden w-[24%] max-w-[340px] lg:block"
      >
        <Image
          src="/images/journal/castle.png"
          alt=""
          width={252}
          height={87}
          unoptimized
          className="h-auto w-full"
          style={{ mixBlendMode: "multiply" }}
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1180px] flex-col px-5 pb-4 pt-5 sm:px-7 lg:px-8 lg:pb-10">
        <SiteHeader />

        {/* 三栏：侧栏 / 书本 / 工具栏（专注欣赏时收起两侧，把整张书放大） */}
        <div
          className={`flex flex-col lg:flex-row lg:items-start ${
            focusMode ? "mt-2 gap-3" : "mt-4 gap-5 lg:mt-2 lg:gap-6"
          }`}
        >
          {!focusMode && (
            <JournalSidebar
              entries={state.entries}
              activeId={state.activeId}
              onSelect={switchEntry}
              onCreate={() => {
                turnRef.current = null;
                setTurn(null);
                dispatch({ type: "addEntry" });
                showToast("已新建一本手账");
              }}
              onRename={(id, title) => {
                dispatch({ type: "renameEntry", id, title });
                showToast(`已改名为「${title}」`);
              }}
              onReset={handleReset}
            />
          )}

          <div className="min-w-0 flex-1">
            {/* 手账标题：点一下就能改名 */}
            {!focusMode && (
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                {editingTitle ? (
                  <input
                    autoFocus
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={commitTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitTitle();
                      }
                      if (e.key === "Escape") {
                        setTitleEditId(null);
                      }
                    }}
                    maxLength={24}
                    aria-label="手账标题"
                    className="font-hand w-full max-w-[18rem] rounded-[6px] border border-[#c9a86b]/70 bg-[#fffdf7]/90 px-2 py-1 text-[1.02rem] text-[#6b5637] outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={beginTitleEdit}
                    title="点击修改手账标题"
                    className="tap-expand font-hand group flex min-w-0 items-center gap-1.5 rounded-[6px] px-1 py-0.5 text-[1.02rem] text-[#6b5637] transition hover:bg-[#f3e7d0]/70"
                  >
                    <span className="truncate">{active.title}</span>
                    <svg
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                      className="h-3 w-3 shrink-0 text-[#b79a6c] opacity-70 transition group-hover:opacity-100"
                    >
                      <path
                        d="M13.6 3.2l3.2 3.2-9 9-4 0.8 0.8-4z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}
                <span className="whitespace-nowrap text-[0.62rem] tracking-wide text-[#a89476]">
                  共 {active.spreads.length} 跨页 · {entryElementCount(active)} 件
                </span>

                {/* 右侧主操作区：保存（常用，始终可见）+ 更多（导出 / 版面 / 删除） */}
                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSave}
                    aria-label="保存这本手账"
                    title="保存到本地"
                    className="tap-expand flex h-9 items-center gap-1 rounded-full border border-[#c9a86b]/70 bg-[#f3e3c4] px-3 text-[0.66rem] tracking-wide text-[#6b5637] transition hover:bg-[#efdcb8] active:scale-[0.97] sm:h-8"
                  >
                    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5">
                      <path
                        d="M4 10.5l3.6 3.6L16 5.8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    保存
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMenuOpen((v) => !v)}
                      aria-label="更多操作"
                      aria-haspopup="dialog"
                      aria-expanded={menuOpen}
                      title="更多操作"
                      className={`tap-expand flex h-9 w-9 items-center justify-center rounded-full border transition active:scale-[0.97] sm:h-8 sm:w-8 ${
                        menuOpen
                          ? "border-[#c9a86b] bg-[#f3e7d0]"
                          : "border-[#e0cdb0] bg-[#fffdf8]/90 hover:bg-[#f6ecd4]"
                      }`}
                    >
                      <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 text-[#8a7350]">
                        <circle cx="4.6" cy="10" r="1.35" fill="currentColor" />
                        <circle cx="10" cy="10" r="1.35" fill="currentColor" />
                        <circle cx="15.4" cy="10" r="1.35" fill="currentColor" />
                      </svg>
                    </button>

                    {menuOpen && (
                      <div
                        role="dialog"
                        aria-label="手账菜单"
                        className="absolute right-0 top-[calc(100%+8px)] z-40 w-[16.5rem] rounded-[var(--radius-md)] border border-[#e6d3ae]/80 bg-[var(--glass-bg-strong)] p-2 shadow-[var(--shadow-pop)] backdrop-blur-[var(--glass-blur)]"
                      >
                        <button
                          type="button"
                          onClick={async () => {
                            setMenuOpen(false);
                            try {
                              showToast("正在导出…");
                              const { domToPng } = await import("modern-screenshot");
                              const node = document.querySelector<HTMLDivElement>(
                                '[data-journal-book]',
                              );
                              if (!node) {
                                showToast("导出失败：找不到书本节点");
                                return;
                              }
                              const dataUrl = await domToPng(node, {
                                backgroundColor: "#f5eddd",
                                scale: 2,
                              });
                              const link = document.createElement("a");
                              link.download = `${active.title}-${new Date().toISOString().slice(0, 10)}.png`;
                              link.href = dataUrl;
                              link.click();
                              showToast("已导出 PNG");
                            } catch (err) {
                              console.error("export png failed", err);
                              showToast("导出失败");
                            }
                          }}
                          className="flex min-h-[44px] w-full items-center gap-2 rounded-[var(--radius-xs)] px-2.5 py-2.5 text-left text-[0.72rem] text-[#7b6444] transition hover:bg-[#f4e9d4]"
                        >
                          <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 text-[#a4895f]">
                            <path
                              d="M10 3v10 M5 8l5 5 5-5 M3 17h14"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          导出当前跨页 PNG
                        </button>

                        <div className="my-1 h-px bg-[#e8d8bb]/70" />

                        <div className="px-2.5 pb-1 pt-1.5 text-[0.62rem] font-medium tracking-wide text-[#8a7350]">
                          纸张模板
                        </div>
                        <div className="mb-2 grid grid-cols-4 gap-1.5 px-1.5">
                          {[
                            { key: "watercolor", label: "水彩" },
                            { key: "kraft", label: "牛皮" },
                            { key: "ruled", label: "横线" },
                            { key: "grid", label: "方格" },
                          ].map((opt) => {
                            const current = (active.paperTemplate ?? "watercolor") === opt.key;
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() => {
                                  dispatch({
                                    type: "setPaperTemplate",
                                    id: active.id,
                                    paperTemplate: opt.key as "watercolor" | "kraft" | "ruled" | "grid",
                                  });
                                  showToast(`已切到「${opt.label}纸」`);
                                }}
                                className={`tap-expand h-9 rounded-[var(--radius-xs)] border text-[0.64rem] transition ${
                                  current
                                    ? "border-[#c9a86b] bg-[#f3e3c4] text-[#6b5637]"
                                    : "border-[#e0cdb0] bg-[#fffaf0] text-[#a8875f] hover:bg-[#f6ecd4]"
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>

                        <div className="px-2.5 pb-1 text-[0.62rem] font-medium tracking-wide text-[#8a7350]">
                          页边距
                        </div>
                        <div className="mb-1 flex gap-1.5 px-1.5">
                          {[
                            { key: "narrow", label: "窄" },
                            { key: "normal", label: "普通" },
                            { key: "wide", label: "宽" },
                          ].map((opt) => {
                            const current = (active.pageMargin ?? "normal") === opt.key;
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() => {
                                  dispatch({
                                    type: "setPageMargin",
                                    id: active.id,
                                    pageMargin: opt.key as "narrow" | "normal" | "wide",
                                  });
                                  showToast(`页边距：${opt.label}`);
                                }}
                                className={`tap-expand h-9 flex-1 rounded-[var(--radius-xs)] border text-[0.64rem] transition ${
                                  current
                                    ? "border-[#c9a86b] bg-[#f3e3c4] text-[#6b5637]"
                                    : "border-[#e0cdb0] bg-[#fffaf0] text-[#a8875f] hover:bg-[#f6ecd4]"
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>

                        <div className="my-1 h-px bg-[#e8d8bb]/70" />

                        <button
                          type="button"
                          disabled={state.entries.length <= 1}
                          onClick={() => {
                            setMenuOpen(false);
                            setConfirmDelete(true);
                          }}
                          className="flex min-h-[44px] w-full items-center gap-2 rounded-[var(--radius-xs)] px-2.5 py-2.5 text-left text-[0.72rem] text-[#c0392b] transition hover:bg-[#fbe9e4] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4">
                            <path
                              d="M4.5 6h11M8 6V4.4h4V6M6.2 6l.6 9.4h6.4L13.8 6M8.4 9v4M11.6 9v4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.25"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          删除这本手账
                        </button>
                        {state.entries.length <= 1 && (
                          <p className="px-2.5 pb-1.5 text-[0.58rem] text-[#b9a78d]">
                            至少要保留一本手账
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            <JournalBook
              spreads={active.spreads}
              spreadIndex={spreadIndex}
              turn={turn}
              onTurnDone={handleTurnDone}
              onRequestSpread={requestSpread}
              onAddSpread={() => {
                dispatch({ type: "addSpread" });
                showToast("加了一张空白跨页");
              }}
              onRemoveSpread={() => {
                dispatch({ type: "removeSpread" });
                showToast("空白跨页已删掉");
              }}
              canRemoveSpread={
                active.spreads.length > 1 && spreadElementCount(spread) === 0
              }
              zoom={zoom}
              onZoomChange={setZoom}
              focusMode={focusMode}
              onToggleFocus={() => setFocusMode((current) => !current)}
              selected={state.selected}
              onSelect={(side, id) => dispatch({ type: "select", side, id })}
              onBeginDrag={() => dispatch({ type: "beginDrag" })}
              onMoveTo={(from, to, id, x, y) =>
                dispatch({ type: "moveTo", from, to, id, x, y })
              }
              onResize={(side, id, w, size) =>
                dispatch({ type: "resize", side, id, w, size })
              }
              onUpdateText={(side, id, content) =>
                dispatch({ type: "update", side, id, patch: { content } })
              }
              onRemove={(side, id) => dispatch({ type: "remove", side, id })}
              autoEditId={autoEditId}
              paperTemplate={active.paperTemplate ?? "watercolor"}
              pageMargin={active.pageMargin ?? "normal"}
            />

            {!focusMode && (
              <p className="mt-3 px-2 text-center text-[0.64rem] leading-relaxed tracking-wide text-[#a89476] lg:text-[0.7rem]">
                点页面外沿或 ‹ › 翻页 · ← / → 也能翻 · ＋加一页可以一直写下去 · 放大后拖动空白处可平移
              </p>
            )}
          </div>

          {!focusMode && (
            <div className="relative flex justify-center lg:w-[62px] lg:shrink-0">
              <JournalToolbar onTool={handleTool} activeTool={picker} />
              {picker && (
                <ElementPicker
                  kind={picker}
                  side={state.activeSide}
                  onSideChange={(side) =>
                    dispatch({ type: "select", side, id: null })
                  }
                  onPick={handlePick}
                  onUpload={(file) => handleUpload(file, picker)}
                  onClose={() => setPicker(null)}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* 删除确认：苹果式弹窗，危险操作二次确认 */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
          <button
            type="button"
            aria-label="取消删除"
            onClick={() => setConfirmDelete(false)}
            className="absolute inset-0 cursor-default bg-[#2b241b]/30 backdrop-blur-[2px]"
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-entry-title"
            className="relative w-full max-w-[340px] rounded-[22px] border border-[#e6d3ae]/80 bg-[#fffdf7]/97 p-5 shadow-[0_24px_64px_rgba(90,70,45,0.3)]"
          >
            <h2
              id="delete-entry-title"
              className="font-serif text-[1.05rem] text-[#6b5637]"
            >
              删除这本手账？
            </h2>
            <p className="mt-2 text-[0.74rem] leading-relaxed text-[#8a7350]">
              「{active.title}」及其中 {entryElementCount(active)} 件素材会一起删除，无法恢复。
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="h-11 flex-1 rounded-[12px] border border-[#e0cdb0] bg-[#f4ead6] text-[0.78rem] text-[#7b6444] transition hover:bg-[#efe3cb] active:scale-[0.98]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDeleteEntry}
                className="h-11 flex-1 rounded-[12px] bg-[#ff3b30] text-[0.78rem] font-medium text-white shadow-[0_4px_14px_rgba(255,59,48,0.28)] transition hover:bg-[#e6332a] active:scale-[0.98]"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 轻提示 */}
      {toast && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[#e3d3b6] bg-[#fffdf7]/95 px-4 py-2 text-[0.74rem] text-[#7b6444] shadow-[0_6px_18px_rgba(130,105,72,0.18)]"
        >
          {toast}
        </div>
      )}
    </section>
  );
}
