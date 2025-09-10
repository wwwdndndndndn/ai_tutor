"use client";

import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export default function AppSidebar() {
  const items = [
    { href: "/classes", label: "班级管理" },
    { href: "/students", label: "学生管理" },
    { href: "/assignments", label: "作业管理" },
    { href: "/analytics", label: "数据分析" },
    { href: "/data", label: "数据管理" },
    { href: "/settings/api", label: "设置" },
  ];

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:bg-background">
      <div className="p-4 text-base font-semibold">功能模块</div>
      <Separator />
      <nav className="flex-1 p-3">
        <ul className="flex flex-col gap-1">
          {items.map((it) => (
            <li key={it.href}>
              <Link
                href={it.href}
                className="block rounded px-3 py-2 text-sm hover:bg-muted"
              >
                {it.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-3 text-xs text-muted-foreground">v0.1.0</div>
    </aside>
  );
}
