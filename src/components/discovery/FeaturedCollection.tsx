import { Link } from "@/i18n/navigation";
import { AppImage } from "@/components/ui/AppImage";
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
  const backdrop = coverThumbs[0] ?? null;
  return (
    // Misma "portada" que la cabecera del detalle (CollectionDetailHeader): la primera carátula difuminada como luz de
    // fondo y el abanico suelto sobre ella. Antes el abanico iba en un escenario con borde propio dentro de la tarjeta
    // (una caja dentro de otra) y el lado del texto quedaba plano.
    <Link
      href={href}
      className="group relative isolate grid gap-5 overflow-hidden rounded-xl border border-ink-border bg-ink-surface p-5 transition-colors hover:border-amber focus-visible:border-amber lg:grid-cols-2 lg:gap-8 lg:p-8"
    >
      {backdrop ? (
        <span aria-hidden="true" className="absolute inset-0 -z-10">
          <AppImage src={backdrop} alt="" fill sizes="1280px" className="scale-125 object-cover opacity-30 blur-3xl saturate-150" />
          <span className="absolute inset-0 bg-gradient-to-l from-ink via-ink/85 to-ink/40" />
        </span>
      ) : null}
      <div className="relative flex items-center justify-center py-4 lg:py-6">
        <SleeveStack covers={coverThumbs} size="hero" />
        <span className={`absolute bottom-0 left-0 z-10 ${FAMILY_STAMP_CLASS}`}>{familyLabel}</span>
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-3">
        <h3 className="font-display text-2xl text-paper transition-colors group-hover:text-amber lg:text-4xl">{title}</h3>
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
