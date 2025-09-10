// src/app/assignments/new/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

import { fetchClasses } from "@/features/classes/mocks"; // 班级 mock
import { createAssignment } from "@/features/assignments/mocks"; // assignments 本地模拟 API

type MiniClass = { id: string; name: string };

export default function NewAssignmentPage() {
  const router = useRouter();

  // 1) 班级下拉
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["classes", "mini"],
    queryFn: async (): Promise<MiniClass[]> => {
      const list = await fetchClasses({ keyword: "", page: 1, pageSize: 9999 });
      return list.items?.map((c: any) => ({ id: c.id, name: c.name })) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // 2) 表单状态
  const [title, setTitle] = React.useState("");
  const [classId, setClassId] = React.useState<string>();
  const [due, setDue] = React.useState<string>("");        // YYYY-MM-DD
  const [content, setContent] = React.useState("");
  const [knowledge, setKnowledge] = React.useState("");

  // 默认把截止时间设为 +7 天，避免“过期不能发布”
  React.useEffect(() => {
    const iso = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
    setDue(iso);
  }, []);

  async function onSubmit() {
    if (!title.trim()) return toast.error("请输入作业标题");
    if (!classId) return toast.error("请选择班级");
    if (!due) return toast.error("请选择截止日期");

    const dueAt = new Date(due).toISOString();
    try {
      await createAssignment({ title: title.trim(), classId, dueAt, content, knowledge: knowledge.trim() || undefined });
      toast.success("已创建（草稿）");
      router.push("/assignments");
    } catch (e: any) {
      toast.error(e?.message ?? "创建失败");
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">创建新作业</h1>

      {/* 标题 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">作业标题</label>
        <Input
          placeholder="例如：作业 1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* 班级选择 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">班级</label>
        <Select value={classId} onValueChange={setClassId} disabled={isLoading}>
          <SelectTrigger>
            <SelectValue placeholder={isLoading ? "加载中.." : "请选择班级"} />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 截止日期（原生日期选择器） */}
      <div className="space-y-2">
        <label className="text-sm font-medium">截止时间</label>
        <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        <p className="text-xs text-muted-foreground">发布前请确保未过期，否则无法发布。</p>
      </div>

      {/* 作业内容/要求 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">作业内容（可选）</label>
        <Textarea
          placeholder="可粘贴题干、要求或外链"
          rows={6}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      {/* 知识点 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">知识点（可选）</label>
        <Input
          placeholder="例如：一元二次方程、指针、二叉树遍历"
          value={knowledge}
          onChange={(e) => setKnowledge(e.target.value)}
        />
      </div>

      <div className="pt-2">
        <Button onClick={onSubmit}>创建作业</Button>
      </div>
    </div>
  );
}
