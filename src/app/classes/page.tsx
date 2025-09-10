"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchClasses, createClass, deleteClass, importClassesCsv } from "@/features/classes/mocks";
import { ClassesQuery } from "@/features/classes/types";
import ClassesTable from "@/features/classes/ClassesTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { toast } from "sonner";

const PAGE_SIZE = 10;

export default function ClassesPage() {
  const qc = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [newName, setNewName] = useState("");
  const [open, setOpen] = useState(false);

  const params: ClassesQuery = { keyword, page, pageSize: PAGE_SIZE };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["classes", params],
    queryFn: () => fetchClasses(params),
    staleTime: 0,
  });

  const onCreate = async () => {
    const name = newName.trim();
    if (!name) return toast.error("班级名称不能为空");

    try {
      await createClass(name);
      setPage(1);
      await qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "classes" });
      setNewName("");
      setOpen(false);
      toast.success("已创建");
    } catch (e) {
      console.error(e);
      toast.error("创建失败");
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deleteClass(id);
      await qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "classes" });
      toast.success("已删除");
    } catch (e) {
      console.error(e);
      toast.error("删除失败");
    }
  };

  const exportCsv = () => {
    const rows = (data?.items ?? []).map((x) => [x.id, x.name, x.studentsCount, x.assignmentsCount, x.createdAt]);
    const header = ["ID", "Name", "Students", "Assignments", "Created"];
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "classes.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    try {
      const { total, success, failed } = await importClassesCsv(file);
      setPage(1);
      await qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "classes" });
      toast.success(`导入完成：共 ${total} 条，成功 ${success}，失败 ${failed}`);
    } catch (err: any) {
      toast.error(err?.message ?? "导入失败");
    } finally {
      e.currentTarget.value = "";
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="搜索班级名称..."
          value={keyword}
          onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
          className="w-64"
        />
        <Button variant="outline" onClick={exportCsv}>导出 CSV</Button>
        <Button variant="outline" onClick={() => document.getElementById('cls-import')?.click()}>导入文件</Button>
        <input id="cls-import" type="file" accept=".csv" className="hidden" onChange={onImportFile} />

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setOpen(true)}>新建班级</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>新建班级</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input autoFocus placeholder="班级名称" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onCreate()} />
              <div className="flex gap-2">
                <Button onClick={onCreate}>创建</Button>
                <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <p className="text-muted-foreground">加载中…</p>}
      {isError && <p className="text-destructive">加载失败</p>}

      {data && data.items.length > 0 ? (
        <>
          <ClassesTable data={data.items} onDelete={onDelete} />
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">Total {data.total} · Page {data.page}/{Math.max(1, Math.ceil(data.total / data.pageSize))}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => (data && p * data.pageSize < data.total ? p + 1 : p))} disabled={!data || page * data.pageSize >= data.total}>Next</Button>
            </div>
          </div>
        </>
      ) : (!isLoading && <div className="rounded-lg border p-8 text-center text-muted-foreground">暂无数据，请先创建班级</div>)}
    </div>
  );
}

