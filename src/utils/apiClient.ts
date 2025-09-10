// src/utils/apiClient.ts
export type Student = {
  id: number;
  name: string;
  score: number;
};

// 模拟请求延迟的函数
function mockFetch<T>(data: T, delay = 800): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
}

// 假接口：获取学生列表
export async function fetchStudents(): Promise<Student[]> {
  return mockFetch([
    { id: 1, name: "Alice", score: 90 },
    { id: 2, name: "Bob", score: 75 },
    { id: 3, name: "Charlie", score: 88 },
  ]);
}
