import { MIN_SECTIONS_FOR_JUMP_NAV } from "@/services/discovery/constants";
import { JumpNavLinks } from "./JumpNavLinks";

// Barra de pasillos de la portada de `/explore` (openspec: reorder-explore-sections D3-D6, redesign-explore-phase1): un
// enlace por cada sección que se renderiza, hacia su ancla. Queda fija bajo la cabecera global mientras se recorre la
// portada y marca la sección que está a la vista (`JumpNavLinks`, cliente). Sin JavaScript son enlaces `#ancla` normales,
// sin marca. La página le pasa solo las secciones visibles, así nunca enlaza a una omitida.

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
    // Franja a todo el ancho del contenedor, pegada bajo la cabecera global (69 px debajo de `lg`, 65 px desde `lg`).
    <div className="sticky top-[4.3125rem] z-20 -mx-4 w-[calc(100%+2rem)] border-b border-ink-border bg-ink/90 backdrop-blur-md supports-[backdrop-filter]:bg-ink/75 sm:-mx-8 sm:w-[calc(100%+4rem)] lg:top-[4.0625rem] xl:-mx-12 xl:w-[calc(100%+6rem)]">
      <nav aria-label={label} className="px-4 sm:px-8 xl:px-12">
        <JumpNavLinks items={items} />
      </nav>
    </div>
  );
}
