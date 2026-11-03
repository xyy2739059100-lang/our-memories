"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: "/",
    label: "首页",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[19px] w-[19px]"
      >
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
        <path d="M10 21v-6h4v6" />
      </svg>
    ),
  },
  {
    href: "/journal",
    label: "手账",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[19px] w-[19px]"
      >
        <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v18H5.5A1.5 1.5 0 0 0 4 22.5z" />
        <path d="M4 19.5A1.5 1.5 0 0 1 5.5 18H19" />
        <path d="M8 7h6M8 11h6" />
      </svg>
    ),
  },
  {
    href: "/map",
    label: "旅行地图",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[19px] w-[19px]"
      >
        <path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
  },
  {
    href: "/anniversary",
    label: "纪念日",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[19px] w-[19px]"
      >
        <path d="M12 20.5s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 5.5c-2.5 4.5-9.5 9-9.5 9z" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  // 登录页是"门外"，不挂底部导航
  if (pathname === "/login") return null;

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] sm:pb-5">
      <div
        className="pointer-events-auto flex w-full max-w-[520px] items-stretch gap-0.5 rounded-[26px] border p-1.5"
        style={{
          backgroundColor: "rgba(255, 253, 247, 0.82)",
          borderColor: "rgba(226, 205, 167, 0.65)",
          boxShadow:
            "0 12px 32px rgba(120, 95, 60, 0.13), 0 2px 6px rgba(120, 95, 60, 0.06)",
          backdropFilter: "blur(18px) saturate(1.4)",
        }}
      >
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className="group relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-[3px] rounded-[20px] transition-colors"
            >
              {/* 选中态：图标后面一块很淡的暖金胶囊 */}
              <span
                aria-hidden="true"
                className={`absolute left-1/2 top-[7px] h-[30px] w-[52px] -translate-x-1/2 rounded-full transition-all duration-300 ${
                  isActive
                    ? "bg-[#e8b84a]/14 opacity-100"
                    : "bg-transparent opacity-0"
                }`}
              />
              <span
                className={`relative transition-colors duration-200 ${
                  isActive
                    ? "text-[#b98c37]"
                    : "text-[#a3937c] group-hover:text-[#7b6444]"
                }`}
              >
                {item.icon}
              </span>
              <span
                className={`relative text-[11px] tracking-[0.08em] transition-colors duration-200 sm:text-[11.5px] ${
                  isActive ? "text-[#5c4a3a]" : "text-[#8b7d6b]"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
