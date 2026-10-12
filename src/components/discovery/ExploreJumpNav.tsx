import { MIN_SECTIONS_FOR_JUMP_NAV } from "@/services/discovery/constants";

// Navegación rápida de la portada de `/explore` (openspec: reorder-explore-sections, design D3-D6): una fila de
// píldoras con un enlace por cada sección que se renderiza, hacia su ancla. Sin estado ni JavaScript: son enlaces
// `#ancla` normales (las secciones llevan `scroll-mt-24`, así el encabezado global no tapa su título). No es fija ni
// resalta la sección activa. La página le pasa solo las secciones visibles, así nunca enlaza a una omitida.

export interface JumpItem {
  /** Ancla de la sección (`id` de su `<section>`). */
  id: string;
  label: string;
}

interface ExploreJumpNavProps {
  /** Nombre accesible de la navegación ("En esta página"). */
  label: string;
  /** Secciones visibles, en el orden de la página. */
  items: JumpItem[];
}

export function ExploreJumpNav({ label, items }: ExploreJumpNavProps) {
  if (items.length < MIN_SECTIONS_FOR_JUMP_NAV) return null;
  return (
    <nav aria-label={label} className="themed-scrollbar -mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 py-0.5 md:mx-0 md:w-full md:overflow-visible md:px-0">
      <ul className="flex w-max gap-1.5 md:w-auto md:flex-wrap">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="inline-flex shrink-0 items-center rounded-full border border-ink-border px-3 py-1 font-data text-xs text-paper-muted transition-colors hover:border-amber hover:text-paper focus-visible:border-amber focus-visible:text-paper"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
