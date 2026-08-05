import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-ink-border bg-ink-surface px-6 py-12 text-center">
      <h3 className="font-display text-lg text-paper">{title}</h3>
      <p className="max-w-sm font-body text-sm text-paper-muted">{description}</p>
      {action}
    </div>
  );
}
