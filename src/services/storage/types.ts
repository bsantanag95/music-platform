/**
 * Contrato del proveedor de storage (openspec: add-image-storage).
 *
 * Capa de I/O puro: no conoce la tabla `image` ni la base de datos.
 * Implementar esta interfaz para agregar un proveedor nuevo (R2, S3 real, etc.)
 * sin tocar la lógica de dominio del servicio de imágenes.
 */
export interface PutOptions {
  /**
   * Cabecera `Cache-Control` del objeto. El driver `s3` la envía como
   * `CacheControl`; el driver `local` la ignora (el filesystem servido por
   * Next no la usa). openspec: mirror-cover-art.
   */
  cacheControl?: string;
}

export interface StorageProvider {
  put(key: string, body: Buffer, contentType: string, options?: PutOptions): Promise<void>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}
