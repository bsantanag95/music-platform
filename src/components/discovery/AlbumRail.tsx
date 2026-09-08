import { AlbumCard } from "@/components/catalog/AlbumCard";
import type { ReleaseGroup, ReleaseGroupCategory } from "@/lib/api/schemas";

interface AlbumRailProps {
  heading: string;
  albums: ReleaseGroup[];
  categoryLabels: Record<ReleaseGroupCategory, string>;
  coverLabel: string;
}

/**
 * Riel de álbumes de la portada de `/explore`: encabezado + grilla de
 * `AlbumCard`. No pagina. No renderiza nada si `albums` viene vacío — la
 * portada se compone solo con las secciones que tienen contenido.
 */
export function AlbumRail({ heading, albums, categoryLabels, coverLabel }: AlbumRailProps) {
  if (albums.length === 0) return null;
  return (
    <section className="flex w-full flex-col gap-3">
      <h2 className="font-display text-xl text-paper">{heading}</h2>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {albums.map((album) => (
          <li key={album.id}>
            <AlbumCard
              releaseGroup={album}
              categoryLabel={categoryLabels[album.category]}
              coverLabel={coverLabel}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
