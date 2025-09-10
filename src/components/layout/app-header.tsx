"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import ApiStatusBadge from "@/components/ApiStatusBadge";

type AppHeaderProps = { onOpenSidebar?: () => void };

export default function AppHeader({ onOpenSidebar }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-3 px-4">
        {/* Mobile: open sidebar */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            {/* 复用 Sidebar（在 Sheet 里展示移动端抽屉） */}
            <AppHeader.MobileSidebar />
          </SheetContent>
        </Sheet>

        <Link href="/" className="font-semibold">AI Tutor</Link>

        {/* 右侧按钮区 */}
        <div className="ml-auto flex items-center gap-2">
          <ApiStatusBadge />
          <ThemeToggle />
          <Link href="/settings/api"><Button variant="outline" size="sm">设置</Button></Link>
        </div>
      </div>
    </header>
  );
}

/** 移动端内嵌侧边栏：供上面 Sheet 使用 */
AppHeader.MobileSidebar = function MobileSidebar() {
  return (
    <nav className="w-64 p-3">
      <SidebarNav />
    </nav>
  );
};

// 共享 SidebarNav（给移动端 Sheet 用；桌面端的真正 Sidebar 也会用到它）
function SidebarNav() {
  const items = [
    { href: "/classes", label: "班级管理" },
    { href: "/students", label: "学生管理" },
    { href: "/assignments", label: "作业管理" },
    { href: "/analytics", label: "数据分析" },
    { href: "/data", label: "数据管理" },
    { href: "/settings/api", label: "设置" },
  ];
  return (
    <ul className="flex flex-col gap-1">
      {items.map((it) => (
        <li key={it.href}>
          <Link href={it.href} className="block rounded px-3 py-2 text-sm hover:bg-muted">
            {it.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
