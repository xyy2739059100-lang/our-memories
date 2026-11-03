"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type {
  GoldStar,
  JournalElement,
  JournalSpread,
  PaperTemplate,
  PageMargin,
} from "@/lib/journal-data";
import { leftStars, overlayPrince, rightStars } from "@/lib/journal-data";
import type { PageSide, Selection } from "@/lib/journal-editor";

/** 翻页动画的进行状态（由页面控制：动画结束后才真正切到目标跨页） */
export interface BookTurn {
  direction: "next" | "prev";
  from: number;
  to: number;
  nonce: number;
}

export const MIN_BOOK_ZOOM = 1;
export const MAX_BOOK_ZOOM = 3;

interface JournalBookProps {
  spreads: JournalSpread[];
  /** 当前展示的跨页下标 */
  spreadIndex: number;
  turn: BookTurn | null;
  onTurnDone: () => void;
  onRequestSpread: (index: number) => void;
  onAddSpread: () => void;
  onRemoveSpread: () => void;
  canRemoveSpread: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  focusMode: boolean;
  onToggleFocus: () => void;
  selected: Selection | null;
  onSelect: (side: PageSide, id: string | null) => void;
  onBeginDrag: () => void;
  /** 拖动：from 是拖动前所在的页，to 是松手前落到的页（可能不同） */
  onMoveTo: (
    from: PageSide,
    to: PageSide,
    id: string,
    x: number,
    y: number,
  ) => void;
  onResize: (side: PageSide, id: string, w: number, size?: number) => void;
  onUpdateText: (side: PageSide, id: string, content: string) => void;
  onRemove: (side: PageSide, id: string) => void;
  /** 刚新建的文字元素 id，会自动进入输入状态 */
  autoEditId?: string | null;
  paperTemplate: PaperTemplate;
  pageMargin: PageMargin;
}

/** 金色四角星 */
function GoldStarMark({ star }: { star: GoldStar }) {
  // star.s 以 387px 页宽为基准，转成 cqw 随书页等比缩放
  const size = `${(star.s / 3.87).toFixed(2)}cqw`;
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className="absolute"
      style={{
        left: `${star.x}%`,
        top: `${star.y}%`,
        width: size,
        height: size,
        transform: `rotate(${star.r ?? 0}deg)`,
        opacity: star.o ?? 0.7,
      }}
    >
      <path
        d="M20 1 L24.2 15.8 L39 20 L24.2 24.2 L20 39 L15.8 24.2 L1 20 L15.8 15.8 Z"
        fill="#dfbc6c"
      />
    </svg>
  );
}

/** 书脊占整本书宽的比例（与下面书脊 div 的 w-[1.6%] 保持一致） */
const SPINE_RATIO = 0.016;

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/** 由整本书的尺寸算出单页宽度（跨页拖拽都以这本书为坐标系） */
function pageMetrics(rect: DOMRect) {
  const spine = rect.width * SPINE_RATIO;
  const pageW = (rect.width - spine) / 2;
  return { spine, pageW, pageH: rect.height, left: rect.left, top: rect.top };
}

/** 某一页左边缘在屏幕上的 x 坐标 */
function pageLeftEdge(side: PageSide, rect: DOMRect) {
  const m = pageMetrics(rect);
  return side === "left" ? rect.left : rect.left + m.pageW + m.spine;
}

/**
 * 页面上的单个元素：可选中、可拖动、可缩放、可改文字。
 * 交互都在 pointer 事件里做，手机上也能直接拖动。
 */
