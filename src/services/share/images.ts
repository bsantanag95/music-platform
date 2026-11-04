import { readFile } from "node:fs/promises";
import { join, normalize, sep } from "node:path";
import sharp from "sharp";
import { COVER_MIRROR } from "@/lib/config/cover-mirror";

// Carátulas, fotos y avatares dentro de las imágenes de compartir (spec share-images, "Carátulas y fotos en la
// imagen"; design D4). Las URL salen siempre de los read-models existentes (`cover_thumb_url` del espejo o de
// CAA, `photo_url` de Commons, el avatar resuelto por el storage): acá no se arma ninguna. Un retiro a pedido
// deja la URL en nulo, así que una carátula retirada nunca llega hasta acá.
//
// El renderizador no acepta WebP (formato del espejo y de los avatares): todo pasa por `sharp` a PNG, achicado
// al tamaño de dibujo y nunca ampliado. Cualquier fallo devuelve `null` y la imagen usa el recuadro tipográfico.

/** Lado máximo de una carátula en una imagen de compartir: la miniatura de origen, nunca ampliada (ADR 0018). */
export const MAX_COVER_SIDE = COVER_MIRROR.maxDimension;

// Más corto que el del espejo (8 s): un crawler espera la imagen; ante una fuente lenta va el recuadro. CAA
// tarda entre 1,8 y 2,7 s por miniatura medido desde acá, así que 3 s dejaba carátulas al borde.
const FETCH_TIMEOUT_MS = 5_000;
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const PUBLIC_DIR = join(process.cwd(), "public");

/** Hosts de los que se aceptan imágenes (evita que la ruta de imágenes pida URL arbitrarias). */
function isAllowedRemote(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  const host = url.hostname;
  if (host === "coverartarchive.org" || host === "archive.org" || host.endsWith(".archive.org")) return true;
  if ((host === "upload.wikimedia.org" || host === "thumb.wikimedia.org") && url.pathname.startsWith("/wikipedia/commons/")) {
    return true;
  }
  const storage = process.env.STORAGE_PUBLIC_DOMAIN;
  if (storage) {
    try {
      const expected = new URL(storage.includes("://") ? storage : `https://${storage}`);
      if (host === expected.hostname) return true;
    } catch {
      return false;
    }
  }
  return false;
}

async function readLocalUpload(src: string): Promise<Buffer | null> {
  const path = normalize(join(PUBLIC_DIR, src));
  if (!path.startsWith(join(PUBLIC_DIR, "uploads") + sep)) return null;
  try {
    return await readFile(path);
  } catch {
    return null;
  }
}

async function fetchRemote(src: string): Promise<Buffer | null> {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return null;
  }
  if (!isAllowedRemote(url)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { redirect: "follow", signal: controller.signal });
    if (!response.ok) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    return bytes.length > 0 && bytes.length <= MAX_SOURCE_BYTES ? bytes : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Bytes de una imagen del catálogo o del storage; `null` si no se acepta la fuente o falla. */
export async function fetchImageBytes(src: string | null): Promise<Buffer | null> {
  if (!src) return null;
  if (src.startsWith("/uploads/")) return readLocalUpload(src);
  return fetchRemote(src);
}

/** PNG embebido (data URI) con lado mayor ≤ `maxSide`, sin ampliar nunca la fuente. */
export async function toEmbeddedPng(bytes: Buffer, maxSide: number): Promise<string | null> {
  try {
    const png = await sharp(bytes)
      .resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

// Caché en memoria de las imágenes ya convertidas (por URL y tamaño): una imagen de género o de ceremonia junta
// hasta 4 carátulas remotas y, sin esto, cada generación las vuelve a pedir a CAA (~2 s cada una). Un fallo se
// recuerda poco tiempo, para no pagar el timeout en cada pedido de la misma imagen. Mismo supuesto de proceso
// único que la caché de búsquedas de MusicBrainz.
const EMBED_TTL_MS = 60 * 60 * 1000;
const EMBED_FAILURE_TTL_MS = 5 * 60 * 1000;
const EMBED_MAX_ENTRIES = 300;
const embedded = new Map<string, { value: string | null; expiresAt: number }>();

function readEmbedded(key: string, now: number): { value: string | null } | null {
  const hit = embedded.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= now) {
    embedded.delete(key);
    return null;
  }
  return { value: hit.value };
}

function storeEmbedded(key: string, value: string | null, now: number): void {
  if (embedded.size >= EMBED_MAX_ENTRIES) {
    const oldest = embedded.keys().next().value;
    if (oldest !== undefined) embedded.delete(oldest);
  }
  embedded.set(key, { value, expiresAt: now + (value ? EMBED_TTL_MS : EMBED_FAILURE_TTL_MS) });
}

/** Solo para pruebas. */
export function clearEmbeddedImageCache(): void {
  embedded.clear();
}

/** Imagen lista para dibujar, o `null` para el recuadro tipográfico. */
export async function loadEmbeddedImage(src: string | null, maxSide: number): Promise<string | null> {
  if (!src) return null;
  const key = `${maxSide}:${src}`;
  const cached = readEmbedded(key, Date.now());
  if (cached) return cached.value;
  const bytes = await fetchImageBytes(src);
  const png = bytes ? await toEmbeddedPng(bytes, maxSide) : null;
  storeEmbedded(key, png, Date.now());
  return png;
}

/** Carátula a ≤250 px, nunca ampliada. */
export function loadEmbeddedCover(src: string | null): Promise<string | null> {
  return loadEmbeddedImage(src, MAX_COVER_SIDE);
}
