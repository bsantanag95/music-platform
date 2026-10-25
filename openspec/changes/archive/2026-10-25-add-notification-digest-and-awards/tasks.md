## 1. Esquema

- [x] 1.1 Crear `drizzle/0077_notification_digest_and_awards.sql`: `notification.award_ceremony_id` (FK `award_ceremony` `ON DELETE CASCADE`); rehacer `chk_notification_kind`, `chk_notification_actor` (sin actor) y `chk_notification_target` con `artist_award_nomination` y `artist_award_win`; único parcial `(recipient_id, award_ceremony_id, kind)`; `artist_award` en `chk_notification_preference_kind`; `app_user.notification_digest_enabled` (`NOT NULL DEFAULT false`) y `notification_digest_sent_at`
- [x] 1.2 Espejo en `src/db/schema.ts` (tipos nuevos en `TAB_KINDS.releases`, `artist_award` con defecto activado)
- [x] 1.3 Aplicar en la BD de scratch y documentar en `docs/03-data/sql-model.md`

## 2. Transporte de email

- [x] 2.1 `EmailMessage.headers?` en `src/services/email/types.ts`; el adaptador de consola las imprime
- [x] 2.2 `src/services/email/resend-transport.ts` (único punto de salida a Resend, `fetch`, `EmailDeliveryError` sin cuerpo) y `getEmailTransport()` con `EMAIL_TRANSPORT=resend` (exige `RESEND_API_KEY` y `EMAIL_FROM`); pruebas con `fetch` simulado (petición, cabeceras, error HTTP, falta de configuración, consola prohibida en producción)
- [x] 2.3 `.env.example` (`EMAIL_TRANSPORT=resend`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_UNSUBSCRIBE_SECRET`) y `docs/02-architecture/auth.md` (transporte de producción)

## 3. Premios

- [x] 3.1 `loadAward` devuelve los ids de las ceremonias escritas; `scripts/load-awards.ts` llama a `emitArtistAwardNotifications` después de la transacción de cada premio y registra un fallo sin abortar
- [x] 3.2 `emitArtistAwardNotifications(tx, ceremonyIds, today)` en el emisor: ventana de D6 (futuro o últimos 30 días; Salón de la Fama del año en curso solo como `win`), `INSERT … SELECT` desde nominaciones + créditos `primary` + `artist_follow` + cuentas activas + preferencia con defecto, una fila por persona, ceremonia y tipo; pruebas
- [x] 3.3 `read.ts`: `target` de premio calculado al leer (artistas seguidos de la ceremonia, cifra, el de más nominaciones, `artistCount`), entrada oculta si ya no queda ningún artista seguido; pruebas

## 4. Resumen semanal

- [x] 4.1 `src/services/notifications/unsubscribe.ts`: token HMAC-SHA256 con `EMAIL_UNSUBSCRIBE_SECRET`, comparación en tiempo constante, sin expiración; pruebas (válido, alterado, otro secreto)
- [x] 4.2 `buildDigest(userId, windowStart, windowEnd)` sobre `listNotificationGroups` de las dos pestañas: no leídas de la ventana, 8 por sección + "y N más", vacío si no hay nada; pruebas (filtros heredados, semana vacía, todo leído)
- [x] 4.3 Plantilla `src/services/email/templates/notification-digest.ts` (texto y HTML escapado, `es` / `en`, asunto neutro, enlace a la bandeja y a la baja, cabeceras `List-Unsubscribe` + `List-Unsubscribe-Post`); pruebas de contenido y de que no hay métricas de actividad
- [x] 4.4 `sendNotificationDigests(now, { dryRun })`: `pg_try_advisory_lock`, destinatarios (opt-in, verificado, activo, marca anterior al lunes 00:00 UTC), envío en serie con pausa, marca solo tras enviar, fallo por persona registrado sin cortar; pruebas
- [x] 4.5 `scripts/send-notification-digests.ts` (`--dry-run`) + `scripts/send-notification-digests.cmd` y `docs/06-operations/notification-digest.md` (Task Scheduler los lunes 10:00, verificación, paso al cron del proveedor, rotación del secreto)

## 5. API

- [x] 5.1 `GET|PUT /api/me/notification-preferences`: `emailDigest` y `emailVerified`, `artist_award` en `preferences`, `409 EMAIL_NOT_VERIFIED` al activar sin verificar; pruebas
- [x] 5.2 `POST /api/notifications/unsubscribe?token=` sin sesión (`200`, `400 INVALID_UNSUBSCRIBE_TOKEN`); pruebas
- [x] 5.3 Schemas Zod (preferencias, `target` de premio) y `docs/04-api/contracts.md` + `errors.md`
- [x] 5.4 Preferencia del resumen en `src/services/profiles/data-export.ts` y su prueba

## 6. UI

- [x] 6.1 `NotificationRow`: fila de premio (icono, textos de nominación / ganó / entró, "y N artistas más", enlace a la ceremonia o a la clase del Salón de la Fama)
- [x] 6.2 `NotificationPreferencesForm`: sección "Por email" (resumen semanal, deshabilitado con enlace a verificar si el email no está verificado) y "Premios de artistas que sigues" en "Novedades"
- [x] 6.3 Página `src/app/[locale]/notifications/unsubscribe/page.tsx` sin sesión: confirmar (botón que hace el `POST`), hecho, token inválido
- [x] 6.4 Mensajes `es` / `en` (plurales ICU) y pruebas de componentes

## 7. Documentación

- [x] 7.1 ADR `docs/02-architecture/adr/0047-resumen-semanal-por-email.md` (Resend por `fetch`, resumen reutilizando la lectura de la bandeja, envío programado idempotente, baja firmada; Web Push diferido) y su entrada en `docs/README.md`
- [x] 7.2 `docs/05-features/notifications.md` (Fase 3), `docs/05-features/awards.md` (la carga avisa), `business-rules.md`, `domain-model.md` y `docs/00-product/roadmap.md` (Web Push en la Fase 6)

## 8. Verificación

- [x] 8.1 `scripts/smoke-test-notifications.ts`: premios contra Postgres real (nominación, ganó, Salón de la Fama, historia sin avisos, carga repetida, una entrada por ceremonia, corrección que oculta la entrada, preferencia), resumen con un transporte simulado (opt-in, verificado, semana vacía, todo leído, doble corrida, fallo de una entrega, filtros) y baja (token válido / alterado); premio sintético `smoke-*` y su limpieza en `AGENTS.md`
- [x] 8.2 Correr el smoke en la BD de scratch y una corrida `--dry-run` del script de resumen
- [x] 8.3 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- [x] 8.4 Verificar en el navegador (escritorio y 375 px): ajustes "Por email", fila de premio, página de baja
