import { Link } from "@/i18n/navigation";

export interface SliceLink {
  key: string;
  label: string;
  href: string;
  current: boolean;
}

/** Menú de la fila (las otras décadas): un desplegable cerrado por defecto con más enlaces. */
export interface FacetMenu {
  label: string;
  links: SliceLink[];
}

export interface Facet {
  /** Rótulo visible de la fila ("Año", "Género"): dice qué filtra. */
  label: string;
  links: SliceLink[];
  menu?: FacetMenu;
}

const CHIP = "inline-flex shrink-0 items-center rounded-full border px-3 py-1 font-data text-xs transition-colors";
const CHIP_CURRENT = "border-amber bg-ink-surface text-paper";
const CHIP_IDLE = "border-ink-border text-paper-muted hover:border-paper-muted/60 hover:text-paper focus-visible:border-amber";

/**
 * Una fila de filtros del listado de una década (openspec: redesign-decade-view): rótulo, chips que filtran esta misma lista
 * (anillo en el actual) y, al final, un menú opcional. En angosto la fila es una línea que se desplaza y el menú pasa a su propia
 * línea; desde `md` los chips se reparten en líneas y el menú es un panel flotante bajo su resumen. Todo son enlaces y un
 * `<details>`: funciona sin JavaScript. No pinta nada sin chips.
 */
export function FacetRow({ facet }: { facet: Facet }) {
  const { label, links, menu } = facet;
  if (links.length === 0) return null;
  const showMenu = menu && menu.links.length > 1;

  return (
    <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2">
      <span aria-hidden="true" className="w-12 shrink-0 font-data text-xs text-paper-muted/80">
        {label}
      </span>
      <nav
        aria-label={label}
        className="themed-scrollbar -mx-4 min-w-0 flex-1 basis-0 overflow-x-auto px-4 py-0.5 md:mx-0 md:overflow-visible md:px-0"
      >
        <ul className="flex w-max gap-1.5 md:w-auto md:flex-wrap">
          {links.map((link) => (
            <li key={link.key}>
              <Link
                href={link.href}
                scroll={false}
                aria-current={link.current ? "page" : undefined}
                className={`${CHIP} ${link.current ? CHIP_CURRENT : CHIP_IDLE}`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {showMenu ? (
        <details className="group w-full md:relative md:w-auto">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 font-data text-xs text-paper-muted transition-colors hover:text-paper focus-visible:text-paper [&::-webkit-details-marker]:hidden">
            {menu.label}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
              className="size-3.5 transition-transform group-open:rotate-180"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          <ul className="flex flex-wrap gap-1.5 pt-3 md:absolute md:right-0 md:top-full md:z-20 md:mt-2 md:w-80 md:rounded-lg md:border md:border-ink-border md:bg-ink-surface md:p-3">
            {menu.links.map((link) => (
              <li key={link.key}>
                <Link
                  href={link.href}
                  scroll={false}
                  aria-current={link.current ? "page" : undefined}
                  className={`${CHIP} ${link.current ? CHIP_CURRENT : CHIP_IDLE}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
