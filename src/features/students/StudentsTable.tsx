"use client";

import React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export type StudentRow = {
  id: string;
  name: string;
  email: string;
  classId: string;
  className?: string;
  studentNo?: string;
  score?: number;
  joinedAt?: string;
};

export type StudentsTableProps = {
  data: StudentRow[];
  onDelete(id: string): void;
};

export default function StudentsTable({ data, onDelete }: StudentsTableProps) {
  const columns = React.useMemo<ColumnDef<StudentRow>[]>(
    () => [
      { header: "ID", accessorKey: "id", size: 180 },
      { header: "姓名", accessorKey: "name" },
      { header: "邮箱", accessorKey: "email" },
      { header: "学号", accessorKey: "studentNo" },
      { header: "班级", accessorKey: "className" },
      {
        header: "创建时间",
        accessorKey: "joinedAt",
        cell: ({ getValue }) => {
          const v = getValue<string>();
          return v ? new Date(v).toLocaleDateString("zh-CN") : "-";
        },
      },
      {
        header: "操作",
        cell: ({ row }) => (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">删除</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除该学生？</AlertDialogTitle>
                <AlertDialogDescription>
                  此操作不可恢复。确定要删除「{row.original.name}」吗？
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex justify-end gap-2">
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(row.original.id)}>
                  确认删除
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        ),
      },
    ],
    [onDelete]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id} className="px-3 py-2 font-medium">
                  {h.isPlaceholder
                    ? null
                    : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((r) => (
            <tr key={r.id} className="border-t">
              {r.getVisibleCells().map((c) => (
                <td key={c.id} className="px-3 py-2">
                  {flexRender(c.column.columnDef.cell, c.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
