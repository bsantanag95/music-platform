import { Link } from "@/i18n/navigation";
import { FAMILY_STAMP_CLASS, SleeveStack } from "./CollectionSleeves";

interface FeaturedCollectionProps {
  /** Enlace al detalle de la colección. */
  href: string;
  title: string;
  description?: string | null;
  /** Frase de contexto del presentador, ya en el idioma activo; sustituye a la descripción. */
  context?: string;
  coverThumbs: string[];
  familyLabel: string;
  itemsLabel: string;
  openLabel: string;
}

/**
 * La colección destacada de la página de colecciones (openspec: redesign-collections-hub, ADR 0040): el punto de
 * entrada de la página, una sola pieza grande con la pila de fundas en tamaño `hero` (el mismo del detalle), el sello
 * de familia sobre la carátula, el título, la frase que dice por qué está ahí y la acción. Sin rótulo "Destacada" sobre
 * el título: que sea la primera y la más grande ya lo dice. Toda la tarjeta es un enlace, como las demás.
 */
export function FeaturedCollection({
  href,
  title,
  description,
  context,
  coverThumbs,
  familyLabel,
  itemsLabel,
  openLabel,
}: FeaturedCollectionProps) {
  const text = context ?? description ?? undefined;
  return (
    <Link
      href={href}
      className="group grid gap-5 rounded-xl border border-ink-border bg-ink-surface p-4 transition-colors hover:border-amber focus-visible:border-amber lg:grid-cols-2 lg:gap-8 lg:p-6"
    >
      <div className="relative flex items-center justify-center overflow-hidden rounded-lg border border-ink-border bg-ink py-8">
        <SleeveStack covers={coverThumbs} size="hero" />
        <span className={`absolute bottom-2 left-2 z-10 ${FAMILY_STAMP_CLASS}`}>{familyLabel}</span>
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-3">
        <h3 className="font-display text-2xl text-paper transition-colors group-hover:text-amber lg:text-3xl">{title}</h3>
        {text ? <p className="line-clamp-3 max-w-prose font-body text-paper-muted">{text}</p> : null}
        <span className="font-data text-xs text-paper-muted">{itemsLabel}</span>
        <span className="inline-flex items-center gap-1 font-data text-sm text-paper transition-colors group-hover:text-amber">
          {openLabel}
          <span aria-hidden="true" className="transition-transform duration-150 group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
