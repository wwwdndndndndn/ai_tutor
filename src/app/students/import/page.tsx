"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { toast } from "sonner";

import { parseCSV } from "@/utils/csvParser"; // 我们稍后会创建这个工具函数
import StudentsTable from "@/features/students/StudentsTable";
import { createStudent } from "@/features/students/mocks"; // 用于模拟创建

const PAGE_SIZE = 10;

export default function ImportStudentsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [students, setStudents] = useState<any[]>([]); // 存储解析后的学生数据
  const [open, setOpen] = useState(false);

  // 读取并解析CSV文件
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseCSV(selectedFile)
        .then(parsedData => {
          setStudents(parsedData);
        })
        .catch(error => {
          toast.error("文件解析失败");
          console.error(error);
        });
    }
  };

  const handleImport = async () => {
    if (!students.length) {
      toast.error("没有数据可导入");
      return;
    }
    // 模拟导入每个学生
    for (const student of students) {
      await createStudent(student); // 存储每个学生数据
    }
    toast.success("导入成功！");
    setStudents([]); // 清空已导入的数据
    setOpen(false);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">学生批量导入</h1>

      {/* CSV文件选择 */}
      <div>
        <label className="block text-sm">选择CSV文件</label>
        <Input type="file" accept=".csv" onChange={handleFileChange} className="w-64 mt-2" />
      </div>

      {/* 显示解析出的学生数据 */}
      {students.length > 0 && (
        <div className="mt-4">
          <StudentsTable data={students} onDelete={() => {}} />
        </div>
      )}

      {/* 导入按钮 */}
      <div className="mt-4">
        <Button onClick={() => setOpen(true)} disabled={!students.length}>
          导入学生
        </Button>
      </div>

      {/* 确认导入对话框 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>确认导入</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认导入</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p>确定要导入这些学生吗？</p>
            <div className="flex gap-2">
              <Button onClick={handleImport}>确认导入</Button>
              <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
