// src/features/students/mocks.ts
// 本地存储版学生数据 CRUD + 导入 CSV/Excel（已修复 seedIfEmpty & SSR）

import * as XLSX from "xlsx";

/** ====== 类型（按你项目需要扩展） ====== */
export type Student = {
  id: string;
  name: string;
  email: string;
  classId: string;
  studentNo?: string;
  score?: number;
  joinedAt: string;
};

export type StudentsQuery = {
  classId?: string;
  keyword?: string;
  page: number;
  pageSize: number;
};

/** ====== 运行环境判断：避免 SSR 访问 localStorage ====== */
const isBrowser = () => typeof window !== "undefined" && typeof localStorage !== "undefined";

/** ====== 本地存储工具 ====== */
const LS_KEY = "ai_tutor_students";

const readStudents = (): Student[] => {
  if (!isBrowser()) return []; // SSR 时返回空
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Student[]) : [];
  } catch {
    return [];
  }
};

const writeStudents = (arr: Student[]) => {
  if (!isBrowser()) return;
  localStorage.setItem(LS_KEY, JSON.stringify(arr));
};

// 如果无数据，塞一些示例，避免空表其它逻辑报错
function seedIfEmpty() {
  if (!isBrowser()) return;
  const cur = readStudents();
  if (cur.length === 0) {
    const now = new Date().toISOString();
    const genId = () =>
      (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`);

    writeStudents([
      {
        id: genId(),
        name: "Student 1",
        email: "student1@school.test",
        classId: "cls_1",
        studentNo: "S20250001",
        score: 92,
        joinedAt: now,
      },
      {
        id: genId(),
        name: "Student 2",
        email: "student2@school.test",
        classId: "cls_2",
        studentNo: "S20250002",
        score: 86,
        joinedAt: now,
      },
      {
        id: genId(),
        name: "Student 3",
        email: "student3@school.test",
        classId: "cls_3",
        studentNo: "S20250003",
        score: 78,
        joinedAt: now,
      },
    ]);
  }
}

/** ====== 查询（支持班级/关键词筛选 + 分页） ====== */
export async function fetchStudents(params: StudentsQuery) {
  if (!isBrowser()) {
    // SSR 阶段返回空，避免报错
    return { items: [], total: 0, page: params.page, pageSize: params.pageSize };
  }

  seedIfEmpty();
  const all = readStudents();

  const byClass = params.classId ? all.filter((s) => s.classId === params.classId) : all;

  const kw = (params.keyword ?? "").trim().toLowerCase();
  const byKw = kw
    ? byClass.filter(
        (s) =>
          s.name.toLowerCase().includes(kw) ||
          s.email.toLowerCase().includes(kw)
      )
    : byClass;

  const total = byKw.length;
  const pageSize = Math.max(1, params.pageSize);
  const page = Math.max(1, params.page);
  const start = (page - 1) * pageSize;
  const items = byKw.slice(start, start + pageSize);

  return { items, total, page, pageSize };
}

/** ====== 创建（按 id 插入到最前） ====== */
export async function createStudent(input: { name: string; email: string; classId: string; studentNo?: string }) {
  if (!isBrowser()) return { ok: false }; // SSR 安全保护

  seedIfEmpty();
  const list = readStudents();
  const now = new Date().toISOString();
  const id =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}_${Math.random().toString(16).slice(2)}`;

  list.unshift({
    id,
    name: input.name,
    email: input.email,
    classId: input.classId,
    studentNo: input.studentNo,
    score: Math.floor(Math.random() * 40) + 60, // 示例分数
    joinedAt: now,
  });

  writeStudents(list);
  return { ok: true };
}

/** ====== 删除（务必按 id 删） ====== */
export async function deleteStudent(id: string) {
  if (!isBrowser()) return { ok: false }; // SSR 安全保护

  seedIfEmpty();
  const list = readStudents();
  const next = list.filter((s) => s.id !== id);
  writeStudents(next);
  return { ok: true };
}

/** ====== 导入工具：规范化、自动邮箱、字段匹配 ====== */
const norm = (s: string) =>
  s.toLowerCase().replace(/\s+/g, "").replace(/_/g, "");

const isEmpty = (v: any) => v == null || String(v).trim() === "";

const NAME_KEYS = new Set(["name", "姓名", "学生", "学生姓名"]);
const EMAIL_KEYS = new Set(["email", "邮箱", "電子郵件", "电子邮箱"]);
const CLASS_KEYS = new Set(["classid", "class", "班级", "班級", "班级id"]);

function pickField(obj: Record<string, any>, keys: Set<string>) {
  const map = new Map<string, any>();
  for (const k of Object.keys(obj)) {
    map.set(norm(k), obj[k]);
  }
  for (const k of keys) {
    const v = map.get(norm(k));
    if (!isEmpty(v)) return v;
  }
  return undefined;
}

function genEmailFromName(name: string) {
  const slug =
    String(name)
      .normalize("NFKD")
      .replace(/[^\w]+/g, "")
      .toLowerCase()
      .slice(0, 24) || "student";
  const rnd = Math.random().toString(36).slice(2, 6);
  return `${slug}.${rnd}@example.local`;
}

/** ====== CSV 导入（带表头识别/跳过/自动邮箱） ====== */
export async function importStudentsCsv(file: File): Promise<{ total: number; success: number; failed: number; }> {
  if (!isBrowser()) return { total: 0, success: 0, failed: 0 };

  const text = await file.text();

  // 简易 CSV 解析（支持引号与转义）
  const rows: string[][] = [];
  let i = 0, cell = "", row: string[] = [], inQuotes = false;

  const pushCell = () => { row.push(cell); cell = ""; };
  const pushRow = () => { rows.push(row.map((c) => c.trim())); row = []; };

  while (i < text.length) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { cell += '"'; i += 2; continue; }
      inQuotes = !inQuotes; i++; continue;
    }
    if (!inQuotes && ch === ",") { pushCell(); i++; continue; }
    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      pushCell(); pushRow();
      if (ch === "\r" && text[i + 1] === "\n") i += 2; else i++;
      continue;
    }
    cell += ch; i++;
  }
  pushCell();
  if (row.length > 1 || row[0] !== "") pushRow();

  if (rows.length === 0) return { total: 0, success: 0, failed: 0 };

  // 识别表头
  const header = rows[0].map((h) => norm(h));
  const hasHeader =
    header.some((h) => NAME_KEYS.has(h)) ||
    header.some((h) => EMAIL_KEYS.has(h)) ||
    header.some((h) => CLASS_KEYS.has(h));
  const startAt = hasHeader ? 1 : 0;

  const idxName  = hasHeader ? header.findIndex((h) => NAME_KEYS.has(h))  : 0;
  const idxEmail = hasHeader ? header.findIndex((h) => EMAIL_KEYS.has(h)) : 1;
  const idxClass = hasHeader ? header.findIndex((h) => CLASS_KEYS.has(h)) : 2;

  let success = 0;
  const total = rows.length - startAt;

  for (let r = startAt; r < rows.length; r++) {
    const cols = rows[r];
    const name    = cols[idxName  >= 0 ? idxName  : 0];
    const email   = cols[idxEmail >= 0 ? idxEmail : 1];
    const classId = cols[idxClass >= 0 ? idxClass : 2];

    if (isEmpty(name) || isEmpty(classId)) continue;

    try {
      await createStudent({
        name: String(name).trim(),
        email: isEmpty(email) ? genEmailFromName(name) : String(email).trim(),
        classId: String(classId).trim(),
      });
      success++;
    } catch { /* ignore */ }
  }

  return { total, success, failed: Math.max(0, total - success) };
}

/** ====== 通用导入：同时支持 CSV 与 Excel ====== */
export async function importStudentsFile(file: File): Promise<{ total: number; success: number; failed: number; }> {
  if (!isBrowser()) return { total: 0, success: 0, failed: 0 };

  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "csv") return importStudentsCsv(file);

  if (ext === "xlsx" || ext === "xls") {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });

    let success = 0;
    const total = rows.length;

    for (const obj of rows) {
      const name    = pickField(obj, NAME_KEYS);
      const email   = pickField(obj, EMAIL_KEYS);
      const classId = pickField(obj, CLASS_KEYS);

      if (isEmpty(name) || isEmpty(classId)) continue;

      try {
        await createStudent({
          name: String(name).trim(),
          email: isEmpty(email) ? genEmailFromName(name) : String(email).trim(),
          classId: String(classId).trim(),
        });
        success++;
      } catch { /* ignore */ }
    }

    return { total, success, failed: Math.max(0, total - success) };
  }

  throw new Error("不支持的文件类型（仅支持 .csv/.xlsx/.xls）");
}
