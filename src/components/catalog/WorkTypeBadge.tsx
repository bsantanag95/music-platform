import type { ReleaseGroupCategory } from "@/lib/api/schemas";

interface WorkTypeBadgeProps {
  category: ReleaseGroupCategory;
  /** Etiquetas localizadas para las categorías que llevan badge. */
  labels: Record<Exclude<ReleaseGroupCategory, "studio">, string>;
}

/**
 * Etiqueta de tipo de obra en la página de álbum
 * (openspec: canonicalize-release-group). Un álbum de estudio no lleva
 * etiqueta —es el caso por defecto—; las demás categorías sí, para que una
 * reseña se enmarque en lo que es la obra (una recopilación, un disco en
 * vivo, un single/EP).
 */
export function WorkTypeBadge({ category, labels }: WorkTypeBadgeProps) {
  if (category === "studio") return null;

  return (
    <span className="inline-flex items-center rounded border border-ink-border px-2 py-0.5 font-data text-xs uppercase tracking-wider text-paper-muted">
      {labels[category]}
    </span>
  );
}
