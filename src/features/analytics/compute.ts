// src/features/analytics/compute.ts
import type { AssignmentItem } from "@/features/assignments/types";
import type { SubmissionItem } from "@/features/submissions/types";

const LS_STUDENTS = "ai_tutor_students";
const LS_ASSIGNMENTS = "aitutor.assignments";
const SUB_KEY = (aid: string) => `aitutor.submissions.${aid}`;

const isBrowser = () =>
  typeof window !== "undefined" && typeof localStorage !== "undefined";

export type AnalyticsInput = {
  classId?: string;      // 班级过滤（可选）
  assignmentId?: string; // 作业过滤（可选；"__ALL__" 代表全部）
};

export type Metrics = {
  totals: {
    students: number;
    classes: number;
    assignments: number;
    graded: number;
    avgScore: number | null;
  };
  gradeBuckets: { label: string; count: number }[];
  statusCounts: { name: string; value: number }[];
  avgByClass: { classId: string; className: string; avg: number | null }[];

  // 各作业平均分 & 各作业提交状态
  avgByAssignment: { assignmentId: string; title: string; avg: number | null }[];
  statusByAssignment: { title: string; graded: number; submitted: number; pending: number }[];
};

export function computeMetrics(input: AnalyticsInput = {}): Metrics {
  if (!isBrowser()) {
    return {
      totals: { students: 0, classes: 0, assignments: 0, graded: 0, avgScore: null },
      gradeBuckets: [],
      statusCounts: [],
      avgByClass: [],
      avgByAssignment: [],
      statusByAssignment: [],
    };
  }

  const { classId, assignmentId } = input;

  const students: Array<{ id: string; classId: string }> = JSON.parse(
    localStorage.getItem(LS_STUDENTS) ?? "[]"
  );
  const assignments: AssignmentItem[] = JSON.parse(
    localStorage.getItem(LS_ASSIGNMENTS) ?? "[]"
  );

  const allClassIds = new Set<string>();
  students.forEach((s) => allClassIds.add(s.classId));
  assignments.forEach((a) => allClassIds.add(a.classId));

  // 先按班级过滤作业
  let selectedAssignments = classId
    ? assignments.filter((a) => a.classId === classId)
    : assignments;

  // 再按作业过滤
  if (assignmentId && assignmentId !== "__ALL__") {
    selectedAssignments = selectedAssignments.filter((a) => a.id === assignmentId);
  }

  // 读取所有相关提交
  let submissions: SubmissionItem[] = [];
  for (const a of selectedAssignments) {
    const arr: SubmissionItem[] = JSON.parse(
      localStorage.getItem(SUB_KEY(a.id)) ?? "[]"
    );
    submissions = submissions.concat(arr);
  }

  const gradedSubs = submissions.filter(
    (s) => s.status === "graded" && typeof s.score === "number"
  );
  const avgScore =
    gradedSubs.length > 0
      ? Math.round(
          (gradedSubs.reduce((sum, s) => sum + (s.score as number), 0) /
            gradedSubs.length) * 10
        ) / 10
      : null;

  // 成绩分布（仅对当前 assignmentId 过滤后的集合）
  const buckets = [
    { label: "<60", ok: (x: number) => x < 60 },
    { label: "60-69", ok: (x: number) => x >= 60 && x <= 69 },
    { label: "70-79", ok: (x: number) => x >= 70 && x <= 79 },
    { label: "80-89", ok: (x: number) => x >= 80 && x <= 89 },
    { label: "90-100", ok: (x: number) => x >= 90 && x <= 100 },
  ];
  const gradeBuckets = buckets.map((b) => ({
    label: b.label,
    count: gradedSubs.filter((s) => b.ok(s.score as number)).length,
  }));

  // 整体提交状态
  const statusCounts = [
    { name: "待提交", value: submissions.filter((s) => s.status === "pending").length },
    { name: "已提交", value: submissions.filter((s) => s.status === "submitted").length },
    { name: "已批改", value: submissions.filter((s) => s.status === "graded").length },
  ];

  // 各班级平均分（对当前过滤集合）
  const classIdsInSubs = Array.from(
    new Set(
      submissions
        .map((s) => selectedAssignments.find((a) => a.id === s.assignmentId)?.classId)
        .filter(Boolean) as string[]
    )
  );
  const avgByClass = classIdsInSubs.map((cid) => {
    const subsForClass = gradedSubs.filter((s) => {
      const a = selectedAssignments.find((a) => a.id === s.assignmentId);
      return a?.classId === cid;
    });
    const avg =
      subsForClass.length > 0
        ? Math.round(
            (subsForClass.reduce((sum, s) => sum + (s.score as number), 0) /
              subsForClass.length) * 10
          ) / 10
        : null;
    return { classId: cid, className: cid, avg };
  });

  // 各作业平均分 & 各作业状态（仅当 assignmentId==ALL 或未指定时才有意义）
  const avgByAssignment = selectedAssignments.map((a) => {
    const subs = gradedSubs.filter((s) => s.assignmentId === a.id);
    const avg =
      subs.length > 0
        ? Math.round(
            (subs.reduce((sum, s) => sum + (s.score as number), 0) / subs.length) * 10
          ) / 10
        : null;
    return { assignmentId: a.id, title: a.title, avg };
  });

  const statusByAssignment = selectedAssignments.map((a) => {
    const subs = submissions.filter((s) => s.assignmentId === a.id);
    return {
      title: a.title,
      pending: subs.filter((s) => s.status === "pending").length,
      submitted: subs.filter((s) => s.status === "submitted").length,
      graded: subs.filter((s) => s.status === "graded").length,
    };
  });

  return {
    totals: {
      students: classId
        ? students.filter((s) => s.classId === classId).length
        : students.length,
      classes: classId ? 1 : allClassIds.size,
      assignments: selectedAssignments.length,
      graded: gradedSubs.length,
      avgScore,
    },
    gradeBuckets,
    statusCounts,
    avgByClass,
    avgByAssignment,
    statusByAssignment,
  };
}

