# Aviso de "Tu año en discos"

Invitación de diciembre (openspec: `add-year-in-discs-phase3`, D3). Del 1 de diciembre a las 12:00 UTC al 16 de enero a las 12:00 UTC, el script
`scripts/send-year-invitations.ts` crea una notificación `year_in_discs` ("Novedades") del año que cierra para cada cuenta activa con escuchas ese año y la
preferencia activa. Fuera de esa ventana no hace nada, así que puede quedar programado todo el año.

## Ejecución manual

```bash
npx tsx --env-file=.env scripts/send-year-invitations.ts --dry-run
```

`--dry-run` cuenta cuántos avisos saldrían sin escribir. Sin la opción, los crea. Solo necesita `DATABASE_URL`.

## Tarea programada (Windows)

Una vez al día. El wrapper `scripts/send-year-invitations.cmd` fija el directorio del repo, crea `logs\` si falta y escribe en
`logs\year-invitations.log`:

```bat
schtasks /Create /TN "music-platform year invitations" /SC DAILY /ST 10:00 ^
  /TR "C:\Users\besan\Documents\Proyectos\music-platform\scripts\send-year-invitations.cmd"
```

Al desplegar, el cron del proveedor ejecuta `pnpm exec tsx scripts/send-year-invitations.ts` a diario con las variables del servicio.

## Idempotencia

Un aviso por persona y año (`uq_notification_recipient_year`, migración `0089`): correr el script varias veces el mismo día, o todos los días de la
ventana, no duplica nada. Un día sin correr se recupera en la corrida siguiente. Quien apaga la preferencia `year_in_discs` no lo recibe; quien la vuelve a
encender dentro de la ventana lo recibe en la siguiente corrida.
