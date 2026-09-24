import { eq, inArray, asc, and, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  releaseGroup,
  track,
  recording,
  credit,
  artist,
  type ReleaseGroupRow,
  type ReleaseRow,
} from "@/db/schema";
import { after } from "next/server";
import { NEGATIVE_RETRY_MS } from "@/lib/config/cover-mirror";
import { findOrIngestTracklist } from "./ingest-release";
import { fetchCoverThumb, resolveCoverThumbUrl } from "../cover-art";
import { isCoverMirrorEnabled, mirrorCover } from "./cover-mirror";
import { isCoverResolved } from "./cover-resolution";

export interface AlbumCredit {
  artistId: string;
  name: string;
  role: "primary" | "featured";
  joinPhrase: string | null;
}

export interface AlbumTrack {
  recordingId: string;
  discNumber: number;
  position: number;
  title: string;
  durationSec: number | null;
  credits: AlbumCredit[];
}

export interface PrimaryArtist {
  id: string;
  name: string;
}

export interface AlbumDetail {
  // La obra. Lleva `category` (tipo de obra) y la fecha de lanzamiento
  // canónica (`firstReleaseDate` / `firstReleaseYear`) del release-group.
  // La fecha del ÁLBUM es esta, no la de la edición ingerida
  // (openspec: canonicalize-release-group).
  // `coverResolved` (openspec: mirror-cover-art) espeja el campo del payload
  // de discografía para que `ReleaseGroupSchema` valide la misma forma.
  releaseGroup: ReleaseGroupRow & { coverResolved: boolean };
  // La edición representativa ingerida. `release.releaseDate` es la fecha de
  // ESTA edición y puede diferir de la fecha canónica del álbum.
  release: ReleaseRow;
  cover: string | null;
  tracks: AlbumTrack[];
  primaryArtist: PrimaryArtist | null;
}

export type AlbumDetailResult =
  | { kind: "not_found" }
  | { kind: "no_editions" }
  | { kind: "ok"; detail: AlbumDetail };

/**
 * Read-model compartido: resuelve el detalle completo de un álbum
 * (release group, edición seleccionada, carátula, tracklist y créditos).
 * Lo consumen tanto el Server Component como el endpoint REST.
 *
 * Distingue tres estados:
 * - `not_found`: el id no corresponde a ningún release_group.
 * - `no_editions`: el release_group existe pero no hay ediciones ingeribles.
 * - `ok`: detalle completo listo para renderizar.
 */
export async function getAlbumDetail(releaseGroupId: string): Promise<AlbumDetailResult> {
  const [rg] = await db
    .select()
    .from(releaseGroup)
    .where(eq(releaseGroup.id, releaseGroupId))
    .limit(1);

  if (!rg) return { kind: "not_found" };

  const releaseRow = await findOrIngestTracklist(rg.id, rg.mbid ?? "");
  if (!releaseRow) return { kind: "no_editions" };

  const tracks = await db
    .select({
      recordingId: track.recordingId,
      position: track.position,
      discNumber: track.discNumber,
      title: recording.title,
      durationSec: recording.durationSec,
    })
    .from(track)
    .innerJoin(recording, eq(track.recordingId, recording.id))
    .where(eq(track.releaseId, releaseRow.id))
    .orderBy(asc(track.discNumber), asc(track.position), asc(recording.id));

  const recordingIds = tracks.map((t) => t.recordingId);

  const creditRows = recordingIds.length
    ? await db
        .select({
          recordingId: credit.recordingId,
          artistId: artist.id,
          name: artist.name,
          role: credit.role,
          joinPhrase: credit.joinPhrase,
          position: credit.position,
        })
        .from(credit)
        .innerJoin(artist, eq(artist.id, credit.artistId))
        .where(inArray(credit.recordingId, recordingIds))
    : [];

  const creditsByRecording = new Map<string, typeof creditRows>();
  for (const c of creditRows) {
    if (!c.recordingId) continue;
    const existing = creditsByRecording.get(c.recordingId) ?? [];
    existing.push(c);
    creditsByRecording.set(c.recordingId, existing);
  }

  const albumTracks: AlbumTrack[] = tracks.map((t) => ({
    recordingId: t.recordingId,
    discNumber: t.discNumber,
    position: t.position,
    title: t.title,
    durationSec: t.durationSec,
    credits: (creditsByRecording.get(t.recordingId) ?? [])
      .sort((a, b) => a.position - b.position)
      .map(({ artistId, name, role, joinPhrase }) => ({
        artistId,
        name,
        role: role as "primary" | "featured",
        joinPhrase,
      })),
  }));

  // La carátula se resuelve a nivel de release-group (cover-only, sin
  // ingestar tracklist). `release.cover_thumb_url` quedó deprecada como
  // lectura legada: el fallback solo cubre filas pre-migración (0003), y el
  // response se normaliza para que `release.coverThumbUrl` y `cover`
  // coincidan siempre (contrato coherente).
  const cover = (await resolveAlbumCover(rg)) ?? releaseRow.coverThumbUrl;

  return {
    kind: "ok",
    detail: {
      releaseGroup: { ...rg, coverResolved: isCoverResolved(rg) },
      release: { ...releaseRow, coverThumbUrl: cover },
      cover,
      tracks: albumTracks,
      primaryArtist:
        (await resolvePrimaryArtist(rg.id)) ?? (await backfillPrimaryArtistFromTracks(rg.id, albumTracks)),
    },
  };
}

