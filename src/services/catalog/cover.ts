import { eq } from "drizzle-orm";
import { db } from "@/db";
import { releaseGroup, type ReleaseGroupRow } from "@/db/schema";
import { NEGATIVE_RETRY_MS } from "@/lib/config/cover-mirror";
import { coverThumbUrl, fetchCoverThumb } from "../cover-art";
import { isCoverMirrorEnabled, mirrorCover } from "./cover-mirror";

/**
 * Resuelve y cachea la carátula de un release-group (patrón cover-only).
 *
 * Es la ruta síncrona, consumida desde el cliente por `LazyCoverImage` y por
 * el backfill: hace un único `GET` a Cover Art Archive (que sigue las
 * redirecciones y trae los bytes), espeja la miniatura si el espejo está
 * habilitado y devuelve la URL servible. NO ingesta el tracklist (0 llamadas a
 * MusicBrainz). El render SSR del detalle de álbum usa otro camino (`HEAD` +
 * espejo diferido, ver `album-detail.ts`).
 *
 * Atajos sin red, en orden:
 * - carátula retirada (`cover_blocked_at`) → `null`;
 * - URL cacheada (`cover_thumb_url`) → esa URL;
 * - ausencia confirmada dentro de la ventana de negativos → `null`.
 *
 * Un error transitorio no escribe nada, así el próximo acceso reintenta. Un
 * `404` sí es concluyente: guarda `null` y `cover_checked_at`.
 */
export async function findOrResolveCover(rg: ReleaseGroupRow): Promise<string | null> {
  if (rg.coverBlockedAt) return null;
  if (rg.coverThumbUrl) return rg.coverThumbUrl;

  const verifiedRecently =
    rg.coverCheckedAt !== null &&
    Date.now() - rg.coverCheckedAt.getTime() < NEGATIVE_RETRY_MS;
  if (verifiedRecently) return null;

  if (!rg.mbid) return null;

  const fetched = await fetchCoverThumb(rg.mbid);
  if (fetched.status === "transient") return null;

  if (fetched.status === "missing") {
    await db
      .update(releaseGroup)
      .set({ coverThumbUrl: null, coverCheckedAt: new Date() })
      .where(eq(releaseGroup.id, rg.id));
    return null;
  }

  if (isCoverMirrorEnabled()) {
    return mirrorCover(rg, fetched.bytes);
  }

  const url = coverThumbUrl(rg.mbid);
  await db
    .update(releaseGroup)
    .set({ coverThumbUrl: url, coverCheckedAt: new Date() })
    .where(eq(releaseGroup.id, rg.id));
  return url;
}
