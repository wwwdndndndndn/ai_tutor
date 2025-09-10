"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import { getAssignmentById } from "@/features/assignments/mocks";
import { getSubmission, updateSubmission, regradeOne } from "@/features/submissions/mocks";

export default function SubmissionDetailPage() {
  const { id: assignmentId, sid } = useParams<{ id: string; sid: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  // 作业信息（标题用）
  const { data: assignment } = useQuery({
    queryKey: ["assignment", assignmentId],
    queryFn: () => getAssignmentById(assignmentId),
  });

  // 提交详情
  const { data: sub, refetch } = useQuery({
    queryKey: ["submission", assignmentId, sid],
    queryFn: () => getSubmission(assignmentId, sid),
  });

  // 本地表单
  const [score, setScore] = useState<number | "">("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (sub) {
      setScore(typeof sub.score === "number" ? sub.score : "");
      setFeedback(sub.feedback ?? "");
    }
  }, [sub]);

  const save = async () => {
    const patch: any = { feedback };
    if (score !== "") {
      const n = Number(score);
      if (Number.isNaN(n)) return toast.error("分数必须是数字");
      patch.score = n;
      patch.status = "graded"; // 保存分数时直接标记已批改
    }
    await updateSubmission(assignmentId, sid, patch);
    toast.success("已保存");
    await refetch();
    await qc.invalidateQueries({ queryKey: ["submissions"] }); // 刷新列表页数据
  };

  const markGraded = async () => {
    await updateSubmission(assignmentId, sid, { status: "graded" });
    toast.success("已标记为已批改");
    await refetch();
    await qc.invalidateQueries({ queryKey: ["submissions"] });
  };

  const regrade = async () => {
    await regradeOne(assignmentId, sid);
    toast.success("已重新批改并更新分数");
    await refetch();
    await qc.invalidateQueries({ queryKey: ["submissions"] });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">提交详情</h1>
          <p className="text-sm text-muted-foreground">作业：{assignment?.title ?? assignmentId}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>返回</Button>
        </div>
      </div>

      {!sub ? (
        <div className="rounded-lg border p-6 text-muted-foreground">未找到该提交</div>
      ) : (
        <>
          {/* 学生信息 */}
          <div className="rounded-lg border p-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div><span className="text-muted-foreground mr-2">学生</span>{sub.name}</div>
            <div><span className="text-muted-foreground mr-2">邮箱</span>{sub.email}</div>
            <div>
              <span className="text-muted-foreground mr-2">状态</span>
              {sub.status === "graded" ? "已批改" : sub.status === "submitted" ? "已提交" : "待提交"}
            </div>
            <div><span className="text-muted-foreground mr-2">提交时间</span>
              {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : "-"}
            </div>
          </div>

          {/* 打分与评语 */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>分数</Label>
              <Input
                inputMode="numeric"
                placeholder="例如：88"
                value={score}
                onChange={e => setScore(e.target.value === "" ? "" : Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">填写数字即可，保存时将自动标记为“已批改”。</p>
            </div>
            <div className="space-y-2">
              <Label>评语</Label>
              <Textarea
                rows={6}
                placeholder="写几句评语给学生…"
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
              />
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={save}>保存</Button>
            <Button variant="outline" onClick={markGraded}>标记为已批改</Button>
            <Button variant="secondary" onClick={regrade}>重新批改（随机分数）</Button>
          </div>
        </>
      )}
    </div>
  );
}

