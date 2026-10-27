// Marcador mientras se lee el modo guardado: filas neutras, sin texto, para no pintar Detallada y saltar después
// (openspec: refine-progress-page-phase1, D1).
export function ProgressPlaceholder({ count }: { count: number }) {
  return (
    <div aria-hidden data-testid="progress-placeholder" className="flex flex-col gap-2">
      {Array.from({ length: Math.min(Math.max(count, 1), 4) }, (_, index) => (
        <div key={index} className="h-16 rounded-lg bg-ink-surface motion-safe:animate-pulse" />
      ))}
    </div>
  );
}
