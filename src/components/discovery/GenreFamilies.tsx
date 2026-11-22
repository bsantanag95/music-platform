import { Link } from "@/i18n/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CoverMosaic } from "./CoverMosaic";

export interface FamilyEntry {
  key: string;
  label: string;
  href: string;
  /** Hasta cuatro carátulas de discos de estudio de la familia; vacío = tarjeta plana. */
  covers: string[];
}

/** Cuántas familias van en grande; el resto, al índice. */
export const BIG_FAMILIES = 6;

/**
 * Reparte las familias en los dos niveles de la sección: las seis primeras principales en grande y todas las demás —el resto de
 * las principales y, al final, las secundarias— en el índice. Las familias llegan en el orden de la taxonomía y solo las que
 * tienen álbumes.
 */
export function splitFamilies<T extends { tier: "main" | "more" }>(families: T[]): { big: T[]; index: T[] } {
  const main = families.filter((family) => family.tier === "main");
  const more = families.filter((family) => family.tier === "more");
  const big = main.slice(0, BIG_FAMILIES);
  // Sin principales suficientes, las secundarias completan las tarjetas antes que dejar un índice de una o dos entradas.
  const rest = [...main.slice(BIG_FAMILIES), ...more];
  const fill = rest.splice(0, Math.max(0, BIG_FAMILIES - big.length));
  return { big: [...big, ...fill], index: rest };
}

interface GenreFamiliesProps {
  heading: string;
  description?: string;
  /** Rótulo del índice ("Más familias"). */
  indexLabel: string;
  big: FamilyEntry[];
  index: FamilyEntry[];
}

function BigTile({ family }: { family: FamilyEntry }) {
  const covers = family.covers.slice(0, 4);
  return (
    <Link
      href={family.href}
      className="group relative isolate block aspect-[4/3] overflow-hidden rounded-lg border border-ink-border bg-ink-surface transition-colors hover:border-amber focus-visible:border-amber"
    >
      {covers.length > 0 ? (
        <>
          {/* Las carátulas son decorativas: el enlace se nombra con la familia. */}
          <CoverMosaic covers={covers} className="absolute inset-0 -z-10 grid" />
          {/* Velo bajo el nombre: garantiza su contraste sobre cualquier carátula. */}
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-3/5 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
        </>
      ) : null}
      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 sm:p-4">
        <span className="font-display text-xl font-bold leading-tight tracking-[-0.01em] text-paper">{family.label}</span>
        <span
          aria-hidden="true"
          className="text-amber opacity-0 transition-[opacity,transform] duration-150 group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          →
        </span>
      </span>
    </Link>
  );
}

/**
 * Sección Géneros de `/explore` (openspec: redesign-explore-phase2): las seis primeras familias principales como tarjetas grandes con
 * sus carátulas y todas las demás en un índice tipográfico —solo el nombre, en columnas, siempre visible—. Sin cifras en ningún nivel
 * (visual-genre-families: el conteo dice qué se ha explorado, no cuánto pesa la familia). Servidor: no hay nada que desplegar.
 */
export function GenreFamilies({ heading, description, indexLabel, big, index }: GenreFamiliesProps) {
  if (big.length === 0) return null;
  return (
    <section id="generos" aria-labelledby="explore-genres-heading" className="flex w-full flex-col gap-5">
      <SectionHeading id="explore-genres-heading" title={heading} description={description} />
      <ul id="explore-genre-families" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {big.map((family) => (
          <li key={family.key}>
            <BigTile family={family} />
          </li>
        ))}
      </ul>
      {index.length > 0 ? (
        <div className="flex flex-col gap-2 pt-3">
          <h3 id="explore-genre-index-label" className="font-data text-xs uppercase tracking-wide text-paper-muted">
            {indexLabel}
          </h3>
          <ul aria-labelledby="explore-genre-index-label" className="columns-2 gap-x-6 sm:columns-3 lg:columns-4 lg:gap-x-8">
            {index.map((family) => (
              <li key={family.key} className="break-inside-avoid">
                <Link
                  href={family.href}
                  className="group flex min-h-11 items-center justify-between gap-3 border-b border-ink-border py-2 font-display text-[1.0625rem] text-paper transition-colors hover:text-amber focus-visible:text-amber"
                >
                  <span className="min-w-0">{family.label}</span>
                  <span aria-hidden="true" className="text-amber opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
