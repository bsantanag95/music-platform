import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { credit, releaseGroup } from "@/db/schema";

// Franja de discografía de la página de álbum (openspec: redesign-album-page, D15): álbumes
// del artista principal con la misma `category` que el actual, en orden cronológico. Solo
// lee la base: nunca dispara la ingesta de la discografía desde la página de álbum.

export interface DiscographyItem {
  id: string;
  title: string;
  coverThumbUrl: string | null;
  firstReleaseYear: number | null;
}

export interface DiscographyStrip {
  items: DiscographyItem[];
  currentIndex: number;
  previous: DiscographyItem | null;
  next: DiscographyItem | null;
}

interface SortableAlbum extends DiscographyItem {
  firstReleaseDate: string | null;
}

/** Clave cronológica: fecha completa, si no el año, si no al final; desempate por título e id. */
function chronologicalKey(album: SortableAlbum): string {
  if (album.firstReleaseDate) return album.firstReleaseDate;
  if (album.firstReleaseYear !== null) return `${String(album.firstReleaseYear).padStart(4, "0")}-00-00`;
  return "9999-99-99";
}

export function orderDiscography(albums: SortableAlbum[]): SortableAlbum[] {
  return [...albums].sort(
    (a, b) =>
      chronologicalKey(a).localeCompare(chronologicalKey(b)) ||
      a.title.localeCompare(b.title) ||
      a.id.localeCompare(b.id),
  );
}

/** Ubica el álbum actual en la lista ordenada; `null` si no está (no hay franja que mostrar). */
export function buildDiscographyStrip(
  albums: SortableAlbum[],
  currentId: string,
): DiscographyStrip | null {
  const ordered = orderDiscography(albums);
  const currentIndex = ordered.findIndex((album) => album.id === currentId);
  if (currentIndex === -1 || ordered.length < 2) return null;
  const strip = ordered.map(({ id, title, coverThumbUrl, firstReleaseYear }) => ({
    id,
    title,
    coverThumbUrl,
    firstReleaseYear,
  }));
  return {
    items: strip,
    currentIndex,
    previous: strip[currentIndex - 1] ?? null,
    next: strip[currentIndex + 1] ?? null,
  };
}

export async function getDiscographyStrip(
  primaryArtistId: string,
  current: { id: string; category: string },
): Promise<DiscographyStrip | null> {
  const rows = await db
    .selectDistinct({
      id: releaseGroup.id,
      title: releaseGroup.title,
      coverThumbUrl: releaseGroup.coverThumbUrl,
      firstReleaseYear: releaseGroup.firstReleaseYear,
      firstReleaseDate: releaseGroup.firstReleaseDate,
    })
    .from(credit)
    .innerJoin(releaseGroup, eq(releaseGroup.id, credit.releaseGroupId))
    .where(
      and(
        eq(credit.artistId, primaryArtistId),
        eq(credit.role, "primary"),
        isNull(credit.recordingId),
        eq(releaseGroup.category, current.category),
      ),
    );

  return buildDiscographyStrip(rows, current.id);
}
