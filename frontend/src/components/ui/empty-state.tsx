import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-neutral-300 text-5xl">{icon}</div>}
      <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-neutral-500 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}