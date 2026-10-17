import type { ReleaseGroupCategory } from "@/lib/api/schemas";
import { albumHref, artistHref, songHref } from "@/lib/catalog-links";
import type { PopularSection } from "@/services/discovery/discovery";
import { POPULARITY_FIGURE_MIN, type PopularWindow } from "@/services/discovery/constants";
import { PopularChart } from "./PopularChart";
import { PopularTabs, type PopularTabPanel } from "./PopularTabs";
import { SectionHeader } from "./SectionHeader";

interface PopularNowProps {
  section: PopularSection;
  heading: string;
  tabsLabel: string;
  tabLabels: { albums: string; artists: string; songs: string };
  /** El subtítulo de la ventana usada ("este mes", "en los últimos 3 meses", "de siempre"). */
  windowDescription: (window: PopularWindow) => string;
  /** "12 personas". */
  peopleLabel: (count: number) => string;
  categoryLabels: Record<ReleaseGroupCategory, string>;
  artistNames?: Record<string, string>;
}

/**
 * "Popular ahora" de `/explore` (openspec: explore-popular-now): lo que más mueve a la comunidad, por personas distintas, en tres
 * pestañas (Álbumes · Artistas · Canciones). Una pestaña sin resultado no aparece y, sin ninguna, la sección no se renderiza. La
 * cifra "N personas" solo aparece desde `POPULARITY_FIGURE_MIN`: con menos, presumirla sería exagerar. No es personalizada: la
 * misma para todas las personas.
 */
export function PopularNow({
  section,
  heading,
  tabsLabel,
  tabLabels,
  windowDescription,
  peopleLabel,
  categoryLabels,
  artistNames,
}: PopularNowProps) {
  const figure = (people: number) => (people >= POPULARITY_FIGURE_MIN ? peopleLabel(people) : undefined);
  const tabs: PopularTabPanel[] = [];

  if (section.albums) {
    tabs.push({
      key: "albums",
      label: tabLabels.albums,
      description: windowDescription(section.albums.window),
      panel: (
        <PopularChart
          label={tabLabels.albums}
          items={section.albums.items.map((album) => {
            const artistName = artistNames?.[album.id] ?? null;
            return {
              id: album.id,
              href: albumHref(artistName, album.title, album.id),
              title: album.title,
              subtitle: artistName,
              meta: [album.firstReleaseYear, categoryLabels[album.category]].filter(Boolean).join(" · "),
              image: { src: album.coverThumbUrl, shape: "square" as const },
              figure: figure(album.people),
            };
          })}
        />
      ),
    });
  }
  if (section.artists) {
    tabs.push({
      key: "artists",
      label: tabLabels.artists,
      description: windowDescription(section.artists.window),
      panel: (
        <PopularChart
          label={tabLabels.artists}
          items={section.artists.items.map((item) => ({
            id: item.id,
            href: artistHref(item.name, item.id),
            title: item.name,
            image: { src: item.photoUrl, shape: "round" as const },
            figure: figure(item.people),
          }))}
        />
      ),
    });
  }
  if (section.songs) {
    tabs.push({
      key: "songs",
      label: tabLabels.songs,
      description: windowDescription(section.songs.window),
      panel: (
        <PopularChart
          label={tabLabels.songs}
          items={section.songs.items.map((item) => ({
            id: item.id,
            href: songHref(item.artistName, item.title, item.id),
            title: item.title,
            subtitle: item.artistName,
            image: { src: item.coverThumbUrl, shape: "square" as const },
            figure: figure(item.people),
          }))}
        />
      ),
    });
  }
  if (tabs.length === 0) return null;

  return (
    <section id="popular" aria-labelledby="popular-heading" className="flex w-full scroll-mt-24 flex-col gap-3">
      <SectionHeader heading={heading} headingId="popular-heading" />
      <PopularTabs tabs={tabs} label={tabsLabel} />
    </section>
  );
}
