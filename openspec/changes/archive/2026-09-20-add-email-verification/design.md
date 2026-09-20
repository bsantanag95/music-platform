## Context

El registro local (`POST /api/auth/register`) crea `app_user` y una sesión inmediata sin confirmar
que la persona controle el email declarado. El email de `app_user` es el único destino del
restablecimiento de contraseña (change `add-password-reset`), así que un email mal escrito o ajeno
deja la cuenta sin vía de recuperación. Google ya exige `email_verified=true` para altas nuevas
(`auth.md` sección 6), pero ese estado no se persiste: `app_user` no tiene columna de verificación.

Ya existe la infraestructura de correo desacoplada `src/services/email/` (interfaz `EmailTransport`,
adaptador `console` en desarrollo, fail-closed en producción) y el patrón de token de un solo uso
del reset de contraseña (`password_reset_token`, hash SHA-256, borrado atómico, único por usuario).
Este cambio reutiliza ambos sin agregar dependencias.

**Restricciones**: monolito de un proceso, mismo origen, rate limiting en memoria; ninguna decisión
debe bloquear a un usuario cuando aún no hay proveedor de email real.

## Goals / Non-Goals

**Goals:**

- Persistir en `app_user.email_verified_at` si el email está verificado.
- Enviar un correo de verificación de un solo uso (TTL 24 h) al registrarse con email local.
- Permitir verificar desde el link y reenviar el correo (autenticado), con rate limiting.
- Marcar como verificadas las altas de Google y las cuentas preexistentes (backfill).
- Operar en modo **soft**: avisar sin bloquear, activable sin proveedor real.

**Non-Goals:**

- Enforcement duro (bloquear login/acciones), cambio de email, OTP, MFA y vinculación por email.

## Decisions

### 1. Verificación en modo soft, con un helper centralizado para endurecer después

`app_user.email_verified_at` se registra y la UI avisa con banner + reenvío, pero **no** se bloquea
login ni acciones. Un helper (`isEmailVerified`) centraliza la comprobación para que activar el
enforcement sea cambiar el punto de control, no reescribir pantallas.

- **Por qué**: sin proveedor real de email, un bloqueo duro dejaría a todos los usuarios nuevos
  fuera de la app. El soft permite construir, testear y desplegar el flujo completo hoy.
- **Alternativa descartada**: enforcement duro desde el inicio — exige proveedor y define qué se
  bloquea; se decide en un cambio posterior con evidencia de la beta.

### 2. Tabla dedicada `email_verification_token`, no una tabla genérica

Se crea `email_verification_token` análoga a `password_reset_token`: hash SHA-256 del token opaco,
TTL, single-use por borrado atómico y **índice único por `user_id`** (un token vigente por usuario,
`INSERT ... ON CONFLICT DO UPDATE`).

- **Por qué**: no toca el reset recién implementado y mantiene cada flujo aislado.
- **Alternativa considerada**: una tabla `user_token(purpose)` unificada — mejor a largo plazo, pero
  obliga a migrar `password_reset_token` y sus tests; se puede unificar si aparece un tercer tipo de
  token. Se descarta por ahora (no resolver antes de tener necesidad real).

### 3. `email_verified_at` con backfill y alta de Google verificada

`ALTER TABLE app_user ADD COLUMN email_verified_at TIMESTAMPTZ`. La migración hace
`UPDATE app_user SET email_verified_at = created_at` (grandfather de existentes) y
`resolveOrCreateOAuthUser` inserta `emailVerifiedAt: now()` en las altas de Google.

- **Por qué**: nadie existente queda con banner ni se ve forzado a reverificar, y el estado de
  Google ya está garantizado por el claim `email_verified` exigido en el flujo.
- **Alternativa descartada**: dejar a los existentes sin verificar — ruido en la UI y trabajo manual
  sin beneficio de seguridad real (ya venían usando el producto).

### 4. Envío best-effort al registrar; el alta nunca falla por el correo

