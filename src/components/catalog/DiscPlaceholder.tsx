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
      <div className="absolute inset-[15%] rounded-full border border-ink-border" />
      <div className="absolute inset-[35%] rounded-full border border-ink-border" />
      <div className="absolute inset-[48%] rounded-full bg-ink-border" />
    </div>
  );
}