function PageElement({
  el,
  side,
  isSelected,
  bookRef,
  autoEditId,
  onSelect,
  onDragStart,
  onBeginDrag,
  onMoveTo,
  onResize,
  onUpdateText,
  onRemove,
}: {
  el: JournalElement;
  side: PageSide;
  isSelected: boolean;
  bookRef: React.RefObject<HTMLDivElement | null>;
  autoEditId?: string | null;
  onSelect: (side: PageSide, id: string | null) => void;
  onDragStart: (
    el: JournalElement,
    side: PageSide,
    e: React.PointerEvent<HTMLDivElement>,
  ) => void;
  onBeginDrag: () => void;
  onMoveTo: (
    from: PageSide,
    to: PageSide,
    id: string,
    x: number,
    y: number,
  ) => void;
  onResize: (side: PageSide, id: string, w: number, size?: number) => void;
  onUpdateText: (side: PageSide, id: string, content: string) => void;
  onRemove: (side: PageSide, id: string) => void;
}) {
  const resize = useRef<{
    px: number;
    w0: number;
    size0: number;
    pw: number;
    moved: boolean;
  } | null>(null);
  /** 记下按下时的位置，用来区分“拖动”和“点一下” */
  const press = useRef<{
    x: number;
    y: number;
    wasSelected: boolean;
  } | null>(null);
  const [editing, setEditing] = useState(() => autoEditId === el.id);
  const [draft, setDraft] = useState(el.content ?? "");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  /** 新建的文字：进入编辑后全选，直接打字就能覆盖示例文案 */
  const selectAllPending = useRef(autoEditId === el.id);

  const box = {
    left: `${el.x}%`,
    top: `${el.y}%`,
    width: `${el.w}%`,
    zIndex: isSelected ? 25 : el.z,
  } as React.CSSProperties;

  const startEditing = () => {
    setDraft(el.content ?? "");
    setEditing(true);
  };

  // 新建的文字一挂载就是编辑态，等输入框出现后把示例文案全选上
  useEffect(() => {
    if (!editing || !selectAllPending.current) return;
    selectAllPending.current = false;
    const node = textareaRef.current;
    if (node) {
      node.focus();
      node.select();
    }
  }, [editing]);

  const commitText = () => {
    setEditing(false);
    if (draft !== (el.content ?? "")) onUpdateText(side, el.id, draft);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (editing) return;
    const wasSelected = isSelected;
    onSelect(side, el.id);
    press.current = { x: e.clientX, y: e.clientY, wasSelected };
    // 拖动逻辑放在整本书上（跨页时元素会换到另一页，本组件会被重新挂载）
    onDragStart(el, side, e);
  };

  /** 几乎没移动就松手：已选中的文字再点一下＝进入编辑 */
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    press.current = null;
    if (!p || editing) return;
    const moved = Math.abs(e.clientX - p.x) + Math.abs(e.clientY - p.y) >= 3;
    if (!moved && p.wasSelected && el.type === "text") startEditing();
  };

  const handleResizeDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = bookRef.current?.getBoundingClientRect();
    if (!rect) return;
    resize.current = {
      px: e.clientX,
      w0: el.w,
      size0: el.size ?? 0,
      pw: pageMetrics(rect).pageW,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = resize.current;
    if (!r) return;
    if (!r.moved) {
      if (Math.abs(e.clientX - r.px) < 2) return;
      r.moved = true;
      onBeginDrag();
    }
    const w = clamp(r.w0 + ((e.clientX - r.px) / r.pw) * 100, 6, 100);
    // 文字跟着一起缩放，避免框变宽而字还是原样
    onResize(side, el.id, w, r.size0 ? (r.size0 * w) / r.w0 : undefined);
  };

  const handleResizeUp = (e: React.PointerEvent<HTMLDivElement>) => {
    resize.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  /** 方向键微调，桌面上比拖拽更准 */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (editing) return;
    const step = e.shiftKey ? 0.2 : 1;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      onBeginDrag();
      onMoveTo(
        side,
        side,
        el.id,
        clamp(el.x + dx, -20, 98),
        clamp(el.y + dy, -20, 98),
      );
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onRemove(side, el.id);
      return;
    }
    if (e.key === "Enter" && el.type === "text") {
      e.preventDefault();
      startEditing();
    }
  };

  const ring = isSelected
    ? "outline outline-2 outline-dashed outline-offset-2 outline-[#c9a86b]/80"
    : "";

  const handleButton = "absolute flex h-[1.15rem] w-[1.15rem] items-center justify-center rounded-full border border-[#e0cdb0] bg-[#fffaf0] text-[0.6rem] leading-none text-[#a8875f] shadow-sm transition hover:bg-[#f3e3c4]";

  return (
    <div
      tabIndex={0}
      role="group"
      aria-label={el.type === "text" ? `文字：${el.content ?? ""}` : el.alt ?? "贴纸"}
      className={`absolute touch-none select-none outline-offset-2 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#c9a86b]/50 ${ring} ${
        isSelected ? "cursor-grabbing" : "cursor-grab"
      }`}
      style={box}
      data-el-id={el.id}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        press.current = null;
      }}
      onKeyDown={handleKeyDown}
    >
      {el.type === "text" ? (
        editing ? (
          <textarea
            ref={textareaRef}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            onBlur={commitText}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setDraft(el.content ?? "");
                setEditing(false);
              }
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                commitText();
              }
            }}
            className="font-hand w-full resize-none rounded-[3px] bg-[#fffaf0]/90 p-1 text-left outline outline-1 outline-[#c9a86b]/70"
            style={{
              fontSize: `${el.size ?? 4}cqw`,
              lineHeight: 1.72,
              color: el.color ?? "#5f7488",
              letterSpacing: "0.04em",
            }}
            rows={Math.max(2, (el.content ?? "").split("\n").length)}
          />
        ) : (
          <p
            onDoubleClick={startEditing}
            className="font-hand whitespace-pre-line"
            style={{
              fontSize: `${el.size ?? 4}cqw`,
              lineHeight: 1.72,
              color: el.color ?? "#5f7488",
              letterSpacing: "0.04em",
              // 压在照片上时也能看清：一层很淡的奶白描边
              textShadow:
                "0 0 3px rgba(255,252,244,0.95), 0 1px 2px rgba(255,252,244,0.85)",
            }}
          >
            {el.content}
          </p>
        )
      ) : el.src ? (
        el.frame ? (
          // 自己上传的照片：白边相框 + 轻微旋转，像贴在纸上
          <div
            className="bg-[#fffef9] p-[4%] pb-[7%] shadow-[0_4px_12px_rgba(120,100,70,0.20)]"
            style={{ transform: `rotate(${el.rotate ?? 0}deg)` }}
          >
            <Image
              src={el.src}
              alt={el.alt ?? ""}
              width={el.iw ?? 300}
              height={el.ih ?? 300}
              unoptimized
              className="pointer-events-none h-auto w-full select-none"
              draggable={false}
            />
          </div>
        ) : (
          <Image
            src={el.src}
            alt={el.alt ?? ""}
            width={el.iw ?? 300}
            height={el.ih ?? 300}
            unoptimized
            className="pointer-events-none h-auto w-full select-none"
            draggable={false}
            style={el.type === "paper" ? { mixBlendMode: "multiply" } : undefined}
          />
        )
      ) : null}

      {isSelected && !editing && (
        <>
          {/* 改字 */}
          {el.type === "text" && (
            <button
              type="button"
              aria-label="修改这段文字"
              title="修改文字"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                startEditing();
              }}
              className="absolute -left-2 -top-2 flex h-[1.15rem] items-center gap-[2px] rounded-full border border-[#e0cdb0] bg-[#fffaf0] px-1.5 text-[0.55rem] leading-none text-[#a8875f] shadow-sm transition hover:bg-[#f3e3c4]"
            >
              ✎ 改
            </button>
          )}

          {/* 删除 */}
          <button
            type="button"
            aria-label="删除这个元素"
            title="删除"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(side, el.id);
            }}
            className={`${handleButton} -right-2 -top-2`}
          >
            ×
          </button>

          {/* 缩放（右下角拖） */}
          <div
            role="button"
            tabIndex={-1}
            aria-label="拖动调整大小"
            title="拖动可缩放"
            onPointerDown={handleResizeDown}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeUp}
            onPointerCancel={handleResizeUp}
            onLostPointerCapture={handleResizeUp}
            className="absolute -bottom-2 -right-2 flex h-[1.25rem] w-[1.25rem] cursor-nwse-resize touch-none items-center justify-center rounded-[3px] border border-[#c9a86b] bg-[#fffaf0] shadow-sm hover:bg-[#f3e3c4]"
          >
            <svg viewBox="0 0 12 12" aria-hidden="true" className="h-2.5 w-2.5 text-[#a8875f]">
              <path
                d="M2.5 9.5 L9.5 2.5 M6 9.5 L9.5 6 M9.5 9.5 L9.5 9.5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
        </>
      )}
    </div>
  );
}

