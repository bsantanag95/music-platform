import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import sharp from "sharp";
import { db } from "@/db";
import { image, type ImageRow } from "@/db/schema";
import {
  STORAGE_LIMITS,
  IMAGE_PRESETS,
  ACCEPTED_INPUT_FORMATS,
  type ImageKind,
} from "@/lib/config/storage";
import { getStorageProvider, type StorageProvider } from "./index";

/**
 * Errores de rechazo del servicio de imágenes. Cada código identifica un
 * motivo específico; el llamador puede distinguirlos sin parsear el mensaje.
 * No se exponen en `ErrorCodeSchema` todavía (no hay ruta HTTP que los devuelva).
 */
export type StorageErrorCode =
  | "UNSUPPORTED_FORMAT"
  | "FILE_TOO_LARGE"
  | "DIMENSIONS_EXCEEDED"
  | "DIMENSIONS_INSUFFICIENT"
  | "UNKNOWN_KIND"
  | "STORAGE_CONFIG_MISSING";

export class StorageError extends Error {
  readonly code: StorageErrorCode;

  constructor(code: StorageErrorCode, message: string) {
    super(message);
    this.name = "StorageError";
    this.code = code;
  }
}

/**
 * Contrato público del servicio de imágenes. Las features solo conocen esta
 * interfaz; un cambio de proveedor no requiere tocar consumidores.
 */
export interface ImageService {
  upload(input: {
    buffer: Buffer;
    kind: ImageKind;
  }): Promise<ImageRow>;
  deleteImage(imageId: string): Promise<void>;
  resolveUrl(imageOrKey: ImageRow | string): string;
}

/**
 * Detecta el formato de imagen a partir de los bytes del buffer (magic bytes).
 * Acepta solo JPEG, PNG, WebP y AVIF; rechaza SVG y cualquier otro formato.
 */
function detectFormat(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpeg";
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  )
    return "png";
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  )
    return "webp";

  if (buffer.length >= 12) {
    const box = buffer.subarray(4, 12).toString("ascii");
    if (box === "ftypavif" || box === "ftypmif1") return "avif";
  }

  return null;
}

/**
 * Valida el formato de entrada. Acepta solo JPEG, PNG, WebP y AVIF.
 */
function validateFormat(buffer: Buffer): void {
  const format = detectFormat(buffer);
  if (!format || !ACCEPTED_INPUT_FORMATS.includes(format as (typeof ACCEPTED_INPUT_FORMATS)[number])) {
    throw new StorageError("UNSUPPORTED_FORMAT", "Formato de imagen no soportado");
  }
}

/**
 * Valida el tamaño del archivo.
 */
function validateFileSize(buffer: Buffer): void {
  if (buffer.length > STORAGE_LIMITS.maxByteSize) {
    throw new StorageError(
      "FILE_TOO_LARGE",
      `El archivo excede el tamaño máximo de ${STORAGE_LIMITS.maxByteSize} bytes`,
    );
  }
}

/**
 * Lee metadata con sharp para validar dimensiones máximas antes de decodificar
 * el contenido completo de píxeles (previene decompression bombs).
 */
async function validateDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
  let metadata;
  try {
    metadata = await sharp(buffer, { limitInputPixels: STORAGE_LIMITS.maxDimension ** 2 })
      .metadata();
  } catch (err) {
    if (err instanceof Error && err.message.includes("exceeds pixel limit")) {
      throw new StorageError(
        "DIMENSIONS_EXCEEDED",
        `Las dimensiones exceden el máximo de ${STORAGE_LIMITS.maxDimension}px`,
      );
    }
    throw err;
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (width > STORAGE_LIMITS.maxDimension || height > STORAGE_LIMITS.maxDimension) {
    throw new StorageError(
      "DIMENSIONS_EXCEEDED",
      `Las dimensiones exceden el máximo de ${STORAGE_LIMITS.maxDimension}px`,
    );
  }

  return { width, height };
}

/**
 * Valida que las dimensiones cumplan el mínimo del kind solicitado.
 */
function validateMinDimensions(
  width: number,
  height: number,
  kind: ImageKind,
): void {
  const preset = IMAGE_PRESETS[kind];
  if (!preset) {
    throw new StorageError("UNKNOWN_KIND", `Kind desconocido: ${kind}`);
  }

  if (width < preset.minWidth || height < preset.minHeight) {
    throw new StorageError(
      "DIMENSIONS_INSUFFICIENT",
      `Las dimensiones (${width}x${height}) son menores al mínimo requerido (${preset.minWidth}x${preset.minHeight}) para el kind '${kind}'`,
    );
  }
}

/**
 * Genera la clave de storage server-side: `{kind}/{uuid}.webp`.
 * El nombre de archivo del cliente nunca participa.
 */
function generateStorageKey(kind: ImageKind): string {
  return `${kind}/${randomUUID()}.webp`;
}

/**
 * Procesa la imagen: reencode a WebP + resize al preset del kind.
 */
async function processImage(
  buffer: Buffer,
  kind: ImageKind,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const preset = IMAGE_PRESETS[kind];
  const targetHeight = preset.height ?? preset.width;

  const result = await sharp(buffer)
    .resize(preset.width, targetHeight, { fit: "cover" })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: result.data,
    width: result.info.width,
    height: result.info.height,
  };
}

/**
 * Crea una instancia del servicio de imágenes con el proveedor inyectado.
 * Permite mockear el provider en tests.
 */
export function createImageService(provider?: StorageProvider): ImageService {
  const getProvider = () => provider ?? getStorageProvider();

  return {
    async upload({ buffer, kind }): Promise<ImageRow> {
      if (!IMAGE_PRESETS[kind]) {
        throw new StorageError("UNKNOWN_KIND", `Kind desconocido: ${kind}`);
      }

      validateFormat(buffer);
      validateFileSize(buffer);

      const { width: origWidth, height: origHeight } = await validateDimensions(buffer);
      validateMinDimensions(origWidth, origHeight, kind);

      const processed = await processImage(buffer, kind);
      const storageKey = generateStorageKey(kind);
      const p = getProvider();

      await p.put(storageKey, processed.buffer, "image/webp");

      try {
        const [row] = await db
          .insert(image)
          .values({
            storageKey,
            kind,
            mimeType: "image/webp",
            width: processed.width,
            height: processed.height,
            byteSize: processed.buffer.length,
          })
          .returning();

        if (!row) throw new Error("No se pudo crear el registro de imagen");
        return row;
      } catch (err) {
        await p.delete(storageKey).catch(() => {});
        throw err;
      }
    },

    async deleteImage(imageId: string): Promise<void> {
      const [row] = await db
        .select()
        .from(image)
        .where(sql`id = ${imageId}`)
        .limit(1);

      if (!row) return;

      const p = getProvider();
      await p.delete(row.storageKey);

      await db.delete(image).where(sql`id = ${imageId}`);
    },

    resolveUrl(imageOrKey: ImageRow | string): string {
      const key = typeof imageOrKey === "string" ? imageOrKey : imageOrKey.storageKey;
      return getProvider().publicUrl(key);
    },
  };
}

/**
 * Instancia singleton del servicio de imágenes.
 */
export const imageService = createImageService();
