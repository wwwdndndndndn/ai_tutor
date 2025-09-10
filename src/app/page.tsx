"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ApiStatusBadge from "@/components/ApiStatusBadge";
import { fetchAssignments } from "@/features/assignments/mocks";
import { fetchStudents } from "@/features/students/mocks";
import { fetchClasses } from "@/features/classes/mocks";
import { computeMetrics } from "@/features/analytics/compute";

export default function Home() {
  const modules = [
    { href: "/classes", title: "班级管理", desc: "维护班级与基本信息" },
    { href: "/students", title: "学生管理", desc: "导入/维护学生数据" },
    { href: "/assignments", title: "作业管理", desc: "创建、发布与批改作业" },
    { href: "/analytics", title: "数据管理", desc: "查看成绩与提交统计" },
  ];

  // 班级映射，供展示名称
  const { data: classes } = useQuery({
    queryKey: ["classes-all"],
    queryFn: async () => {
      const d = await fetchClasses({ keyword: "", page: 1, pageSize: 9999 });
      return d.items as Array<{ id: string; name: string }>;
    },
    staleTime: 5 * 60 * 1000,
  });
  const classMap = useMemo(() => {
    const m = new Map<string, string>();
    (classes ?? []).forEach((c) => m.set(c.id, c.name));
    return m;
  }, [classes]);

  // 最近作业（按创建时间倒序，取 5 条）
  const { data: recentAssignments } = useQuery({
    queryKey: ["assignments", { page: 1, pageSize: 5 }],
    queryFn: () => fetchAssignments({ page: 1, pageSize: 5, keyword: "" }),
  });

  // 最近学生（按导入/加入时间倒序，取 5 条）
  const { data: recentStudents } = useQuery({
    queryKey: ["students", { page: 1, pageSize: 5 }],
    queryFn: () => fetchStudents({ page: 1, pageSize: 5 }),
  });

  // 数据概览（使用现有 computeMetrics）
  const metrics = computeMetrics({});

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Tutor 控制台</h1>
          <p className="text-sm text-muted-foreground">请选择左侧模块，或从下方快捷入口进入</p>
        </div>
        <div className="flex items-center gap-2">
          <ApiStatusBadge />
          <Link href="/settings/api"><Button variant="outline" size="sm">API 设置</Button></Link>
        </div>
      </div>

      {/* 快捷功能模块卡片 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {modules.map((m) => (
          <Link key={m.href} href={m.href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary">
              <div className="p-4">
                <h3 className="text-lg font-semibold">{m.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
                <Button className="mt-4" size="sm" variant="outline">进入</Button>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* 数据概览 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Stat label="学生数" value={metrics.totals.students} />
        <Stat label="班级数" value={metrics.totals.classes} />
        <Stat label="作业数" value={metrics.totals.assignments} />
        <Stat label="已批改份数" value={metrics.totals.graded} />
        <Stat label="平均分" value={metrics.totals.avgScore ?? "-"} />
      </div>

      {/* 最近数据 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="p-4">
            <h3 className="mb-2 text-lg font-semibold">最近作业</h3>
            <ul className="divide-y">
              {(recentAssignments?.items ?? []).map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2">
                  <div>
                    <Link href={`/assignments/${a.id}`} className="text-primary hover:underline">
                      {a.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      班级：{classMap.get(a.classId) ?? a.classId} · 截止：{new Date(a.dueAt).toLocaleDateString()} · {a.status === "published" ? "已发布" : "草稿"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>
                </li>
              ))}
              {(recentAssignments?.items?.length ?? 0) === 0 && (
                <li className="py-6 text-center text-sm text-muted-foreground">暂无数据</li>
              )}
            </ul>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <h3 className="mb-2 text-lg font-semibold">最近学生</h3>
            <ul className="divide-y">
              {(recentStudents?.items ?? []).map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2">
                  <div>
                    <span className="font-medium">{s.name}</span>
                    <p className="text-xs text-muted-foreground">{s.email} · {classMap.get(s.classId) ?? s.classId}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(s.joinedAt).toLocaleDateString()}</span>
                </li>
              ))}
              {(recentStudents?.items?.length ?? 0) === 0 && (
                <li className="py-6 text-center text-sm text-muted-foreground">暂无数据</li>
              )}
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <div className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </div>
    </Card>
  );
}