/** 纸张基底：水彩晕染 + 纤维颗粒 + 泛黄做旧 + 书脊阴影
 * template 不同时切换基底底色 / 纤维 / 叠层线：
 * - watercolor（默认）：现在的水彩晕染
 * - kraft：深卡其牛皮纸
 * - ruled：水彩 + 横线 + 左侧红线
 * - grid：水彩 + 方格线
 */
function PagePaper({
  side,
  template = "watercolor",
}: {
  side: "left" | "right";
  template?: PaperTemplate;
}) {
  const tilt = side === "left" ? "62% 10%" : "38% 10%";
  const wash1 = side === "left" ? "68% 8%" : "34% 6%";
  const wash2 = side === "left" ? "18% 74%" : "86% 78%";

  // 越靠近书脊越暗，越靠外沿越旧
  const spineShade =
    side === "left"
      ? "linear-gradient(270deg, rgba(108,82,48,0.26) 0%, rgba(108,82,48,0.07) 6%, rgba(108,82,48,0) 15%)"
      : "linear-gradient(90deg, rgba(108,82,48,0.26) 0%, rgba(108,82,48,0.07) 6%, rgba(108,82,48,0) 15%)";
  const outerAge =
    side === "left"
      ? "linear-gradient(90deg, rgba(150,118,78,0.15) 0%, rgba(150,118,78,0) 10%)"
      : "linear-gradient(270deg, rgba(150,118,78,0.15) 0%, rgba(150,118,78,0) 10%)";

  // 牛皮纸的基底色（比水彩深，偏卡其）
  const kraftBg =
    "linear-gradient(168deg, #d9c28f 0%, #c9b079 46%, #b89a60 100%)";
  const watercolorBg = [
    "linear-gradient(168deg, #f9f1e1 0%, #f2e7d4 46%, #e8dabe 100%)",
  ].join(",");

  const isKraft = template === "kraft";

  return (
    <>
      {/* 主底色层 */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundColor: isKraft ? "#d4bb82" : "#f4ead6",
          backgroundImage: isKraft
            ? [
                "radial-gradient(58% 38% at 50% 50%, rgba(120,90,50,0.08) 0%, rgba(120,90,50,0) 70%)",
                kraftBg,
              ].join(",")
            : [
                `radial-gradient(58% 38% at ${wash1}, rgba(150,180,212,0.20) 0%, rgba(150,180,212,0) 64%)`,
                `radial-gradient(52% 40% at ${wash2}, rgba(160,190,216,0.16) 0%, rgba(160,190,216,0) 66%)`,
                `radial-gradient(66% 26% at ${tilt}, rgba(188,208,226,0.14) 0%, rgba(188,208,226,0) 72%)`,
                watercolorBg,
              ].join(","),
        }}
      />
      {/* 纤维噪点层：牛皮纸更粗更重，水彩更细更淡 */}
      {isKraft ? (
        <div aria-hidden="true" className="paper-kraft-grain absolute inset-0" />
      ) : (
        <>
          <div aria-hidden="true" className="paper-grain absolute inset-0 opacity-25" />
          <div
            aria-hidden="true"
            className="absolute inset-0 mix-blend-multiply opacity-40"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='420' height='420'><filter id='m'><feTurbulence type='fractalNoise' baseFrequency='0.035' numOctaves='4' seed='7'/><feColorMatrix type='saturate' values='0'/></filter><rect width='420' height='420' filter='url(%23m)' opacity='0.16'/></svg>\")",
              backgroundSize: "420px 420px",
            }}
          />
        </>
      )}
      {/* 横线 / 方格叠层 */}
      {template === "ruled" && (
        <div aria-hidden="true" className="paper-lines-ruled absolute inset-0 opacity-80" />
      )}
      {template === "grid" && (
        <div aria-hidden="true" className="paper-grid absolute inset-0 opacity-70" />
      )}
      {/* 纸页泛黄 + 四角压暗 */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage: [
            isKraft
              ? "radial-gradient(115% 115% at 50% 45%, rgba(255,252,240,0) 48%, rgba(86,62,32,0.18) 100%)"
              : "radial-gradient(115% 115% at 50% 45%, rgba(255,252,240,0) 52%, rgba(184,152,104,0.13) 100%)",
            isKraft
              ? "radial-gradient(70% 42% at 50% 0%, rgba(255,255,250,0.18) 0%, rgba(255,255,250,0) 62%)"
              : "radial-gradient(70% 42% at 50% 0%, rgba(255,255,250,0.28) 0%, rgba(255,255,250,0) 62%)",
            outerAge,
          ].join(","),
        }}
      />
      {/* 书脊内侧阴影 */}
      <div aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: spineShade }} />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          boxShadow: isKraft
            ? "inset 0 0 48px rgba(86,62,32,0.22), inset 0 0 120px rgba(86,62,32,0.08)"
            : "inset 0 0 48px rgba(146,118,84,0.16), inset 0 0 120px rgba(146,118,84,0.06)",
        }}
      />
    </>
  );
}

