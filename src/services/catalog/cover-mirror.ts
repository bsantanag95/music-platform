import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { db } from "@/db";
import { releaseGroup, type ReleaseGroupRow } from "@/db/schema";
import { COVER_MIRROR } from "@/lib/config/cover-mirror";
import { getStorageProvider, StorageConfigError } from "@/services/storage";
import { coverThumbUrl, fetchCoverThumb } from "../cover-art";

/** Caché inmutable de un año: la clave cambia cuando cambia el contenido. */
export const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

/**
 * El espejo propio de carátulas (openspec: mirror-cover-art) se habilita solo
 * con sus dos condiciones de licencia cumplidas: un proveedor de storage real
 * configurado **y** un contacto público de retiro. Si falta cualquiera de las
 * dos, la app resuelve carátulas por hotlink como antes, sin error.
 *
 * Fail-safe a propósito (a diferencia de las imágenes propias, ADR 0017): acá
 * existe una alternativa funcional, y alojar copias sin canal de retiro
 * violaría la condición de licencia.
 */
export function isCoverMirrorEnabled(): boolean {
  if (!process.env.COVER_ART_TAKEDOWN_EMAIL) return false;

  try {
    getStorageProvider();
    return true;
  } catch (err) {
    if (err instanceof StorageConfigError) return false;
    throw err;
  }
}

/** Convierte a WebP ≤250 px y calcula el hash de contenido que versiona la clave. */
async function processCoverBytes(
  bytes: Buffer,
): Promise<{ buffer: Buffer; hash: string }> {
  const buffer = await sharp(bytes)
    .resize({
      width: COVER_MIRROR.maxDimension,
      height: COVER_MIRROR.maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: COVER_MIRROR.webpQuality })
    .toBuffer();

  const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 12);
  return { buffer, hash };
}

/** Clave versionada por contenido: `covers/{mbid}/{sha256[0..12]}.webp`. */
export function coverObjectKey(mbid: string, hash: string): string {
  return `covers/${mbid}/${hash}.webp`;
}

/**
 * Convierte los bytes de `front-250` a WebP ≤250 px (sin ampliar, conservando
 * la proporción) y los espeja en el storage con clave versionada por contenido
 * y caché inmutable. Persiste la clave, la URL servible y `cover_checked_at`
 * en el release-group, y devuelve la URL servible.
 *
 * Si la conversión o el `put` fallan, guarda la URL de CAA (la carátula existe)
 * con la clave nula: el álbum queda como candidato del backfill y se sigue
 * mostrando. No lanza por fallas del espejo.
 */
export async function mirrorCover(
  rg: Pick<ReleaseGroupRow, "id" | "mbid">,
  bytes: Buffer,
): Promise<string | null> {
  if (!rg.mbid) return null;

  const caaUrl = coverThumbUrl(rg.mbid);
  let storageKey: string | null = null;

  try {
    const { buffer, hash } = await processCoverBytes(bytes);
    const key = coverObjectKey(rg.mbid, hash);

    await getStorageProvider().put(key, buffer, "image/webp", {
      cacheControl: IMMUTABLE_CACHE_CONTROL,
    });

    storageKey = key;
  } catch {
    storageKey = null;
  }

  const url = storageKey ? getStorageProvider().publicUrl(storageKey) : caaUrl;

  await db
    .update(releaseGroup)
    .set({
      coverStorageKey: storageKey,
      coverThumbUrl: url,
      coverCheckedAt: new Date(),
    })
    .where(eq(releaseGroup.id, rg.id));

  return url;
}

/** Borra un objeto del storage sin lanzar: devuelve si se pudo. */
async function deleteCoverObject(key: string): Promise<boolean> {
  try {
    await getStorageProvider().delete(key);
    return true;
  } catch {
    return false;
  }
}

export interface TakedownResult {
  hadObject: boolean;
  objectDeleted: boolean;
}

/**
 * Retiro a pedido (openspec: mirror-cover-art, decisión 10): borra la copia del
 * storage si existe, anula la URL y la clave y fija `cover_blocked_at`. Un
 * release-group marcado nunca se vuelve a resolver ni a espejar. Si el borrado
 * del objeto falla, igual se anula la fila: lo servible es la URL.
 */
export async function takedownCover(
  rg: Pick<ReleaseGroupRow, "id" | "coverStorageKey">,
): Promise<TakedownResult> {
  const hadObject = Boolean(rg.coverStorageKey);
  const objectDeleted = rg.coverStorageKey
    ? await deleteCoverObject(rg.coverStorageKey)
    : false;

  await db
    .update(releaseGroup)
    .set({
      coverThumbUrl: null,
      coverStorageKey: null,
      coverBlockedAt: new Date(),
    })
    .where(eq(releaseGroup.id, rg.id));

  return { hadObject, objectDeleted };
}

export type RevalidateResult = "missing" | "updated" | "unchanged" | "transient";

/**
 * Sigue a la fuente (openspec: mirror-cover-art, decisión 10): vuelve a
 * descargar la carátula espejada y:
 * - `404` → borra el objeto y anula la fila;
 * - hash distinto → sube la clave nueva, actualiza y borra la anterior;
 * - mismo hash → solo actualiza `cover_checked_at`;
 * - error transitorio → no toca nada.
 */
export async function revalidateCover(
  rg: Pick<ReleaseGroupRow, "id" | "mbid" | "coverStorageKey">,
): Promise<RevalidateResult> {
  if (!rg.mbid) return "transient";

  const fetched = await fetchCoverThumb(rg.mbid);
  if (fetched.status === "transient") return "transient";

  if (fetched.status === "missing") {
    if (rg.coverStorageKey) await deleteCoverObject(rg.coverStorageKey);
    await db
      .update(releaseGroup)
      .set({ coverThumbUrl: null, coverStorageKey: null, coverCheckedAt: new Date() })
      .where(eq(releaseGroup.id, rg.id));
    return "missing";
  }

  const { buffer, hash } = await processCoverBytes(fetched.bytes);
  const newKey = coverObjectKey(rg.mbid, hash);

  if (newKey === rg.coverStorageKey) {
    await db
      .update(releaseGroup)
      .set({ coverCheckedAt: new Date() })
      .where(eq(releaseGroup.id, rg.id));
    return "unchanged";
  }

  await getStorageProvider().put(newKey, buffer, "image/webp", {
    cacheControl: IMMUTABLE_CACHE_CONTROL,
  });
  const url = getStorageProvider().publicUrl(newKey);

  await db
    .update(releaseGroup)
    .set({ coverStorageKey: newKey, coverThumbUrl: url, coverCheckedAt: new Date() })
    .where(eq(releaseGroup.id, rg.id));

  if (rg.coverStorageKey) await deleteCoverObject(rg.coverStorageKey);
  return "updated";
}
