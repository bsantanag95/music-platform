import { AlbumCard } from "./AlbumCard";
import type { ReleaseGroup, ReleaseGroupCategory } from "@/lib/api/schemas";

// Orden fijo de secciones en el perfil: mismo orden que documenta el
// modelo de datos para `release_group.category`.
const CATEGORY_ORDER: ReleaseGroupCategory[] = [
  "studio",
  "single_ep",
  "compilation",
  "live_other",
];

interface AlbumGridProps {
  releaseGroups: ReleaseGroup[];
  categoryLabels: Record<ReleaseGroupCategory, string>;
  discographyHeading: string;
  coverLabel: string;
}

// Agrupa la discografía por categoría y solo renderiza secciones que
// tengan contenido — una categoría vacía no genera una sección vacía.
export function AlbumGrid({
  releaseGroups,
  categoryLabels,
  discographyHeading,
  coverLabel,
}: AlbumGridProps) {
  const grouped = new Map<ReleaseGroupCategory, ReleaseGroup[]>();
  for (const rg of releaseGroups) {
    const list = grouped.get(rg.category) ?? [];
    list.push(rg);
    grouped.set(rg.category, list);
  }

  return (
    <section className="flex w-full flex-col gap-8">
      <h2 className="font-display text-xl text-paper">{discographyHeading}</h2>
      {CATEGORY_ORDER.map((category) => {
        const items = grouped.get(category);
        if (!items?.length) return null;
        return (
          <div key={category} className="flex flex-col gap-3">
            <h3 className="font-data text-xs uppercase tracking-wider text-paper-muted">
              {categoryLabels[category]}
            </h3>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((rg) => (
                <li key={rg.id}>
                  <AlbumCard
                    releaseGroup={rg}
                    categoryLabel={categoryLabels[category]}
                    coverLabel={coverLabel}
                  />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
