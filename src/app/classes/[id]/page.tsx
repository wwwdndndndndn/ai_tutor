"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getClassById } from "@/features/classes/mocks";
import { fetchStudents } from "@/features/students/mocks";
import StudentsTable from "@/features/students/StudentsTable";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 10;

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);

  const { data: cls } = useQuery({ queryKey: ["class", id], queryFn: () => getClassById(id) });
  const { data, isLoading, isError } = useQuery({
    queryKey: ["students", { classId: id, page, pageSize: PAGE_SIZE }],
    queryFn: () => fetchStudents({ classId: id, page, pageSize: PAGE_SIZE }),
  });

  const rows = useMemo(() => (data?.items ?? []).map((s) => ({ ...s, className: cls?.name ?? id })), [data?.items, cls?.name, id]);
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / (data?.pageSize ?? PAGE_SIZE)));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">班级：{cls?.name ?? id}</h1>
          <p className="text-sm text-muted-foreground">ID：{id} · 创建时间：{cls?.createdAt ? new Date(cls.createdAt).toLocaleString() : '-'}</p>
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">加载中…</p>}
      {isError && <p className="text-destructive">加载失败</p>}

      <StudentsTable data={rows} onDelete={() => {}} />

      <div className="flex items-center justify-between pt-2">
        <p className="text-sm text-muted-foreground">共{total} 条 · 第 {data?.page ?? page}/{pageCount}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>上一页</Button>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page >= pageCount}>下一页</Button>
        </div>
      </div>
    </div>
  );
}

