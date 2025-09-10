"use client";

import * as React from "react";
import Link from "next/link";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ClassItem } from "./types";

export type ClassesTableProps = {
  data: ClassItem[];
  onDelete(id: string): void;
};

const columns: ColumnDef<ClassItem>[] = [
  { header: "ID", accessorKey: "id", size: 180 },
  {
    header: "班级",
    accessorKey: "name",
    // ✅ 注意：只有一层括号（{ row }），并且这个对象在 columns 数组里
    cell: ({ row }) => {
      const item = row.original as ClassItem;
      return (
        <Link href={`/classes/${item.id}`} className="text-primary underline underline-offset-2">
          {item.name}
        </Link>
      );
    },
  },
  { header: "学生数量", accessorKey: "studentsCount" },
  { header: "作业数量", accessorKey: "assignmentsCount" },
  {
    header: "创建时间",
    accessorKey: "createdAt",
    cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString(),
  },
  {
    header: "操作",
    cell: ({ row }) => (
      <Button
        variant="outline"
        size="sm"
        onClick={() => (row.original as any).__onDelete?.()}
      >
        Delete
      </Button>
    ),
  },
];

export default function ClassesTable({ data, onDelete }: ClassesTableProps) {
  // 为每行注入删除回调
  const withAction = React.useMemo(
    () => data.map((d) => ({ ...d, __onDelete: () => onDelete(d.id) })),
    [data, onDelete]
  );

  const table = useReactTable({
    data: withAction,
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
