import { cleanupExpiredSessions } from "@/services/auth/sessions";
import { cleanupExpiredResetTokens } from "@/services/auth/password-reset";
import { cleanupExpiredVerificationTokens } from "@/services/auth/email-verification";

/**
 * Job de mantenimiento para ejecutar periódicamente fuera del tráfico web.
 * Limpia sesiones expiradas y tokens vencidos de restablecimiento de contraseña
 * y de verificación de email.
 * Uso: pnpm run db:cleanup-sessions
 */
async function main(): Promise<void> {
  await cleanupExpiredSessions();
  await cleanupExpiredResetTokens();
  await cleanupExpiredVerificationTokens();
  console.log("Limpieza de sesiones y tokens expirados completada.");
}

main()
  .catch((error) => {
    console.error("No se pudieron limpiar las sesiones expiradas:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit();
  });
