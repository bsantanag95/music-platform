import { Link } from "@/i18n/navigation";
import { SectionHeader } from "./SectionHeader";

export interface DecadeColumn {
  decade: number;
  count: number;
  href: string;
  /** Conteo corto para sobre la barra ("2.345"). */
  countLabel: string;
  /** Nombre accesible de la columna ("1990s: 2.345 álbumes"). */
  ariaLabel: string;
}

interface DecadeHistogramProps {
  heading: string;
  description?: string;
  /** En cualquier orden: se dibujan de la más antigua a la más reciente. */
  decades: DecadeColumn[];
  /** Título de la lista de décadas con muy pocos álbumes, fuera del gráfico ("Antes"). */
  earlierLabel: string;
}

/**
 * Una década entra al gráfico desde que alcanza esta fracción de la más grande. Por debajo (en el
 * catálogo actual, de los 1890s a los 1940s: de 2 a 82 álbumes contra 15.000) todas las barras
 * quedaban en el mínimo, idénticas, ocupando la mitad del ancho sin decir nada.
 */
const CHART_MIN_SHARE = 0.02;

/**
 * Décadas de `/explore` como histograma del catálogo: una columna por década, en orden
 * cronológico, con la altura proporcional a sus álbumes. Cada columna es un enlace a
 * `/explore?decada=`; la lista de enlaces es la alternativa textual (cada uno dice la década y
 * la cantidad). Las décadas iniciales con muy pocos álbumes van en una lista aparte, a la izquierda.
 * En pantallas angostas pasa a barras horizontales. No renderiza nada sin décadas.
 */
export function DecadeHistogram({ heading, description, decades, earlierLabel }: DecadeHistogramProps) {
  if (decades.length === 0) return null;
  const columns = [...decades].sort((a, b) => a.decade - b.decade);
  const max = Math.max(...columns.map((d) => d.count), 1);
  // Las décadas iniciales por debajo del umbral pasan a una lista compacta a la izquierda (solo si son
  // al menos dos: una sola no justifica sacarla del gráfico).
  const firstCharted = columns.findIndex((d) => d.count >= max * CHART_MIN_SHARE);
  const earlier = firstCharted >= 2 ? columns.slice(0, firstCharted) : [];
  const charted = columns.slice(earlier.length);

  return (
    <section id="decadas" aria-labelledby="explore-decades-heading" className="flex w-full scroll-mt-24 flex-col gap-3">
      <SectionHeader heading={heading} description={description} headingId="explore-decades-heading" />
      {/* Desde `md`: columnas en orden cronológico, con la cifra pegada sobre cada barra. */}
      <div className="hidden w-full gap-4 rounded-lg border border-ink-border bg-ink-surface px-3 pb-2 pt-4 md:flex">
        {earlier.length > 0 ? (
          <div className="flex w-28 shrink-0 flex-col gap-1 border-r border-ink-border pr-3">
            <span className="px-1.5 font-data text-[0.65rem] uppercase tracking-wider text-paper-muted/70">
              {earlierLabel}
            </span>
            <ol className="flex flex-col">
              {earlier.map((d) => (
                <li key={d.decade}>
                  <Link
                    href={d.href}
                    aria-label={d.ariaLabel}
                    className="flex items-baseline justify-between gap-2 rounded px-1.5 py-0.5 font-data text-xs text-paper-muted transition-colors hover:bg-ink hover:text-amber focus-visible:bg-ink"
                  >
                    <span aria-hidden="true">{d.decade}s</span>
                    <span aria-hidden="true" className="tabular-nums text-paper-muted/70">
                      {d.countLabel}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
        <ol className="flex h-44 flex-1 items-stretch gap-1.5">
          {charted.map((d) => {
            const height = Math.max(3, Math.round((d.count / max) * 100));
            return (
              <li key={d.decade} className="flex-1">
                <Link
                  href={d.href}
                  aria-label={d.ariaLabel}
                  className="group flex h-full flex-col items-center gap-1.5 rounded-md px-0.5 pt-1 transition-colors hover:bg-ink focus-visible:bg-ink"
                >
                  {/* Reserva arriba para la cifra de la barra más alta. */}
                  <span aria-hidden="true" className="relative mt-4 w-full flex-1 border-b border-ink-border">
                    <span
                      className="absolute inset-x-1 bottom-0 rounded-t-sm bg-paper-muted/30 transition-colors group-hover:bg-amber group-focus-visible:bg-amber"
                      style={{ height: `${height}%` }}
                    />
                    <span
                      className="absolute inset-x-0 text-center font-data text-[0.65rem] tabular-nums text-paper-muted transition-colors group-hover:text-paper"
                      style={{ bottom: `calc(${height}% + 0.25rem)` }}
                    >
                      {d.countLabel}
                    </span>
                  </span>
                  <span aria-hidden="true" className="font-data text-xs text-paper-muted transition-colors group-hover:text-paper">
                    {d.decade}s
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
      {/* En pantallas angostas: barras horizontales, de la más reciente a la más antigua, para que
          las décadas con más música queden arriba en lugar de fuera de pantalla a la derecha. */}
      <ol className="flex w-full flex-col gap-0.5 rounded-lg border border-ink-border bg-ink-surface p-2 md:hidden">
        {[...columns].reverse().map((d) => (
          <li key={d.decade}>
            <Link
              href={d.href}
              aria-label={d.ariaLabel}
              className="group grid grid-cols-[3.25rem_1fr_3.5rem] items-center gap-2 rounded-md px-1.5 py-1.5 font-data text-xs text-paper-muted transition-colors hover:bg-ink focus-visible:bg-ink"
            >
              <span aria-hidden="true" className="group-hover:text-paper">
                {d.decade}s
              </span>
              <span aria-hidden="true" className="h-2 rounded-sm bg-ink-border">
                <span
                  className="block h-full rounded-sm bg-paper-muted/40 transition-colors group-hover:bg-amber"
                  style={{ width: `${Math.max(2, Math.round((d.count / max) * 100))}%` }}
                />
              </span>
              <span aria-hidden="true" className="text-right tabular-nums">
                {d.countLabel}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
