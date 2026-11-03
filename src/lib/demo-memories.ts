/**
 * 首页「最近的回忆」演示数据。
 * 当前阶段仅用于展示照片网格与灯箱，后续阶段将替换为 IndexedDB 中的真实数据。
 */

export interface MemoryPhoto {
  id: string;
  src: string;
  alt: string;
  title: string;
  date: string;
}

export const demoMemories: MemoryPhoto[] = [
  {
    id: "memory-001",
    src: "/images/memories/seaside.svg",
    alt: "海边的午后水彩插画",
    title: "海边的午后",
    date: "2025.08.02",
  },
  {
    id: "memory-002",
    src: "/images/memories/cloud-flight.svg",
    alt: "云端旅行水彩插画",
    title: "飞过那片云",
    date: "2025.07.21",
  },
  {
    id: "memory-003",
    src: "/images/memories/rose.svg",
    alt: "玻璃罩里的玫瑰水彩插画",
    title: "唯一的那朵玫瑰",
    date: "2025.06.14",
  },
  {
    id: "memory-004",
    src: "/images/memories/starry-night.svg",
    alt: "星空夜晚水彩插画",
    title: "一起看过的星空",
    date: "2025.05.30",
  },
  {
    id: "memory-005",
    src: "/images/memories/mountain-lake.svg",
    alt: "山间清晨水彩插画",
    title: "山与湖的清晨",
    date: "2025.04.18",
  },
  {
    id: "memory-006",
    src: "/images/memories/city-dusk.svg",
    alt: "城市黄昏水彩插画",
    title: "城市里的黄昏",
    date: "2025.03.09",
  },
];
