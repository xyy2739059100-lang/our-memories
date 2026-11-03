import Image from "next/image";
import Link from "next/link";

function LogoMark() {
  return (
    <svg
      viewBox="0 0 56 44"
      className="h-9 w-10 shrink-0 sm:h-10 sm:w-11"
      aria-hidden="true"
    >
      {/* 流星本体 */}
      <path
        d="M14 11.5 L16.8 18.7 L24 21.5 L16.8 24.3 L14 31.5 L11.2 24.3 L4 21.5 L11.2 18.7 Z"
        fill="none"
        stroke="#c9a45e"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="21.5" r="1.7" fill="#c9a45e" />
      {/* 彗尾 */}
      <path
        d="M22 21 C31 19.5 38 16 47 8.5"
        fill="none"
        stroke="#c9a45e"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M24 26 C32 24 38 21 44 15"
        fill="none"
        stroke="#d9bd85"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.75"
      />
    </svg>
  );
}

interface SiteHeaderProps {
  /** 内页用：在品牌标识前加一个回到首页的小箭头 */
  showBack?: boolean;
}

/**
 * 全站统一页头（2026-11 起固定几何）：
 * [固定返回位] [Logo + 文字] [星球头像]
 *
 * - 返回位永远占着位置：没有返回按钮的页面放一个等宽空占位，
 *   这样 Our Memories / ONLY OUR TIME 在 4 个页面的 x 坐标完全一致。
 * - 头像永远贴容器右边缘，不会被同行的分页胶囊挤动。
 * - 容器宽度与内边距由各页面统一用 max-w-[1180px] px-5 sm:px-7 lg:px-8 pt-5。
 */
export default function SiteHeader({ showBack = false }: SiteHeaderProps) {
  return (
    <header className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:gap-3">
      {/* 返回位：没有按钮也占位，保证品牌永远从同一个 x 开始 */}
      <div className="relative h-9 w-9 sm:h-10 sm:w-10">
        {showBack && (
          <Link
            href="/"
            aria-label="回到首页"
            className="tap-expand absolute inset-0 flex items-center justify-center border backdrop-blur transition hover:text-[#7b6444]"
            style={{
              borderRadius: "var(--radius-chip)",
              backgroundColor: "var(--glass-bg-strong)",
              borderColor: "var(--glass-border)",
              boxShadow: "var(--shadow-soft)",
              color: "#a4895f",
            }}
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M12.5 4.5 7 10l5.5 5.5" />
            </svg>
          </Link>
        )}
      </div>

      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <LogoMark />
        <div className="leading-tight">
          <p className="font-serif text-[1.2rem] tracking-[0.02em] text-[#8c6d45] sm:text-2xl">
            Our Memories
          </p>
          <p className="mt-1 text-[9px] tracking-[0.38em] text-[#c1a472] sm:text-[10px]">
            — ONLY OUR TIME —
          </p>
        </div>
      </div>

      <div
        className="relative h-10 w-10 shrink-0 overflow-hidden sm:h-12 sm:w-12"
        style={{
          borderRadius: "var(--radius-chip)",
          border: "0.5px solid var(--glass-border)",
          boxShadow: "var(--shadow-soft)",
        }}
      >
        <Image
          src="/images/avatar/b612-avatar.svg"
          alt="我们的 B612 星球头像"
          fill
          unoptimized
          sizes="48px"
          className="object-cover"
        />
      </div>
    </header>
  );
}
