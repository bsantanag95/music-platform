## 1. Modelo de datos

- [x] 1.1 Crear `drizzle/0031_password_reset_token.sql`: tabla `password_reset_token` (`id` UUID PK
      default, `user_id` UUID NOT NULL FK `app_user(id)` ON DELETE CASCADE, `token_hash` TEXT NOT
      NULL, `created_at` TIMESTAMPTZ NOT NULL default `now()`, `expires_at` TIMESTAMPTZ NOT NULL,
      CHECK `expires_at > created_at`), sin columna `used_at` (single-use por borrado físico).
- [x] 1.2 Índices: `uq_password_reset_token_hash` único sobre `token_hash`,
      `uq_password_reset_token_user` único sobre `user_id` (migración `0032`, un solo token vigente
      por usuario) e `idx_password_reset_token_expires_at` sobre `expires_at`.
- [x] 1.3 Agregar `passwordResetToken` a `src/db/schema.ts` (pgTable + check, siguiendo el patrón de
      `session`) y exportar `PasswordResetTokenRow`.
- [x] 1.4 Documentar la tabla en `docs/03-data/sql-model.md`.
- [x] 1.5 Aplicar la migración local (`pnpm run db:migrate`) y verificar que no hay drift de esquema.

## 2. Servicio de email

- [x] 2.1 Crear `src/services/email/types.ts`: `EmailMessage { to, subject, html, text }` e interfaz
      `EmailTransport` con `send(message): Promise<void>`.
- [x] 2.2 Crear `src/services/email/console-transport.ts`: adaptador de desarrollo que registra el
      mensaje por consola (incluye el link), prohibido en producción.
- [x] 2.3 Crear `src/services/email/index.ts` con `getEmailTransport()`: selecciona el transporte
      según `EMAIL_TRANSPORT`; en `NODE_ENV=production` sin transporte real configurado lanza un
      error controlado (`EMAIL_CONFIG_MISSING`), fail-closed; en desarrollo cae al adaptador
      `console`.
- [x] 2.4 Crear `src/services/email/templates/password-reset.ts`: compone asunto, texto y HTML del
      correo para un `locale` dado, construyendo el link
      `${NEXT_PUBLIC_APP_URL}/<locale>/auth/reset-password?token=<token>`.
- [x] 2.5 Tests de `getEmailTransport` y de la plantilla (fallback a console en dev, fail-closed en
      producción, link localizado correcto).
- [x] 2.6 Agregar `EMAIL_TRANSPORT` y `EMAIL_FROM` a `.env.example` con comentarios (incluyendo que
      `console` es solo para desarrollo).

## 3. Servicio de dominio de restablecimiento

- [x] 3.1 `src/services/auth/users.ts`: agregar búsqueda de usuario para reset que devuelva
      `{ id, passwordHash }` por email (reutilizando o extendiendo `findUserByEmail`) y
      `updatePasswordHash(userId, hash)`.
- [x] 3.2 Crear `src/services/auth/password-reset.ts` con `requestPasswordReset(email, locale)`:
      busca usuario, y solo si `passwordHash != null` borra tokens previos del usuario, inserta uno
      nuevo y envía el correo; si no existe o es solo-Google es no-op.
- [x] 3.3 Implementar generación de token en `password-reset.ts`: 32 bytes `base64url`, hash SHA-256
      persistido, TTL de 30 minutos, con `INSERT ... ON CONFLICT (user_id) DO UPDATE` sobre el índice
      único `uq_password_reset_token_user` para que pedir un token nuevo invalide el anterior de forma
      atómica y race-safe.
- [x] 3.4 Implementar `findValidResetToken(token)` (no consume, para la pre-validación de la página).
- [x] 3.5 Implementar `consumeResetToken(token)` con borrado atómico
      (`DELETE ... WHERE token_hash = ... AND expires_at > now() RETURNING user_id`) y
      `resetPassword(token, password)`: valida el token y calcula el hash antes de consumirlo, y en
      una única transacción actualiza el hash, borra todos los tokens del usuario y todas sus
      sesiones.
- [x] 3.6 Implementar `cleanupExpiredResetTokens()` y encadenarla desde
      `scripts/cleanup-expired-sessions.ts` (o un script hermano invocado por el scheduler).
- [x] 3.7 Tests unitarios de `password-reset.ts`: token solo para cuenta con contraseña local; no-op
      para email inexistente y cuenta solo-Google; un token nuevo invalida el previo; `expires_at` a
      30 min; token expirado no consume; single-use (segundo intento falla); reset actualiza hash,
      borra tokens y borra todas las sesiones.

