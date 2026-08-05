import { Button } from "./Button";

interface ErrorStateProps {
  title: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-danger/40 bg-ink-surface px-6 py-12 text-center">
      <h3 className="font-display text-lg text-paper">{title}</h3>
      <p className="max-w-sm font-body text-sm text-paper-muted">{description}</p>
      {onRetry && retryLabel && (
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
