interface SkeletonProps {
  className?: string;
  variant?: "block" | "disc";
  ariaLabel?: string;
}

export function Skeleton({ className = "", variant = "block", ariaLabel }: SkeletonProps) {
  if (variant === "disc") {
    return (
      <div
        role="status"
        aria-label={ariaLabel}
        className={`relative animate-pulse overflow-hidden rounded-full bg-ink-surface ${className}`}
      >
        <div className="absolute inset-[15%] rounded-full border border-ink-border" />
        <div className="absolute inset-[35%] rounded-full border border-ink-border" />
        <div className="absolute inset-[48%] rounded-full bg-ink-border" />
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className={`animate-pulse rounded bg-ink-surface ${className}`}
    />
  );
}
