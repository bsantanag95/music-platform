import { cleanupExpiredSessions } from "@/services/auth/sessions";

/**
 * Job de mantenimiento para ejecutar periódicamente fuera del tráfico web.
 * Uso: pnpm run db:cleanup-sessions
 */
async function main(): Promise<void> {
  await cleanupExpiredSessions();
  console.log("Limpieza de sesiones expiradas completada.");
}

main()
  .catch((error) => {
    console.error("No se pudieron limpiar las sesiones expiradas:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit();
  });
