/**
 * 手账页演示数据（1:1 对齐「手账页面设计图」）。
 * 照片 / 便签 / 插画均来自设计图裁切素材，坐标为页面内百分比。
 */

export interface JournalElement {
  id: string;
  type: "photo" | "paper" | "text";
  /** 相对页面宽度的百分比 */
  x: number;
  /** 相对页面高度的百分比 */
  y: number;
  /** 宽度（页面宽度百分比） */
  w: number;
  src?: string;
  /** 素材原始像素尺寸，用于 next/image 保持比例 */
  iw?: number;
  ih?: number;
  alt?: string;
  content?: string;
  /** 字号（cqw，容器查询单位） */
  size?: number;
  color?: string;
  align?: "left" | "center";
  /** 顶部装饰星 */
  z?: number;
  /** 自己上传的照片：渲染成带白边的拍立得相框 */
  frame?: boolean;
  /** 轻微旋转（度），让贴上去的照片更自然 */
  rotate?: number;
}

export interface GoldStar {
  x: number;
  y: number;
  s: number;
  o?: number;
  r?: number;
}

export type PaperTemplate = "watercolor" | "kraft" | "ruled" | "grid";
export type PageMargin = "narrow" | "normal" | "wide";

/** 一张跨页：左右两页（翻页时以"跨页"为单位翻） */
export interface JournalSpread {
  id: string;
  left: JournalElement[];
  right: JournalElement[];
}

export interface JournalEntry {
  id: string;
  title: string;
  cover: string;
  /** 一本书可以有很多张跨页，第一张是打开书时看到的 */
  spreads: JournalSpread[];
  /** 纸张模板：水彩（默认）/ 牛皮纸 / 横线 / 方格 */
  paperTemplate?: PaperTemplate;
  /** 页边距：窄 / 普通（默认） / 宽 */
  pageMargin?: PageMargin;
}

/** 旧数据里的一本书（左页 / 右页），迁移到 spreads 时用 */
export interface LegacyJournalEntry {
  id: string;
  title: string;
  cover: string;
  leftPage: JournalElement[];
  rightPage: JournalElement[];
}

const A = {
  lake: { src: "/images/journal/photo-lake.png", iw: 311, ih: 254 },
  cloud: { src: "/images/journal/photo-cloud.png", iw: 240, ih: 256 },
  beach: { src: "/images/journal/photo-beach.png", iw: 218, ih: 223 },
  prince: { src: "/images/journal/prince.png", iw: 195, ih: 263 },
  planet: { src: "/images/journal/planet-rose.png", iw: 246, ih: 243 },
  dome: { src: "/images/journal/rose-dome.png", iw: 132, ih: 144 },
  stamp: { src: "/images/journal/stamp.png", iw: 109, ih: 80 },
  checklist: { src: "/images/journal/note-checklist.png", iw: 271, ih: 199 },
  quote: { src: "/images/journal/note-quote.png", iw: 275, ih: 216 },
  b612: { src: "/images/journal/label-b612.png", iw: 237, ih: 125 },
} as const;

export const leftStars: GoldStar[] = [
  { x: 60, y: 6, s: 15, o: 0.9, r: 10 },
  { x: 52, y: 33, s: 11, o: 0.7, r: -8 },
  { x: 70, y: 47, s: 13, o: 0.8, r: 14 },
  { x: 92, y: 63, s: 10, o: 0.6, r: -6 },
  { x: 40, y: 58, s: 9, o: 0.55, r: 20 },
  { x: 30, y: 92, s: 12, o: 0.65, r: -14 },
  { x: 78, y: 88, s: 9, o: 0.5, r: 8 },
];

export const rightStars: GoldStar[] = [
  { x: 6, y: 8, s: 13, o: 0.85, r: -10 },
  { x: 46, y: 5, s: 10, o: 0.6, r: 12 },
  { x: 88, y: 34, s: 14, o: 0.8, r: -14 },
  { x: 20, y: 38, s: 9, o: 0.5, r: 18 },
  { x: 44, y: 88, s: 12, o: 0.7, r: 10 },
  { x: 80, y: 78, s: 10, o: 0.55, r: -8 },
  { x: 12, y: 96, s: 9, o: 0.45, r: 16 },
];

