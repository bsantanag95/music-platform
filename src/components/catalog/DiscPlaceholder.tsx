// Placeholder decorativo tipo vinilo para fotos y carátulas que todavía no
// existen (artistas sin `photoUrl`, álbumes sin carátula o con carátula
// fallida). Es un componente de servidor: no usa estado ni interacción.

interface DiscPlaceholderProps {
  alt: string;
  className?: string;
}

export function DiscPlaceholder({ alt, className = "" }: DiscPlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={alt}
      className={`relative overflow-hidden rounded bg-ink-surface ${className}`}
    >
      <span className="sr-only">{alt}</span>
      {/* Anillo en paper-muted (no ink-border): a tamaño de celda de feed
          (size-11/12) ink-border-sobre-ink-surface es casi invisible —
          ambos tonos cálidos casi negros. paper-muted es el tono que
          DESIGN.md ya asigna a "placeholder"; a esta opacidad el disco se
          lee como grabado discreto en cualquier tamaño, no como recuadro
          vacío. */}
      <div className="absolute inset-[15%] rounded-full border border-paper-muted/45" />
      <div className="absolute inset-[35%] rounded-full border border-paper-muted/45" />
      <div className="absolute inset-[48%] rounded-full bg-paper-muted/35" />
    </div>
  );
}
