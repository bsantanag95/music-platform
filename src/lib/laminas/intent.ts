import { isValidUuid } from "@/lib/validation";

// Intención "Arma la tuya" (openspec: add-top-n-lamina-phase3, ADR 0052): lo único que aporta el cliente es el id de una
// Lámina. La ruta de destino se arma aquí, así que el retorno después de autenticarse no puede llevar a otro lugar.

/** El id si es un identificador válido; cualquier otra cosa se descarta. */
export function parseLaminaIntent(value: unknown): string | null {
  return typeof value === "string" && isValidUuid(value) ? value.toLowerCase() : null;
}

/** Destino para armar una Lámina a partir de otra. */
export function laminaBuildHref(id: string): string {
  return `/me/laminas?desde=${id}`;
}

/** Registro o login conservando la intención. */
export function laminaAuthHref(path: "/auth/register" | "/auth/login", id: string | null): string {
  return id ? `${path}?lamina=${id}` : path;
}
