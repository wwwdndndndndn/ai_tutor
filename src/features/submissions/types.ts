export type SubmissionStatus = "pending" | "submitted" | "graded";

export type SubmissionItem = {
  id: string;
  assignmentId: string;
  studentId: string;
  name: string;
  email: string;
  status: SubmissionStatus;
  score?: number;
  submittedAt?: string; // ISO
  feedback?: string;
};

export type SubmissionsQuery = {
  assignmentId: string;
  status?: "all" | "submitted" | "pending" | "graded";
  keyword?: string;
  page: number;
  pageSize: number;
};

export type JobStatus = "queued" | "running" | "done";

export type GradeJobOptions = {
  /** true = 只批改“未批改”的（submitted），false = 对已提交的全部重新批改、覆盖原分数 */
  onlyUngraded: boolean;
};

export type GradeJob = {
  id: string;
  assignmentId: string;
  total: number;
  processed: number;
  status: JobStatus;
  createdAt: string;
  completedAt?: string;
  options: GradeJobOptions;
};
