/**
 * 纪念日（阶段八）的数据模型。
 * 和旅行地图一样，事件与照片分成两张表，只靠 id 关联，
 * 以后换成云端数据库时页面代码不用改。
 */

export type AuthorId = "me" | "her";

export interface AnniversaryPhoto {
  id: string;
  /** 公共素材路径，或者用户上传后的 dataURL */
  src: string;
  width: number;
  height: number;
  caption?: string;
  authorId: AuthorId;
}

export interface AnniversaryEvent {
  id: string;
  title: string;
  /** YYYY-MM-DD；已经过去的算「已过去」，未来那天算「还有」 */
  date: string;
  /** 卡片上那句手写小字 */
  note: string;
  /** 标题后面的小符号，比如 ♡ / 🎂 / ✨ */
  mark?: string;
  remind: boolean;
  photoIds: string[];
  authorId: AuthorId;
  updatedAt: string;
  updatedBy: AuthorId;
}

export interface AnniversaryData {
  events: AnniversaryEvent[];
  photos: AnniversaryPhoto[];
  /** 左栏那几个可以欣赏的句子，允许自己改写 */
  copy: AnniversaryCopy;
}

/** 页面文案：标题 / 手写引文 / 左下小纸条，都能在设置里改 */
export interface AnniversaryCopy {
  heading: string;
  /** 可以换行，页面上按行渲染 */
  quote: string;
  note: string;
}

export const DEFAULT_ANNIVERSARY_COPY: AnniversaryCopy = {
  heading: "我们的纪念日",
  quote: "有些日子，\n值得被永远记住。",
  note: "和你在一起的每一天，\n都是特别的日子 ♡",
};

/** 两位共同编辑的人，卡片上显示小署名 */
export const ANNIVERSARY_AUTHORS: Record<
  AuthorId,
  { name: string; color: string }
> = {
  me: { name: "我", color: "#8ea9bd" },
  her: { name: "她", color: "#c98b78" },
};

/** 标题后面可以选的小符号 */
export const MARKS = ["♡", "🎂", "✨", "🌙", "🍀"] as const;
