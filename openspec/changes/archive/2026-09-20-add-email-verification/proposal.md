## Why

Hoy el registro local crea la cuenta y la sesión al instante, sin confirmar que la persona controle
el email que declaró. Ese email es el único destinatario posible del restablecimiento de contraseña:
un email mal escrito o ajeno deja al usuario sin vía de recuperación, y permite "reservar" el correo
de otra persona. Google ya exige `email_verified=true` para altas nuevas, pero ese estado **no se
persiste** en `app_user`, así que el sistema no sabe si un email está verificado. Cerrar este hueco
es el complemento natural del reset de contraseña recién implementado y una precondición de higiene
para la beta cerrada (Fase 6).

## Goals

- Registrar en `app_user` si el email está verificado (`email_verified_at`), marcando como
  verificadas las altas de Google (que ya exigen el claim) y las cuentas preexistentes.
- Enviar un correo de verificación al registrarse con email local, reutilizando la infraestructura
  de email desacoplada (`src/services/email/`) sin depender de un proveedor real todavía.
- Permitir verificar desde un link de un solo uso y reenviar el correo, con rate limiting.
- Operar en modo **soft**: registrar y avisar (banner + reenvío), sin bloquear login ni acciones,
  de modo que se pueda activar sin proveedor y sin dejar usuarios trabados.

## Non-Goals

- Enforcement duro (bloquear login o acciones hasta verificar): queda como escalón posterior, con un
  helper centralizado preparado para activarlo cuando exista proveedor real.
- Cambio de email de una cuenta (no existe ese flujo hoy).
- Habilitar vinculación automática de identidades por email: tener el email verificado es una prueba
  de propiedad más fuerte, pero no reabre ADR 0010 por sí solo.
- Integrar un proveedor de email real o verificar con códigos OTP en vez de link.
- Verificación de teléfono, MFA u otros factores.

## What Changes

- Nueva capability `email-verification`: alta de token de verificación, correo con link de un solo
  uso (TTL 24 h), verificación y reenvío autenticado.
- `app_user.email_verified_at` (TIMESTAMPTZ nullable); migración con backfill de las cuentas
  existentes y alta de Google marcada como verificada.
- Nueva tabla `email_verification_token` con la misma mecánica que `password_reset_token` (hash
  SHA-256, single-use por borrado atómico, único por usuario).
- `POST /api/auth/register` dispara el envío de verificación en best-effort (no bloquea el alta) y
  acepta un `locale` opcional; `resolveOrCreateOAuthUser` marca la cuenta de Google como verificada.
- Rutas `POST /api/auth/email/verify` y `POST /api/auth/email/verify/resend`, página
  `/<locale>/auth/verify-email`, plantilla de correo y banner de "verificá tu email" con reenvío.
- Códigos nuevos `INVALID_VERIFICATION_TOKEN` y `EMAIL_ALREADY_VERIFIED`.

## Capabilities

### New Capabilities

- `email-verification`: estado de verificación del email, token de un solo uso, envío del correo,
  verificación desde el link, reenvío autenticado, superficies web y política soft.

### Modified Capabilities

<!-- Ninguna: el requisito de google-oauth (email_verified para altas nuevas) no cambia; persistir
     el estado ya verificado es un detalle de implementación. -->

## Impact

- **Base de datos**: migración `drizzle/0033_email_verification.sql` y espejo en `src/db/schema.ts`
  (`appUser.emailVerifiedAt`, `emailVerificationToken`, `EmailVerificationTokenRow`).
- **Servicios**: `src/services/auth/email-verification.ts` nuevo; `identities.ts` marca las altas de
  Google; `src/services/email/templates/email-verification.ts` nuevo.
- **API**: rutas de verificación/reenvío; `RegisterRequestSchema` suma `locale?`; esquemas y códigos
  en `src/lib/api/schemas.ts`. Contratos en `docs/04-api/contracts.md` y `errors.md`.
- **Frontend**: página `verify-email`, banner de verificación y reenvío en `/me/settings`; mensajes
  en `messages/{es,en}/{auth,errors}.json`.
- **Documentación**: ADR 0015, `docs/02-architecture/auth.md`, `03-data/sql-model.md`,
  `02-architecture/data-classification.md`, `docs/README.md`.
- **Tests**: unitarios de servicio/rutas/plantilla/componentes y
  `scripts/smoke-test-email-verification.ts` (mockea el transporte, BD scratch).
- **Sin dependencias nuevas**: se reutiliza `src/services/email/`.
