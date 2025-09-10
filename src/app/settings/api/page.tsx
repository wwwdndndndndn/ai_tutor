"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApiHealth, getApiConfig, setApiConfig } from "@/utils/api-status";
import ApiStatusBadge from "@/components/ApiStatusBadge";
import { toast } from "sonner";

export default function ApiSettingsPage() {
  const { config, refresh } = useApiHealth();
  const [mode, setMode] = React.useState(config.mode);
  const [baseUrl, setBaseUrl] = React.useState(config.baseUrl ?? (process.env.NEXT_PUBLIC_API_BASE || ""));
  const [healthPath, setHealthPath] = React.useState(config.healthPath ?? (process.env.NEXT_PUBLIC_HEALTH_PATH || "/health"));

  const onSave = () => {
    const cfg = { mode, baseUrl: mode === "external" ? baseUrl.trim() : undefined, healthPath: mode === "external" ? healthPath.trim() : undefined } as any;
    setApiConfig(cfg);
    toast.success("已保存配置");
    refresh();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">API 设置</h1>
        <ApiStatusBadge />
      </div>

      <div className="grid gap-4 md:max-w-xl">
        <div className="space-y-2">
          <Label>后端模式</Label>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="mode" checked={mode === "mock"} onChange={() => setMode("mock")} /> 本地 Mock
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="mode" checked={mode === "external"} onChange={() => setMode("external")} /> 外部 API
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <Label>API Base URL</Label>
          <Input
            placeholder="例如：https://api.example.com"
            disabled={mode !== "external"}
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">可在 .env 中设置 NEXT_PUBLIC_API_BASE 作为默认值。</p>
        </div>

        <div className="space-y-2">
          <Label>Health Path</Label>
          <Input
            placeholder="默认 /health 或 /healthz"
            disabled={mode !== "external"}
            value={healthPath}
            onChange={(e) => setHealthPath(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">可在 .env 中设置 NEXT_PUBLIC_HEALTH_PATH 作为默认值。</p>
        </div>

        <div className="pt-2">
          <Button onClick={onSave}>保存</Button>
        </div>
      </div>
    </div>
  );
}
