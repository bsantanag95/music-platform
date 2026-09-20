## 1. Modelo de datos

- [x] 1.1 Crear `drizzle/0033_email_verification.sql`: `ALTER TABLE app_user ADD COLUMN
      email_verified_at TIMESTAMPTZ;`, backfill `UPDATE app_user SET email_verified_at = created_at
      WHERE email_verified_at IS NULL;`, y tabla `email_verification_token` (`id` UUID PK, `user_id`
      UUID NOT NULL FK `app_user(id)` ON DELETE CASCADE, `token_hash` TEXT NOT NULL, `created_at`
      TIMESTAMPTZ NOT NULL default `now()`, `expires_at` TIMESTAMPTZ NOT NULL, CHECK
      `expires_at > created_at`), sin columna `used_at`.
- [x] 1.2 Índices: `uq_email_verification_token_hash` único sobre `token_hash`,
      `uq_email_verification_token_user` único sobre `user_id` (un token vigente por usuario),
      `idx_email_verification_token_expires_at` sobre `expires_at`.
- [x] 1.3 Agregar a `src/db/schema.ts`: `appUser.emailVerifiedAt`, tabla `emailVerificationToken`
      (siguiendo el patrón de `passwordResetToken`) y exportar `EmailVerificationTokenRow`.
- [x] 1.4 Documentar la columna y la tabla en `docs/03-data/sql-model.md` y clasificar el token como
      dato efímero (Clase D) en `docs/02-architecture/data-classification.md`.
- [x] 1.5 Aplicar la migración local (`pnpm run db:migrate`) y verificar que no hay drift de esquema.

## 2. Plantilla de email

- [x] 2.1 Crear `src/services/email/templates/email-verification.ts`: asunto, texto y HTML para un
      `locale` dado, con el link
      `${NEXT_PUBLIC_APP_URL}/<locale>/auth/verify-email?token=<token>` y escape HTML, reutilizando
      el patrón de `templates/password-reset.ts` y la copy de `messages/{locale}/auth.json`.
- [x] 2.2 Tests de la plantilla (link localizado es/en, fallback a `es`, escape del HTML).

## 3. Servicio de dominio de verificación

- [x] 3.1 Crear `src/services/auth/email-verification.ts` con:
      `requestEmailVerification(userId, locale)` (resuelve el transporte primero; no-op si ya está
      verificado; upsert del token; envía el correo), `findValidVerificationToken(token)` (no
      consume), `verifyEmail(token)` (consume atómico + `email_verified_at = now()` + borra tokens en
      una transacción) y `cleanupExpiredVerificationTokens()`.
- [x] 3.2 Reutilizar el patrón del reset: token de 32 bytes `base64url`, hash SHA-256, TTL de 24 h,
      `INSERT ... ON CONFLICT (user_id) DO UPDATE` sobre `uq_email_verification_token_user`.
- [x] 3.3 En el servicio, si `getEmailTransport()` falla (producción sin proveedor), registrar el
      fallo y NO crear token, sin propagar el error (modo soft).
- [x] 3.4 Encadenar `cleanupExpiredVerificationTokens()` desde `scripts/cleanup-expired-sessions.ts`.
- [x] 3.5 Tests unitarios del servicio: no-op si ya verificado; token generado y correo enviado;
      sin token si falla el transporte; single-use; expirado no verifica; verificación fija
      `email_verified_at` y borra tokens; limpieza de vencidos.

## 4. Altas (registro local y Google)

- [x] 4.1 `POST /api/auth/register`: tras crear la cuenta, disparar
      `void requestEmailVerification(user.id, locale).catch(log)` sin bloquear ni hacer fallar el
      alta; aceptar `locale?` del body.
- [x] 4.2 `src/services/auth/identities.ts`: `resolveOrCreateOAuthUser` inserta `emailVerifiedAt:
      new Date()` en las altas de Google.
- [x] 4.3 Actualizar los tests de registro y de identidades para el nuevo comportamiento (incluido
      el envío en best-effort).

## 5. Esquemas, contratos y errores

- [x] 5.1 `src/lib/api/schemas.ts`: agregar `locale?` a `RegisterRequestSchema`, el body de
      verificación (`VerifyEmailRequestSchema` con `token`) y los códigos `INVALID_VERIFICATION_TOKEN`
      y `EMAIL_ALREADY_VERIFIED` a `ErrorCodeSchema`.
- [x] 5.2 Documentar ambos códigos en `docs/04-api/errors.md`.
- [x] 5.3 Documentar las rutas en `docs/04-api/contracts.md` (verificación, reenvío) y la nueva
      verificación al registrarse; actualizar la sección de Google para notar que la cuenta queda
      `email_verified_at` poblada.

## 6. Rutas API

- [x] 6.1 `src/app/api/auth/email/verify/route.ts`: `POST` con `withErrorHandling`, valida con Zod,
      consume el token y responde `200` o `400 INVALID_VERIFICATION_TOKEN`; rate limit por IP.
- [x] 6.2 `src/app/api/auth/email/verify/resend/route.ts`: `POST` que requiere sesión (`401
      AUTH_REQUIRED`), responde `409 EMAIL_ALREADY_VERIFIED` si ya está verificada, si no reenvía
      (`200`); rate limit por usuario e IP.
