// src/utils/api-status.ts
"use client";

import React from "react";

export type ApiMode = "mock" | "external";
export type ApiStatus = "unknown" | "ok" | "degraded" | "down";

const LS_KEY = "ai_tutor_api_config";

type ApiConfig = { mode: ApiMode; baseUrl?: string; healthPath?: string };

const isBrowser = () => typeof window !== "undefined" && typeof localStorage !== "undefined";

function defaultConfig(): ApiConfig {
  // 如果存在环境变量，则默认 external
  const envBase = process.env.NEXT_PUBLIC_API_BASE;
  const envHealth = process.env.NEXT_PUBLIC_HEALTH_PATH || "/health";
  if (envBase && typeof envBase === "string" && envBase.trim()) {
    return { mode: "external", baseUrl: envBase.trim(), healthPath: envHealth };
  }
  return { mode: "mock" };
}

export function getApiConfig(): ApiConfig {
  if (!isBrowser()) return defaultConfig();
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? ({ ...defaultConfig(), ...(JSON.parse(raw) as ApiConfig) }) : defaultConfig();
  } catch {
    return defaultConfig();
  }
}

export function setApiConfig(cfg: ApiConfig) {
  if (!isBrowser()) return;
  localStorage.setItem(LS_KEY, JSON.stringify(cfg));
}

// Fetch with timeout helper
async function fetchWithTimeout(url: string, ms = 3000): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export function useApiHealth(intervalMs = 15000) {
  const [status, setStatus] = React.useState<ApiStatus>("unknown");
  const [checking, setChecking] = React.useState(false);
  const [lastChecked, setLastChecked] = React.useState<number | undefined>(undefined);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [cfg, setCfg] = React.useState<ApiConfig>(() => getApiConfig());

  React.useEffect(() => {
    if (!isBrowser()) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) setCfg(getApiConfig());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const check = React.useCallback(async () => {
    if (!isBrowser()) return;
    setChecking(true);
    setError(undefined);
    try {
      if (cfg.mode === "mock") {
        setStatus("ok");
      } else if (cfg.baseUrl) {
        try {
          const hp = cfg.healthPath || process.env.NEXT_PUBLIC_HEALTH_PATH || "/health";
          const url = cfg.baseUrl.replace(/\/$/, "") + hp;
          const res = await fetchWithTimeout(url, 3500);
          // 尝试解析 JSON（如 { status: "ok" }），否则以 HTTP 状态为准
          if (res.ok) {
            try { const j = await res.clone().json(); if (j?.status && String(j.status).toLowerCase().includes("ok")) setStatus("ok"); else setStatus("ok"); }
            catch { setStatus("ok"); }
          } else if (res.status >= 500) setStatus("down");
          else setStatus("degraded");
        } catch (err: any) {
          setStatus("down");
          setError(err?.message ?? String(err));
        }
      } else {
        setStatus("unknown");
      }
    } finally {
      setLastChecked(Date.now());
      setChecking(false);
    }
  }, [cfg.mode, cfg.baseUrl, cfg.healthPath]);

  React.useEffect(() => {
    check();
    if (!isBrowser()) return;
    const id = window.setInterval(check, intervalMs);
    return () => window.clearInterval(id);
  }, [check, intervalMs]);

  return { config: cfg, status, checking, lastChecked, error, refresh: check };
}
