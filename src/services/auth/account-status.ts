import { isNull } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { appUser } from "@/db/schema";

// Cuenta activa vs. desactivada (spec account-lifecycle). Una cuenta desactivada
// desaparece para las demás personas —perfil, búsqueda, listados, feed, listas—
// pero conserva todo su contenido, y vuelve al iniciar sesión. Este es el ÚNICO
// lugar donde se define qué es "activa": toda consulta que liste personas o su
// contenido social usa `activeUserCondition()` en vez de repetir el criterio.
// Las consultas de moderación y las del propio dueño NO lo usan (la moderación ve
// la identidad real y el dueño no tiene sesión mientras esté desactivado).

/** `app_user.deactivated_at IS NULL`. Para alias de `app_user` (p. ej. el seguido de un evento), pasar la tabla del alias. */
export function activeUserCondition(user: { deactivatedAt: AnyPgColumn } = appUser) {
  return isNull(user.deactivatedAt);
}

/** Autoría de contenido conservado (reseñas y comentarios) de una cuenta desactivada. */
export const DEACTIVATED_AUTHOR = {
  username: "",
  displayName: null,
  deactivated: true,
} as const;

export interface AuthorRow {
  id: string;
  username: string | null;
  displayName: string | null;
  deactivatedAt: Date | null;
}

export interface MaskedAuthor {
  id: string;
  username: string;
  displayName: string | null;
  /** La cuenta está desactivada: la interfaz muestra «Cuenta desactivada», sin enlace ni vista rápida. */
  deactivated: boolean;
}

/**
 * Autoría de un contenido conservado. Con la cuenta desactivada NO se entrega el
 * usuario ni el nombre real (spec account-lifecycle, "Reseñas y comentarios de una
 * cuenta desactivada"); solo el identificador estable y la marca `deactivated`.
 */
export function maskAuthor(author: AuthorRow): MaskedAuthor {
  // Suelto a propósito (`!= null`): una fila sin la columna cuenta como activa, no como desactivada.
  if (author.deactivatedAt != null) return { id: author.id, ...DEACTIVATED_AUTHOR };
  return {
    id: author.id,
    username: author.username ?? "",
    displayName: author.displayName,
    deactivated: false,
  };
}
