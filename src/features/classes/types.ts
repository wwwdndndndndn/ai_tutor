export type ClassItem = {
  id: string;
  name: string;
  studentsCount: number;
  assignmentsCount: number;
  createdAt: string; // ISO
};
export type ClassesQuery = { keyword?: string; page: number; pageSize: number };
export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };
