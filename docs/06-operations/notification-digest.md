# Resumen semanal de notificaciones por email

Documento operativo del resumen semanal (openspec `add-notification-digest-and-awards`, Fase 3 de
notificaciones; ADR 0047). Cubre qué envía, cómo correrlo a mano, cómo verificarlo, cómo
programarlo y qué hacer con el secreto de baja.

## Qué envía

- **Solo a quien lo activó** (`app_user.notification_digest_enabled`), con el email verificado y la
  cuenta activa. Está desactivado por defecto y se activa en *Ajustes → Notificaciones → Por email*;
  activarlo exige el email verificado.
- **Una vez por semana como mucho**: la corrida toma a quien no tiene marca o cuya
  `notification_digest_sent_at` es anterior al lunes 00:00 UTC de la semana en curso. La marca se
  mueve **después** de entregar el correo, así que dos corridas en la misma semana no repiten.
- **Solo lo no leído** cuyo evento más reciente cae en la ventana `(marca anterior o hace 7 días,
  ahora]`, con los mismos filtros de privacidad, la misma agrupación y los mismos textos que la
  bandeja. Dos secciones, "Para ti" y "Novedades", con hasta 8 entradas cada una y "y N más".
- **Una semana vacía no envía** y no mueve la marca: la ventana siguiente sigue cubriendo lo
  pendiente.
- Cada correo lleva el enlace a la bandeja, el enlace de baja y las cabeceras `List-Unsubscribe` y
  `List-Unsubscribe-Post` (baja en un clic, RFC 8058). No incluye métricas de actividad propia,
  rachas ni recordatorios de inactividad.

El contenido y la plantilla viven en `src/services/notifications/digest.ts` y
`src/services/email/templates/notification-digest.ts`; el envío programado, en
`src/services/notifications/send-digests.ts`.

## Requisitos

- Migración `0077` aplicada (`pnpm run db:migrate`).
- Variables de entorno:
  - `DATABASE_URL`.
  - `NEXT_PUBLIC_APP_URL` (los enlaces del correo son absolutos).
  - `EMAIL_UNSUBSCRIBE_SECRET` (firma del enlace de baja; sin él, la corrida falla).
  - `EMAIL_TRANSPORT=resend`, `RESEND_API_KEY` y `EMAIL_FROM` para enviar de verdad. En
    `--dry-run` no se piden.
  - `DIGEST_SEND_INTERVAL_MS` (opcional): pausa entre envíos, 600 ms por defecto. Sirve para no
    superar el límite de Resend con lotes grandes.
- Dominio de `EMAIL_FROM` verificado en Resend.

## Correr a mano

```bash
# Simulación: arma y cuenta los resúmenes sin enviar ni mover marcas.
npx tsx --env-file=.env scripts/send-notification-digests.ts --dry-run

# Envío real.
npx tsx --env-file=.env scripts/send-notification-digests.ts
```

Salida esperada (los números cambian según la semana):

```
Resumen semanal de la semana del 2026-10-26.
Listo en 12.4 s: 3 destinatario(s), 2 enviado(s), 1 sin novedades, 0 con error.
```

Si otra corrida tiene el lock, imprime `Otra corrida del resumen está en curso: no se hizo nada.` y
sale con código 0. Un fallo de una persona deja el proceso con código 1 (para que la tarea quede
marcada como fallida) pero no corta el lote ni mueve su marca: la corrida siguiente lo reintenta.

## Verificación

1. Correr primero con `--dry-run` y comprobar que los destinatarios y las cifras tienen sentido.
2. Enviar de verdad y revisar:
   - La salida del script y `logs/notification-digest.log` (la tarea programada escribe ahí).
   - El panel de Resend (entregas y rebotes).
   - En la base: `SELECT username, notification_digest_sent_at FROM app_user WHERE
     notification_digest_enabled ORDER BY notification_digest_sent_at DESC NULLS LAST;` — quien
     recibió el correo tiene la marca de esta semana.
3. Abrir el correo: enlace a la bandeja, enlace de baja y cabeceras. El `POST` de un clic
   (`/api/notifications/unsubscribe?token=…`) apaga el resumen sin sesión.
4. Repetir el script el mismo día: no debe enviar nada más (la marca es de esta semana).

Problemas típicos:

- `EMAIL_CONFIG_MISSING`: falta `EMAIL_TRANSPORT=resend` o alguna de `RESEND_API_KEY`/`EMAIL_FROM`.
- Error del secreto de baja: falta `EMAIL_UNSUBSCRIBE_SECRET`.
- Todos "sin novedades": la bandeja está leída, la ventana no tiene eventos o las marcas ya son de
  esta semana.

## Programar la tarea (Windows)

El wrapper `scripts/send-notification-digests.cmd` fija el directorio de trabajo del repo y llama a
`node` + `tsx` (el Programador de tareas no resuelve bien los shims `.CMD` de pnpm). Registra la
tarea para los lunes a las 10:00:

```bat
schtasks /Create /TN "music-platform notification digest" /SC WEEKLY /D MON /ST 10:00 ^
  /TR "C:\Users\besan\Documents\Proyectos\music-platform\scripts\send-notification-digests.cmd"
```

El wrapper redirige la salida a `logs\notification-digest.log` (ignorado por git). Ajustar la ruta
del wrapper si el repo se mueve.

## Paso al cron del proveedor

Al desplegar, el proceso programado del proveedor (cron del contenedor, Railway/Fly, un worker) debe
ejecutar el mismo script una vez por semana:

```bash
pnpm exec tsx scripts/send-notification-digests.ts
```

Con las variables de entorno del servicio ya cargadas (sin `--env-file`). Mantener la hora del lunes
y la pausa `DIGEST_SEND_INTERVAL_MS`; el lock advisory y la marca semanal hacen que un reintento o
una corrida duplicada no manden dos correos a la misma persona.

## Rotación del secreto de baja

`EMAIL_UNSUBSCRIBE_SECRET` firma el token de baja (HMAC-SHA256, sin expiración a propósito: darse de
baja nunca debe fallar por abrir un correo viejo). **Rotarlo invalida los enlaces de baja de todos
los correos ya enviados**: la página muestra el token como inválido y el `POST` responde
`400 INVALID_UNSUBSCRIBE_TOKEN`. La persona siempre puede desactivar el resumen desde *Ajustes →
Notificaciones*.

Por eso se rota solo ante un incidente (secreto filtrado), no de forma periódica. Tras rotarlo, los
correos nuevos usan el secreto nuevo; no hay versiones de clave ni reemisión retroactiva.

## Idempotencia y límites conocidos

- El lock (`pg_try_advisory_lock` sobre una conexión reservada) impide dos corridas simultáneas.
- La marca semanal impide dos envíos a la misma persona en la misma semana, incluso si la tarea se
  dispara dos veces.
- Si el proceso muere justo después de entregar y antes de escribir la marca, esa persona puede
  recibir el mismo resumen en la corrida siguiente. Es la contrapartida de marcar solo tras
  entregar, que evita perder resúmenes por fallos del proveedor.
