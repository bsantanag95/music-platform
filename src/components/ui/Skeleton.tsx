interface SkeletonProps {
  className?: string;
  variant?: "block" | "disc";
}

/**
 * `variant="disc"` es el toque distintivo del proyecto: un círculo con
 * anillos concéntricos tenues (como los surcos de un vinilo) en vez de un
 * bloque genérico — pensado para carátulas y fotos de artista (Etapa 3.2+),
 * donde un skeleton cuadrado rompería la identidad visual del catálogo.
 */
export function Skeleton({ className = "", variant = "block" }: SkeletonProps) {
  if (variant === "disc") {
    return (
      <div
        role="status"
        aria-label="Cargando"
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
      aria-label="Cargando"
      className={`animate-pulse rounded bg-ink-surface ${className}`}
    />
  );
}