/**
 * Resolución SSR del detalle de álbum (openspec: mirror-cover-art, decisión 7):
 * conserva el `HEAD` barato (un solo salto, ~0,8 s) en lugar del `GET` que
 * sigue las 3 redirecciones. Si hay carátula y el espejo está habilitado,
 * agenda la descarga + espejo con `after()` para que la próxima visita ya use
 * la URL del storage. Respeta el retiro y la ventana de negativos.
 */
export async function resolveAlbumCover(rg: ReleaseGroupRow): Promise<string | null> {
  if (rg.coverBlockedAt) return null;

  if (rg.coverThumbUrl) {
    scheduleCoverMirror(rg);
    return rg.coverThumbUrl;
  }

  const verifiedRecently =
    rg.coverCheckedAt !== null &&
    Date.now() - rg.coverCheckedAt.getTime() < NEGATIVE_RETRY_MS;
  if (verifiedRecently) return null;

  const url = rg.mbid ? await resolveCoverThumbUrl(rg.mbid) : null;
  if (!url) {
    // El `HEAD` no distingue `404` de error transitorio: no se registra
    // `cover_checked_at` para no cachear un transitorio como ausencia. La
    // ruta cover-only (`GET`) sí los distingue y es la que confirma negativos.
    return null;
  }

  await db
    .update(releaseGroup)
    .set({ coverThumbUrl: url, coverCheckedAt: new Date() })
    .where(eq(releaseGroup.id, rg.id));

  scheduleCoverMirror({ ...rg, coverThumbUrl: url });
  return url;
}

/**
 * Difierre la descarga y el espejo hasta después de enviar la respuesta. Solo
 * cuando el espejo está habilitado y la carátula todavía no está en el storage
 * (clave nula): así no se re-descarga una ya espejada.
 */
function scheduleCoverMirror(rg: ReleaseGroupRow): void {
  if (!rg.mbid || rg.coverStorageKey) return;
  if (!isCoverMirrorEnabled()) return;

  const mbid = rg.mbid;
  after(async () => {
    const fetched = await fetchCoverThumb(mbid);
    if (fetched.status === "found") {
      await mirrorCover(rg, fetched.bytes);
    }
  });
}

async function resolvePrimaryArtist(
  releaseGroupId: string,
): Promise<PrimaryArtist | null> {
  const [row] = await db
    .select({
      id: artist.id,
      name: artist.name,
    })
    .from(credit)
    .innerJoin(artist, eq(artist.id, credit.artistId))
    .where(
      and(
        eq(credit.releaseGroupId, releaseGroupId),
        eq(credit.role, "primary"),
        isNull(credit.recordingId),
      ),
    )
    .orderBy(asc(credit.position))
    .limit(1);

  return row ?? null;
}

/**
 * Autocuración: un release-group llegado como stub de búsqueda (a diferencia
 * de la ingesta de discografía en `ingest-discography.ts`) puede no tener su
 * propio crédito de artista, aunque sus pistas sí lo tengan (`findOrIngestTracklist`
 * ingiere créditos por grabación siempre). Si `resolvePrimaryArtist` no
 * encuentra nada, se deriva el artista principal del crédito "primary" más
 * frecuente entre las pistas ya ingeridas y se persiste como crédito de
 * release-group — así el breadcrumb y los listados que dependen de él
 * (favoritos, quiero escuchar) dejan de omitir al artista en visitas futuras,
 * sin esperar a que alguien visite la discografía del artista.
 */
async function backfillPrimaryArtistFromTracks(
  releaseGroupId: string,
  tracks: AlbumTrack[],
): Promise<PrimaryArtist | null> {
  const counts = new Map<string, { name: string; count: number }>();
  for (const t of tracks) {
    const primary = t.credits.find((c) => c.role === "primary");
    if (!primary) continue;
    const entry = counts.get(primary.artistId);
    if (entry) entry.count += 1;
    else counts.set(primary.artistId, { name: primary.name, count: 1 });
  }

  let best: { id: string; name: string; count: number } | null = null;
  for (const [id, { name, count }] of counts) {
    if (!best || count > best.count) best = { id, name, count };
  }
  if (!best) return null;

  await db
    .insert(credit)
    .values({
      artistId: best.id,
      releaseGroupId,
      recordingId: null,
      position: 0,
      role: "primary",
    })
    .onConflictDoNothing();

  return { id: best.id, name: best.name };
}
