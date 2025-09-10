// src/features/classes/mocks.ts
import { ClassesQuery, ClassItem, Paged } from "./types";

// ---- 安全的浏览器判断与存取封装 ----
const isBrowser = () => typeof window !== "undefined" && !!window.localStorage;
const LS_KEY = "ai_tutor_classes";

const safeRead = (): ClassItem[] => {
  if (!isBrowser()) return []; // SSR / 非浏览器时返回空，避免报错
  const raw = window.localStorage.getItem(LS_KEY);
  return raw ? (JSON.parse(raw) as ClassItem[]) : [];
};

const safeWrite = (list: ClassItem[]) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(LS_KEY, JSON.stringify(list));
};

// ---- 稳定的 ID 生成（兼容无 randomUUID 的环境）----
const genId = () => {
  const c = (globalThis as any).crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // 退化方案：时间戳 + 随机数
  return `id_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
};

// ---- 首次播种数据（仅在需要时）----
const seedIfEmpty = () => {
  let list = safeRead();
  if (list.length === 0) {
    const now = Date.now();
    list = Array.from({ length: 42 }).map((_, i) => ({
      id: `cls_${i + 1}`,
      name: `Class ${i + 1}`,
      studentsCount: Math.floor(Math.random() * 40) + 10,
      assignmentsCount: Math.floor(Math.random() * 8),
      createdAt: new Date(now - i * 86400000).toISOString(),
    }));
    safeWrite(list);
  }
};

// ---- Mock API ----
export async function fetchClasses(q: ClassesQuery): Promise<Paged<ClassItem>> {
  seedIfEmpty();
  await new Promise((r) => setTimeout(r, 200)); // 模拟网络延迟

  const all = safeRead();
  const keyword = (q.keyword ?? "").trim().toLowerCase();
  const filtered = keyword
    ? all.filter((x) => x.name.toLowerCase().includes(keyword))
    : all;

  const start = (q.page - 1) * q.pageSize;
  const items = filtered.slice(start, start + q.pageSize);

  return {
    items,
    total: filtered.length,
    page: q.page,
    pageSize: q.pageSize,
  };
}

export async function createClass(name: string): Promise<void> {
  seedIfEmpty();
  await new Promise((r) => setTimeout(r, 150));
  const list = safeRead();
  list.unshift({
    id: genId(),
    name,
    studentsCount: 0,
    assignmentsCount: 0,
    createdAt: new Date().toISOString(),
  });
  safeWrite(list);
}

export async function deleteClass(id: string): Promise<void> {
  seedIfEmpty();
  await new Promise((r) => setTimeout(r, 150));
  const list = safeRead().filter((x) => x.id !== id);
  safeWrite(list);
}

// 读取单个班级
export async function getClassById(id: string): Promise<ClassItem | null> {
  seedIfEmpty();
  const list = safeRead();
  return list.find((x) => x.id === id) ?? null;
}

// 导入 CSV（列：name 或 带表头识别）
export async function importClassesCsv(file: File): Promise<{ total: number; success: number; failed: number; }> {
  seedIfEmpty();
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { total: 0, success: 0, failed: 0 };
  const header = lines[0].split(",").map((s) => s.trim().replace(/^\"|\"$/g, ""));
  const hasHeader = header.some((h) => /name|班级|class/i.test(h));
  const start = hasHeader ? 1 : 0;
  let success = 0;
  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(",").map((s) => s.trim().replace(/^\"|\"$/g, ""));
    const name = hasHeader ? cols[header.findIndex((h) => /name|班级|class/i.test(h))] : cols[0];
    if (!name) continue;
    try { await createClass(name); success++; } catch {}
  }
  const total = lines.length - start;
  return { total, success, failed: Math.max(0, total - success) };
}
