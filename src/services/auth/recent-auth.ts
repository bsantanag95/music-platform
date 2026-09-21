import { ApiError } from "@/lib/api/errors";
import { clearAuthAttempts, consumeAuthAttempt } from "./rate-limit";
import { verifyPassword } from "./password";
import type { ResolvedSession } from "./sessions";

/** Una sesión iniciada hace menos de esto cuenta como "reciente" (cuentas sin contraseña). */
export const RECENT_AUTH_WINDOW_MS = 10 * 60 * 1000;

/** ¿La sesión se inició hace menos de la ventana de autenticación reciente? */
export function isRecentSession(sessionCreatedAt: Date, now = Date.now()): boolean {
  return now - sessionCreatedAt.getTime() < RECENT_AUTH_WINDOW_MS;
}

/**
 * Factor de identidad fresco para las acciones sensibles de la cuenta (spec
 * account-credentials, "Autenticación reciente para acciones sensibles"):
 * cambiar el email, crear una contraseña, desactivar y eliminar la cuenta.
 *
 * - Cuenta con contraseña: la contraseña viaja en la petición y se verifica acá.
 * - Cuenta sin contraseña (alta con Google): la sesión tiene que ser reciente;
 *   si no, `REAUTH_REQUIRED` y la interfaz ofrece confirmar con Google.
 *
 * Las verificaciones de contraseña están limitadas por usuario, para que una
 * sesión robada no pueda probar contraseñas sin límite.
 */
export async function requireRecentAuth(current: ResolvedSession, password?: string): Promise<void> {
  const { user } = current;

  if (user.passwordHash === null) {
    if (!isRecentSession(current.sessionCreatedAt)) {
      throw new ApiError("REAUTH_REQUIRED", 403, "Confirmá tu identidad para continuar");
    }
    return;
  }

  const attemptKey = `sensitive:user:${user.id}`;
  if (!consumeAuthAttempt([attemptKey])) {
    throw new ApiError("RATE_LIMITED", 429, "Demasiados intentos. Probá más tarde");
  }
  if (!password || !(await verifyPassword(user.passwordHash, password))) {
    throw new ApiError("INVALID_CREDENTIALS", 403, "La contraseña no es correcta");
  }
  clearAuthAttempts([attemptKey]);
}
