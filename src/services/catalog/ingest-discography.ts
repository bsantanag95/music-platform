import { and, eq, inArray, isNotNull, isNull, notInArray, sql } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import {
  artist,
  membership,
  releaseGroup,
  credit,
  type ReleaseGroupRow,
  type ArtistRow,
} from "@/db/schema";
import { hasStaleAlbumGenres, syncAlbumGenreSeeds } from "../genres/album-seeds";
import { musicbrainz, RELEASE_BROWSE_PAGE_SIZE } from "../musicbrainz/client";
import { wikidataIdOf } from "../musicbrainz/artist-profile-mappers";
import { mapReleaseGroupCategory } from "../musicbrainz/mappers";
import { upsertArtistStub } from "./ingest-artist";
import { canonicalDateValues } from "./ingest-release-group";
import type { MBArtistCreditItem, MBReleaseGroup } from "../musicbrainz/types";

// Discografía de un artista (openspec: fix-artist-discography-ingestion, capability
// `artist-discography`): browse paginado sin bootlegs, tipos crudos de MusicBrainz,
// marca de release-groups fuera de la discografía y resincronización semanal.

/** Tope de páginas del browse (2.000 release-groups) para acotar un artista anómalo. */
export const DISCOGRAPHY_MAX_PAGES = 20;
/** Páginas que la primera visita trae de forma síncrona; el resto va en segundo plano. */
export const DISCOGRAPHY_INITIAL_PAGES = 3;
/** Antigüedad a partir de la cual una discografía completa se vuelve a sincronizar. */
export const DISCOGRAPHY_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

/** Release-group de la discografía con el rol del crédito del artista. */
export type DiscographyRow = ReleaseGroupRow & { creditRole: "primary" | "featured" };

/**
 * Trae y cachea todos los release-groups donde el artista aparece
 * acreditado (como principal o como feat.), junto con sus créditos.
 *
 * Si `target.discographySyncedAt` ya está seteado, se devuelve directo
 * desde la base local sin esperar a MusicBrainz; si además la discografía
 * no está completa o tiene más de 7 días, se resincroniza en segundo plano.
 * Los release-groups fuera de la discografía nunca se devuelven.
 */
export async function findOrIngestDiscography(target: ArtistRow): Promise<DiscographyRow[]> {
  const direct = await findOrIngestOwnDiscography(target);

  if (target.type !== "person") return direct;

  const groupRows = await db
    .select({ group: artist })
    .from(membership)
    .innerJoin(artist, eq(artist.id, membership.groupId))
    .where(and(eq(membership.personId, target.id), eq(artist.type, "group")));

  const combined = new Map(direct.map((row) => [row.id, row]));
  for (const { group } of groupRows) {
    for (const row of await findOrIngestOwnDiscography(group)) combined.set(row.id, row);
  }
  return [...combined.values()];
}

/** Solo la discografía propia del artista (sin la de sus grupos): la usa la página de artista. */
export async function findOrIngestOwnDiscography(target: ArtistRow): Promise<DiscographyRow[]> {
  if (target.discographySyncedAt) {
    if (needsDiscographyRefresh(target)) scheduleDiscographySync(target.id);
    else scheduleAlbumGenreSync(target.id);
    return readArtistDiscography(target.id);
  }

  if (!target.mbid) return [];

  const result = await syncArtistDiscography(target.id, { mode: "initial" });
  if (result.status === "partial") scheduleDiscographySync(target.id);
  else scheduleAlbumGenreSync(target.id);
  return readArtistDiscography(target.id);
}

/** Discografía guardada de un artista, sin los release-groups fuera de la discografía. */
export async function readArtistDiscography(artistId: string): Promise<DiscographyRow[]> {
  const rows = await db
    .select({ releaseGroup, role: credit.role })
    .from(credit)
    .innerJoin(releaseGroup, eq(releaseGroup.id, credit.releaseGroupId))
    .where(and(eq(credit.artistId, artistId), isNull(releaseGroup.discographyUnlistedAt)));

  // Un artista acreditado dos veces en el mismo release-group cuenta una vez; manda el
  // crédito principal.
  const byId = new Map<string, DiscographyRow>();
  for (const { releaseGroup: row, role } of rows) {
    const creditRole = role === "primary" ? "primary" : "featured";
    const existing = byId.get(row.id);
    if (!existing || (existing.creditRole === "featured" && creditRole === "primary")) {
      byId.set(row.id, { ...row, creditRole });
    }
  }
  return [...byId.values()];
}