const baseEntries: LegacyJournalEntry[] = [
  {
    id: "entry-001",
    title: "我们的日常",
    cover: "/images/journal/thumb-1.png",
    leftPage: [
      {
        id: "lp-date",
        type: "text",
        x: 15,
        y: 7,
        w: 55,
        content: "2025.08.18",
        size: 4.1,
        color: "#7b6c58",
      },
      {
        id: "lp-quote",
        type: "text",
        x: 15.5,
        y: 13.2,
        w: 56,
        content: "和你一起看过的风景，\n都变成了特别的意义。",
        size: 4.05,
        color: "#5f7488",
      },
      {
        id: "lp-photo",
        type: "photo",
        x: 9.18,
        y: 22.74,
        w: 50.79,
        ...A.lake,
        alt: "湖边风景与水花",
      },
      {
        id: "lp-checklist",
        type: "paper",
        x: 10.16,
        y: 62.9,
        w: 44.26,
        ...A.checklist,
        alt: "今日小事便签",
      },
      {
        id: "lp-dome",
        type: "photo",
        x: 64.55,
        y: 72.76,
        w: 21.56,
        ...A.dome,
        alt: "玻璃罩中的玫瑰",
      },
    ],
    rightPage: [
      {
        id: "rp-planet",
        type: "photo",
        x: 7.49,
        y: 6.6,
        w: 40.94,
        ...A.planet,
        alt: "带玫瑰的星球",
      },
      {
        id: "rp-quote",
        type: "paper",
        x: 50.08,
        y: 8.83,
        w: 45.77,
        ...A.quote,
        alt: "你是我一生中最美好的小小星球",
      },
      {
        id: "rp-cloud",
        type: "photo",
        x: 5.31,
        y: 41.58,
        w: 39.92,
        ...A.cloud,
        alt: "云层之上的日落",
      },
      {
        id: "rp-beach",
        type: "photo",
        x: 51.75,
        y: 52.8,
        w: 36.28,
        ...A.beach,
        alt: "沙滩上的合影剪影",
      },
      {
        id: "rp-stamp",
        type: "paper",
        x: 64.04,
        y: 43.44,
        w: 18.14,
        ...A.stamp,
        alt: "邮戳贴纸",
      },
      {
        id: "rp-b612",
        type: "photo",
        x: 24.12,
        y: 77.31,
        w: 39.43,
        ...A.b612,
        alt: "B612 标签",
      },
    ],
  },
  {
    id: "entry-002",
    title: "旅行日记",
    cover: "/images/journal/thumb-2.png",
    leftPage: [
      {
        id: "t2-date",
        type: "text",
        x: 15,
        y: 7,
        w: 55,
        content: "2025.05.02",
        size: 4.1,
        color: "#7b6c58",
      },
      {
        id: "t2-quote",
        type: "text",
        x: 15.5,
        y: 13.2,
        w: 56,
        content: "云上的日落，\n是你指给我看的。",
        size: 4.05,
        color: "#5f7488",
      },
      {
        id: "t2-cloud",
        type: "photo",
        x: 12,
        y: 30,
        w: 62,
        ...A.cloud,
        alt: "云层之上的日落",
      },
    ],
    rightPage: [
      {
        id: "t2-note",
        type: "paper",
        x: 12,
        y: 12,
        w: 56,
        ...A.quote,
        alt: "你是我一生中最美好的小小星球",
      },
      {
        id: "t2-planet",
        type: "photo",
        x: 26,
        y: 44,
        w: 46,
        ...A.planet,
        alt: "带玫瑰的星球",
      },
      {
        id: "t2-b612",
        type: "photo",
        x: 62,
        y: 76,
        w: 22,
        ...A.b612,
        alt: "B612 标签",
      },
    ],
  },
  {
    id: "entry-003",
    title: "生活碎片",
    cover: "/images/journal/thumb-3.png",
    leftPage: [
      {
        id: "t3-beach",
        type: "photo",
        x: 12,
        y: 14,
        w: 56,
        ...A.beach,
        alt: "沙滩上的合影剪影",
      },
      {
        id: "t3-note",
        type: "paper",
        x: 14,
        y: 60,
        w: 52,
        ...A.checklist,
        alt: "今日小事便签",
      },
    ],
    rightPage: [
      {
        id: "t3-quote",
        type: "paper",
        x: 10,
        y: 10,
        w: 58,
        ...A.quote,
        alt: "你是我一生中最美好的小小星球",
      },
      {
        id: "t3-dome",
        type: "photo",
        x: 20,
        y: 46,
        w: 26,
        ...A.dome,
        alt: "玻璃罩中的玫瑰",
      },
      {
        id: "t3-stamp",
        type: "paper",
        x: 62,
        y: 62,
        w: 22,
        ...A.stamp,
        alt: "邮戳贴纸",
      },
    ],
  },
  {
    id: "entry-004",
    title: "专属回忆",
    cover: "/images/journal/thumb-4.png",
    leftPage: [
      {
        id: "t4-planet",
        type: "photo",
        x: 16,
        y: 10,
        w: 58,
        ...A.planet,
        alt: "带玫瑰的星球",
      },
      {
        id: "t4-date",
        type: "text",
        x: 15,
        y: 56,
        w: 55,
        content: "2024.09.09",
        size: 4.1,
        color: "#7b6c58",
      },
      {
        id: "t4-quote",
        type: "text",
        x: 15.5,
        y: 62,
        w: 60,
        content: "关于我们，\n还有很多很多页。",
        size: 4.05,
        color: "#5f7488",
      },
    ],
    rightPage: [
      {
        id: "t4-prince",
        type: "paper",
        x: 24,
        y: 12,
        w: 34,
        ...A.prince,
        alt: "小王子与狐狸",
      },
      {
        id: "t4-note",
        type: "paper",
        x: 14,
        y: 54,
        w: 54,
        ...A.quote,
        alt: "你是我一生中最美好的小小星球",
      },
    ],
  },
];

