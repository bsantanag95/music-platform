## Context

- **Email**: `src/services/email/index.ts` expone `getEmailTransport()`; solo existe `consoleTransport` y en producción
  falla cerrado con `EmailConfigError` (`EMAIL_CONFIG_MISSING`, ADR 0014). `EmailMessage` es `{ to, subject, text,
  html }`. Las plantillas viven en `src/services/email/templates/` y leen sus textos de `messages/{es,en}`.
- **Bandeja**: ADR 0045/0046. `notification` con una fila por evento, emisor único, lectura con filtros y agrupación,
  pestañas `for_you` / `releases`, preferencias con defecto por tipo.
- **Premios**: `loadAward` (`src/services/awards/load.ts`, ADR 0032) carga un premio desde JSON versionado con
  `scripts/load-awards.ts`. Upsert de ceremonia (`award_ceremony`, `held_on`), y **reemplaza todas las nominaciones de
  una categoría** cuando cambian (borrado + inserción). Una nominación apunta a `artist_id`, `release_group_id` o
  `recording_id`. `award.kind` ∈ `competition` | `hall_of_fame` (ADR 0044).
- **Operación**: no hay cron ni colas (ADR 0011). El único proceso programado es el backup nocturno, corrido por el
  Task Scheduler de Windows con un wrapper `.cmd` (`docs/06-operations/backup-restore.md`).
- **Cuentas**: `app_user.email_verified_at`, `app_user.locale` (puede ser nulo), `deactivated_at`.

Decisiones del usuario (2026-10-25): Resend por HTTP; Web Push diferido a la PWA (Fase 6 del roadmap); el resumen lo
envía un script programado; premios de artistas seguidos en "Novedades".

## Goals / Non-Goals

**Goals:**

- Un transporte real con el mismo contrato que el de consola, y un único punto de salida a Resend.
- Un resumen semanal que se puede correr dos veces la misma semana sin mandar dos emails.
- Avisos de premios que sobreviven a la recarga de nominaciones y no se disparan al cargar la historia.

**Non-Goals:**

- Web Push, service worker, manifest.
- Emails por evento, frecuencias configurables o filtros por tipo en el email.

## Decisions

### D1. Transporte Resend por `fetch`

`src/services/email/resend-transport.ts` es el **único** punto de salida a Resend (mismo criterio que los clientes
de MusicBrainz, Wikimedia y ListenBrainz): `POST https://api.resend.com/emails` con `Authorization: Bearer
RESEND_API_KEY`, `from: EMAIL_FROM`, `to`, `subject`, `text`, `html` y `headers`. Un error HTTP lanza
`EmailDeliveryError` con el estado (nunca el cuerpo, que puede repetir el destinatario).

`getEmailTransport()`: `EMAIL_TRANSPORT=resend` exige `RESEND_API_KEY` y `EMAIL_FROM` o lanza `EmailConfigError`;
`console` sigue igual (prohibido en producción); cualquier otro valor, `EmailConfigError`. `EmailMessage` suma
`headers?: Record<string, string>`, que el adaptador de consola imprime y Resend reenvía.

**Alternativas descartadas**: SDK de Resend (dependencia nueva para un solo `POST`); SMTP con `nodemailer`
(dependencia nueva y configuración de servidor). El adaptador deja la puerta abierta a otro proveedor implementando
`EmailTransport`.

Efecto colateral buscado: los emails de cuenta (recuperación, verificación, cambio de email, contraseña cambiada)
pasan a poder salir en producción con la misma configuración. Su contenido no cambia.

### D2. Preferencia y estado del resumen

En `app_user` (no en `notification_preference`, que es por tipo de aviso y no por canal):

- `notification_digest_enabled boolean NOT NULL DEFAULT false` — opt-in.
- `notification_digest_sent_at timestamptz` — fin de la ventana del último resumen enviado.

Activarlo exige email verificado: `PUT /api/me/notification-preferences` con `emailDigest: true` y
`email_verified_at` nulo responde `409 EMAIL_NOT_VERIFIED`. Si el email cambia y queda sin verificar, el script lo
salta (D4) sin desactivar la preferencia: al verificar el nuevo, vuelve a recibirlo.

### D3. Contenido del resumen

`buildDigest(userId, windowStart, windowEnd)` en `src/services/notifications/digest.ts`, reutilizando la lectura de la
bandeja (`listNotificationGroups` con los mismos filtros de privacidad y la misma agrupación) para no tener dos
definiciones de "qué ve la persona":

- Entradas **no leídas** con su evento más reciente dentro de la ventana `(notification_digest_sent_at o hace 7
  días, ahora]`, de las dos pestañas.
