"use client";

import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-4 md:p-6 bg-[var(--bg)]"
          style={{ maxWidth: "1200px", width: "100%", margin: "0 auto" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}