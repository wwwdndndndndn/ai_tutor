// src/components/ApiStatusBadge.tsx
"use client";

import * as React from "react";
import { useApiHealth } from "@/utils/api-status";

function Dot({ color }: { color: string }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />;
}

export default function ApiStatusBadge() {
  const { status, config, checking, lastChecked, refresh } = useApiHealth();

  let color = "bg-zinc-400";
  let text = "未知";
  if (status === "ok") { color = "bg-emerald-500"; text = "正常"; }
  else if (status === "degraded") { color = "bg-amber-500"; text = "受限"; }
  else if (status === "down") { color = "bg-rose-500"; text = "故障"; }

  return (
    <button
      type="button"
      onClick={() => refresh()}
      title={`模式：${config.mode}${config.baseUrl ? `\nURL：${config.baseUrl}` : ""}${lastChecked ? `\n上次检测：${new Date(lastChecked).toLocaleString()}` : ""}`}
      className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs text-foreground/80 hover:bg-muted"
    >
      <Dot color={color} />
      <span>API：{text}{checking ? "…" : ""}</span>
    </button>
  );
}

