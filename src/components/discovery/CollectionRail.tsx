import { ListCard } from "@/components/lists/ListCard";
import { listHref } from "@/lib/catalog-links";
import type { FeaturedCollection } from "@/services/discovery/discovery";
import { SectionHeader } from "./SectionHeader";

interface CollectionRailProps {
  heading: string;
  /** Una línea bajo el título (qué son estas colecciones). */
  description?: string;
  collections: FeaturedCollection[];
  /** `username` de la cuenta curadora, para armar el enlace a la lista pública. */
  curatorUsername: string;
  itemsLabel: (count: number) => string;
}

/**
 * Riel de colecciones editoriales de `/explore`: listas públicas de la cuenta
 * curadora, ya ordenadas por `rank`. Cada tarjeta enlaza al detalle público de
 * la lista. No renderiza nada si no hay colecciones.
 */
export function CollectionRail({
  heading,
  description,
  collections,
  curatorUsername,
  itemsLabel,
}: CollectionRailProps) {
  if (collections.length === 0) return null;
  return (
    <section className="flex w-full flex-col gap-3">
      <SectionHeader heading={heading} description={description} />
      <ul className="grid gap-4 sm:grid-cols-2">
        {collections.map((collection) => (
          <li key={collection.id}>
            <ListCard
              href={listHref(curatorUsername, collection.title, collection.id)}
              title={collection.title}
              coverThumbs={collection.coverThumbs}
              meta={<span>{itemsLabel(collection.itemCount)}</span>}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