## 4. Esquemas, contratos y errores

- [x] 4.1 Agregar a `src/lib/api/schemas.ts`: `ForgotPasswordRequestSchema`
      (`email` válido + `locale` opcional) y `ResetPasswordRequestSchema` (`token` no vacío +
      `password` min 8 / max 128, reutilizando la política de registro).
- [x] 4.2 Agregar los códigos `INVALID_RESET_TOKEN` (400) y `EMAIL_CONFIG_MISSING` (503) a
      `ErrorCodeSchema`.
- [x] 4.3 Documentar ambos códigos en `docs/04-api/errors.md`.
- [x] 4.4 Documentar los endpoints en `docs/04-api/contracts.md` (sección de recuperación de
      contraseña): request/response de `forgot` (202 genérico) y `reset` (200 / 400 / 429),
      señalando explícitamente la anti-enumeración.

## 5. Rutas API

- [x] 5.1 `src/app/api/auth/password/forgot/route.ts`: `POST` envuelto en `withErrorHandling`,
      valida con Zod, aplica rate limit (IP + email), responde `202 { ok: true }` siempre para email
      bien formado y dispara el envío sin bloquear la respuesta.
- [x] 5.2 `src/app/api/auth/password/reset/route.ts`: `POST` envuelto en `withErrorHandling`, valida
      con Zod, aplica rate limit por IP, responde `200` en éxito y `400` con `INVALID_RESET_TOKEN`
      para token inválido/expirado/usado.
- [x] 5.3 Manejar `EMAIL_CONFIG_MISSING` como `503` controlado en `forgot`.
- [x] 5.4 Tests de rutas (`route.test.ts` por endpoint): `202` invariante (email inexistente /
      cuenta solo-Google / cuenta local), `400 VALIDATION_ERROR`, `429 RATE_LIMITED`,
      `400 INVALID_RESET_TOKEN`, `200` de reset y `503` de configuración ausente.

## 6. Páginas y formularios

- [x] 6.1 `src/app/[locale]/auth/forgot-password/page.tsx` (Server Component) y
      `src/components/auth/ForgotPasswordForm.tsx` (client): envío vía `apiFetch` con
      `ForgotPasswordRequestSchema`, estado genérico de enviado y nota para cuentas Google.
- [x] 6.2 `src/app/[locale]/auth/reset-password/page.tsx` (Server Component): lee `token` de
      `searchParams`, pre-valida con `findValidResetToken`, renderiza el formulario o el estado de
      link inválido/expirado, y aplica `Referrer-Policy: no-referrer`.
- [x] 6.3 `src/components/auth/ResetPasswordForm.tsx` (client): token como prop, contraseña +
      confirmación, error local si no coinciden, llama a `/api/auth/password/reset`, redirige a
      `/auth/login?reset=1` en éxito y muestra `ApiError.code` traducido en error.
- [x] 6.4 Actualizar `src/app/[locale]/auth/login/page.tsx`: enlace "¿Olvidaste tu contraseña?" al
      pedido y aviso de éxito al recibir `?reset=1`.
- [x] 6.5 Tests de componentes: `ForgotPasswordForm` (envío, mensaje genérico, validación),
      `ResetPasswordForm` (contraseñas no coincidentes, token inválido, éxito) y actualización de
      `src/app/[locale]/auth/auth-pages.test.tsx` para las páginas nuevas y el enlace de login.

## 7. i18n

- [x] 7.1 Agregar claves a `messages/es/auth.json` y `messages/en/auth.json`: enlace de olvido,
      título/descripción del pedido, mensaje genérico de enviado, nota de Google, título/descripción
      del reset, etiquetas de contraseña y confirmación, error de no coincidencia, estado de token
      inválido, aviso de éxito del login.
- [x] 7.2 Agregar `INVALID_RESET_TOKEN` y `EMAIL_CONFIG_MISSING` (con `title` y `description`) a
      `messages/es/errors.json` y `messages/en/errors.json`.

## 8. Documentación y ADR

- [x] 8.1 Crear `docs/02-architecture/adr/0014-recuperacion-contrasena-y-transporte-email.md` con la
      decisión (token de un solo uso hasheado, anti-enumeración, transporte de email desacoplado) y
      sus alternativas.
- [x] 8.2 Actualizar `docs/02-architecture/auth.md`: nueva sección "Recuperación de contraseña" y
      quitar el bullet que la deja fuera de alcance.
- [x] 8.3 Actualizar `docs/02-architecture/data-classification.md` clasificando el token de reset
      como dato efímero.
