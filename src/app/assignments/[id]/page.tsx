"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

import SubmissionsTable from "@/features/submissions/SubmissionsTable";
import { fetchSubmissions, ensureAssignmentSubmissions, startGradeJob, fetchJob } from "@/features/submissions/mocks";
import { getAssignmentById } from "@/features/assignments/mocks";

const PAGE_SIZE = 10;

export default function AssignmentDetailPage() {
  const params = useParams<{ id: string }>();
  const assignmentId = params.id;
  const qc = useQueryClient();

  // 1) 作业详情
  const { data: assignment } = useQuery({
    queryKey: ["assignment", assignmentId],
    queryFn: () => getAssignmentById(assignmentId),
  });

  // 2) 初始化提交（只做一次）
  useEffect(() => {
    if (assignment) ensureAssignmentSubmissions(assignmentId, assignment.classId);
  }, [assignment, assignmentId]);

  // 列表筛选
  const [status, setStatus] = useState<"all"|"submitted"|"pending"|"graded">("all");
  const [kw, setKw] = useState("");
  const [page, setPage] = useState(1);

  const q = { assignmentId, status, keyword: kw, page, pageSize: PAGE_SIZE };
  const { data, isLoading, isError } = useQuery({
    queryKey: ["submissions", q],
    queryFn: () => fetchSubmissions(q),
    enabled: !!assignment,
  });

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / (data?.pageSize ?? PAGE_SIZE)));

  // 导出：全部
  const exportAllCsv = () => {
    const rows = (items ?? []).map(x => [x.name, x.email, x.status, x.score ?? "", x.submittedAt ?? ""]);
    const header = ["学生","邮箱","状态","分数","提交时间"];
    downloadCsv(`作业-${assignment?.title ?? assignmentId}-提交.csv`, [header, ...rows]);
  };
  // 导出：仅已批改
  const exportGradedCsv = () => {
    const graded = (items ?? []).filter(x => x.status === "graded");
    const rows = graded.map(x => [x.name, x.email, x.score ?? "", x.submittedAt ?? ""]);
    const header = ["学生","邮箱","分数","提交时间"];
    downloadCsv(`作业-${assignment?.title ?? assignmentId}-已批改.csv`, [header, ...rows]);
  };

  // 3) 批改 Job
  const [onlyUngraded, setOnlyUngraded] = useState(true);
  const [jobId, setJobId] = useState<string | null>(null);

  const onStartGrade = async (opts: { onlyUngraded: boolean }) => {
    const ret = await startGradeJob(assignmentId, { onlyUngraded: opts.onlyUngraded });
    setJobId(ret.jobId);
    toast.success(opts.onlyUngraded ? "已开始批改（仅未批改）" : "已开始重新批改（覆盖分数）");
  };

  // 轮询进度
  const { data: job } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => fetchJob(jobId as string),
    enabled: !!jobId,
    refetchInterval: (q) => {
      const j = q.state.data as any;
      return j && j.status === "done" ? false : 1200; // 1.2s
    },
  });

  useEffect(() => {
    if (job && job.status === "done") {
      toast.success("批改完成");
      setJobId(null);
      qc.invalidateQueries({ queryKey: ["submissions"] });
    }
  }, [job, qc]);

  const jobRunning = !!jobId && job?.status !== "done";

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">作业：{assignment?.title ?? assignmentId}</h1>
          <p className="text-sm text-muted-foreground">
            班级：{assignment?.classId}　状态：{assignment?.status === "published" ? "已发布" : "草稿"}　
            截止：{assignment?.dueAt ? new Date(assignment.dueAt).toLocaleString() : "-"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox id="onlyU" checked={onlyUngraded} onCheckedChange={(v) => setOnlyUngraded(Boolean(v))} />
            <label htmlFor="onlyU" className="text-sm">仅批改未批改</label>
          </div>

          <Button variant="outline" onClick={exportAllCsv}>导出 CSV</Button>
          <Button variant="outline" onClick={exportGradedCsv}>导出已批改</Button>

          <Button disabled={jobRunning} onClick={() => onStartGrade({ onlyUngraded })}>开始批改</Button>
          <Button disabled={jobRunning} variant="secondary" onClick={() => onStartGrade({ onlyUngraded: false })}>
            重新批改（覆盖）
          </Button>
        </div>
      </div>

      {jobId && (
        <div className="rounded-md border p-3">
          <p className="mb-2 font-medium">批改进行中…</p>
          <ProgressBar processed={job?.processed ?? 0} total={job?.total ?? 0} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={(v: any) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="状态筛选" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="submitted">已提交</SelectItem>
            <SelectItem value="graded">已批改</SelectItem>
            <SelectItem value="pending">待提交</SelectItem>
          </SelectContent>
        </Select>
        <Input className="w-64" placeholder="搜索学生或邮箱" value={kw} onChange={e => { setKw(e.target.value); setPage(1); }} />
      </div>

      {isLoading && <p className="text-muted-foreground">加载中…</p>}
      {isError && <p className="text-destructive">加载失败</p>}

      {items.length > 0
        ? (
          <>
            <SubmissionsTable data={items} />
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">共{total} 条 • 第 {page}/{pageCount}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>上一页</Button>
                <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))}>下一页</Button>
              </div>
            </div>
          </>
        )
        : (!isLoading && <div className="rounded-lg border p-8 text-center text-muted-foreground">暂无数据</div>)
      }
    </div>
  );
}

// 工具：生成并下载 CSV
function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// 简易进度条
function ProgressBar({ processed, total }: { processed: number; total: number }) {
  const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
  return (
    <div className="h-2 w-full rounded bg-muted">
      <div className="h-2 rounded bg-primary" style={{ width: `${percent}%` }} />
      <p className="mt-2 text-xs text-muted-foreground">{processed}/{total}（{percent}%）</p>
    </div>
  );
}