- Dos secciones, "Para ti" y "Novedades", hasta **8 entradas cada una**, con "y N más" y un botón a
  `/me/notifications` (absoluto, desde `NEXT_PUBLIC_APP_URL`).
- Los textos son los mismos de la bandeja (`messages/{es,en}/notifications.json`), en `app_user.locale` o `es`.
- Asunto neutro con la cifra de entradas: "Tu semana en music-platform: 5 novedades". **Sin** rachas, días sin
  entrar, "te estás perdiendo", ni nada de la actividad propia.
- **Semana vacía → no se envía** y no se mueve la marca (la ventana siguiente sigue cubriendo lo pendiente).
- Ningún dato de otras personas que la bandeja no muestre ya; nada de contenido privado de terceros.

**Alternativa descartada — consulta propia para el email**: duplicaría filtros de bloqueo, desactivación y
moderación, la clase de divergencia que la Fase 1 evitó con una sola fuente de lectura.

### D4. Envío programado e idempotente

`scripts/send-notification-digests.ts` (con `--dry-run`) llama a `sendNotificationDigests(now)`:

1. `pg_try_advisory_lock` de `notification-digest`: si otra corrida está en curso, sale sin hacer nada.
2. Destinatarios: `notification_digest_enabled`, email verificado, cuenta activa y `notification_digest_sent_at`
   nulo o anterior al **inicio de la semana actual** (lunes 00:00 UTC). Dos corridas en la misma semana no repiten.
3. Por persona, en serie: arma el resumen; si no está vacío, lo envía y **después** actualiza
   `notification_digest_sent_at = now`. Un fallo de envío de una persona se registra y no corta el lote ni mueve su
   marca (la próxima corrida lo reintenta).
4. Ritmo: una pausa mínima entre envíos (`DIGEST_SEND_INTERVAL_MS`, 600 ms por defecto) para no superar el límite
   de Resend.

El wrapper `scripts/send-notification-digests.cmd` sigue el patrón del backup (cwd fijo, `node` + `tsx`). La tarea
se programa los lunes a las 10:00; `docs/06-operations/notification-digest.md` describe alta, verificación y cómo
moverlo al cron del proveedor al desplegar.

**Alternativa descartada — disparo bajo demanda con `after()`**: depende de que haya tráfico justo después de la
hora y ejecutaría envíos largos dentro del ciclo de vida de una request.

### D5. Baja en un clic

Token `base64url(userId.issuedWeek).hmac` firmado con `EMAIL_UNSUBSCRIBE_SECRET` (HMAC-SHA256, `node:crypto`,
comparación en tiempo constante). No expira: dar de baja nunca debe fallar por un email viejo. No sirve para otra
cosa que poner `notification_digest_enabled = false`.

- Cada resumen lleva el enlace `/<locale>/notifications/unsubscribe?token=…` y las cabeceras `List-Unsubscribe:
  <https://…/api/notifications/unsubscribe?token=…>` y `List-Unsubscribe-Post: List-Unsubscribe=One-Click`.
- `POST /api/notifications/unsubscribe?token=` (el que usan los clientes de correo) desactiva y responde `200`, sin
  sesión.
- `GET` de la página muestra un botón de confirmar (un `GET` no cambia estado: los escáneres de enlaces lo abren).
- Token inválido → `400 INVALID_UNSUBSCRIBE_TOKEN` (código nuevo, como `INVALID_RESET_TOKEN` e
  `INVALID_VERIFICATION_TOKEN`) y la página lo explica.

### D6. Avisos de premios

Tipos nuevos, en la pestaña "Novedades", activados por defecto, desactivables con **una** preferencia
(`artist_award`, que gobierna los dos):

| Tipo | Cuándo | Texto |
|---|---|---|
| `artist_award_nomination` | ceremonia de competencia con `held_on` en el futuro o en los últimos 30 días | "*Artista* tiene 3 nominaciones en los Grammy 2027" |
| `artist_award_win` | ceremonia con `held_on` en los últimos 30 días y al menos una nominación ganadora de un artista seguido, o una clase de Salón de la Fama del año en curso | "*Artista* ganó 2 premios en los Grammy 2027" / "*Artista* entró al Salón de la Fama de los Grammy" |

- **Referencia estable**: `notification.award_ceremony_id` (FK `ON DELETE CASCADE`), nunca la nominación (se reescribe
  en cada recarga de una categoría). El único `(recipient_id, award_ceremony_id, kind)` hace idempotente la carga.
