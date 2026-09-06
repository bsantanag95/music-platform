import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  artist,
  credit,
  recording,
  release,
  releaseGroup,
  track,
  type RecordingRow,
} from "@/db/schema";
import { mapReleaseGroupCategory, yearFromMbDate } from "../musicbrainz/mappers";
import type { MBArtistCreditItem, MBReleaseWithReleaseGroup } from "../musicbrainz/types";
import { ingestCredits } from "./ingest-discography";
import { upsertReleaseGroupStubs, type ReleaseGroupCategoryValue } from "./ingest-release-group";

// Ingesta bajo demanda de una grabación suelta (openspec: catalog-recording-
// ingestion). Es lo mínimo para responder "¿en qué álbumes aparece esta
// canción?" desde la búsqueda: `recording` + créditos + stubs de
// `release_group`. PROHIBIDO escribir `release`/`track` desde acá:
// `findOrIngestTracklist` devuelve el release local existente tal cual sin
// re-consultar MusicBrainz, así que un tracklist parcial congelaría el álbum
// con datos incompletos. Las apariciones que consume la búsqueda se calculan
// en vivo desde el browse (cacheado como contexto de búsqueda).

export interface RecordingSeed {
  mbid: string;
  title: string;
  /** Segundos, si la respuesta de búsqueda los trae. */
  durationSec: number | null;
  credits: MBArtistCreditItem[];
}

export interface SongContextAlbum {
  releaseGroupId: string;
  mbid: string | null;
  title: string;
  category: ReleaseGroupCategoryValue;
  /** Año del release más antiguo del grupo, si se conoce (proxy del álbum original). */
  year: number | null;
}

const CATEGORY_ORDER: Record<ReleaseGroupCategoryValue, number> = {
  studio: 0,
  single_ep: 1,
  compilation: 2,
  live_other: 3,
};

/** Orden D5 del design: categoría, luego año ascendente (null al final), luego título. */
export function sortSongContextAlbums(albums: SongContextAlbum[]): SongContextAlbum[] {
  return [...albums].sort((a, b) => {
    const categoryDiff = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
    if (categoryDiff !== 0) return categoryDiff;
    const yearDiff =
      (a.year ?? Number.MAX_SAFE_INTEGER) - (b.year ?? Number.MAX_SAFE_INTEGER);
    if (yearDiff !== 0) return yearDiff;
    return a.title.localeCompare(b.title);
  });
}

/**
 * Crea o recupera una `recording` por `mbid` de forma idempotente e ingiere
 * sus créditos (vía `ingestCredits`, ADR 0004, creando los stubs de artista
 * que falten). Si la fila ya existe NO se sobrescribe ni se re-ingieren los
 * créditos: puede venir de un tracklist completo ya visitado.
 */
export async function findOrIngestRecording(seed: RecordingSeed): Promise<RecordingRow> {
  const [existing] = await db
    .select()
    .from(recording)
    .where(eq(recording.mbid, seed.mbid))
    .limit(1);
  if (existing) return existing;

  const inserted = await db
    .insert(recording)
    .values({ mbid: seed.mbid, title: seed.title, durationSec: seed.durationSec })
    .onConflictDoNothing({ target: recording.mbid })
    .returning();

  let row = inserted[0];
  if (!row) {
    // Conflicto entre la lectura y el insert (carrera): la fila ya está, se relee.
    const [conflict] = await db
      .select()
      .from(recording)
      .where(eq(recording.mbid, seed.mbid))
      .limit(1);
    row = conflict;
  }
  if (!row) throw new Error(`No se pudo resolver la grabación ${seed.mbid}`);

  if (seed.credits.length > 0) {
    await ingestCredits(seed.credits, { recordingId: row.id });
  }
  return row;
}

/**
 * Agrupa las apariciones de una grabación en álbumes (release_group): muchos
 * releases distintos comparten el mismo grupo. Cada grupo se persiste como
 * stub y se resuelve por su `id` local; el año es el del release más antiguo
 * del grupo.
 */
export async function albumsFromMbReleases(
  releases: MBReleaseWithReleaseGroup[],
): Promise<SongContextAlbum[]> {
  interface Group {
    title: string;
    category: ReleaseGroupCategoryValue;
    year: number | null;
  }
  const byMbid = new Map<string, Group>();

  for (const item of releases) {
    const rg = item["release-group"];
    if (!rg?.id) continue;
    const year = yearFromMbDate(item.date);
    const known = byMbid.get(rg.id);
    if (!known) {
      byMbid.set(rg.id, {
        title: rg.title,
        category: mapReleaseGroupCategory(rg["primary-type"], rg["secondary-types"]),
        year,
      });
      continue;
    }
    if (year !== null && (known.year === null || year < known.year)) known.year = year;
  }

  const stubs = [...byMbid.entries()].map(([mbid, group]) => ({
    mbid,
    title: group.title,
    category: group.category,
  }));
  const rows = await upsertReleaseGroupStubs(stubs);

  return rows
    .filter((row): row is typeof row & { mbid: string } => row.mbid !== null)
    .map((row) => {
      const group = byMbid.get(row.mbid);
      return {
        releaseGroupId: row.id,
        mbid: row.mbid,
        // La fila local manda: un release_group ya enriquecido no se re-titula.
        title: row.title,
        category: row.category as ReleaseGroupCategoryValue,
        year: group?.year ?? null,
      };
    });
}

/**
 * Apariciones locales de una grabación ya ingerida (tracklist de un álbum
 * visitado): `track → release → release_group` agrupado por álbum. Devuelve
 * `[]` para grabaciones stub creadas por la búsqueda (nunca tienen tracks).
 */
export async function localAppearanceAlbums(recordingId: string): Promise<SongContextAlbum[]> {
  const rows = await db
    .select({
      releaseGroupId: releaseGroup.id,
      mbid: releaseGroup.mbid,
      title: releaseGroup.title,
      category: releaseGroup.category,
      releaseDate: release.releaseDate,
    })
    .from(track)
    .innerJoin(release, eq(release.id, track.releaseId))
    .innerJoin(releaseGroup, eq(releaseGroup.id, release.releaseGroupId))
    .where(eq(track.recordingId, recordingId))
    .orderBy(asc(releaseGroup.title));

  interface Group {
    mbid: string | null;
    title: string;
    category: ReleaseGroupCategoryValue;
    year: number | null;
  }
  const byId = new Map<string, Group>();
  for (const row of rows) {
    const year = yearFromMbDate(row.releaseDate);
    const known = byId.get(row.releaseGroupId);
    if (!known) {
      byId.set(row.releaseGroupId, {
        mbid: row.mbid,
        title: row.title,
        category: row.category as ReleaseGroupCategoryValue,
        year,
      });
      continue;
    }
    if (year !== null && (known.year === null || year < known.year)) known.year = year;
  }

  return [...byId.entries()].map(([releaseGroupId, group]) => ({
    releaseGroupId,
    ...group,
  }));
}

/** Nombre del artista primario (crédito posición 0) de una grabación local. */
export async function localRecordingArtistName(recordingId: string): Promise<string | null> {
  const [row] = await db
    .select({ name: artist.name })
    .from(credit)
    .innerJoin(artist, eq(artist.id, credit.artistId))
    .where(and(eq(credit.recordingId, recordingId), eq(credit.role, "primary")))
    .orderBy(asc(credit.position))
    .limit(1);
  return row?.name ?? null;
}
