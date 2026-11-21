import { Link } from "@/i18n/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CoverMosaic } from "./CoverMosaic";

export interface DecadeEntry {
  decade: number;
  /** Nombre localizado ("Años 90", "1990s"): el texto del enlace. */
  label: string;
  href: string;
  /** Hasta cuatro carátulas de discos de estudio de la década; vacío = sin mosaico. */
  covers: string[];
}

interface DecadeTimelineProps {
  heading: string;
  description?: string;
  /** Décadas con entrada propia, de la más reciente a la más antigua. */
  decades: DecadeEntry[];
  /** Décadas anteriores, agrupadas al final en una sola entrada con un enlace por década. */
  earlier: DecadeEntry[];
  /** Rótulo de esa entrada ("Antes de 1950"). */
  earlierLabel: string;
}

/** Cifra grande de la línea de tiempo: el mismo "1990s" que la cabecera de la vista de década. */
const yearOf = (decade: number) => `${decade}s`;

function EarlierLinks({ earlier, className }: { earlier: DecadeEntry[]; className: string }) {
  return (
    <ul className={className}>
      {earlier.map((entry) => (
        <li key={entry.decade}>
          <Link
            href={entry.href}
            className="inline-flex min-h-11 items-center lg:min-h-8 font-body text-sm text-paper-muted transition-colors hover:text-amber focus-visible:text-amber"
          >
            {entry.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Sección Décadas de `/explore` (openspec: redesign-explore-phase2), en dos formas según el ancho y de la más reciente a la más
 * antigua en las dos: desde `lg`, una línea de tiempo con una marca por década, el año en grande y un mosaico de carátulas; por
 * debajo, un índice tipográfico en dos columnas, sin carátulas. Las décadas anteriores a 1950 van juntas al final ("Antes de 1950"),
 * con un enlace de texto cada una, visibles sin desplegar. Sin cifras. La forma que no corresponde al ancho lleva `display: none`, así
 * que sale también del árbol de accesibilidad y nadie oye los enlaces dos veces.
 */
export function DecadeTimeline({ heading, description, decades, earlier, earlierLabel }: DecadeTimelineProps) {
  if (decades.length === 0 && earlier.length === 0) return null;
  const columns = decades.length + (earlier.length > 0 ? 1 : 0);

  return (
    <section id="decadas" aria-labelledby="explore-decades-heading" className="flex w-full flex-col gap-5">
      <SectionHeading id="explore-decades-heading" title={heading} description={description} />

      {/* Línea de tiempo (escritorio). */}
      <ol
        className="relative hidden gap-4 pt-7 before:absolute before:inset-x-0 before:top-[0.6875rem] before:h-px before:bg-ink-border lg:grid"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {decades.map((entry) => (
          <li key={entry.decade} className="min-w-0">
            <Link
              href={entry.href}
              aria-label={entry.label}
              className="group relative flex flex-col gap-2.5 before:absolute before:-top-[1.375rem] before:left-0 before:size-2.5 before:rounded-full before:border before:border-paper-muted before:bg-ink before:transition-colors hover:before:border-amber hover:before:bg-amber focus-visible:before:border-amber focus-visible:before:bg-amber"
            >
              <span
                aria-hidden="true"
                className="font-display text-[clamp(1.25rem,2vw,1.875rem)] font-bold leading-none tracking-[-0.03em] text-paper tabular-nums transition-colors group-hover:text-amber"
              >
                {yearOf(entry.decade)}
              </span>
              {entry.covers.length > 0 ? (
                <CoverMosaic
                  covers={entry.covers}
                  className="grid aspect-square w-full overflow-hidden rounded-md ring-1 ring-ink-border transition-[box-shadow] group-hover:ring-amber"
                />
              ) : (
                <span aria-hidden="true" className="aspect-square w-full rounded-md border border-dashed border-ink-border" />
              )}
              {entry.label !== yearOf(entry.decade) ? (
                <span aria-hidden="true" className="truncate font-body text-sm text-paper-muted">
                  {entry.label}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
        {earlier.length > 0 ? (
          <li className="relative flex min-w-0 flex-col gap-1.5 before:absolute before:-top-[1.375rem] before:left-0 before:size-2.5 before:rounded-full before:border before:border-dashed before:border-paper-muted before:bg-ink">
            <span className="font-display text-lg font-bold leading-tight text-paper-muted">{earlierLabel}</span>
            <EarlierLinks earlier={earlier} className="flex flex-col" />
          </li>
        ) : null}
      </ol>

      {/* Índice (teléfono y tableta). */}
      <ul className="grid grid-cols-2 gap-x-6 lg:hidden">
        {decades.map((entry) => (
          <li key={entry.decade} className="min-w-0">
            <Link
              href={entry.href}
              className="flex min-h-12 items-center border-b border-ink-border py-2 font-display text-[1.75rem] font-bold leading-tight tracking-[-0.03em] text-paper transition-colors hover:text-amber focus-visible:text-amber"
            >
              {entry.label}
            </Link>
          </li>
        ))}
        {earlier.length > 0 ? (
          <li className="col-span-2 flex flex-col gap-1 pt-4">
            <span className="font-data text-xs uppercase tracking-wide text-paper-muted">{earlierLabel}</span>
            <EarlierLinks earlier={earlier} className="flex flex-wrap gap-x-4" />
          </li>
        ) : null}
      </ul>
    </section>
  );
}
