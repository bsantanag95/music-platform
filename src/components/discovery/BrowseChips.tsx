import { Link } from "@/i18n/navigation";

interface Chip {
  label: string;
  href: string;
}

interface BrowseChipsProps {
  heading: string;
  chips: Chip[];
  /** Chips secundarios, detrás de un desplegable "Más" (familias secundarias de géneros). */
  moreChips?: Chip[];
  moreLabel?: string;
}

const CHIP_CLASS =
  "inline-flex rounded-full border border-ink-border px-3 py-1 font-data text-sm text-paper-muted transition-colors hover:border-amber hover:text-paper";

function ChipList({ chips }: { chips: Chip[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <li key={chip.href}>
          <Link href={chip.href} className={CHIP_CLASS}>
            {chip.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Riel de navegación por facetas (década o familia de géneros) de `/explore`: encabezado +
 * fila de chips que enlazan a un listado filtrado (`/explore?decada=`, `/explore?familia=`).
 * Los chips secundarios quedan detrás de un "Más" nativo (`<details>`), sin JavaScript. No
 * renderiza nada si no hay chips.
 */
export function BrowseChips({ heading, chips, moreChips = [], moreLabel }: BrowseChipsProps) {
  if (chips.length === 0 && moreChips.length === 0) return null;
  return (
    <section className="flex w-full flex-col gap-3">
      <h2 className="font-display text-xl text-paper">{heading}</h2>
      {chips.length > 0 && <ChipList chips={chips} />}
      {moreChips.length > 0 && moreLabel && (
        <details className="group">
          <summary className={`${CHIP_CLASS} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
            {moreLabel}
          </summary>
          <div className="mt-2">
            <ChipList chips={moreChips} />
          </div>
        </details>
      )}
    </section>
  );
}
