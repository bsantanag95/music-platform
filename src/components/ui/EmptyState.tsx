import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  // Menos aire vertical: para un panel dentro de una página (pestaña vacía), no para una página entera vacía.
  compact?: boolean;
}

export function EmptyState({ title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-lg border border-ink-border bg-ink-surface text-center ${
        compact ? "px-5 py-8" : "px-6 py-12"
      }`}
    >
      <h3 className="font-display text-lg text-paper">{title}</h3>
      <p className="max-w-sm font-body text-sm text-paper-muted">{description}</p>
      {action}
    </div>
  );
}
