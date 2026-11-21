import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { FeaturedCollection } from "@/services/discovery/discovery";
import { collectionLinkOf, collectionTitleOf } from "@/components/discovery/collection-links";
import { FAMILY_STAMP_CLASS, SleeveStack } from "@/components/discovery/CollectionSleeves";
import type { CollectionFamily } from "@/services/discovery/collections/families";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";

export const MOSAIC_LIMIT = 6;

type Tile = "featured" | "medium" | "wide";

/**
 * Qué forma toma cada colección del mosaico según cuántas hay (sin huecos en la rejilla de 4 columnas):
 * 6 o más → destacada 2×2 + cuatro medianas + la sexta a lo ancho; 5 → destacada + cuatro medianas;
 * 4 o menos → todas medianas en una fila.
 */
export function mosaicTiles(count: number): Tile[] {
  const n = Math.min(count, MOSAIC_LIMIT);
  if (n >= 6) return ["featured", "medium", "medium", "medium", "medium", "wide"];
  if (n === 5) return ["featured", "medium", "medium", "medium", "medium"];
  return Array.from({ length: n }, () => "medium" as const);
}

const ROW_COLS: Record<number, string> = {
  1: "lg:grid-cols-2",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

interface CollectionMosaicProps {
  collections: FeaturedCollection[];
  /** `username` de la cuenta curadora, para armar el enlace a la lista pública. */
  curatorUsername: string;
  itemsLabel: (count: number) => string;
  /** `id` del encabezado de la sección (la lista lo usa como nombre accesible). */
  labelledBy: string;
  /** Nombre de la familia de cada colección, como sello sobre el título (Explorar). Sin él no hay sello (Inicio). */
  familyLabel?: (family: CollectionFamily) => string;
}

// Colecciones de Inicio y de la portada de Explorar (openspec: redesign-anon-home-phase2, redesign-explore-phase2):
// desde `lg`, un mosaico con una colección destacada; por debajo, las mismas fichas en una fila con
// desplazamiento horizontal, para que no se apilen a ancho completo en el teléfono. Explorar le pasa
// `familyLabel` para el sello de familia. No renderiza nada sin colecciones.
export async function CollectionMosaic({
  collections,
  curatorUsername,
  itemsLabel,
  labelledBy,
  familyLabel,
}: CollectionMosaicProps) {
  if (collections.length === 0) return null;
  const locale = await getLocale();
  const tiles = mosaicTiles(collections.length);
  const shown = collections.slice(0, tiles.length);
  const hasFeatured = tiles[0] === "featured";

  return (
    <ul
      aria-labelledby={labelledBy}
      style={hasFeatured ? { gridTemplateRows: tiles.includes("wide") ? "15rem 15rem auto" : "15rem 15rem" } : undefined}
      className={`-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden ${
        hasFeatured ? "lg:grid-cols-4" : `${ROW_COLS[shown.length] ?? "lg:grid-cols-4"} lg:auto-rows-[15rem]`
      }`}
    >
      {shown.map((collection, index) => {
        const tile = tiles[index]!;
        const title = collectionTitleOf(collection, locale);
        const href = collectionLinkOf(collection, locale, curatorUsername);
        const count = itemsLabel(collection.itemCount);
        return (
          <li
            key={collection.id}
            className={`w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-auto ${
              tile === "featured" ? "lg:col-span-2 lg:row-span-2" : tile === "wide" ? "lg:col-span-4" : ""
            }`}
          >
            <Link
              href={href}
              className={`group relative flex h-full min-h-56 overflow-hidden rounded-xl border border-ink-border bg-ink-surface p-5 transition-colors hover:border-amber/70 focus-visible:border-amber ${
                tile === "wide" ? "flex-col gap-4 lg:min-h-0 lg:flex-row lg:items-center lg:justify-between" : "flex-col justify-end gap-4"
              }`}
            >
              {tile === "featured" ? <FeaturedCovers covers={collection.coverThumbs} /> : null}
              {tile === "medium" ? (
                <div className="mb-auto">
                  <SleeveStack covers={collection.coverThumbs} size="card" />
                </div>
              ) : null}
              <div className="flex min-w-0 flex-col items-start gap-1">
                {familyLabel ? (
                  <span className={`mb-1 ${FAMILY_STAMP_CLASS}`}>{familyLabel(collection.family)}</span>
                ) : null}
                <h3
                  className={`font-display font-bold leading-tight text-paper transition-colors group-hover:text-amber ${
                    tile === "featured" ? "text-[clamp(1.5rem,2.2vw,2.125rem)]" : "line-clamp-2 text-lg"
                  }`}
                >
                  {title}
                </h3>
                {tile !== "medium" && collection.description ? (
                  <p className="line-clamp-2 font-body text-sm text-paper-muted">{collection.description}</p>
                ) : null}
                <span className="font-data text-xs text-paper-muted">{count}</span>
              </div>
              {tile === "wide" ? (
                <div aria-hidden="true" className="flex shrink-0 gap-2">
                  {collection.coverThumbs.slice(0, 5).map((cover, i) => (
                    <CoverThumb key={i} cover={cover} label="" className="size-14 rounded-md ring-1 ring-ink" />
                  ))}
                </div>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// Cuadrícula de la colección destacada: hasta ocho carátulas en 4 × 2; sin carátulas suficientes, el
// disco de reserva ocupa el resto (nunca un hueco vacío).
function FeaturedCovers({ covers }: { covers: string[] }) {
  const cells: (string | null)[] = Array.from({ length: 8 }, (_, i) => covers[i] ?? null);
  return (
    <div aria-hidden="true" className="mb-auto grid grid-cols-4 gap-2 lg:gap-2.5">
      {cells.map((cover, i) =>
        cover ? (
          <CoverThumb key={i} cover={cover} label="" className="aspect-square w-full rounded-md ring-1 ring-ink" />
        ) : (
          <DiscPlaceholder key={i} alt="" className="aspect-square w-full rounded-md" />
        ),
      )}
    </div>
  );
}
