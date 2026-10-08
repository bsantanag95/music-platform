import { createHash } from "node:crypto";
import { and, eq, inArray, isNull, like } from "drizzle-orm";
import { after } from "next/server";
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

const CAA_HOTLINK_PREFIX = "https://coverartarchive.org/";

/** Tope de carátulas por tarea diferida: una página trae ≤50 y el resto cae en la siguiente visita. */
const MAX_DEFERRED_MIRRORS = 50;

type CoverMirrorFilter = ReturnType<typeof inArray>;

/**
 * Espeja, después de responder, las carátulas que todavía apuntan a Cover Art Archive (openspec:
 * mirror-cover-art; ADR 0018). Las listas personales (Quiero escuchar, favoritos, listas) solo
 * leen `cover_thumb_url`: sin esto un álbum ingerido antes del espejo seguía sirviéndose por
 * hotlink — y por el optimizador de imágenes de Next, que descarga de CAA en cada petición — hasta
 * que alguien abría su página. La respuesta actual conserva la URL vieja; la próxima ya usa el
 * storage. Descargas en serie para no martillar archive.org; no lanza ni afecta la respuesta.
 * Sin espejo habilitado, o fuera de una request de Next (scripts, tests), no hace nada.
 */
function scheduleMirror(selector: CoverMirrorFilter): void {
  if (!isCoverMirrorEnabled()) return;
  try {
    after(async () => {
      const rows = await db
        .select()
        .from(releaseGroup)
        .where(
          and(
            selector,
            like(releaseGroup.coverThumbUrl, `${CAA_HOTLINK_PREFIX}%`),
            isNull(releaseGroup.coverStorageKey),
            isNull(releaseGroup.coverBlockedAt),
          ),
        );
      for (const rg of rows) {
        if (!rg.mbid) continue;
        try {
          const fetched = await fetchCoverThumb(rg.mbid);
          if (fetched.status === "found") await mirrorCover(rg, fetched.bytes);
        } catch (error) {
          console.error(`[cover-mirror] no se pudo espejar la carátula de ${rg.id}`, error);
        }
      }
    });
  } catch {
    // `after()` no está disponible fuera de una request de Next.
  }
}

/** Espeja las carátulas de estos release-groups que sigan en CAA. */
export function scheduleCoverMirrors(releaseGroupIds: string[]): void {
  if (releaseGroupIds.length === 0) return;
  scheduleMirror(inArray(releaseGroup.id, releaseGroupIds.slice(0, MAX_DEFERRED_MIRRORS)));
}

/**
 * Igual, a partir de las URLs de carátula que ya trae una respuesta (favoritos, listas): ignora las
 * nulas y las que no son un hotlink a CAA, y quita duplicados. La URL de CAA es única por álbum
 * (`/release-group/{mbid}/front-250`), así que identifica la fila sin necesitar su id.
 */
export function scheduleCoverMirrorsForUrls(urls: ReadonlyArray<string | null | undefined>): void {
  const remote = [...new Set(urls)].filter(
    (url): url is string => typeof url === "string" && url.startsWith(CAA_HOTLINK_PREFIX),
  );
  if (remote.length === 0) return;
  scheduleMirror(inArray(releaseGroup.coverThumbUrl, remote.slice(0, MAX_DEFERRED_MIRRORS)));
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
