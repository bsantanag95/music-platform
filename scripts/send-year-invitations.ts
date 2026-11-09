import { sendYearInvitations } from "@/services/laminas/year-invitation";

/**
 * Envía el aviso de "Tu año en discos" (openspec: add-year-in-discs-phase3, D3).
 *
 * Uso:
 *   tsx --env-file=.env scripts/send-year-invitations.ts [--dry-run]
 *
 * Se programa a diario. Fuera de la ventana (del 1 de diciembre a las 12:00 UTC al 16 de enero a las 12:00 UTC) no hace nada. Dentro, avisa del año que
 * cierra a cada cuenta activa con escuchas ese año y la preferencia activa; repetirlo no duplica (un aviso por persona y año), así que un día sin correr
 * se recupera al siguiente. `--dry-run` cuenta sin escribir. Requiere DATABASE_URL.
 */
async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const result = await sendYearInvitations({ dryRun });
  if (result.year === null) {
    console.log("Fuera de la ventana de la invitación de diciembre: no se hizo nada.");
    return;
  }
  console.log(
    dryRun
      ? `Tu ${result.year} en discos: ${result.sent} aviso(s) por enviar (simulación).`
      : `Tu ${result.year} en discos: ${result.sent} aviso(s) nuevo(s).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