- [x] 6.3 Tests de rutas: éxito, token inválido, ya verificado, sin sesión y rate limit.

## 7. Páginas y UI (modo soft)

- [x] 7.1 `src/app/[locale]/auth/verify-email/page.tsx` (Server Component): pre-valida el token con
      `findValidVerificationToken`, aplica `Referrer-Policy: no-referrer`, muestra el estado de
      confirmación o el de link inválido/expirado con opción de pedir uno nuevo.
- [x] 7.2 Componente cliente de confirmación/reenvío que llama a `/api/auth/email/verify` vía
      `apiFetch` y redirige a un estado de éxito tras verificar.
- [x] 7.3 Aviso de email sin verificar con botón "Reenviar" en `/<locale>/me/settings` (visible solo
      con `email_verified_at` nulo), y estado de éxito tras verificar.
- [x] 7.4 Tests de componentes/páginas: aviso visible/oculto según el estado, reenvío, verificación
      exitosa, link inválido.

## 8. i18n

- [x] 8.1 Agregar claves a `messages/{es,en}/auth.json`: aviso de email sin verificar, botón
      reenviar, estados de verificación (éxito, link inválido/expirado), copy del correo
      (`verifyEmailSubject`, `verifyEmailIntro`, `verifyEmailCta`, `verifyEmailExpiry`,
      `verifyEmailIgnore`).
- [x] 8.2 Agregar `INVALID_VERIFICATION_TOKEN` y `EMAIL_ALREADY_VERIFIED` (`title`/`description`) a
      `messages/{es,en}/errors.json`.

## 9. Documentación y ADR

- [x] 9.1 Crear `docs/02-architecture/adr/0015-verificacion-de-email.md`: decisión (columna de estado,
      token de un solo uso, modo soft, relación con ADR 0010 y con el transporte de email) y
      alternativas.
- [x] 9.2 Actualizar `docs/02-architecture/auth.md` con una sección de verificación de email.
- [x] 9.3 Actualizar `docs/README.md` (lista de ADR y estado de `auth.md`).

## 10. Smoke test

- [x] 10.1 `scripts/smoke-test-email-verification.ts`: guard `assert-smoke-allowed.ts`, requiere
      `ALLOW_SMOKE_ON_REAL_DB=1` y BD de scratch, captura el token del adaptador `console` (sin
      envíos reales) y ejercita los route handlers reales.
- [x] 10.2 Cubrir: registro local genera token; cuenta ya verificada es no-op; verificación exitosa
      fija `email_verified_at` y borra el token; token reusado/expirado → `INVALID_VERIFICATION_TOKEN`;
      reenvío autenticado y `EMAIL_ALREADY_VERIFIED`.
- [x] 10.3 Limpiar fixtures al terminar y documentar el script en `AGENTS.md`.

## 11. Verificación final

- [x] 11.1 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build` en verde.
      → typecheck limpio; lint sin errores (4 warnings preexistentes de `<img>`); suite completa
      1961 passed; build de producción exitoso con las rutas nuevas.
- [x] 11.2 Correr el smoke test y resetear/borrar los fixtures usados.
      → corrido con `ALLOW_SMOKE_ON_REAL_DB=1` contra la BD de `DATABASE_URL` (dev local); el script
      borra sus usuarios `smoke_verify_*` y el cascade limpia tokens y sesiones.
- [x] 11.3 Probar manualmente en el navegador: registrar una cuenta, obtener el link por el
      adaptador `console`, verificar, comprobar el aviso y el reenvío; y que las cuentas existentes
      no ven el aviso. → verificado manualmente por el usuario.
- [x] 11.4 Pedir auditoría al subagente **seguridad** (solo reporte) sobre token, reenvío, rate
      limiting, exposición del link y modo soft. → reporte con 1 hallazgo alto y varios bajos, todos
      resueltos en el grupo 12.
- [x] 11.5 Confirmar `openspec validate` en verde y que `docs/`, contratos y esquemas quedaron
      sincronizados. → `openspec validate add-email-verification --type change --strict` válido.

## 12. Endurecimiento tras auditoría de seguridad

- [x] 12.1 Reenvío: eliminar `clearAuthAttempts` en el éxito (cada envío cuenta contra el rate
      limit). Antes, limpiar los contadores tras cada envío permitía reenvíos ilimitados
      (hallazgo alto #1). Test actualizado.
- [x] 12.2 Exponer y usar el helper `isEmailVerified` (existía solo en la documentación): centraliza
      el punto de enforcement y lo usan el servicio y `/<locale>/me/settings` (hallazgo bajo #3).
- [x] 12.3 Validar el body del reenvío con `ResendEmailRequestSchema` (hallazgo informativo #7).
- [x] 12.4 Documentar `EMAIL_CONFIG_MISSING` también para el reenvío (`errors.md`) y aclarar en
      `auth.md`/ADR 0015 que el modo soft no impide reservar un email ajeno y que el `no-referrer`
      se aplica por metadata (hallazgos #2, #4, #6).
- [x] 12.5 Smoke test: verificar que el reenvío invalida el token anterior (hallazgo informativo #9).