function Page({
  side,
  elements,
  stars,
  pageNumber,
  selected,
  bookRef,
  autoEditId,
  className = "relative h-full flex-1",
  paperTemplate = "watercolor",
  pageMargin = "normal",
  onSelect,
  onDragStart,
  onBeginDrag,
  onMoveTo,
  onResize,
  onUpdateText,
  onRemove,
}: {
  side: PageSide;
  elements: JournalElement[];
  stars: GoldStar[];
  pageNumber: number;
  selected: Selection | null;
  bookRef: React.RefObject<HTMLDivElement | null>;
  autoEditId?: string | null;
  className?: string;
  paperTemplate?: PaperTemplate;
  pageMargin?: PageMargin;
  onSelect: (side: PageSide, id: string | null) => void;
  onDragStart: (
    el: JournalElement,
    side: PageSide,
    e: React.PointerEvent<HTMLDivElement>,
  ) => void;
  onBeginDrag: () => void;
  onMoveTo: (
    from: PageSide,
    to: PageSide,
    id: string,
    x: number,
    y: number,
  ) => void;
  onResize: (side: PageSide, id: string, w: number, size?: number) => void;
  onUpdateText: (side: PageSide, id: string, content: string) => void;
  onRemove: (side: PageSide, id: string) => void;
}) {
  // 页边距：窄 / 普通 / 宽，用百分比 padding，不影响元素百分比坐标
  const padByMargin: Record<PageMargin, string> = {
    narrow: "1.5%",
    normal: "4.5%",
    wide: "9%",
  };
  const pad = padByMargin[pageMargin];

  return (
    <div
      // 点空白处＝选中这一页（新素材会放到这里）并取消当前选中。
      // 不拦截冒泡：放大后从页面空白处拖动就能平移整本书。
      onPointerDown={() => onSelect(side, null)}
      className={className}
      data-page={side}
      style={{ containerType: "inline-size" }}
    >
      <PagePaper side={side} template={paperTemplate} />
      <div
        className="absolute inset-0"
        style={{ padding: pad }}
      >
        {stars.map((star, i) => (
          <GoldStarMark key={`${side}-star-${i}`} star={star} />
        ))}
        {elements.map((el) => (
          <PageElement
            key={el.id}
            el={el}
            side={side}
            isSelected={selected?.side === side && selected.id === el.id}
            bookRef={bookRef}
            autoEditId={autoEditId}
            onSelect={onSelect}
            onDragStart={onDragStart}
            onBeginDrag={onBeginDrag}
            onMoveTo={onMoveTo}
            onResize={onResize}
            onUpdateText={onUpdateText}
            onRemove={onRemove}
          />
        ))}
      </div>
      {/* 页码：纸质书的页脚小字，随书页等比缩放 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-[2.4%] select-none text-center font-serif tracking-[0.3em]"
        style={{
          fontSize: "3cqw",
          color: "#8f7a5e",
          opacity: 0.9,
          textShadow: "0 0 3px rgba(255,252,244,0.7)",
        }}
      >
        {pageNumber}
      </span>
    </div>
  );
}

/** 翻页中的那张纸：正面是当前页，背面是下一页（转过去后看到的左页） */
function FlipSheet({
  turn,
  front,
  back,
  frontNumber,
  backNumber,
  pageProps,
  onDone,
}: {
  turn: BookTurn;
  front: JournalSpread;
  back: JournalSpread;
  frontNumber: number;
  backNumber: number;
  pageProps: Omit<React.ComponentProps<typeof Page>, "side" | "elements" | "stars" | "pageNumber" | "className">;
  onDone: () => void;
}) {
  const flipRef = useRef<HTMLDivElement | null>(null);
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  // 动画直接改 DOM 的 transform，不走 React state：每一帧都不触发渲染，翻页更顺
  useEffect(() => {
    const node = flipRef.current;
    if (!node) return;
    const duration = 640;
    const started = performance.now();
    let raf = 0;

    const step = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      const angle = turn.direction === "next" ? -180 * t : 180 * (1 - t);
      node.style.transform = `rotateY(${angle}deg)`;
      // 翻到中间时纸张翘起，影子最深
      node.style.setProperty("--flip-shade", String(Math.sin(Math.PI * t)));
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        doneRef.current();
      }
    };

    node.style.transform = `rotateY(${turn.direction === "next" ? 0 : 180}deg)`;
    node.style.setProperty("--flip-shade", "0");
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [turn.direction, turn.nonce]);

  return (
    <div
      aria-hidden="true"
      data-flip-sheet
      className="pointer-events-none absolute top-0 z-30 h-full"
      style={{ left: "50.8%", width: "49.2%", perspective: "2000px" }}
    >
      <div
        ref={flipRef}
        className="relative h-full w-full"
        style={{
          transformStyle: "preserve-3d",
          transformOrigin: "left center",
          transform: `rotateY(${turn.direction === "next" ? 0 : 180}deg)`,
          willChange: "transform",
        }}
      >
        {/* 正面：翻动的那一面纸 */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ backfaceVisibility: "hidden" }}
        >
          <Page
            side="right"
            elements={front.right}
            stars={rightStars}
            pageNumber={frontNumber}
            className="relative h-full w-full"
            {...pageProps}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(96,70,40,0.26) 0%, rgba(255,255,255,0.02) 52%, rgba(255,255,255,0.12) 100%)",
              opacity: "calc(var(--flip-shade, 0) * 0.55)",
            }}
          />
        </div>

        {/* 背面：翻过去之后露出的左页 */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <Page
            side="left"
            elements={back.left}
            stars={leftStars}
            pageNumber={backNumber}
            className="relative h-full w-full"
            {...pageProps}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(270deg, rgba(96,70,40,0.26) 0%, rgba(255,255,255,0.02) 52%, rgba(255,255,255,0.12) 100%)",
              opacity: "calc(var(--flip-shade, 0) * 0.55)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/** 小圆按钮（翻页、缩放用） */
function RoundButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="tap-expand flex h-9 w-9 items-center justify-center rounded-full border border-[#e3d3b6] bg-[#fffdf8]/95 text-[0.86rem] leading-none text-[#8a7350] transition hover:bg-[#f6ecd4] hover:text-[#6b5637] disabled:cursor-not-allowed disabled:opacity-35 sm:h-8 sm:w-8 sm:text-[0.8rem]"
    >
      {children}
    </button>
  );
}

