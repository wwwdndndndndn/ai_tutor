"use client";
import * as React from "react";
import Link from "next/link";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { SubmissionItem } from "./types";

export type SubmissionsTableProps = {
  data: SubmissionItem[];
};

export default function SubmissionsTable({ data }: SubmissionsTableProps) {
  const columns = React.useMemo<ColumnDef<SubmissionItem>[]>(() => [
    {
      header: "学生",
      accessorKey: "name",
      cell: ({ row }) => {
        const it = row.original;
        return (
          <Link
            href={`/assignments/${it.assignmentId}/submissions/${it.id}`}
            className="text-primary underline underline-offset-2"
          >
            {it.name}
          </Link>
        );
      }
    },
    { header: "邮箱", accessorKey: "email" },
    {
      header: "状态",
      accessorKey: "status",
      cell: ({ getValue }) => {
        const v = getValue<string>();
        if (v === "graded") return "已批改";
        if (v === "submitted") return "已提交";
        return "待提交";
      }
    },
    {
      header: "分数",
      accessorKey: "score",
      cell: ({ getValue }) => {
        const v = getValue<number | undefined>();
        return v ?? "-";
      }
    },
    {
      header: "提交时间",
      accessorKey: "submittedAt",
      cell: ({ getValue }) => {
        const v = getValue<string | undefined>();
        return v ? new Date(v).toLocaleString() : "-";
      }
    },
  ], []);

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(h => (
                <th key={h.id} className="px-3 py-2 font-medium">
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(r => (
            <tr key={r.id} className="border-t">
              {r.getVisibleCells().map(c => (
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