/** La discografía nunca se recorrió entera, o la última vez fue hace más de 7 días. */
export function needsDiscographyRefresh(target: Pick<ArtistRow, "discographyCompleteAt">, now = Date.now()): boolean {
  return target.discographyCompleteAt === null || now - target.discographyCompleteAt.getTime() > DISCOGRAPHY_REFRESH_MS;
}

/**
 * Programa una sincronización completa después de responder y, al terminar, la de los géneros
 * semilla de sus álbumes (openspec: add-genre-taxonomy). Fuera de una request de Next
 * (scripts) `after()` no está disponible: se omite y la próxima visita la vuelve a programar.
 */
function scheduleDiscographySync(artistId: string): void {
  try {
    after(async () => {
      try {
        await syncArtistDiscography(artistId, { mode: "full" });
      } catch (error) {
        console.error(`[discography] no se pudo sincronizar la discografía de ${artistId}`, error);
      }
      await runAlbumGenreSync(artistId);
    });
  } catch {
    console.warn(`[discography] sincronización de ${artistId} omitida: fuera de una request`);
  }
}

/** Géneros semilla de los álbumes vencidos del artista, en segundo plano (Wikidata P136). */
function scheduleAlbumGenreSync(artistId: string): void {
  try {
    after(() => runAlbumGenreSync(artistId));
  } catch {
    // Fuera de una request (scripts): el backfill de semillas cubre ese caso.
  }
}

async function runAlbumGenreSync(artistId: string): Promise<void> {
  try {
    if (await hasStaleAlbumGenres(artistId)) await syncAlbumGenreSeeds(artistId);
  } catch (error) {
    console.error(`[genres] no se pudieron sincronizar los géneros de los álbumes de ${artistId}`, error);
  }
}

export interface DiscographyPages {
  releaseGroups: MBReleaseGroup[];
  total: number;
  /** Se recorrieron todas las páginas que informa MusicBrainz. */
  complete: boolean;
  /** Se cortó por el tope de seguridad, no por el límite pedido. */
  truncated: boolean;
}

/** Recorre el browse de release-groups (sin bootlegs) hasta el total o hasta `maxPages`. */
export async function fetchDiscographyPages(artistMbid: string, maxPages = DISCOGRAPHY_MAX_PAGES): Promise<DiscographyPages> {
  const releaseGroups: MBReleaseGroup[] = [];
  let total = 0;
  let pages = 0;
  do {
    const page = await musicbrainz.browseReleaseGroupsByArtist(artistMbid, pages * RELEASE_BROWSE_PAGE_SIZE);
    total = page["release-group-count"];
    releaseGroups.push(...page["release-groups"]);
    pages += 1;
    if (page["release-groups"].length === 0) break;
  } while (releaseGroups.length < total && pages < maxPages);

  const complete = releaseGroups.length >= total;
  const truncated = !complete && pages >= DISCOGRAPHY_MAX_PAGES;
  if (truncated) {
    console.warn(`[discography] ${artistMbid}: tope de ${DISCOGRAPHY_MAX_PAGES} páginas (${releaseGroups.length} de ${total})`);
  }
  return { releaseGroups, total, complete, truncated };
}

/**
 * Upsert de los release-groups del browse con sus tipos crudos, sus créditos y la entidad de
 * Wikidata que declara MusicBrainz (NULL si dejó de declararla; openspec: add-genre-taxonomy).
 */