export default function JournalBook({
  spreads,
  spreadIndex,
  turn,
  onTurnDone,
  onRequestSpread,
  onAddSpread,
  onRemoveSpread,
  canRemoveSpread,
  zoom,
  onZoomChange,
  focusMode,
  onToggleFocus,
  selected,
  onSelect,
  onBeginDrag,
  onMoveTo,
  onResize,
  onUpdateText,
  onRemove,
  autoEditId,
  paperTemplate,
  pageMargin,
}: JournalBookProps) {
  const bookRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  /** 平移记录里带上跨页下标：翻页后自动回到居中，不需要在 effect 里重置 */
  const [pan, setPan] = useState({ x: 0, y: 0, spread: 0 });
  const [panning, setPanning] = useState(false);
  const zoomRef = useRef(zoom);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  /* ---------------- 缩放 / 平移 ---------------- */

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const update = () => {
      const rect = node.getBoundingClientRect();
      const next = { w: Math.round(rect.width), h: Math.round(rect.height) };
      setStageSize((current) =>
        current.w === next.w && current.h === next.h ? current : next,
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const clampPan = useCallback(
    (next: { x: number; y: number }, z: number) => {
      const maxX = Math.max(0, (stageSize.w * (z - 1)) / 2);
      const maxY = Math.max(0, (stageSize.h * (z - 1)) / 2);
      return { x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) };
    },
    [stageSize.w, stageSize.h],
  );

  // 只在当前跨页上保留平移；翻到新的一页就回到居中
  const rawPan = pan.spread === spreadIndex ? pan : { x: 0, y: 0 };
  const displayPan = clampPan(rawPan, zoom);

  // Ctrl / ⌘ + 滚轮、触控板双指捏合 → 放大缩小
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const step = event.deltaY > 0 ? -0.12 : 0.12;
      onZoomChange(clamp(zoomRef.current + step, MIN_BOOK_ZOOM, MAX_BOOK_ZOOM));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [onZoomChange]);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const panStart = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);

  const handleStageDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // 100% 时不平移，让页面正常滚动；元素拖动会被元素自己拦住
    if (zoomRef.current <= 1.001 || turn) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (pointers.current.size === 1) {
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        panX: displayPan.x,
        panY: displayPan.y,
      };
      setPanning(true);
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        zoom: zoomRef.current,
      };
      panStart.current = null;
    }
  };

  const handleStageMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const ratio = dist / pinchStart.current.dist;
      onZoomChange(
        clamp(
          pinchStart.current.zoom * ratio,
          MIN_BOOK_ZOOM,
          MAX_BOOK_ZOOM,
        ),
      );
      return;
    }

    const start = panStart.current;
    if (!start) return;
    const next = clampPan(
      {
        x: start.panX + (e.clientX - start.x),
        y: start.panY + (e.clientY - start.y),
      },
      zoomRef.current,
    );
    setPan({ ...next, spread: spreadIndex });
  };

  const handleStageUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (pointers.current.size === 0) {
      panStart.current = null;
      pinchStart.current = null;
      setPanning(false);
    } else if (pointers.current.size === 1) {
      const [only] = [...pointers.current.values()];
      panStart.current = {
        x: only.x,
        y: only.y,
        panX: displayPan.x,
        panY: displayPan.y,
      };
      pinchStart.current = null;
    }
  };

  /* ---------------- 拖动元素（跨页换页） ---------------- */

  /** 拖动中的元素：host 表示它此刻在哪一页，跨页后同步更新 */
  const dragRef = useRef<{
    id: string;
    host: PageSide;
    grabX: number;
    grabY: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  // 最新回调放进 ref，window 上的监听器只装一次
  const handlers = useRef({ onBeginDrag, onMoveTo });

  useEffect(() => {
    handlers.current = { onBeginDrag, onMoveTo };
  }, [onBeginDrag, onMoveTo]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      const rect = bookRef.current?.getBoundingClientRect();
      if (!d || !rect) return;

      // 第一次真正移动时才记一步历史，单纯点选不进撤销栈
      if (!d.moved) {
        if (
          Math.abs(e.clientX - d.startX) + Math.abs(e.clientY - d.startY) < 3
        )
          return;
        d.moved = true;
        handlers.current.onBeginDrag();
      }

      const m = pageMetrics(rect);
      const px = e.clientX - rect.left;
      // 越过书脊就换页；书脊本身是缓冲区，不会来回闪
      let target = d.host;
      if (d.host === "left" && px > m.pageW + m.spine) target = "right";
      else if (d.host === "right" && px < m.pageW) target = "left";

      const edge =
        target === "left" ? rect.left : rect.left + m.pageW + m.spine;
      const x = clamp(((e.clientX - edge) / m.pageW) * 100 - d.grabX, -30, 98);
      const y = clamp(
        ((e.clientY - rect.top) / m.pageH) * 100 - d.grabY,
        -20,
        94,
      );

      handlers.current.onMoveTo(d.host, target, d.id, x, y);
      d.host = target;
    };

    const onUp = () => {
      dragRef.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const handleDragStart = (
    el: JournalElement,
    side: PageSide,
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    const rect = bookRef.current?.getBoundingClientRect();
    if (!rect) return;
    const m = pageMetrics(rect);
    const edge = pageLeftEdge(side, rect);
    dragRef.current = {
      id: el.id,
      host: side,
      // 抓取点相对元素左上角的偏移，换页后仍然贴着手指
      grabX: ((e.clientX - edge) / m.pageW) * 100 - el.x,
      grabY: ((e.clientY - rect.top) / m.pageH) * 100 - el.y,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
  };

  /* ---------------- 翻页 ---------------- */

  const current = spreads[spreadIndex] ?? spreads[0];
  const fromSpread = turn ? spreads[turn.from] : null;
  const toSpread = turn ? spreads[turn.to] : null;

  // 翻页过程中下面露出来的两页：下一页从右边露出来，上一页从左边露出来
  let baseLeft = current.left;
  let baseRight = current.right;
  let baseLeftNumber = spreadIndex * 2 + 1;
  let baseRightNumber = spreadIndex * 2 + 2;
  if (turn && fromSpread && toSpread) {
    if (turn.direction === "next") {
      baseLeft = fromSpread.left;
      baseRight = toSpread.right;
      baseLeftNumber = turn.from * 2 + 1;
      baseRightNumber = turn.to * 2 + 2;
    } else {
      baseLeft = toSpread.left;
      baseRight = fromSpread.right;
      baseLeftNumber = turn.to * 2 + 1;
      baseRightNumber = turn.from * 2 + 2;
    }
  }

  const frontSpread =
    turn?.direction === "next" ? fromSpread : toSpread;
  const backSpread = turn?.direction === "next" ? toSpread : fromSpread;
  const frontNumber =
    turn?.direction === "next"
      ? (turn?.from ?? 0) * 2 + 2
      : (turn?.to ?? 0) * 2 + 2;
  const backNumber =
    turn?.direction === "next"
      ? (turn?.to ?? 0) * 2 + 1
      : (turn?.from ?? 0) * 2 + 1;

  const pageProps = {
    selected,
    bookRef,
    autoEditId,
    paperTemplate,
    pageMargin,
    onSelect,
    onDragStart: handleDragStart,
    onBeginDrag,
    onMoveTo,
    onResize,
    onUpdateText,
    onRemove,
  };

  const zoomed = zoom > 1.001;

  return (
    <div className="relative w-full">
      {/* 控制条：页码 / 加页 / 缩放 / 专注欣赏 */}
      <div className="mb-2 flex flex-col items-center gap-1.5 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 rounded-full border border-[#e3d3b6] bg-[#fffdf8]/92 px-1 py-0.5 shadow-[0_1px_3px_rgba(140,115,80,0.08)]">
            <RoundButton
              label="翻到上一页"
              onClick={() => onRequestSpread(spreadIndex - 1)}
              disabled={spreadIndex <= 0 || Boolean(turn)}
            >
              ‹
            </RoundButton>
            <span className="min-w-[4.4rem] text-center text-[0.64rem] tabular-nums text-[#8a7350]">
              第 {spreadIndex + 1} / {spreads.length} 页
            </span>
            <RoundButton
              label="翻到下一页"
              onClick={() => onRequestSpread(spreadIndex + 1)}
              disabled={spreadIndex >= spreads.length - 1 || Boolean(turn)}
            >
              ›
            </RoundButton>
          </div>

          <button
            type="button"
            onClick={onAddSpread}
            aria-label="加一页"
            title="在这张跨页后面加一张空白跨页"
            className="tap-expand flex h-9 items-center gap-1 rounded-full border border-[#e0cdb0] bg-[#fffdf8]/95 px-3 text-[0.64rem] tracking-wide text-[#8a7350] transition hover:bg-[#f6ecd4] hover:text-[#6b5637] sm:h-8"
          >
            ＋ 加一页
          </button>
          {canRemoveSpread && (
            <button
              type="button"
              onClick={onRemoveSpread}
              aria-label="删掉这页"
              title="删掉这张空白跨页"
              className="text-[0.6rem] text-[#a89476] underline decoration-[#c9b48c]/60 underline-offset-2 transition hover:text-[#8a5e4a]"
            >
              删掉这页
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 rounded-full border border-[#e3d3b6] bg-[#fffdf8]/92 px-1 py-0.5 shadow-[0_1px_3px_rgba(140,115,80,0.08)]">
            <RoundButton
              label="缩小"
              onClick={() =>
                onZoomChange(
                  clamp(zoom - 0.25, MIN_BOOK_ZOOM, MAX_BOOK_ZOOM),
                )
              }
              disabled={zoom <= MIN_BOOK_ZOOM}
            >
              −
            </RoundButton>
            <button
              type="button"
              onClick={() => onZoomChange(1)}
              aria-label="回到 100%"
              title="点一下回到 100%"
              className="tap-expand min-w-[3rem] h-9 text-center text-[0.66rem] tabular-nums text-[#8a7350] sm:h-8"
            >
              {Math.round(zoom * 100)}%
            </button>
            <RoundButton
              label="放大"
              onClick={() =>
                onZoomChange(
                  clamp(zoom + 0.25, MIN_BOOK_ZOOM, MAX_BOOK_ZOOM),
                )
              }
              disabled={zoom >= MAX_BOOK_ZOOM}
            >
              ＋
            </RoundButton>
          </div>

          <button
            type="button"
            onClick={onToggleFocus}
            aria-pressed={focusMode}
            aria-label={focusMode ? "退出专注欣赏" : "专注欣赏"}
            title={focusMode ? "退出专注欣赏" : "专注欣赏：收起两侧，只留下这本书"}
            className={`tap-expand flex h-9 items-center gap-1 rounded-full border px-3 text-[0.64rem] tracking-wide transition sm:h-8 ${
              focusMode
                ? "border-[#c9a86b] bg-[#f3e3c4] text-[#6b5637]"
                : "border-[#e0cdb0] bg-[#fffdf8]/95 text-[#8a7350] hover:bg-[#f6ecd4]"
            }`}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3 w-3">
              <path
                d="M2.5 10s2.8-5 7.5-5 7.5 5 7.5 5-2.8 5-7.5 5-7.5-5-7.5-5z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <circle cx="10" cy="10" r="2.1" fill="currentColor" />
            </svg>
            {focusMode ? "退出专注" : "专注欣赏"}
          </button>
        </div>
      </div>

      {/* 舞台：放大后在这里平移；100% 时不裁剪，书的影子完整 */}
      <div
        ref={stageRef}
        data-journal-stage
        onPointerDown={handleStageDown}
        onPointerMove={handleStageMove}
        onPointerUp={handleStageUp}
        onPointerCancel={handleStageUp}
        className={`relative w-full rounded-[16px] ${
          zoomed ? "overflow-hidden" : ""
        } ${
          zoomed
            ? panning
              ? "cursor-grabbing"
              : "cursor-grab"
            : ""
        }`}
        style={{
          aspectRatio: "775 / 510",
          touchAction: zoomed ? "none" : "pan-y",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${displayPan.x}px, ${displayPan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: panning ? "none" : "transform 200ms ease",
          }}
        >
          <div className="relative h-full w-full">
            {/* 硬壳封面：比纸页多出一点点，像一本真正的书 */}
            <div
              aria-hidden="true"
              className="absolute -inset-x-[0.9%] -bottom-[1.3%] -top-[0.5%] z-0 rounded-[16px] shadow-[0_18px_40px_rgba(100,78,50,0.28)]"
              style={{
                backgroundImage: [
                  "linear-gradient(160deg, #9b7c51 0%, #b69767 38%, #8f6f47 100%)",
                  "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 4px)",
                ].join(","),
              }}
            />

            {/* 页边堆积的厚度 */}
            <div
              aria-hidden="true"
              className="absolute inset-x-[2.6%] top-[99%] z-[1] h-[5px] rounded-b-[7px] bg-[#f2e8d3] shadow-[0_1px_0_rgba(180,152,110,0.55)]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-[2.2%] top-[99.4%] z-[1] h-[5px] rounded-b-[7px] bg-[#e7d9bc]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-[1.8%] top-[99.9%] z-[1] h-[5px] rounded-b-[7px] bg-[#d9c6a3]"
            />

            {/* 书本主体 */}
            <div
              ref={bookRef}
              data-journal-book
              className="relative z-10 flex aspect-[775/510] w-full overflow-hidden rounded-[12px] border border-[#c9b08a]/55 bg-[#f5eddd] shadow-[0_10px_26px_rgba(120,100,72,0.20)]"
              style={{ perspective: "1800px" }}
            >
              <Page
                side="left"
                elements={baseLeft}
                stars={leftStars}
                pageNumber={baseLeftNumber}
                {...pageProps}
              />

              {/* 书脊 */}
              <div
                aria-hidden="true"
                className="relative z-20 w-[1.6%] shrink-0"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(150,124,88,0.10) 0%, rgba(168,143,106,0.44) 22%, rgba(201,180,146,0.52) 48%, rgba(168,143,106,0.44) 76%, rgba(150,124,88,0.10) 100%)",
                }}
              >
                <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#a8895e]/40" />
              </div>

              <Page
                side="right"
                elements={baseRight}
                stars={rightStars}
                pageNumber={baseRightNumber}
                {...pageProps}
              />

              {/* 翻页中的那张纸 */}
              {turn && frontSpread && backSpread && (
                <FlipSheet
                  turn={turn}
                  front={frontSpread}
                  back={backSpread}
                  frontNumber={frontNumber}
                  backNumber={backNumber}
                  pageProps={{
                    ...pageProps,
                    autoEditId: undefined,
                    selected: null,
                  }}
                  onDone={onTurnDone}
                />
              )}

              {/* 跨书脊的插画（小王子）：只在第一张跨页上，像贴在书上的贴纸 */}
              {!turn && spreadIndex === 0 && (
                <div className="pointer-events-none absolute inset-0 z-30">
                  <div
                    className="absolute"
                    style={{
                      left: `${overlayPrince.x}%`,
                      top: `${overlayPrince.y}%`,
                      width: `${overlayPrince.w}%`,
                    }}
                  >
                    <Image
                      src={overlayPrince.src!}
                      alt={overlayPrince.alt ?? ""}
                      width={overlayPrince.iw ?? 200}
                      height={overlayPrince.ih ?? 265}
                      unoptimized
                      className="h-auto w-full select-none"
                      draggable={false}
                    />
                  </div>
                </div>
              )}

              {/* 点页面外沿翻页（放大后隐藏，避免挡住平移手势） */}
              {!turn && !zoomed && spreadIndex > 0 && (
                <button
                  type="button"
                  aria-label="点左页边缘翻到上一页"
                  title="上一页"
                  onClick={() => onRequestSpread(spreadIndex - 1)}
                  className="absolute left-0 top-0 z-[15] h-full w-[4.2%] cursor-pointer bg-transparent transition hover:bg-[#b9975f]/10"
                />
              )}
              {!turn && !zoomed && spreadIndex < spreads.length - 1 && (
                <button
                  type="button"
                  aria-label="点右页边缘翻到下一页"
                  title="下一页"
                  onClick={() => onRequestSpread(spreadIndex + 1)}
                  className="absolute right-0 top-0 z-[15] h-full w-[4.2%] cursor-pointer bg-transparent transition hover:bg-[#b9975f]/10"
                />
              )}

              {/* 左上角金色回形针 */}
              <svg
                aria-hidden="true"
                viewBox="0 0 40 92"
                className="absolute -top-[2%] left-[2.4%] z-40 h-[13%] w-auto drop-shadow-[0_2px_3px_rgba(120,95,60,0.25)]"
              >
                <path
                  d="M26 8 C12 8 8 20 8 34 L8 66 C8 78 14 86 22 86 C30 86 33 78 33 68 L33 30 C33 20 29 15 24 15 C19 15 17 20 17 28 L17 62"
                  fill="none"
                  stroke="#c9a86b"
                  strokeWidth="4.6"
                  strokeLinecap="round"
                />
                <path
                  d="M26 8 C12 8 8 20 8 34 L8 66 C8 78 14 86 22 86 C30 86 33 78 33 68 L33 30 C33 20 29 15 24 15 C19 15 17 20 17 28 L17 62"
                  fill="none"
                  stroke="#e8cb8f"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {focusMode && (
          <button
            type="button"
            onClick={onToggleFocus}
            className="absolute right-3 top-3 z-40 rounded-full border border-[#d9c5a2] bg-[#fffdf8]/95 px-3 py-1 text-[0.62rem] tracking-[0.08em] text-[#8a7350] shadow-[0_2px_8px_rgba(130,105,72,0.16)] transition hover:bg-[#f6ecd4]"
          >
            退出专注欣赏
          </button>
        )}
      </div>
    </div>
  );
}