/**
 * 示例书里额外的跨页：第一次打开就能左右翻，感受"一本书很多页"。
 * 旧存档不会丢：加载时会自动把原来的左右页并成第 1 张跨页。
 */
const extraSpreads: Record<string, JournalSpread[]> = {
  "entry-001": [
    {
      id: "entry-001-s2",
      left: [
        {
          id: "s2-date",
          type: "text",
          x: 15,
          y: 7,
          w: 55,
          content: "2025.08.19",
          size: 4.1,
          color: "#7b6c58",
        },
        {
          id: "s2-quote",
          type: "text",
          x: 15.5,
          y: 13.4,
          w: 60,
          content: "把平凡的一天，\n写成值得收藏的一页。",
          size: 4.05,
          color: "#5f7488",
        },
        {
          id: "s2-cloud",
          type: "photo",
          x: 11,
          y: 26,
          w: 52,
          ...A.cloud,
          alt: "云层之上的日落",
        },
        {
          id: "s2-note",
          type: "paper",
          x: 14,
          y: 63,
          w: 48,
          ...A.checklist,
          alt: "今日小事便签",
        },
      ],
      right: [
        {
          id: "s2-beach",
          type: "photo",
          x: 8,
          y: 9,
          w: 46,
          ...A.beach,
          alt: "沙滩上的合影剪影",
        },
        {
          id: "s2-stamp",
          type: "paper",
          x: 60,
          y: 12,
          w: 18,
          ...A.stamp,
          alt: "邮戳贴纸",
        },
        {
          id: "s2-dome",
          type: "photo",
          x: 54,
          y: 48,
          w: 21,
          ...A.dome,
          alt: "玻璃罩中的玫瑰",
        },
        {
          id: "s2-b612",
          type: "photo",
          x: 20,
          y: 72,
          w: 34,
          ...A.b612,
          alt: "B612 标签",
        },
      ],
    },
  ],
  "entry-004": [
    {
      id: "entry-004-s2",
      left: [
        {
          id: "s4-date",
          type: "text",
          x: 15,
          y: 7,
          w: 55,
          content: "2024.09.10",
          size: 4.1,
          color: "#7b6c58",
        },
        {
          id: "s4-quote",
          type: "text",
          x: 15.5,
          y: 13.4,
          w: 62,
          content: "如果有一天我们老了，\n就一起翻这些页。",
          size: 4.05,
          color: "#5f7488",
        },
        {
          id: "s4-lake",
          type: "photo",
          x: 12,
          y: 26,
          w: 58,
          ...A.lake,
          alt: "湖边风景与水花",
        },
        {
          id: "s4-stamp",
          type: "paper",
          x: 68,
          y: 68,
          w: 18,
          ...A.stamp,
          alt: "邮戳贴纸",
        },
      ],
      right: [
        {
          id: "s4-prince",
          type: "paper",
          x: 22,
          y: 10,
          w: 34,
          ...A.prince,
          alt: "小王子与狐狸",
        },
        {
          id: "s4-quote-note",
          type: "paper",
          x: 12,
          y: 52,
          w: 56,
          ...A.quote,
          alt: "你是我一生中最美好的小小星球",
        },
      ],
    },
  ],
};

