import { Link } from "@/i18n/navigation";
import { AlbumCard } from "@/components/catalog/AlbumCard";
import type { ReleaseGroup, ReleaseGroupCategory } from "@/lib/api/schemas";

interface AlbumRailProps {
  heading: string;
  albums: ReleaseGroup[];
  categoryLabels: Record<ReleaseGroupCategory, string>;
  coverLabel: string;
  /** Hay sesión: el menú de acciones de cada disco pide sus marcas. */
  authenticated?: boolean;
  /** Enlace "Ver todo" junto al encabezado (p. ej. la pestaña completa de la página de género). */
  seeAll?: { href: string; label: string };
  /** Identificador de la sección, para enlazar a ella con un ancla. */
  id?: string;
}

/**
 * Riel de álbumes de la portada de `/explore`: encabezado + grilla de
 * `AlbumCard`. No pagina. No renderiza nada si `albums` viene vacío — la
 * portada se compone solo con las secciones que tienen contenido.
 */
export function AlbumRail({ heading, albums, categoryLabels, coverLabel, authenticated = false, seeAll, id }: AlbumRailProps) {
  if (albums.length === 0) return null;
  return (
    <section id={id} className="flex w-full flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl text-paper">{heading}</h2>
        {seeAll && (
          <Link href={seeAll.href} className="font-data text-sm text-amber underline-offset-2 hover:underline">
            {seeAll.label} →
          </Link>
        )}
      </div>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {albums.map((album) => (
          <li key={album.id}>
            <AlbumCard
              releaseGroup={album}
              categoryLabel={categoryLabels[album.category]}
              coverLabel={coverLabel}
              authenticated={authenticated}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
