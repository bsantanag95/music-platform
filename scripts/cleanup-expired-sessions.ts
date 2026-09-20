import { cleanupExpiredSessions } from "@/services/auth/sessions";
import { cleanupExpiredResetTokens } from "@/services/auth/password-reset";

/**
 * Job de mantenimiento para ejecutar periódicamente fuera del tráfico web.
 * Limpia sesiones expiradas y tokens de restablecimiento de contraseña vencidos.
 * Uso: pnpm run db:cleanup-sessions
 */
async function main(): Promise<void> {
  await cleanupExpiredSessions();
  await cleanupExpiredResetTokens();
  console.log("Limpieza de sesiones y tokens de restablecimiento completada.");
}

main()
  .catch((error) => {
    console.error("No se pudieron limpiar las sesiones expiradas:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit();
  });
