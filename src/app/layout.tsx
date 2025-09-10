import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ReactQueryProvider from "@/providers/react-query-provider";
import AppShell from "@/components/layout/app-shell"; // 👈 新增
import { Toaster } from "sonner"; // 👈 新增


const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Tutor",
  description: "Demo app",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ReactQueryProvider>
          <AppShell>{children}</AppShell>
          {/* 👇 全局通知容器；system 会自动跟随系统深浅色 */}
          <Toaster position="top-right" theme="system" richColors closeButton />
        </ReactQueryProvider>
      </body>
    </html>
  );
}
