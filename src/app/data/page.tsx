"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { fetchClasses, importClassesCsv } from "@/features/classes/mocks";
import { fetchStudents, importStudentsFile } from "@/features/students/mocks";
import { fetchAssignments } from "@/features/assignments/mocks";

export default function DataHubPage() {
  const classFile = React.useRef<HTMLInputElement>(null);
  const stuFile = React.useRef<HTMLInputElement>(null);

  const exportClasses = async () => {
    const d = await fetchClasses({ keyword: "", page: 1, pageSize: 9999 });
    const rows = d.items.map((x) => [x.id, x.name, x.studentsCount, x.assignmentsCount, x.createdAt]);
    downloadCsv("classes.csv", [["ID","Name","Students","Assignments","Created"], ...rows]);
  };
  const exportStudents = async () => {
    const d = await fetchStudents({ page: 1, pageSize: 9999 });
    const rows = d.items.map((s) => [s.id, s.name, s.email, (s as any).studentNo ?? "", s.classId, s.joinedAt]);
    downloadCsv("students.csv", [["ID","Name","Email","StudentNo","ClassID","JoinedAt"], ...rows]);
  };
  const exportAssignments = async () => {
    const d = await fetchAssignments({ page: 1, pageSize: 9999 });
    const rows = d.items.map((a) => [a.id, a.title, (a as any).knowledge ?? "", a.status, a.dueAt, a.createdAt]);
    downloadCsv("assignments.csv", [["ID","Title","Knowledge","Status","DueAt","CreatedAt"], ...rows]);
  };

  const generateSamples = async () => {
    // 触发各模块的 seedIfEmpty（这些 fetch 会触发）
    await Promise.all([
      fetchClasses({ keyword: "", page: 1, pageSize: 1 }),
      fetchStudents({ page: 1, pageSize: 1 }),
      fetchAssignments({ page: 1, pageSize: 1 }),
    ]);
    toast.success("已生成/加载示例数据");
  };

  const onImportClasses = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    try {
      const { total, success, failed } = await importClassesCsv(file);
      toast.success(`导入完成：共 ${total}，成功 ${success}，失败 ${failed}`);
    } catch (err) {
      toast.error(err?.message ?? "导入失败");
    } finally {
      e.currentTarget.value = "";
    }
  };
  const onImportStudents = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    try {
      const { total, success, failed } = await importStudentsFile(file);
      toast.success(`导入完成：共 ${total}，成功 ${success}，失败 ${failed}`);
    } catch (err) {
      toast.error(err?.message ?? "导入失败");
    } finally {
      e.currentTarget.value = "";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">数据管理（统一入口）</h1>
      <p className="text-sm text-muted-foreground">提供数据导入、导出、示例生成等操作；并明确各功能的对象（班级/学生/作业）。</p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <div className="p-4 space-y-2">
            <h3 className="font-semibold">班级数据</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportClasses}>导出</Button>
              <Button variant="outline" onClick={() => classFile.current?.click()}>导入 CSV</Button>
              <input ref={classFile} type="file" accept=".csv" className="hidden" onChange={onImportClasses} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4 space-y-2">
            <h3 className="font-semibold">学生数据</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportStudents}>导出</Button>
              <Button variant="outline" onClick={() => stuFile.current?.click()}>导入 CSV/Excel</Button>
              <input ref={stuFile} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onImportStudents} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4 space-y-2">
            <h3 className="font-semibold">作业数据</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportAssignments}>导出</Button>
              <Button onClick={generateSamples}>生成示例数据</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((v) => String(v)).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
