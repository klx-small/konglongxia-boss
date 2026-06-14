import type { Metadata, Viewport } from "next";
import "./globals.css";

import { BottomNav } from "@/components/bottom-nav";
import { FeedbackLink } from "@/components/feedback/FeedbackLink";

export const metadata: Metadata = {
  title: "恐龙侠打BOSS",
  description: "面向中文大学生的 AI 课表排程 + 打怪式学习计划工具"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#13795b"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="min-h-dvh">
          <main className="mx-auto w-full max-w-md px-4 pb-24 pt-4 md:max-w-5xl md:px-6 md:pb-10">
            {children}
          </main>
          <FeedbackLink />
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