/** 把旧结构（左右页）统一成跨页数组，示例书额外带上第二张跨页 */
export const journalEntries: JournalEntry[] = baseEntries.map((entry) => ({
  id: entry.id,
  title: entry.title,
  cover: entry.cover,
  spreads: [
    {
      id: `${entry.id}-s1`,
      left: entry.leftPage,
      right: entry.rightPage,
    },
    ...(extraSpreads[entry.id] ?? []),
  ],
  paperTemplate: "watercolor" as const,
  pageMargin: "normal" as const,
}));

/** 一本书里一共有多少件素材（侧栏、标题旁都用它） */
export function entryElementCount(entry: JournalEntry): number {
  return entry.spreads.reduce(
    (total, spread) => total + spread.left.length + spread.right.length,
    0,
  );
}

/** 一张跨页上有多少件素材 */
export function spreadElementCount(spread: JournalSpread): number {
  return spread.left.length + spread.right.length;
}

/** 跨越书脊、需要渲染在最上层的元素（相对整本书的百分比） */
export const overlayPrince: JournalElement = {
  id: "ov-prince",
  type: "paper",
  x: 37.04,
  y: 25.21,
  w: 15.9,
  ...A.prince,
  alt: "小王子与狐狸",
  z: 30,
};

/** 可添加到手账里的素材（工具栏选择面板用） */
export interface JournalAsset {
  key: string;
  label: string;
  src: string;
  iw: number;
  ih: number;
  type: "photo" | "paper";
  /** 默认插入宽度（页宽百分比） */
  defaultW: number;
}

export const photoAssets: JournalAsset[] = [
  { key: "lake", label: "湖边", ...A.lake, type: "photo", defaultW: 42 },
  { key: "cloud", label: "云海", ...A.cloud, type: "photo", defaultW: 38 },
  { key: "beach", label: "沙滩", ...A.beach, type: "photo", defaultW: 34 },
];

export const stickerAssets: JournalAsset[] = [
  { key: "prince", label: "小王子", ...A.prince, type: "paper", defaultW: 16 },
  { key: "planet", label: "星球", ...A.planet, type: "paper", defaultW: 26 },
  { key: "dome", label: "玫瑰罩", ...A.dome, type: "paper", defaultW: 16 },
  { key: "stamp", label: "邮戳", ...A.stamp, type: "paper", defaultW: 14 },
  { key: "b612", label: "B612", ...A.b612, type: "photo", defaultW: 20 },
];
