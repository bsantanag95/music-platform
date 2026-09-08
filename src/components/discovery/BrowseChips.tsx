import { Link } from "@/i18n/navigation";

interface Chip {
  label: string;
  href: string;
}

interface BrowseChipsProps {
  heading: string;
  chips: Chip[];
}

/**
 * Riel de navegación por facetas (década o género) de `/explore`: encabezado +
 * fila de chips que enlazan a un listado filtrado (`/explore?decada=` o
 * `/explore?genero=`). No renderiza nada si no hay chips.
 */
export function BrowseChips({ heading, chips }: BrowseChipsProps) {
  if (chips.length === 0) return null;
  return (
    <section className="flex w-full flex-col gap-3">
      <h2 className="font-display text-xl text-paper">{heading}</h2>
      <ul className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <li key={chip.href}>
            <Link
              href={chip.href}
              className="inline-flex rounded-full border border-ink-border px-3 py-1 font-data text-sm text-paper-muted transition-colors hover:border-amber hover:text-paper"
            >
              {chip.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
