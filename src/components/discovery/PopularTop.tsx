import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import type { PopularChartItem } from "./PopularChart";

/**
 * Top de álbumes de "Popular ahora" (openspec: redesign-explore-phase2): cada disco con su posición en cifras grandes de contorno
 * detrás de la carátula, como un top de discos de tienda. La carátula se monta con un margen izquierdo fijo, así "1" y "12" la dejan
 * del mismo tamaño; la cifra se mide en unidades del contenedor (`cqw`), así que "12" se lee entera a cualquier ancho. Desde `md` es una rejilla que se ve entera (4 columnas, 6 desde `lg`); en el teléfono, una fila táctil con el
 * siguiente disco asomando. La posición la da el `<ol>`; la cifra grande es decorativa. `role="list"` porque `list-style: none` le
 * quita la semántica de lista en Safari.
 */
export function PopularTop({ items, label }: { items: PopularChartItem[]; label: string }) {
  if (items.length === 0) return null;
  return (
    <ol
      role="list"
      aria-label={label}
      className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-8 sm:px-8 md:mx-0 md:grid md:grid-cols-4 md:gap-x-5 md:gap-y-8 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-6 [&::-webkit-scrollbar]:hidden"
    >
      {items.map((item, index) => (
        <li key={item.id} className="w-[62%] shrink-0 snap-start [container-type:inline-size] sm:w-[38%] md:w-auto">
          <Link href={item.href} className="group flex min-w-0 flex-col gap-3">
            <span className="relative block pl-[36%]">
              <span
                aria-hidden="true"
                className={`absolute bottom-[-0.08em] left-0 font-display text-[40cqw] font-bold leading-none tracking-[-0.06em] text-transparent tabular-nums [-webkit-text-stroke-width:1.5px] ${
                  index === 0 ? "[-webkit-text-stroke-color:var(--color-amber)]" : "[-webkit-text-stroke-color:var(--color-paper-muted)] opacity-60"
                }`}
              >
                {index + 1}
              </span>
              <CoverThumb
                cover={item.image.src}
                label=""
                className="relative aspect-square w-full rounded-md shadow-[0_18px_30px_-16px_rgba(0,0,0,0.9)] ring-1 ring-ink transition-transform duration-200 group-hover:-translate-y-0.5"
              />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-display text-base text-paper transition-colors group-hover:text-amber">
                {item.title}
              </span>
              {item.subtitle ? <span className="truncate font-body text-sm text-paper-muted">{item.subtitle}</span> : null}
              {item.figure ? (
                <span className="mt-0.5 truncate font-data text-xs tabular-nums text-paper-muted">{item.figure}</span>
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
