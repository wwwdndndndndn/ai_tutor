"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  fetchStudents,
  createStudent,
  deleteStudent,
  importStudentsFile,
} from "@/features/students/mocks";
import { StudentsQuery } from "@/features/students/mocks"; // 如果你有独立 types，改成你的路径
import StudentsTable, {
  StudentRow,
} from "@/features/students/StudentsTable";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { fetchClasses } from "@/features/classes/mocks";

const PAGE_SIZE = 10;

export default function StudentsPage() {
  const sp = useSearchParams();
  const initClassId = sp.get("classId") || undefined;

  const qc = useQueryClient();
  const [classId, setClassId] = useState<string | undefined>(initClassId);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);

  // 表单状态
  const [fClassId, setFClassId] = useState<string | undefined>(undefined);
  const [fName, setFName] = useState("");
  const [fEmail, setFEmail] = useState("");

  // 隐藏文件 input
  const fileRef = useRef<HTMLInputElement>(null);

  // 班级列表
  const { data: classList } = useQuery({
    queryKey: ["classes-all"],
    queryFn: async () => {
      const d = await fetchClasses({ keyword: "", page: 1, pageSize: 9999 });
      return d.items;
    },
    staleTime: 5 * 60 * 1000,
  });

  // 学生列表
  const params: StudentsQuery = { classId, keyword, page, pageSize: PAGE_SIZE };
  const { data, isLoading, isError } = useQuery({
    queryKey: ["students", params],
    queryFn: () => fetchStudents(params),
  });

  // 将 class 名合并进行展示
  const dataWithClassName: StudentRow[] = useMemo(() => {
    const map = new Map<string, string>();
    (classList ?? []).forEach((c) => map.set(c.id, c.name));
    return (data?.items ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      classId: s.classId,
      className: map.get(s.classId) ?? s.classId,
      studentNo: (s as any).studentNo,
      score: s.score,
      joinedAt: s.joinedAt,
    }));
  }, [data?.items, classList]);

  const resetForm = () => {
    setFClassId(undefined);
    setFName("");
    setFEmail("");
  };

  const onCreate = async () => {
    if (!fClassId) return toast.error("请先选择班级");
    if (!fName.trim()) return toast.error("姓名不能为空");
    if (!fEmail.trim()) return toast.error("邮箱不能为空");
    await createStudent({
      classId: fClassId,
      name: fName.trim(),
      email: fEmail.trim(),
      studentNo: undefined,
    });
    setPage(1);
    await qc.invalidateQueries({
      predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "students",
    });
    toast.success("已创建");
    setOpen(false);
    resetForm();
  };

  const onDelete = async (id: string) => {
    await deleteStudent(id);
    await qc.invalidateQueries({
      predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "students",
    });
    toast.success("已删除");
  };

  // 导入文件（CSV/Excel）
  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget; // 先缓存，避免事件池导致 null
    const file = inputEl.files?.[0];
    if (!file) return;
    try {
      const { total, success, failed } = await importStudentsFile(file);
      toast.success(`导入完成：共 ${total} 条，成功 ${success}，失败 ${failed}`);
      await qc.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "students",
      });
    } catch (err) {
      console.error(err);
      toast.error("导入失败");
    } finally {
      inputEl.value = ""; // 允许再次选择相同文件
    }
  };

  const exportCsv = () => {
    const rows = (dataWithClassName ?? []).map((x) => [
      x.name,
      x.email,
      x.className,
      x.score,
      x.joinedAt,
    ]);
    const header = ["姓名", "邮箱", "班级", "成绩", "加入时间"];
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "学生列表.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* 筛选 */}
        <Select
          value={classId ?? "ALL"}
          onValueChange={(v) => {
            setClassId(v === "ALL" ? undefined : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-56">
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

        {/* 搜索 */}
        <Input
          placeholder="搜索姓名或邮箱..."
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            setPage(1);
          }}
          className="w-64"
        />

        {/* 导出/导入 */}
        <Button variant="outline" onClick={exportCsv}>
          导出 CSV
        </Button>

        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          导入文件
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={onImportFile}
        />

        {/* 创建学生 */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>新建学生</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建学生</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>班级</Label>
                <Select value={fClassId} onValueChange={(v) => setFClassId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择班级" />
                  </SelectTrigger>
                  <SelectContent>
                    {(classList ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>姓名</Label>
                <Input value={fName} onChange={(e) => setFName(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label>邮箱</Label>
                <Input
                  type="email"
                  value={fEmail}
                  onChange={(e) => setFEmail(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={onCreate}>创建</Button>
                <DialogClose asChild>
                  <Button variant="outline">取消</Button>
                </DialogClose>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <p className="text-muted-foreground">加载中…</p>}
      {isError && <p className="text-destructive">加载失败</p>}

      {dataWithClassName.length > 0 ? (
        <>
          <StudentsTable data={dataWithClassName} onDelete={onDelete} />
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              共 {data?.total ?? 0} 条 • 第 {data?.page ?? page}/
              {Math.max(
                1,
                Math.ceil((data?.total ?? 0) / (data?.pageSize ?? PAGE_SIZE))
              )}{" "}
              页
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((p) =>
                    data && p * data.pageSize < data.total ? p + 1 : p
                  )
                }
                disabled={!data || page * data.pageSize >= data.total}
              >
                下一页
              </Button>
            </div>
          </div>
        </>
      ) : (
        !isLoading && (
          <div className="rounded-lg border p-8 text-center text-muted-foreground">
            暂无数据，请先新建学生
          </div>
        )
      )}
    </div>
  );
}
