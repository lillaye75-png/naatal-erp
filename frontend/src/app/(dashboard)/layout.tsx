"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { I18nProvider } from "@/lib/i18n";
import { ToastProvider } from "@/components/ui/toast";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function DashboardRouteLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <I18nProvider>
          <ToastProvider>
            <DashboardLayout>{children}</DashboardLayout>
          </ToastProvider>
        </I18nProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}