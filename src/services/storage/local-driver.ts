import { writeFile, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import type { StorageProvider } from "./types";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

/**
 * Driver de desarrollo: escribe en `public/uploads/` (servido estáticamente
 * por Next). `publicUrl()` devuelve una ruta relativa al propio origen.
 * No requiere credenciales; bloqueado en producción por `getStorageProvider()`.
 */
export const localDriver: StorageProvider = {
  async put(key: string, body: Buffer): Promise<void> {
    const filePath = join(UPLOAD_DIR, key);
    await mkdir(join(UPLOAD_DIR, key.split("/").slice(0, -1).join("/") || "."), {
      recursive: true,
    });
    await writeFile(filePath, body);
  },

  async delete(key: string): Promise<void> {
    const filePath = join(UPLOAD_DIR, key);
    await unlink(filePath).catch((err: unknown) => {
      if (isENOENT(err)) return;
      throw err;
    });
  },

  publicUrl(key: string): string {
    return `/uploads/${key}`;
  },
};

function isENOENT(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "ENOENT";
}
