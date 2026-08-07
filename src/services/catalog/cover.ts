import { eq } from "drizzle-orm";
import { db } from "@/db";
import { releaseGroup, type ReleaseGroupRow } from "@/db/schema";
import { resolveCoverThumbUrl } from "../cover-art";

/**
 * Resuelve y cachea la carátula de un release-group (patrón cover-only).
 *
 * La carátula se resuelve a nivel de release-group con un `HEAD` a Cover Art
 * Archive y NO requiere ingestar el tracklist de una edición — 0 llamadas a
 * MusicBrainz. Es la única fuente escribible de la carátula (migración 0003);
 * `release.cover_thumb_url` queda como fallback legado en el read-model.
 *
 * Self-heal: si el valor cacheado es null, se re-resuelve en cada acceso por
 * si la portada aparece después. Decisión consciente: un `HEAD` es barato y
 * no está rate-limited (ver design del change cover-only-caratulas).
 */
export async function findOrResolveCover(rg: ReleaseGroupRow): Promise<string | null> {
  if (rg.coverThumbUrl) return rg.coverThumbUrl;

  const cover = rg.mbid ? await resolveCoverThumbUrl(rg.mbid) : null;

  const rows = await db
    .update(releaseGroup)
    .set({ coverThumbUrl: cover })
    .where(eq(releaseGroup.id, rg.id))
    .returning({ coverThumbUrl: releaseGroup.coverThumbUrl });

  return rows[0]?.coverThumbUrl ?? cover;
}
