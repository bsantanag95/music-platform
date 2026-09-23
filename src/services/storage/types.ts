/**
 * Contrato del proveedor de storage (openspec: add-image-storage).
 *
 * Capa de I/O puro: no conoce la tabla `image` ni la base de datos.
 * Implementar esta interfaz para agregar un proveedor nuevo (R2, S3 real, etc.)
 * sin tocar la lógica de dominio del servicio de imágenes.
 */
export interface StorageProvider {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}