async function saveDiscographyReleaseGroups(groups: MBReleaseGroup[]): Promise<void> {
  for (const rg of groups) {
    const category = mapReleaseGroupCategory(rg["primary-type"], rg["secondary-types"]);
    const canonicalDate = canonicalDateValues({ firstReleaseDate: rg["first-release-date"] });
    const types = { primaryType: rg["primary-type"] ?? null, secondaryTypes: rg["secondary-types"] ?? [] };
    const wikidataId = wikidataIdOf(rg);

    const inserted = await db
      .insert(releaseGroup)
      // La fecha canónica solo se escribe al crear el stub: un release_group
      // ya enriquecido conserva la que resolvió `findOrIngestTracklist`.
      .values({ mbid: rg.id, title: rg.title, category, ...types, ...canonicalDate, wikidataId })
      .onConflictDoUpdate({
        target: releaseGroup.mbid,
        set: {
          title: rg.title,
          category,
          ...types,
          wikidataId,
          // Una entidad nueva o distinta invalida las semillas: se vuelven a pedir.
          genresSyncedAt: sql`CASE WHEN ${releaseGroup.wikidataId} IS DISTINCT FROM excluded.wikidata_id
            THEN NULL ELSE ${releaseGroup.genresSyncedAt} END`,
        },
      })
      .returning({ id: releaseGroup.id });

    const row = inserted[0];
    if (row && rg["artist-credit"]?.length) {
      await ingestCredits(rg["artist-credit"], { releaseGroupId: row.id });
    }
  }
}

/**
 * Solo la entidad de Wikidata de los release-groups ya guardados de un artista, desde el mismo
 * browse (backfill de semillas, openspec: add-genre-taxonomy): no crea release-groups, no toca
 * créditos ni marcas. Un cambio de entidad reinicia la vigencia de sus géneros.
 */
export async function refreshReleaseGroupWikidataIds(
  artistMbid: string,
  { dryRun = false }: { dryRun?: boolean } = {},
): Promise<{ checked: number; changed: number }> {
  const { releaseGroups } = await fetchDiscographyPages(artistMbid);
  let changed = 0;
  for (const rg of releaseGroups) {
    const wikidataId = wikidataIdOf(rg);
    const differs = and(eq(releaseGroup.mbid, rg.id), sql`${releaseGroup.wikidataId} IS DISTINCT FROM ${wikidataId}`);
    const rows = dryRun
      ? await db.select({ id: releaseGroup.id }).from(releaseGroup).where(differs)
      : await db.update(releaseGroup).set({ wikidataId, genresSyncedAt: null }).where(differs).returning({ id: releaseGroup.id });
    changed += rows.length;
  }
  return { checked: releaseGroups.length, changed };
}

export type DiscographySyncResult =
  | { status: "skipped" }
  /** Se guardaron las páginas iniciales; faltan otras (la sincronización completa sigue en segundo plano). */
  | { status: "partial"; saved: number; total: number }
  | { status: "complete"; saved: number; total: number; unlisted: number; relisted: number; truncated: boolean };

export interface DiscographySyncOptions {
  /**
   * `initial`: primera visita, hasta 3 páginas y solo si nunca se sincronizó.
   * `full`: todas las páginas, solo si la discografía está incompleta o vencida.
   */
  mode: "initial" | "full";
  /** Recorre MusicBrainz y calcula el resultado sin escribir (backfill en simulación). */
  dryRun?: boolean;
}

/**
 * Sincroniza la discografía de un artista bajo un candado por artista: dos visitas
 * simultáneas hacen una sola sincronización (la segunda relee el artista y la omite).
 * Solo una sincronización que recorrió todas las páginas marca y desmarca los
 * release-groups fuera de la discografía y fija `discography_complete_at`.
 */
