import { sendNotificationDigests, weekStartUtc } from "@/services/notifications/send-digests";

/**
 * Envía el resumen semanal por email (openspec: add-notification-digest-and-awards, D4).
 *
 * Uso:
 *   tsx --env-file=.env scripts/send-notification-digests.ts [--dry-run]
 *
 * `--dry-run` arma y cuenta los resúmenes sin enviar ni mover marcas: sirve para
 * verificar la configuración antes de programar la tarea. Una semana sin nada sin
 * leer no envía correo a esa persona. Si otra corrida está en curso, sale sin hacer
 * nada. Requiere DATABASE_URL, NEXT_PUBLIC_APP_URL y EMAIL_UNSUBSCRIBE_SECRET; sin
 * `--dry-run`, además EMAIL_TRANSPORT=resend con RESEND_API_KEY y EMAIL_FROM.
 */
async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const now = new Date();
  const week = weekStartUtc(now).toISOString().slice(0, 10);
  console.log(`Resumen semanal de la semana del ${week}${dryRun ? " (simulación)" : ""}.`);

  const started = Date.now();
  const result = await sendNotificationDigests(now, { dryRun });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  if (result.status === "locked") {
    console.log("Otra corrida del resumen está en curso: no se hizo nada.");
    return;
  }

  const sent = dryRun
    ? `${result.wouldSend} resumen(es) para enviar`
    : `${result.sent} enviado(s)`;
  console.log(
    `Listo en ${seconds} s: ${result.recipients} destinatario(s), ${sent}, ` +
      `${result.empty} sin novedades, ${result.failed} con error.`,
  );

  // Un fallo de una persona se reintenta la próxima corrida, pero la tarea debe
  // quedar marcada como fallida para que el operador lo vea.
  if (result.failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
