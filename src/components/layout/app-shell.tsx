"use client";

import AppHeader from "./app-header";
import AppSidebar from "./app-sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <AppHeader />
      <div className="mx-auto grid max-w-screen-2xl grid-cols-1 md:grid-cols-[16rem_1fr]">
        <AppSidebar />
        <main className="min-h-[calc(100dvh-56px)] p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
