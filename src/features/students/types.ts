export type StudentItem = {
  id: string;
  classId: string;          // 关联班级
  name: string;
  email: string;
  studentNo?: string;       // 学号（可选）
  score: number;
  joinedAt: string;         // ISO
};

export type StudentsQuery = {
  classId?: string;         // 为空=全部
  keyword?: string;
  page: number;
  pageSize: number;
};

export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };
