import { AlbumCard } from "@/components/catalog/AlbumCard";
import type { ReleaseGroup, ReleaseGroupCategory } from "@/lib/api/schemas";
import { RailScroller } from "./RailScroller";
import { SectionHeader } from "./SectionHeader";

interface AlbumRailProps {
  heading: string;
  /** Una línea bajo el título: qué reúne el riel o con qué regla. */
  description?: string;
  albums: ReleaseGroup[];
  categoryLabels: Record<ReleaseGroupCategory, string>;
  coverLabel: string;
  /** Hay sesión: el menú de acciones de cada disco pide sus marcas. */
  authenticated?: boolean;
  /** Enlace "Ver todo" junto al encabezado (p. ej. la pestaña completa de la página de género). */
  seeAll?: { href: string; label: string };
  /** Identificador de la sección, para enlazar a ella con un ancla. */
  id?: string;
  /**
   * `grid` (predeterminado): grilla de hasta dos filas. `scroll`: una sola fila desplazable con
   * flechas (portada de `/explore`, donde se apilan varios rieles).
   */
  layout?: "grid" | "scroll";
}

/**
 * Riel de álbumes: encabezado + `AlbumCard`s. No pagina. No renderiza nada si `albums` viene
 * vacío — la portada se compone solo con las secciones que tienen contenido.
 */
export function AlbumRail({
  heading,
  description,
  albums,
  categoryLabels,
  coverLabel,
  authenticated = false,
  seeAll,
  id,
  layout = "grid",
}: AlbumRailProps) {
  if (albums.length === 0) return null;
  const headingId = id ? `${id}-heading` : undefined;
  const header = <SectionHeader heading={heading} description={description} seeAll={seeAll} headingId={headingId} />;

  if (layout === "scroll") {
    return (
      <section id={id} aria-labelledby={headingId} className="flex w-full scroll-mt-24 flex-col gap-3">
        <RailScroller header={header} labelledBy={headingId}>
          {albums.map((album) => (
            <li
              key={album.id}
              className="w-[44%] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-4rem)/5)] xl:w-[calc((100%-5rem)/6)]"
            >
              <AlbumCard
                releaseGroup={album}
                categoryLabel={categoryLabels[album.category]}
                coverLabel={coverLabel}
                authenticated={authenticated}
                menuPositioning="fixed"
              />
            </li>
          ))}
        </RailScroller>
      </section>
    );
  }

  return (
    <section id={id} aria-labelledby={headingId} className="flex w-full flex-col gap-3">
      {header}
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
