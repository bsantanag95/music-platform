import { localDriver } from "./local-driver";
import { createS3Driver } from "./s3-driver";
import type { StorageProvider } from "./types";

export type { StorageProvider } from "./types";
export { localDriver } from "./local-driver";
export { createS3Driver } from "./s3-driver";
export {
  imageService,
  createImageService,
  StorageError,
  type StorageErrorCode,
  type ImageService,
} from "./image-service";

/**
 * Error de configuración de storage. Mismo patrón que `EmailConfigError`:
 * en producción, sin un proveedor real configurado, el servicio falla cerrado
 * para no escribir en el filesystem efímero del host.
 */
export class StorageConfigError extends Error {
  readonly code = "STORAGE_CONFIG_MISSING" as const;

  constructor() {
    super("No hay un proveedor de storage configurado");
    this.name = "StorageConfigError";
  }
}

let cachedProvider: StorageProvider | null = null;

/**
 * Devuelve el proveedor de storage activo según `STORAGE_DRIVER`.
 *
 * `local` escribe en `public/uploads/` y solo funciona fuera de producción.
 * `s3` usa un proveedor S3-compatible (Cloudflare R2). En producción, sin un
 * proveedor real configurado, falla cerrado con `STORAGE_CONFIG_MISSING`.
 *
 * El proveedor se memoiza a nivel de módulo: con el driver `s3`, construir
 * un `S3Client` nuevo en cada invocación es inaceptable al resolver listas
 * de avatares (openspec: connect-avatar-upload, Decisión 13).
 */
export function getStorageProvider(): StorageProvider {
  if (cachedProvider) return cachedProvider;

  const driver = process.env.STORAGE_DRIVER;

  if (!driver || driver === "local") {
    if (process.env.NODE_ENV === "production") throw new StorageConfigError();
    cachedProvider = localDriver;
    return cachedProvider;
  }

  if (driver === "s3") {
    const endpoint = process.env.STORAGE_S3_ENDPOINT;
    const bucket = process.env.STORAGE_S3_BUCKET;
    const accessKeyId = process.env.STORAGE_S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.STORAGE_S3_SECRET_ACCESS_KEY;
    const publicDomain = process.env.STORAGE_PUBLIC_DOMAIN;

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey || !publicDomain) {
      throw new StorageConfigError();
    }

    cachedProvider = createS3Driver(endpoint, bucket, accessKeyId, secretAccessKey, publicDomain);
    return cachedProvider;
  }

  throw new StorageConfigError();
}
