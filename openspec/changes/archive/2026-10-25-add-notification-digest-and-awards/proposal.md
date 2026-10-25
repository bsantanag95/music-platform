## Why

Las Fases 1 y 2 dejaron la bandeja completa dentro de la app: lo dirigido a la persona en "Para ti" y los
lanzamientos de artistas seguidos en "Novedades". Quien no abre la app durante una semana no se entera de nada, y los
premios —que la plataforma ya carga y muestra con detalle (ADR 0032, 0042–0044)— no avisan a quien sigue a un
nominado. Esta es la **Fase 3** y última del plan de notificaciones.

Hoy además no hay ningún proveedor de email real: `getEmailTransport` solo tiene el adaptador `console` y en
producción falla cerrado (`EMAIL_CONFIG_MISSING`). Sumar un proveedor es requisito del resumen y, de paso, habilita
los emails de cuenta (recuperación, verificación, cambio de email) que hoy no pueden salir en producción.

## What Changes

- **Transporte de email Resend** por HTTP (`fetch`, sin dependencia nueva): `EMAIL_TRANSPORT=resend` con
  `RESEND_API_KEY` y `EMAIL_FROM`; único punto de salida a Resend, falla cerrado sin configuración. `EmailMessage`
  suma cabeceras opcionales (`List-Unsubscribe`).
- **Resumen semanal por email**, **opt-in** (desactivado por defecto) y solo con email verificado: lo no leído de la
  semana en "Para ti" y en "Novedades", agrupado igual que la bandeja, con tope y enlace a `/me/notifications`. Una
  semana sin nada nuevo **no envía nada**. Sin métricas de actividad ni recordatorios ("hace X días que…").
- **Baja en un clic**: enlace firmado (HMAC, sin sesión) en cada resumen y cabeceras `List-Unsubscribe` +
  `List-Unsubscribe-Post` (RFC 8058).
- **Envío programado**: `scripts/send-notification-digests.ts`, idempotente por semana (lock + marca por persona),
  con su wrapper `.cmd` para el Task Scheduler, igual que el backup; documentado en `docs/06-operations/`.
- **Premios de artistas seguidos** en "Novedades": al cargar una ceremonia con `load-awards`, se avisa a quien sigue a
  un artista nominado (directamente o como artista principal del disco o la canción nominados), **una entrada por
  ceremonia**: "*Artista* tiene 3 nominaciones en los Grammy 2027" y, con la ceremonia ya celebrada, "*Artista* ganó
  en los Grammy 2027". El ingreso a un Salón de la Fama avisa como "entró". Solo ceremonias recientes o próximas:
  cargar la historia no avisa.
- **Ajustes → Notificaciones**: sección "Por email" con el resumen semanal (con aviso si el email no está
  verificado) y el tipo de premios en "Novedades" (activado por defecto).
- Migración `0077`: tipos `artist_award_nomination` y `artist_award_win`, columna `award_ceremony_id`, preferencias y
  columnas del resumen en `app_user`.
- **Diferido**: Web Push. Necesita service worker y manifest, que el roadmap deja para la Fase 6 (PWA); se anota ahí.

## Goals / Non-Goals

**Goals:**

- Que quien no entra a diario igual se entere de lo importante, en un solo email semanal que pidió.
- Que seguir a un artista avise también de sus nominaciones y premios.
- Un proveedor de email real con el mismo contrato que el adaptador de consola.

**Non-Goals:**

- Web Push y cualquier parte de la PWA (Fase 6 del roadmap).
- Emails inmediatos por evento: el email es solo el resumen semanal.
- Frecuencias configurables (diaria, mensual) o elegir qué tipos van por email: un solo resumen semanal con lo que
  la persona ya recibe en la bandeja.
- Cambiar el contenido de los emails de cuenta existentes.
- Avisar ceremonias históricas al cargarlas.

## Capabilities

### New Capabilities

- `notification-digest`: resumen semanal por email (opt-in, email verificado, contenido, semana vacía, baja en un
  clic, envío programado idempotente) y el transporte de email Resend.

### Modified Capabilities

- `notifications`: tipos de premios en "Novedades", su emisión desde la carga de premios, su lectura agrupada por
  ceremonia, y preferencias con los tipos nuevos.

## Impact

- **Base de datos**: `drizzle/0077_notification_digest_and_awards.sql`, espejo en `src/db/schema.ts`,
  `docs/03-data/sql-model.md`.
- **Servicios**: `src/services/email/resend-transport.ts` + `index.ts` + `types.ts`;
  `src/services/notifications/digest.ts` (selección, plantilla, envío), `unsubscribe.ts` (token firmado);
  `src/services/notifications/emit.ts` y `read.ts` (premios); `src/services/awards/load.ts` (llamada al emisor);
  `src/services/profiles/data-export.ts` (preferencia del resumen).
- **API**: `GET|PUT /api/me/notification-preferences` (`emailDigest`), `GET|POST /api/notifications/unsubscribe`,
  tipos nuevos en `NotificationGroup` → `docs/04-api/contracts.md` y `errors.md` (`EMAIL_NOT_VERIFIED`, `INVALID_UNSUBSCRIBE_TOKEN`).
- **UI**: `NotificationPreferencesForm`, `NotificationRow` (premios), página `/[locale]/notifications/unsubscribe`,
  plantilla del email en `src/services/email/templates/`, mensajes `es` / `en`.
- **Scripts y operación**: `scripts/send-notification-digests.ts` + `.cmd`, `docs/06-operations/notification-digest.md`,
  `.env.example` (`EMAIL_TRANSPORT=resend`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_UNSUBSCRIBE_SECRET`).
- **Docs**: ADR nuevo `0047` (Resend, resumen semanal y envío programado), `docs/05-features/notifications.md`,
  `business-rules.md`, `domain-model.md`, `docs/05-features/awards.md`, `docs/00-product/roadmap.md` (Web Push en la
  Fase 6), `docs/02-architecture/auth.md` (el transporte de producción).
- **Smoke**: `scripts/smoke-test-notifications.ts` (premios, resumen con transporte simulado, baja) + `AGENTS.md`.
- **Sin dependencias nuevas** (Resend por `fetch`; HMAC con `node:crypto`).
