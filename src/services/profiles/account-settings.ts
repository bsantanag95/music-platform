import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appUser, authIdentity } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { routing } from "@/i18n/routing";
import { AUDIENCES, PROFILE_IDENTITY_LIMITS, type Audience } from "@/services/social/types";

export interface AccountPreferencesInput {
  /** `undefined` = no tocar; cadena vacía o solo espacios = borrar (el sitio muestra el username). */
  displayName?: string | null;
  /** `undefined` = no tocar; `null` = "según el tipo". */
  defaultAudience?: Audience | null;
}

/**
 * Actualiza el nombre visible y la audiencia por defecto del contenido nuevo
 * (specs social-profiles, "Perfil autenticado y configuración", y
 * default-audience). No reescribe contenido existente: la preferencia solo se
 * lee al crear.
 */
export async function updateAccountPreferences(
  userId: string,
  input: AccountPreferencesInput,
): Promise<void> {
  const patch: { displayName?: string | null; defaultAudience?: Audience | null } = {};

  if (input.displayName !== undefined) {
    const trimmed = input.displayName === null ? "" : input.displayName.trim();
    if (trimmed.length > PROFILE_IDENTITY_LIMITS.displayName) {
      throw new ApiError("VALIDATION_ERROR", 400, "El nombre visible es demasiado largo");
    }
    patch.displayName = trimmed.length === 0 ? null : trimmed;
  }

  if (input.defaultAudience !== undefined) {
    if (input.defaultAudience !== null && !AUDIENCES.includes(input.defaultAudience)) {
      throw new ApiError("VALIDATION_ERROR", 400, "La audiencia por defecto no es válida");
    }
    patch.defaultAudience = input.defaultAudience;
  }

  if (Object.keys(patch).length === 0) return;

  const updated = await db
    .update(appUser)
    .set(patch)
    .where(eq(appUser.id, userId))
    .returning({ id: appUser.id });
  if (updated.length === 0) {
    throw new ApiError("USER_NOT_FOUND", 404, "Usuario no encontrado");
  }
}

/** Cómo inicia sesión la cuenta. Nunca incluye el hash de la contraseña. */
export interface AccessMethod {
  hasPassword: boolean;
  /** Proveedores externos vinculados (p. ej. `google`), sin duplicados y ordenados. */
  providers: string[];
}

/**
 * Método de acceso de la cuenta para mostrarlo en solo lectura (spec
 * owner-settings, "Pantalla Cuenta y seguridad"). `password_hash` nulo = cuenta
 * sin contraseña local (alta con Google). El hash NO sale de esta función: solo
 * se devuelve si existe.
 */
export async function getAccessMethod(userId: string): Promise<AccessMethod> {
  const [[user], identities] = await Promise.all([
    db.select({ passwordHash: appUser.passwordHash }).from(appUser).where(eq(appUser.id, userId)).limit(1),
    db.select({ provider: authIdentity.provider }).from(authIdentity).where(eq(authIdentity.userId, userId)),
  ]);
  if (!user) throw new ApiError("USER_NOT_FOUND", 404, "Usuario no encontrado");

  return {
    hasPassword: user.passwordHash !== null,
    providers: [...new Set(identities.map((row) => row.provider))].sort(),
  };
}

/**
 * Guarda el idioma preferido de la interfaz (spec account-preferences). Rechaza
 * un idioma no soportado. Solo lo escribe el control de Ajustes: el selector del
 * Header no persiste la preferencia.
 */
export async function setLocalePreference(userId: string, locale: string): Promise<void> {
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    throw new ApiError("VALIDATION_ERROR", 400, "El idioma no está soportado");
  }
  const updated = await db
    .update(appUser)
    .set({ locale })
    .where(eq(appUser.id, userId))
    .returning({ id: appUser.id });
  if (updated.length === 0) throw new ApiError("USER_NOT_FOUND", 404, "Usuario no encontrado");
}

