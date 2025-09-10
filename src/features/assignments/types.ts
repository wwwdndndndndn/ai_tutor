export type AssignmentStatus = "draft" | "published";

export type AssignmentItem = {
  id: string;
  classId: string;
  title: string;
  knowledge?: string;
  status: AssignmentStatus;
  dueAt: string;           // ISO
  createdAt: string;       // ISO
  submittedCount: number;  // 与表格字段一致
};

export type AssignmentsQuery = {
  classId?: string;
  keyword?: string;
  page: number;
  pageSize: number;
};

export type Paged<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