Tras crear el usuario, el registro dispara `requestEmailVerification(...)` sin bloquear ni propagar
errores (`void ... .catch(log)`). La función resuelve el transporte primero: si no hay transporte
real configurado (producción sin `EMAIL_TRANSPORT`), registra el fallo y **no crea token** (evita
tokens huérfanos), pero el alta y la sesión siguen funcionando.

- **Por qué**: a diferencia del reset (que es un flujo que el usuario pidió y debe fallar cerrado),
  el alta no puede depender del correo; es exactamente el motivo del modo soft.
- **Consecuencia**: sin proveedor, el usuario ve el banner y puede reenviar, pero el correo no
  llega; se resuelve al configurar el proveedor.

### 5. Reenvío autenticado y verificación con token de un solo uso

`POST /api/auth/email/verify` recibe `{ token }` y consume el token de forma atómica, fijando
`email_verified_at` y borrando los tokens del usuario en una transacción. `POST
/api/auth/email/verify/resend` requiere sesión y solo actúa sobre el propio usuario.

- **Por qué**: el registro ya expone `EMAIL_TAKEN`, así que no hay una preocupación nueva de
  enumeración; aun así, el reenvío autenticado evita un endpoint público de spam a terceros.
- **Single-use**: `DELETE ... WHERE token_hash = ... AND expires_at > now() RETURNING user_id`,
  race-safe, igual que el reset.

### 6. TTL de 24 horas

El link de verificación dura 24 h (vs. 30 min del reset): verificar no es una operación sensible ni
urgente, y fuerzan menos reenvíos. El token se invalida igualmente si se emite uno nuevo.

### 7. Locale por parámetro en el registro, validado server-side

`RegisterRequestSchema` suma `locale?`; el servidor lo valida con `resolveLocale` contra
`src/i18n/routing.ts` (default `es`) y lo usa para componer el correo. Mismo patrón que
`POST /api/auth/password/forgot`.

### 8. Migración no destructiva y sin dependencias

Migración SQL a mano (`0033`), espejo en `schema.ts`/`sql-model.md`, reutilización de
`src/services/email/`. No hay backfill destructivo; el rollback es `DROP TABLE` + `DROP COLUMN`.

## Risks / Trade-offs

- **[Sin proveedor, el correo no llega y nadie verifica]** → es el modo soft: no bloquea nada y el
  banner permite reenviar; al configurar el proveedor el flujo funciona sin cambios de código.
- **[El alta no falla si el envío falla]** → el usuario puede reenviar desde el banner; se loguea el
  error sin exponer el token.
- **[Token filtrado en logs de producción]** → el adaptador `console` está prohibido en producción y
  el token nunca se loguea; el correo no pasa por next-intl, sino por la plantilla server-side.
- **[Backfill deja a todos los existentes como verificados]** → aceptado; solo los registros nuevos
  verán el banner, que es el objetivo.
- **[Modo soft no impide emails ajenos]** → mitiga el caso de tipeo/typo y avisa; la garantía real
  llega con el enforcement duro cuando exista proveedor.
- **[Reenvío como vector de spam]** → requiere sesión y aplica el rate limiter en memoria.

## Migration Plan

1. Aplicar `drizzle/0033_email_verification.sql` con `pnpm run db:migrate` (crea columna + backfill +
   tabla de tokens).
2. Sincronizar `schema.ts`, `sql-model.md` y `data-classification.md`.
3. Desplegar; el registro empieza a intentar el envío (no bloqueante). Sin proveedor, solo se
   registra el fallo y los usuarios ven el banner.
4. **Rollback**: revertir deploy y `DROP TABLE email_verification_token; ALTER TABLE app_user DROP
   COLUMN email_verified_at;` (no hay datos de negocio que preservar).

## Open Questions

- ¿Se expone `emailVerified` en la respuesta de `GET /api/auth/me` para clientes externos? Hoy el
  banner se resuelve server-side desde la sesión; no se decide en este cambio.
- Momento y alcance del enforcement duro (qué se bloquea) — cambio posterior, con proveedor real.
- ¿Reusar la verificación para habilitar vinculación por email? Reabriría ADR 0010; fuera de alcance.
