import { ListCard } from "@/components/lists/ListCard";
import type { FeaturedCollection } from "@/services/discovery/discovery";

interface CollectionRailProps {
  heading: string;
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
  collections,
  curatorUsername,
  itemsLabel,
}: CollectionRailProps) {
  if (collections.length === 0) return null;
  return (
    <section className="flex w-full flex-col gap-3">
      <h2 className="font-display text-xl text-paper">{heading}</h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {collections.map((collection) => (
          <li key={collection.id}>
            <ListCard
              href={`/users/${encodeURIComponent(curatorUsername)}/lists/${collection.id}`}
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
