import { Link } from "@/i18n/navigation";
import { SectionHeader } from "./SectionHeader";

export interface FamilyTile {
  key: string;
  label: string;
  href: string;
  count: number;
  /** Conteo ya formateado ("17.285 álbumes"). */
  countLabel: string;
}

interface FamilyGridProps {
  heading: string;
  description?: string;
  families: FamilyTile[];
  /** Familias secundarias, detrás de un desplegable. */
  moreFamilies?: FamilyTile[];
  moreLabel?: string;
}

function Tile({ family, max }: { family: FamilyTile; max: number }) {
  // Escala de raíz cuadrada: con Rock en decenas de miles y Brasileña en decenas, una escala
  // lineal dejaría casi todas las barras en el mínimo. Es una pista de tamaño, no un gráfico.
  const width = Math.max(4, Math.round(Math.sqrt(family.count / max) * 100));
  return (
    <Link
      href={family.href}
      className="group flex h-full flex-col gap-2 rounded-lg border border-ink-border bg-ink-surface px-3 py-2.5 transition-colors hover:border-amber focus-visible:border-amber"
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="truncate font-display text-sm text-paper">{family.label}</span>
        <span aria-hidden="true" className="text-paper-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-amber">
          →
        </span>
      </span>
      <span className="font-data text-xs tabular-nums text-paper-muted">{family.countLabel}</span>
      <span aria-hidden="true" className="mt-auto block h-1 rounded-full bg-ink-border">
        <span
          className="block h-full rounded-full bg-paper-muted/50 transition-colors group-hover:bg-amber"
          style={{ width: `${width}%` }}
        />
      </span>
    </Link>
  );
}

const GRID = "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";

/**
 * Familias de géneros de `/explore`: tarjetas con el número de álbumes y una barra de tamaño
 * relativo, cada una lleva a `/explore?familia=`. Las familias secundarias quedan detrás de un
 * `<details>` nativo (sin JavaScript). No renderiza nada si no hay familias.
 */
export function FamilyGrid({ heading, description, families, moreFamilies = [], moreLabel }: FamilyGridProps) {
  if (families.length === 0 && moreFamilies.length === 0) return null;
  const max = Math.max(...families.map((f) => f.count), ...moreFamilies.map((f) => f.count), 1);
  return (
    <section aria-labelledby="explore-genres-heading" className="flex w-full scroll-mt-24 flex-col gap-3">
      <SectionHeader heading={heading} description={description} headingId="explore-genres-heading" />
      {families.length > 0 && (
        <ul className={GRID}>
          {families.map((family) => (
            <li key={family.key}>
              <Tile family={family} max={max} />
            </li>
          ))}
        </ul>
      )}
      {moreFamilies.length > 0 && moreLabel && (
        <details className="group/more">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md px-1 py-1 font-data text-sm text-paper-muted transition-colors hover:text-paper [&::-webkit-details-marker]:hidden">
            {moreLabel}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
              className="size-3.5 transition-transform group-open/more:rotate-180"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          <ul className={`${GRID} mt-2`}>
            {moreFamilies.map((family) => (
              <li key={family.key}>
                <Tile family={family} max={max} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
