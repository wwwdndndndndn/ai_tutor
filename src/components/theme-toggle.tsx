"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // 初次从 localStorage 恢复主题
    const saved = localStorage.getItem("theme");
    const dark = saved ? saved === "dark" : false;
    document.documentElement.classList.toggle("dark", dark);
    setIsDark(dark);
  }, []);

  const toggle = () => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  };

  return (
    <Button variant="outline" size="sm" onClick={toggle}>
      {isDark ? "浅色" : "深色"}
    </Button>
  );
}
