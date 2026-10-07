import { lastSuccessfulSyncAt, syncReleaseCalendar } from "@/services/home/release-calendar-sync";

/**
 * Sincroniza el calendario de lanzamientos de Inicio (openspec: add-home-release-calendar, ADR 0029)
 * desde el feed "Fresh Releases" de ListenBrainz, ignorando la vigencia de 24 h. Es lo mismo que
 * dispara Inicio en segundo plano cuando el calendario está vencido; sirve para el primer llenado y
 * como respaldo si el entorno corta las tareas posteriores a la respuesta.
 *
 * Uso:
 *   tsx --env-file=.env scripts/sync-release-calendar.ts
 *
 * Escribe en la BD de DATABASE_URL: reemplaza `release_calendar_entry` y crea stubs de release-group
 * solo para los discos que se muestran (y los de artistas con relación de algún usuario). Si otra
 * sincronización está en curso, sale sin hacer nada. Requiere DATABASE_URL, LISTENBRAINZ_USER_AGENT y
 * MUSICBRAINZ_USER_AGENT en el entorno.
 */
async function main() {
  const before = await lastSuccessfulSyncAt();
  console.log(`Última sincronización exitosa: ${before ? before.toISOString() : "nunca"}`);
  const started = Date.now();
  const result = await syncReleaseCalendar();
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (result.status === "skipped") {
    console.log("Otra sincronización está en curso: no se hizo nada.");
  } else if (result.status === "failed") {
    console.error(`La sincronización falló en ${seconds} s: ${result.error}`);
    process.exitCode = 1;
  } else {
    console.log(
      `Listo en ${seconds} s: ${result.entries} entradas, ${result.anonymous} en la selección anónima, ` +
        `${result.linked} vinculadas al catálogo.`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
