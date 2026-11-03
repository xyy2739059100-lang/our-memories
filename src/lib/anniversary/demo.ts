/**
 * 纪念日的演示数据（不接云端）。
 * 日期都是固定写死的，不用「今天 + N 天」——
 * 这样每次打开看到的都是同一批示例，用户也可以在设置里一条条删掉。
 */
import type { AnniversaryData } from "./types";
import { DEFAULT_ANNIVERSARY_COPY } from "./types";
import { todayString } from "./format";

export function createDemoAnniversary(): AnniversaryData {
  const today = todayString();

  return {
    copy: { ...DEFAULT_ANNIVERSARY_COPY },
    photos: [
      {
        id: "anniv-photo-1",
        src: "/images/journal/photo-beach.png",
        width: 320,
        height: 320,
        caption: "第一次一起看海",
        authorId: "me",
      },
      {
        id: "anniv-photo-2",
        src: "/images/journal/photo-cloud.png",
        width: 320,
        height: 320,
        caption: "在云上写的名字",
        authorId: "her",
      },
      {
        id: "anniv-photo-3",
        src: "/images/journal/photo-lake.png",
        width: 320,
        height: 320,
        caption: "生日那天的湖",
        authorId: "me",
      },
      {
        id: "anniv-photo-4",
        src: "/images/memories/starry-night.svg",
        width: 320,
        height: 320,
        caption: "要去看的那片星空",
        authorId: "her",
      },
    ],
    events: [
      {
        id: "anniv-trip",
        title: "我们的旅行",
        date: "2027-05-20",
        note: "一起去看海，去远方",
        mark: "♡",
        remind: true,
        photoIds: ["anniv-photo-4"],
        authorId: "her",
        updatedAt: today,
        updatedBy: "her",
      },
      {
        id: "anniv-birthday",
        title: "我的生日",
        date: "2024-10-01",
        note: "有你在，真好",
        mark: "🎂",
        remind: false,
        photoIds: ["anniv-photo-3"],
        authorId: "me",
        updatedAt: today,
        updatedBy: "me",
      },
      {
        id: "anniv-together",
        title: "在一起的日子",
        date: "2024-02-14",
        note: "和你一起，看更大的世界",
        mark: "♡",
        remind: true,
        photoIds: ["anniv-photo-2"],
        authorId: "her",
        updatedAt: today,
        updatedBy: "her",
      },
      {
        id: "anniv-meet",
        title: "相遇的日子",
        date: "2023-08-18",
        note: "从此，世界多了一个你",
        mark: "♡",
        remind: false,
        photoIds: ["anniv-photo-1"],
        authorId: "me",
        updatedAt: today,
        updatedBy: "me",
      },
    ],
  };
}