export async function syncArtistDiscography(
  artistId: string,
  { mode, dryRun = false }: DiscographySyncOptions,
): Promise<DiscographySyncResult> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`discography:${artistId}`}, 0))`);
    const [current] = await tx.select().from(artist).where(eq(artist.id, artistId)).limit(1);
    if (!current?.mbid) return { status: "skipped" };
    if (mode === "initial" && current.discographySyncedAt) return { status: "skipped" };
    if (mode === "full" && !needsDiscographyRefresh(current)) return { status: "skipped" };

    const pages = await fetchDiscographyPages(current.mbid, mode === "initial" ? DISCOGRAPHY_INITIAL_PAGES : DISCOGRAPHY_MAX_PAGES);
    const saved = pages.releaseGroups.length;
    const now = new Date();

    if (!pages.complete && !pages.truncated) {
      if (!dryRun) {
        await saveDiscographyReleaseGroups(pages.releaseGroups);
        await tx.update(artist).set({ discographySyncedAt: now }).where(eq(artist.id, artistId));
      }
      return { status: "partial", saved, total: pages.total };
    }

    // Con el tope alcanzado no se sabe qué hay más allá: no se marca nada.
    let marks = { unlisted: 0, relisted: 0 };
    if (dryRun) {
      if (!pages.truncated) marks = await countUnlistedChanges(tx, artistId, pages.releaseGroups);
    } else {
      await saveDiscographyReleaseGroups(pages.releaseGroups);
      if (!pages.truncated) marks = await applyUnlistedMarks(tx, artistId, pages.releaseGroups, now);
      await tx
        .update(artist)
        .set({ discographySyncedAt: now, discographyCompleteAt: now })
        .where(eq(artist.id, artistId));
    }
    return { status: "complete", saved, total: pages.total, ...marks, truncated: pages.truncated };
  });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Release-groups acreditados al artista, con MBID (los únicos que MusicBrainz puede devolver). */
function creditedReleaseGroupIds(tx: Tx, artistId: string) {
  return tx
    .select({ id: credit.releaseGroupId })
    .from(credit)
    .where(and(eq(credit.artistId, artistId), isNotNull(credit.releaseGroupId)));
}

/**
 * Marca los release-groups acreditados que la sincronización completa no devolvió y
 * desmarca los que volvieron. No borra nada: los datos de usuarios se conservan.
 */
async function applyUnlistedMarks(tx: Tx, artistId: string, groups: MBReleaseGroup[], now: Date) {
  const returned = groups.map((rg) => rg.id);
  const credited = inArray(releaseGroup.id, creditedReleaseGroupIds(tx, artistId));

  const unlisted = await tx
    .update(releaseGroup)
    .set({ discographyUnlistedAt: now })
    .where(
      and(
        credited,
        isNotNull(releaseGroup.mbid),
        isNull(releaseGroup.discographyUnlistedAt),
        returned.length > 0 ? notInArray(releaseGroup.mbid, returned) : undefined,
      ),
    )
    .returning({ id: releaseGroup.id });

  const relisted =
    returned.length === 0
      ? []
      : await tx
          .update(releaseGroup)
          .set({ discographyUnlistedAt: null })
          .where(and(credited, isNotNull(releaseGroup.discographyUnlistedAt), inArray(releaseGroup.mbid, returned)))
          .returning({ id: releaseGroup.id });

  return { unlisted: unlisted.length, relisted: relisted.length };
}

/** Lo que `applyUnlistedMarks` cambiaría, sin escribir (simulación del backfill). */
async function countUnlistedChanges(tx: Tx, artistId: string, groups: MBReleaseGroup[]) {
  const returned = new Set(groups.map((rg) => rg.id));
  const rows = await tx
    .select({ mbid: releaseGroup.mbid, unlistedAt: releaseGroup.discographyUnlistedAt })
    .from(releaseGroup)
    .where(and(inArray(releaseGroup.id, creditedReleaseGroupIds(tx, artistId)), isNotNull(releaseGroup.mbid)));
  let unlisted = 0;
  let relisted = 0;
  for (const row of rows) {
    const isReturned = row.mbid !== null && returned.has(row.mbid);
    if (!isReturned && row.unlistedAt === null) unlisted += 1;
    if (isReturned && row.unlistedAt !== null) relisted += 1;
  }
  return { unlisted, relisted };
}

/**
 * Crea los créditos de un target (álbum o canción) a partir del array
 * artist-credit de MusicBrainz — mapea 1:1 con el modelo CREDIT
 * (ver ADR 0004): posición 0 = primary, el resto = featured, y el
 * joinphrase de MusicBrainz coincide exactamente con nuestro join_phrase.
 */
export async function ingestCredits(
  mbCredits: MBArtistCreditItem[],
  target: { releaseGroupId?: string; recordingId?: string },
) {
  for (let position = 0; position < mbCredits.length; position++) {
    const item = mbCredits[position];
    if (!item) continue;
    const creditedArtist = await upsertArtistStub(item.artist.id, item.artist.name);

    await db
      .insert(credit)
      .values({
        artistId: creditedArtist.id,
        releaseGroupId: target.releaseGroupId ?? null,
        recordingId: target.recordingId ?? null,
        position,
        role: position === 0 ? "primary" : "featured",
        joinPhrase: item.joinphrase ?? null,
      })
      .onConflictDoNothing();
  }
}
