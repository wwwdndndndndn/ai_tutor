// src/features/assignments/mocks.ts
// 本地存储版“后端”，与 React Query 配合使用；并与 analytics 使用的 LS_KEY 对齐

import type { AssignmentsQuery, Paged, AssignmentItem } from "./types";

export type Assignment = {
  id: string;
  classId: string;       // 关联班级
  title: string;
  content?: string;      // 题干/说明（可选）
  knowledge?: string;    // 知识点（可选）
  status: "draft" | "published";
  submittedCount: number;
  dueAt: string;         // ISO
  createdAt: string;     // ISO
};

// ---------------- 本地存储封装 ----------------
const isBrowser = () => typeof window !== "undefined" && !!window.localStorage;
const LS_KEY = "aitutor.assignments"; // 与 analytics/compute.ts 中保持一致
const SUB_KEY = (aid: string) => `aitutor.submissions.${aid}`;

const readAll = (): Assignment[] => {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Assignment[]) : [];
  } catch {
    return [];
  }
};

const writeAll = (list: Assignment[]) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(LS_KEY, JSON.stringify(list));
};

// 稳定 ID 生成（兼容无 crypto.randomUUID 的环境）
const genId = () => (globalThis as any).crypto?.randomUUID?.() ?? `a_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

// 首次播种（仅空时）
const seedIfEmpty = () => {
  if (!isBrowser()) return;
  const cur = readAll();
  if (cur.length === 0) {
    const now = Date.now();
    const sample: Assignment[] = Array.from({ length: 6 }).map((_, i) => ({
      id: `a_${i + 1}`,
      classId: `cls_${(i % 3) + 1}`,
      title: `作业 ${i + 1}`,
      content: i % 2 === 0 ? "示例题干" : undefined,
      status: i % 3 === 0 ? "draft" : "published",
      submittedCount: Math.floor(Math.random() * 12),
      dueAt: new Date(now + (i + 1) * 86400000).toISOString(),
      createdAt: new Date(now - i * 86400000).toISOString(),
    }));
    writeAll(sample);
  }
};

// 小工具
const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

// ---------------- 查询 ----------------
export async function fetchAssignments(q: AssignmentsQuery): Promise<Paged<AssignmentItem>> {
  seedIfEmpty();
  await delay();
  const all = readAll();

  // 过滤
  const byClass = q.classId ? all.filter((a) => a.classId === q.classId) : all;
  const kw = (q.keyword ?? "").trim();
  const byKw = kw
    ? byClass.filter((a) => a.title.includes(kw) || a.content?.includes(kw))
    : byClass;

  // 排序：创建时间倒序
  byKw.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  // 分页
  const pageSize = Math.max(1, q.pageSize);
  const page = Math.max(1, q.page);
  const start = (page - 1) * pageSize;
  const items = byKw.slice(start, start + pageSize).map<AssignmentItem>((a) => ({
    id: a.id,
    classId: a.classId,
    title: a.title,
    knowledge: a.knowledge,
    status: a.status,
    dueAt: a.dueAt,
    createdAt: a.createdAt,
    submittedCount: a.submittedCount,
  }));

  return { items, total: byKw.length, page, pageSize };
}

export async function getAssignmentById(id: string): Promise<Assignment | null> {
  seedIfEmpty();
  await delay();
  const row = readAll().find((x) => x.id === id) ?? null;
  return row;
}

// ---------------- 变更 ----------------
export async function createAssignment(input: {
  title: string;
  content?: string;
  classId: string;
  knowledge?: string;
  dueAt: string; // ISO
}) {
  seedIfEmpty();
  await delay();
  const list = readAll();
  const row: Assignment = {
    id: genId(),
    title: input.title,
    content: input.content,
    knowledge: input.knowledge,
    classId: input.classId,
    status: "draft",
    submittedCount: 0,
    dueAt: input.dueAt,
    createdAt: new Date().toISOString(),
  };
  list.unshift(row);
  writeAll(list);
  return row;
}

// 支持两个签名：publishAssignment(id) => 发布；publishAssignment(id, false) => 设为草稿
export async function publishAssignment(id: string, publish: boolean = true) {
  seedIfEmpty();
  await delay();
  const list = readAll();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) throw new Error("Assignment not found");
  const row = list[idx];

  if (publish) {
    if (new Date(row.dueAt).getTime() < Date.now()) {
      throw new Error("已过期的作业不能发布");
    }
    row.status = "published";
  } else {
    row.status = "draft";
    // 业务约束：草稿状态下提交数清零（避免困惑）
    row.submittedCount = 0;
  }

  list[idx] = row;
  writeAll(list);
  return row;
}

// 为兼容旧调用名（AssignmentsTable 中使用）
export async function draftAssignment(id: string) {
  return publishAssignment(id, false);
}

export async function deleteAssignment(id: string) {
  seedIfEmpty();
  await delay();
  const list = readAll();
  const next = list.filter((x) => x.id !== id);
  if (next.length === list.length) throw new Error("Assignment not found");
  writeAll(next);

  // 清理该作业的本地提交数据（如果存在）
  try {
    if (isBrowser()) window.localStorage.removeItem(SUB_KEY(id));
  } catch { /* ignore */ }

  return true;
}
