import type { ReactNode } from "react";

interface BadgeProps {
  variant?: "success" | "error" | "warning" | "info" | "neutral";
  children: ReactNode;
}

const badgeVariants = {
  success: "bg-teranga-50 text-teranga-600",
  error: "bg-red-50 text-error",
  warning: "bg-amber-50 text-warning",
  info: "bg-blue-50 text-info",
  neutral: "bg-neutral-100 text-neutral-600",
};

export function Badge({ variant = "neutral", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold ${badgeVariants[variant]}`}
    >
      {children}
    </span>
  );
}