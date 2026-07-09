"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { I18nProvider } from "@/lib/i18n";
import { ToastProvider } from "@/components/ui/toast";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <I18nProvider>
          <ToastProvider>
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4">
              {children}
            </div>
          </ToastProvider>
        </I18nProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}