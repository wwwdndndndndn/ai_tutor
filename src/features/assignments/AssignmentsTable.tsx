// src/features/assignments/AssignmentsTable.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  publishAssignment,
  draftAssignment,
  deleteAssignment,
} from "@/features/assignments/mocks";
import { toast } from "sonner";

// ---------------- Types ----------------
export type AssignmentRow = {
  id: string;
  title: string;
  className: string; // 展示用的班级名称
  status: "draft" | "published";
  submittedCount: number;
  dueAt: string; // ISO
  createdAt: string; // ISO
};

export type AssignmentsTableProps = {
  data: AssignmentRow[];
  onDelete?: (id: string) => Promise<void> | void;
  onPublish?: (id: string, publish: boolean) => Promise<void> | void;
  selectable?: boolean;
  onSelectionChange?: (ids: string[]) => void;
};

// ---------------- Helpers ----------------
function fmt(dateISO: string) {
  try {
    return new Date(dateISO).toLocaleString();
  } catch {
    return dateISO ?? "";
  }
}

function StatusBadge({ s }: { s: AssignmentRow["status"] }) {
  const cls =
    s === "published"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${cls}`}>
      {s === "published" ? "已发布" : "草稿"}
    </span>
  );
}

// ---------------- Component ----------------
export default function AssignmentsTable({ data, onDelete, onPublish, selectable = true, onSelectionChange }: AssignmentsTableProps) {
  const qc = useQueryClient();
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});

  const columns = React.useMemo<ColumnDef<AssignmentRow>[]>(() => {
    return [
      selectable ? {
        id: "select",
        header: ({ table }) => (
          <input type="checkbox" checked={table.getIsAllRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} />
        ),
        cell: ({ row }) => (
          <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />
        ),
        size: 36,
      } : undefined,
      { header: "ID", accessorKey: "id", size: 180 },
      {
        header: "标题",
        accessorKey: "title",
        cell: ({ row }) => {
          const a = row.original;
          return (
            <Link
              href={`/assignments/${a.id}`}
              className="text-primary hover:underline underline-offset-4"
              prefetch
            >
              {a.title}
            </Link>
          );
        },
      },
      {
        header: "班级",
        accessorKey: "className",
      },
      { header: "知识点", accessorKey: "knowledge" as any },
      {
        header: "提交数",
        accessorKey: "submittedCount",
        size: 80,
        cell: ({ getValue }) => <span className="tabular-nums">{getValue<number>()}</span>,
      },
      {
        header: "状态",
        accessorKey: "status",
        size: 90,
        cell: ({ getValue }) => <StatusBadge s={getValue<"draft" | "published">()} />,
      },
      {
        header: "截止时间",
        accessorKey: "dueAt",
        size: 190,
        cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{fmt(getValue<string>())}</span>,
      },
      {
        header: "创建时间",
        accessorKey: "createdAt",
        size: 190,
        cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{fmt(getValue<string>())}</span>,
      },
      {
        header: "操作",
        id: "actions",
        size: 240,
        cell: ({ row }) => {
          const a = row.original;

          const publish = async () => {
            if (onPublish) {
              await onPublish(a.id, true);
            } else {
              await publishAssignment(a.id);
              await qc.invalidateQueries({ queryKey: ["assignments"] });
              toast.success("已发布");
            }
          };

          const setDraft = async () => {
            if (onPublish) {
              await onPublish(a.id, false);
            } else {
              await draftAssignment(a.id);
              await qc.invalidateQueries({ queryKey: ["assignments"] });
              toast.success("已设为草稿");
            }
          };

          const confirmedDelete = async () => {
            if (onDelete) {
              await onDelete(a.id);
            } else {
              await deleteAssignment(a.id);
              await qc.invalidateQueries({ queryKey: ["assignments"] });
              toast.success("已删除");
            }
          };

          const isOverDue = new Date(a.dueAt).getTime() < Date.now();

          return (
            <div className="flex flex-wrap items-center gap-2 justify-end">
              {a.status === "draft" ? (
                <Button onClick={publish} disabled={isOverDue} title={isOverDue ? "已过期，不能发布" : ""}>
                  发布
                </Button>
              ) : (
                <Button variant="outline" onClick={setDraft}>
                  设为草稿
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">删除</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确定删除该作业？</AlertDialogTitle>
                    <AlertDialogDescription>
                      删除后不可恢复，相关统计将受影响。该操作仅影响本地模拟数据。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmedDelete}>确定删除</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        },
      },
    ].filter(Boolean) as ColumnDef<AssignmentRow>[];
  }, [onDelete, onPublish, qc, selectable]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { rowSelection },
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? (updater as any)(rowSelection) : updater;
      setRowSelection(next as any);
    },
    getRowId: (row) => row.id,
    enableRowSelection: selectable,
  });

  React.useEffect(() => {
    if (!onSelectionChange) return;
    const ids = table.getSelectedRowModel().rows.map((r) => r.original.id);
    onSelectionChange(ids);
  }, [rowSelection, onSelectionChange, table]);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id} className="px-3 py-2 font-medium">
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>

        <tbody>
          {table.getRowModel().rows.map((r) => (
            <tr key={r.id} className="border-t hover:bg-muted/40">
              {r.getVisibleCells().map((c) => (
                <td key={c.id} className="px-3 py-2 align-middle">
                  {flexRender(c.column.columnDef.cell, c.getContext())}
                </td>
              ))}
            </tr>
          ))}

          {data.length === 0 && (
            <tr className="border-t">
              <td colSpan={columns.length} className="px-3 py-16 text-center text-muted-foreground">
                暂无数据
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
