"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { computeMetrics } from "@/features/analytics/compute";
import { fetchClasses } from "@/features/classes/mocks";
import { fetchAssignments } from "@/features/assignments/mocks";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Legend, CartesianGrid, LineChart, Line,
} from "recharts";

// 读取主题颜色（适配深浅色）
function token(name: string, fallback = "#64748b") {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
const COLORS = [
  token("--chart-1", "#60a5fa"),
  token("--chart-2", "#34d399"),
  token("--chart-3", "#fbbf24"),
  token("--chart-4", "#fb7185"),
  token("--chart-5", "#a78bfa"),
];
const FG = token("--foreground", "#0f172a");
const MUTED = token("--muted-foreground", "#94a3b8");

export default function AnalyticsPage() {
  const [classId, setClassId] = useState<string | undefined>(undefined);
  const [assignmentId, setAssignmentId] = useState<string | undefined>("__ALL__");

  // 班级列表
  const { data: classList } = useQuery({
    queryKey: ["classes-all"],
    queryFn: async () => {
      const d = await fetchClasses({ keyword: "", page: 1, pageSize: 9999 });
      return d.items as Array<{ id: string; name: string }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  // 当前班级下的作业列表（用于“作业选择器”）
  const { data: assignmentList } = useQuery({
    queryKey: ["assignments-for-class", classId ?? "ALL"],
    queryFn: async () => {
      const d = await fetchAssignments({
        classId: classId ?? undefined,
        keyword: "",
        page: 1,
        pageSize: 9999,
      });
      return d.items as Array<{ id: string; title: string }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const metrics = useMemo(
    () => computeMetrics({ classId, assignmentId }),
    [classId, assignmentId]
  );

  const className = useMemo(() => {
    if (!classId) return "全部班级";
    const f = (classList ?? []).find((x) => x.id === classId);
    return f?.name ?? classId;
  }, [classId, classList]);

  const showAllAssignments = !assignmentId || assignmentId === "__ALL__";

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">数据分析</h1>
        <div className="flex gap-2">
          <Select
            value={classId ?? "ALL"}
            onValueChange={(v) => {
              setClassId(v === "ALL" ? undefined : v);
              setAssignmentId("__ALL__");
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="按班级筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部班级</SelectItem>
              {(classList ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={assignmentId ?? "__ALL__"}
            onValueChange={(v) => setAssignmentId(v)}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="按作业筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">全部作业（{className}）</SelectItem>
              {(assignmentList ?? []).map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 总览卡片 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="学生数" value={metrics.totals.students} />
        <StatCard label="班级数" value={metrics.totals.classes} />
        <StatCard label="作业数" value={metrics.totals.assignments} />
        <StatCard label="已批改份数" value={metrics.totals.graded} />
        <StatCard label="平均分" value={metrics.totals.avgScore ?? "-"} />
      </div>

      {/* 主图区域 */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* 左：成绩分布（选作业时是该作业的直方图；未选作业时显示“各作业平均分”） */}
        <div className="rounded-lg border p-4">
          <h2 className="mb-3 font-semibold">
            {showAllAssignments ? "各作业平均分" : `成绩分布（${className}）`}
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              {showAllAssignments ? (
                <BarChart data={metrics.avgByAssignment} margin={{ top: 12, right: 12, left: 12, bottom: 12 }}>
                  <CartesianGrid stroke={MUTED} strokeDasharray="3 3" />
                  <XAxis dataKey="title" tick={{ fill: FG }} />
                  <YAxis domain={[0, 100]} tick={{ fill: FG }} />
                  <Tooltip contentStyle={{ color: FG }} />
                  <Bar dataKey="avg" radius={[6, 6, 0, 0]} fill={COLORS[0]} />
                </BarChart>
              ) : (
                <BarChart data={metrics.gradeBuckets} margin={{ top: 12, right: 12, left: 12, bottom: 12 }}>
                  <CartesianGrid stroke={MUTED} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: FG }} />
                  <YAxis allowDecimals={false} tick={{ fill: FG }} />
                  <Tooltip contentStyle={{ color: FG }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} fill={COLORS[0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* 右：提交状态（全部作业汇总 / 单作业） */}
        <div className="rounded-lg border p-4">
          <h2 className="mb-3 font-semibold">提交状态</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              {showAllAssignments ? (
                <BarChart data={metrics.statusByAssignment} margin={{ top: 12, right: 12, left: 12, bottom: 12 }}>
                  <CartesianGrid stroke={MUTED} strokeDasharray="3 3" />
                  <XAxis dataKey="title" tick={{ fill: FG }} />
                  <YAxis allowDecimals={false} tick={{ fill: FG }} />
                  <Tooltip contentStyle={{ color: FG }} />
                  <Legend />
                  <Bar dataKey="graded" fill={COLORS[2]} />
                  <Bar dataKey="submitted" fill={COLORS[1]} />
                  <Bar dataKey="pending" fill={COLORS[3]} />
                </BarChart>
              ) : (
                <PieChart>
                  <Tooltip contentStyle={{ color: FG }} />
                  <Legend />
                  <Pie
                    dataKey="value"
                    data={[
                      { name: "已批改", value: metrics.statusCounts.find((x) => x.name === "已批改")?.value ?? 0 },
                      { name: "已提交", value: metrics.statusCounts.find((x) => x.name === "已提交")?.value ?? 0 },
                      { name: "待提交", value: metrics.statusCounts.find((x) => x.name === "待提交")?.value ?? 0 },
                    ]}
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill={COLORS[0]}
                  >
                  </Pie>
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* 各班级平均分（即便选了具体作业，也展示该作业在不同班级的差异） */}
        <div className="rounded-lg border p-4 xl:col-span-2">
          <h2 className="mb-3 font-semibold">各班级平均分</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.avgByClass.map((x) => ({ name: x.className, avg: x.avg ?? 0 }))} margin={{ top: 12, right: 12, left: 12, bottom: 12 }}>
                <CartesianGrid stroke={MUTED} strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fill: FG }} />
                <YAxis domain={[0, 100]} tick={{ fill: FG }} />
                <Tooltip contentStyle={{ color: FG }} />
                <Bar dataKey="avg" radius={[6, 6, 0, 0]} fill={COLORS[4]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 示例趋势（使用平均分或桶计数拼的序列） */}
        <div className="rounded-lg border p-4 xl:col-span-2">
          <h2 className="mb-3 font-semibold">批改量趋势（示例）</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={toTrend(metrics.gradeBuckets)} margin={{ top: 12, right: 12, left: 12, bottom: 12 }}>
                <CartesianGrid stroke={MUTED} strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fill: FG }} />
                <YAxis allowDecimals={false} tick={{ fill: FG }} />
                <Tooltip contentStyle={{ color: FG }} />
                <Line type="monotone" dataKey="value" stroke={COLORS[0]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function toTrend(buckets: { label: string; count: number }[]) {
  return buckets.map((b) => ({ name: b.label, value: b.count }));
}

