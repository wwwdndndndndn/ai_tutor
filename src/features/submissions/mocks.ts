import { SubmissionItem, SubmissionsQuery, GradeJob, GradeJobOptions } from "./types";

// —— 本地键
const SUB_KEY = (aid: string) => `aitutor.submissions.${aid}`;
const JOB_KEY = "aitutor.jobs";
const STU_KEY = "ai_tutor_students";

const isBrowser = () => typeof window !== "undefined";
const read = (k: string) => {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(k);
  return raw ? JSON.parse(raw) : null;
};
const write = (k: string, v: any) => {
  if (!isBrowser()) return;
  localStorage.setItem(k, JSON.stringify(v));
};
const rid = () => Math.random().toString(36).slice(2, 10);

/** 用班级的学生列表为指定 assignmentId 生成提交种子 */
function seedSubmissionsIfEmpty(assignmentId: string, classId: string) {
  if (!isBrowser()) return;
  const cur: SubmissionItem[] = read(SUB_KEY(assignmentId)) ?? [];
  if (cur.length > 0) return;

  const allStudents = (read(STU_KEY) ?? []) as any[];
  const inClass = allStudents.filter((s) => s.classId === classId);

  const now = Date.now();
  const seeded: SubmissionItem[] = inClass.map((s, idx) => {
    const submitted = Math.random() < 0.6; // 60% 已提交
    return {
      id: rid(),
      assignmentId,
      studentId: s.id,
      name: s.name,
      email: s.email,
      status: submitted ? "submitted" : "pending",
      submittedAt: submitted ? new Date(now - (idx + 1) * 3600_000).toISOString() : undefined,
      score: undefined,
      feedback: "",
    };
  });

  write(SUB_KEY(assignmentId), seeded);
}

/** 查询列表（筛选 + 分页） */
export async function fetchSubmissions(q: SubmissionsQuery) {
  const all: SubmissionItem[] = read(SUB_KEY(q.assignmentId)) ?? [];
  const status = q.status ?? "all";
  const byStatus =
    status === "all" ? all : all.filter((x) => x.status === (status as any));

  const kw = (q.keyword ?? "").trim().toLowerCase();
  const filtered = kw
    ? byStatus.filter(
        (x) => x.name.toLowerCase().includes(kw) || x.email.toLowerCase().includes(kw)
      )
    : byStatus;

  const start = (q.page - 1) * q.pageSize;
  const items = filtered.slice(start, start + q.pageSize);
  return { items, total: filtered.length, page: q.page, pageSize: q.pageSize };
}

/** 给详情页调用：确保有一份提交数据 */
export function ensureAssignmentSubmissions(assignmentId: string, classId: string) {
  seedSubmissionsIfEmpty(assignmentId, classId);
}

/** 启动批改 Job（支持仅批未批 / 重新批改覆盖） */
export async function startGradeJob(assignmentId: string, options: GradeJobOptions = { onlyUngraded: true }) {
  const subs: SubmissionItem[] = read(SUB_KEY(assignmentId)) ?? [];

  const targets =
    options.onlyUngraded
      ? subs.filter((s) => s.status === "submitted")
      : subs.filter((s) => s.status === "submitted" || s.status === "graded");

  const jobs: GradeJob[] = read(JOB_KEY) ?? [];
  const job: GradeJob = {
    id: `job_${rid()}`,
    assignmentId,
    total: targets.length,
    processed: 0,
    status: "queued",
    createdAt: new Date().toISOString(),
    options,
  };
  jobs.unshift(job);
  write(JOB_KEY, jobs);

  return { jobId: job.id };
}

/** 轮询 Job */
export async function fetchJob(jobId: string) {
  const jobs: GradeJob[] = read(JOB_KEY) ?? [];
  const idx = jobs.findIndex((j) => j.id === jobId);
  if (idx < 0) return null;

  const j = jobs[idx];

  if (j.status === "queued") j.status = "running";

  if (j.status === "running") {
    const step = Math.max(1, Math.floor(Math.random() * 5));
    j.processed = Math.min(j.total, j.processed + step);

    if (j.processed >= j.total) {
      j.status = "done";
      j.completedAt = new Date().toISOString();

      // 写回分数
      const subs: SubmissionItem[] = read(SUB_KEY(j.assignmentId)) ?? [];
      const updated = subs.map((s) => {
        const inScope = j.options.onlyUngraded
          ? s.status === "submitted"
          : s.status === "submitted" || s.status === "graded";

        if (inScope) {
          return {
            ...s,
            status: "graded",
            score: 60 + Math.floor(Math.random() * 41), // 60~100
          };
        }
        return s;
      });
      write(SUB_KEY(j.assignmentId), updated);
    }

    jobs[idx] = j;
    write(JOB_KEY, jobs);
  }

  return j;
}

/** ===== 新增：读取单条提交 ===== */
export async function getSubmission(assignmentId: string, sid: string) {
  const subs: SubmissionItem[] = read(SUB_KEY(assignmentId)) ?? [];
  return subs.find(s => s.id === sid) ?? null;
}

/** ===== 新增：更新单条提交（分数/评语/状态） ===== */
export async function updateSubmission(
  assignmentId: string,
  sid: string,
  patch: Partial<Pick<SubmissionItem, "score" | "feedback" | "status">>
) {
  const subs: SubmissionItem[] = read(SUB_KEY(assignmentId)) ?? [];
  const idx = subs.findIndex(s => s.id === sid);
  if (idx < 0) return null;
  subs[idx] = { ...subs[idx], ...patch };
  write(SUB_KEY(assignmentId), subs);
  return subs[idx];
}

/** ===== 新增：单人重新批改（随机打分并置为 graded） ===== */
export async function regradeOne(assignmentId: string, sid: string) {
  const subs: SubmissionItem[] = read(SUB_KEY(assignmentId)) ?? [];
  const idx = subs.findIndex(s => s.id === sid);
  if (idx < 0) return null;
  subs[idx] = {
    ...subs[idx],
    status: "graded",
    score: 60 + Math.floor(Math.random() * 41),
  };
  write(SUB_KEY(assignmentId), subs);
  return subs[idx];
}