- [x] 8.4 Actualizar `docs/README.md` (lista de ADR y estado de `auth.md`).

## 9. Smoke test

- [x] 9.1 `scripts/smoke-test-password-reset.ts`: usar el guard `scripts/assert-smoke-allowed.ts`,
      requerir `ALLOW_SMOKE_ON_REAL_DB=1` y BD de scratch, capturar el token del adaptador `console`
      (sin envíos reales) y ejercitar los route handlers reales contra Postgres.
- [x] 9.2 Cubrir: email inexistente / cuenta solo-Google / cuenta con contraseña local (202
      invariante), token de un solo uso, token expirado y reset exitoso que actualiza la contraseña y
      borra las sesiones.
- [x] 9.3 Limpiar los fixtures al terminar (borrar el usuario de prueba y sus tokens/sesiones) y
      documentar el script en `AGENTS.md` si corresponde.

## 10. Verificación final

- [x] 10.1 `pnpm install` si hiciera falta (sin dependencias nuevas) y
      `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build` en verde.
      → typecheck limpio; lint sin errores (4 warnings preexistentes de `<img>`); suite completa
      1926 passed; build de producción exitoso con las rutas nuevas.
- [x] 10.2 Correr el smoke test contra BD de scratch y resetear/borrar los fixtures usados.
      → corrido con `ALLOW_SMOKE_ON_REAL_DB=1` contra la BD de `DATABASE_URL` (dev local, sin scratch
      configurada); el script borra sus propios usuarios `smoke-reset-*` y el cascade limpia tokens y
      sesiones.
- [x] 10.3 Probar manualmente en el navegador: pedir reset, obtener el link por el
      adaptador `console`, definir contraseña, comprobar que las sesiones previas quedaron invalidas
      y que el login funciona con la contraseña nueva. → verificado manualmente por el usuario.
- [x] 10.4 Pedir auditoría al subagente **seguridad** (solo reporte) sobre anti-enumeración,
      manejo del token, rate limiting y exposición del link. → reporte sin hallazgos críticos/altos;
      los 2 medios se resolvieron en el grupo 11.
- [x] 10.5 Confirmar `openspec validate` en verde y que `docs/`, contratos y esquemas quedaron
      sincronizados. → `openspec validate add-password-reset --type change --strict` válido.

## 11. Endurecimiento tras auditoría de seguridad

- [x] 11.1 Migración `drizzle/0032_password_reset_token_unique_user.sql`: índice único
      `uq_password_reset_token_user` sobre `user_id`; `requestPasswordReset` usa
      `INSERT ... ON CONFLICT (user_id) DO UPDATE`. Se elimina la carrera que podía dejar dos links
      válidos (hallazgo medio #1).
- [x] 11.2 `resetPassword` atómico: valida el token sin consumirlo, calcula el hash y recién entonces
      consume; actualiza la contraseña, borra tokens y sesiones en una sola transacción, evitando
      dejar la contraseña cambiada con sesiones vivas (hallazgo medio #2).
- [x] 11.3 Escapar HTML al renderizar la plantilla de email (hallazgo informativo #7). La página de
      reset queda dinámica por `searchParams`, por lo que Next aplica `no-store` (hallazgo bajo #4).
- [x] 11.4 Actualizar spec y design: el endpoint de pedido NO limpia contadores de rate limit (para
      no introducir una señal de existencia de cuenta), a diferencia del de reset (hallazgo bajo #3).

## 12. No reutilizar la contraseña anterior

- [x] 12.1 `findValidResetToken` devuelve también `passwordHash` (join con `appUser`); `resetPassword`
      compara con `verifyPassword` antes de consumir y devuelve `"ok" | "invalid_token" |
      "password_reused"`. En `password_reused` NO consume el token.
- [x] 12.2 Ruta `POST /api/auth/password/reset` mapea `password_reused` → `400 PASSWORD_REUSED`.
- [x] 12.3 Código `PASSWORD_REUSED` en `ErrorCodeSchema`, `errors.md`, `contracts.md` y
      `messages/{es,en}/errors.json`; `ResetPasswordForm` lo muestra traducido.
- [x] 12.4 Spec (requirement "No reutilizar la contraseña anterior") y ADR 0014/design actualizados;
      se descarta el historial de contraseñas y el chequeo contra listas de filtradas queda futuro.
- [x] 12.5 Tests: servicio (reuso rechazado sin consumir token, `ok` y `invalid_token`), ruta
      (`400 PASSWORD_REUSED`), componente (mensaje) y smoke test (reuso → `400`, token vigente →
      reset válido).
