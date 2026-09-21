// Reglas de cuenta compartidas por el registro, el cambio de usuario y el
// cambio de contraseña. Archivo puro (sin base de datos ni `next/*`) para que
// también lo importen los componentes cliente que validan en línea.

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 32;
export const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

/** Cuánto dura la reserva del usuario anterior y el enfriamiento entre cambios. */
export const USERNAME_CHANGE_COOLDOWN_DAYS = 30;
export const USERNAME_CHANGE_COOLDOWN_MS = USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

export type UsernameProblem = "too_short" | "too_long" | "invalid_chars";

/** `null` si el usuario cumple las reglas de formato (no mira si está disponible). */
export function validateUsernameFormat(value: string): UsernameProblem | null {
  if (value.length < USERNAME_MIN) return "too_short";
  if (value.length > USERNAME_MAX) return "too_long";
  if (!USERNAME_REGEX.test(value)) return "invalid_chars";
  return null;
}
