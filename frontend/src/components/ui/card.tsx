import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}

export function Card({ children, className = "", interactive }: CardProps) {
  return (
    <div
      className={`rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-6 ${
        interactive
          ? "transition-all hover:border-teranga-500 hover:shadow-sm cursor-pointer"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex items-center justify-between mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-base font-semibold text-[var(--text-primary)] ${className}`}>{children}</h3>;
}