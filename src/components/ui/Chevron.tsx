// Chevron SVG común para despliegues y navegación (openspec: refine-album-page-phase1): reemplaza los glifos de texto
// (›, ▾, ◀) por el mismo trazo que usan la franja de discografía y los rieles.

const ROTATION = { down: "", up: "rotate-180", left: "rotate-90", right: "-rotate-90" } as const;

interface ChevronProps {
  direction: keyof typeof ROTATION;
  className?: string;
}

export function Chevron({ direction, className = "" }: ChevronProps) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 transition-transform ${ROTATION[direction]} ${className}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