- **Una entrada por persona y ceremonia**, aunque siga a varios nominados. La fila no guarda a quién: la lectura
  calcula, para esa ceremonia, los artistas seguidos con nominaciones o premios (directamente o como crédito
  `primary` del disco o la canción nominados), sus cifras y el más nombrado; así una recarga que corrige nominaciones
  se refleja sin reescribir avisos. Si después de una corrección ya no queda ningún artista seguido, la entrada no se
  muestra.
- **Emisión**: `loadAward` devuelve los ids de las ceremonias que escribió; `scripts/load-awards.ts` llama, después de
  la transacción de cada premio, a `emitArtistAwardNotifications(tx, ceremonyIds, today)`, que filtra por la ventana
  de la tabla y hace un `INSERT … SELECT` desde nominaciones + créditos + `artist_follow` + cuentas activas +
  preferencia (con su defecto). Un fallo se registra y no invalida la carga.
- **La historia no avisa**: las ceremonias fuera de la ventana (todo `data/awards/` de años anteriores) no emiten.
- Halls of fame: solo `artist_award_win` ("entró"), nunca nominaciones (no tienen).

### D7. Esquema (migración `0077`)

```
ALTER TABLE notification ADD COLUMN award_ceremony_id uuid REFERENCES award_ceremony(id) ON DELETE CASCADE;
-- chk_notification_kind, chk_notification_actor (sin actor) y chk_notification_target con los dos tipos nuevos
CREATE UNIQUE INDEX uq_notification_recipient_ceremony_kind
  ON notification (recipient_id, award_ceremony_id, kind) WHERE award_ceremony_id IS NOT NULL;
-- chk_notification_preference_kind + 'artist_award'
ALTER TABLE app_user
  ADD COLUMN notification_digest_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN notification_digest_sent_at timestamptz;
```

Sin backfill: el resumen empieza desactivado para todos y los premios ya cargados no avisan.

### D8. API y UI

- `GET|PUT /api/me/notification-preferences`: `{ preferences, emailDigest, emailVerified }`; el `PUT` acepta
  `emailDigest`. `artist_award` se suma a las claves de `preferences`.
- `NotificationGroup.target` suma `{ type: "award", ceremonyId, awardSlug, awardName, year, isHallOfFame,
  artistName, artistCount, count }` (`count` = nominaciones o premios del grupo de artistas seguidos).
- Fila de premio: icono de premio, texto de D6, enlace a la ceremonia (`/awards/<slug>/<year>` o
  `/hall-of-fame/<slug>/<year>`).
- Ajustes → Notificaciones: sección "Por email" con "Resumen semanal (lunes)"; sin email verificado, el interruptor
  queda deshabilitado con el enlace a verificarlo. "Premios de artistas que sigues" en "Novedades".
- Página `/[locale]/notifications/unsubscribe` (sin sesión): confirmar, hecho, o token inválido.

## Risks / Trade-offs

- [El Task Scheduler depende de que la máquina esté encendida] → idempotente por semana: la corrida siguiente
  envía lo que faltó; documentado el paso al cron del proveedor al desplegar.
- [Resend rechaza o limita] → envío en serie con pausa; un fallo no corta el lote ni mueve la marca.
- [Un email expone contenido] → el resumen reutiliza la lectura de la bandeja; solo lo que la persona ya ve.
- [Reenviar el email a otra persona permite darse de baja por ella] → el token solo puede desactivar el resumen,
  nada más; es el comportamiento estándar de RFC 8058.
- [Avalancha de premios al cargar una ceremonia grande] → una entrada por persona y ceremonia; la preferencia es una.
- [Correcciones de nominaciones] → la entrada se recalcula al leer; si deja de haber un artista seguido, no se muestra.
- [El secreto de baja se filtra] → solo permite desactivar resúmenes; rotarlo invalida enlaces viejos y por eso no se
  rota salvo incidente (documentado).

## Migration Plan

1. `drizzle/0077_notification_digest_and_awards.sql` (aditiva salvo los `CHECK` rehechos).
2. Configurar `EMAIL_TRANSPORT=resend`, `RESEND_API_KEY`, `EMAIL_FROM` y `EMAIL_UNSUBSCRIBE_SECRET`; verificar el
   dominio remitente en Resend.
3. Desplegar; programar `send-notification-digests.cmd` (lunes 10:00).
4. Rollback: quitar la tarea programada y volver a `EMAIL_TRANSPORT=console` en desarrollo; la migración puede
   quedarse.

## Open Questions

- Ninguna bloqueante. Web Push queda en la Fase 6 del roadmap.
