import type { Metadata } from "next";
import { Noto_Serif_SC, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/layout/BottomNav";

const notoSansSC = Noto_Sans_SC({
  variable: "--font-sans-cn",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const notoSansSerif = Noto_Serif_SC({
  variable: "--font-serif-cn",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Our Memories — 我们的回忆",
  description: "属于两个人的私人回忆空间，记录日常、照片、旅行与纪念日。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${notoSansSC.variable} ${notoSansSerif.variable} h-full antialiased`}
    >
      <body className="paper-texture flex min-h-full flex-col font-sans text-brown">
        <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+7rem)]">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
