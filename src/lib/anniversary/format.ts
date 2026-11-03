/**
 * 纪念日的日期计算与展示：
 * - 卡片上显示 2023.08.18 这种点分写法
 * - 已经过去的显示「已过去 X 天」，还没到的显示「还有 X 天」
 */

const DAY = 24 * 60 * 60 * 1000;

/** 把 YYYY-MM-DD 解析成 UTC 零点，避免时区把天数算歪 */
function toUtcDay(date: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const [, y, m, d] = match;
  const stamp = Date.UTC(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(stamp) ? null : stamp;
}

export function todayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, "0");
  const d = `${now.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysFromToday(offset: number): string {
  const now = new Date();
  const stamp = Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ) + offset * DAY;
  const date = new Date(stamp);
  return `${date.getUTCFullYear()}-${`${date.getUTCMonth() + 1}`.padStart(2, "0")}-${`${date.getUTCDate()}`.padStart(2, "0")}`;
}

/** 2023-08-18 → 2023.08.18 */
export function formatDate(date: string): string {
  return date.replace(/-/g, ".");
}

export interface EventTiming {
  /** upcoming 还没发生，past 已经过去了，unknown 日期写错了 */
  state: "upcoming" | "past" | "unknown";
  /** 天数，永远是正数 */
  days: number;
  label: string;
}

export function timingOf(
  date: string,
  today: string | null,
): EventTiming {
  const a = toUtcDay(date);
  // 预渲染阶段拿不到「今天」，先按未知处理，挂载后再算
  const b = today ? toUtcDay(today) : null;
  if (a === null || b === null) {
    return { state: "unknown", days: 0, label: "日期待定" };
  }
  const diff = Math.round((b - a) / DAY);
  if (diff === 0) return { state: "upcoming", days: 0, label: "就是今天" };
  if (diff > 0) return { state: "past", days: diff, label: `已过去 ${diff} 天` };
  return { state: "upcoming", days: -diff, label: `还有 ${-diff} 天` };
}

/** 时间轴按时间倒序（最近的排在上面），未来的那天浮到最前面 */
export function sortEvents<T extends { date: string }>(events: T[]): T[] {
  return events
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));
}
