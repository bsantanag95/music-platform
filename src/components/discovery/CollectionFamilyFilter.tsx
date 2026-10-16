import { Link } from "@/i18n/navigation";

export interface FamilyFilterOption {
  /** Familia que filtra; `null` = "Todas". */
  value: string | null;
  label: string;
  href: string;
}

interface CollectionFamilyFilterProps {
  /** Nombre accesible de la barra ("Filtrar por tipo"). */
  label: string;
  options: FamilyFilterOption[];
  /** Familia activa; `undefined` = "Todas". */
  active?: string;
}

const CHIP =
  "inline-flex shrink-0 items-center rounded-full border px-3 py-1 font-data text-xs transition-colors focus-visible:border-amber";
const CHIP_OFF = `${CHIP} border-ink-border text-paper-muted hover:border-amber hover:text-paper`;
const CHIP_ON = `${CHIP} border-amber text-paper`;

/**
 * Filtro por tipo de la página de colecciones (openspec: redesign-collections-hub): "Todas" y las familias que tienen
 * contenido. Filtra vigentes y archivo a la vez (un solo `?familia=`). Con una sola familia no hay nada que elegir y no
 * se pinta. Cada opción es un enlace: el filtro es una vista con su propia URL, no un estado del cliente.
 */
export function CollectionFamilyFilter({ label, options, active }: CollectionFamilyFilterProps) {
  // "Todas" + una familia no ofrece una elección real.
  if (options.filter((option) => option.value !== null).length < 2) return null;
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const isActive = (option.value ?? undefined) === active;
        return (
          <Link
            key={option.value ?? "all"}
            href={option.href}
            aria-current={isActive ? "page" : undefined}
            className={isActive ? CHIP_ON : CHIP_OFF}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
