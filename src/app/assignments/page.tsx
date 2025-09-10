"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

import { fetchAssignments } from "@/features/assignments/mocks";
import { startGradeJob } from "@/features/submissions/mocks";
import { fetchClasses } from "@/features/classes/mocks";
import AssignmentsTable from "@/features/assignments/AssignmentsTable";

const PAGE_SIZE = 10;

export default function AssignmentsPage() {
  const [classId, setClassId] = useState<string | undefined>(undefined);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  // 班级列表（下拉）
  const { data: classList } = useQuery({
    queryKey: ["classes-all"],
    queryFn: async () => {
      const d = await fetchClasses({ keyword: "", page: 1, pageSize: 9999 });
      return d.items;
    },
    staleTime: 5 * 60 * 1000,
  });

  // 作业列表
  const params = { classId, keyword, page, pageSize: PAGE_SIZE };
  const { data, isLoading, isError } = useQuery({
    queryKey: ["assignments", params],
    queryFn: () => fetchAssignments(params),
  });

  const dataWithClassName = useMemo(() => {
    const map = new Map<string, string>();
    (classList ?? []).forEach(c => map.set(c.id, c.name));
    return (data?.items ?? []).map(a => ({
      ...a,
      className: map.get(a.classId) ?? a.classId,
    }));
  }, [data?.items, classList]);

  // 导出 CSV
  const exportCsv = () => {
    const rows = (dataWithClassName ?? []).map(x => [
      x.title,
      x.className,
      x.status,
      x.dueAt,
      x.createdAt,
    ]);
    const header = ["标题", "班级", "状态", "截止时间", "创建时间"];
    const csv = [header, ...rows]
      .map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "assignments.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / (data?.pageSize ?? PAGE_SIZE)));

  const [selected, setSelected] = useState<string[]>([]);

  const exportSelectedFeedback = async () => {
    const SUB_KEY = (aid: string) => `aitutor.submissions.${aid}`;
    const rows: string[][] = [];
    for (const id of selected) {
      try {
        const subs = JSON.parse(localStorage.getItem(SUB_KEY(id)) ?? '[]');
        const graded = subs.filter((s: any) => s.status === 'graded' && typeof s.score === 'number');
        const avg = graded.length ? Math.round((graded.reduce((a: number, b: any) => a + b.score, 0) / graded.length) * 10) / 10 : '';
        const submitted = subs.filter((s: any) => s.status === 'submitted').length;
        const pending = subs.filter((s: any) => s.status === 'pending').length;
        rows.push([id, String(avg), String(graded.length), String(submitted), String(pending)]);
      } catch {}
    }
    const header = ["AssignmentID", "AvgScore", "Graded", "Submitted", "Pending"];
    const csv = [header, ...rows].map(r => r.join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'assignments_feedback.csv'; a.click(); URL.revokeObjectURL(a.href);
  };

  const exportSelectedStats = async () => {
    // 这里与反馈报告类似，输出状态统计作为示例
    await exportSelectedFeedback();
  };

  const batchGrade = async () => {
    for (const id of selected) {
      await startGradeJob(id, { onlyUngraded: false });
    }
    toast.success(`已触发 ${selected.length} 个作业的批改`);
  };

  return (
    <div className="p-6 space-y-4">
      {/* 顶部工具栏 */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 按班级筛选 */}
        <Select
          value={classId ?? "ALL"}
          onValueChange={v => {
            setClassId(v === "ALL" ? undefined : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="按班级筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部班级</SelectItem>
            {(classList ?? []).map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 搜索 */}
      <Input
          className="w-64"
          placeholder="搜索作业标题"
          value={keyword}
          onChange={e => {
            setKeyword(e.target.value);
            setPage(1);
          }}
        />

        {/* 导出 */}
        <Button variant="outline" onClick={exportCsv}>导出 CSV</Button>

        {/* 跳转到新建作业页 */}
        <Link href="/assignments/new">
          <Button>新建作业</Button>
        </Link>
      </div>

      {/* 表格区域 */}
      {isLoading && <p className="text-muted-foreground">加载中…</p>}
      {isError && <p className="text-destructive">加载失败</p>}

      {dataWithClassName.length > 0 ? (
        <>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">已选 {selected.length} 项</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={batchGrade} disabled={selected.length === 0}>批量批改</Button>
              <Button variant="outline" size="sm" onClick={exportSelectedFeedback} disabled={selected.length === 0}>生成反馈报告</Button>
              <Button variant="outline" size="sm" onClick={exportSelectedStats} disabled={selected.length === 0}>生成统计分析</Button>
            </div>
          </div>
          <AssignmentsTable data={dataWithClassName} selectable onSelectionChange={setSelected} />
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              共{total} 条 • 第 {data?.page ?? page}/{pageCount}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>上一页</Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => (data && p * (data.pageSize) < data.total ? p + 1 : p))}
                disabled={!data || page * (data.pageSize) >= data.total}
              >
                下一页
              </Button>
            </div>
          </div>
        </>
      ) : (
        !isLoading && <div className="rounded-lg border p-8 text-center text-muted-foreground">暂无作业，点击“新建作业”添加。</div>
      )}
    </div>
  );
}
