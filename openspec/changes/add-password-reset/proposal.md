## Why

La autenticación local existe desde la Fase 4, pero `docs/02-architecture/auth.md` dejó
explícitamente fuera de alcance el "flujo de recuperación de contraseña (reset por email)". Hoy un
usuario que olvida su contraseña no tiene ninguna vía de recuperación: la única alternativa es que
un operador toque la base de datos. Es el hueco funcional más grande que le queda al login propio, y
el bloqueante de producto antes de abrir la beta cerrada (Fase 6).

## Goals

- Permitir que un usuario con contraseña local inicie un restablecimiento por email y defina una
  contraseña nueva sin intervención manual.
- No revelar si un email tiene cuenta (anti-enumeración): la respuesta del pedido es idéntica para
  email inexistente, cuenta solo-Google y cuenta local válida.
- No crear vinculación implícita por email (ADR 0010): las cuentas sin `password_hash` (Google) no
  pueden restablecer ni obtener contraseña local por esta vía.
- Desacoplar el envío de correo del proveedor concreto: adaptador `console` en desarrollo, proveedor
  real configurable después, sin credenciales externas para completar el flujo.

## Non-Goals

- Cambio de contraseña estando autenticado (superficie de perfil/settings), fuera de alcance.
- Verificación de email en el registro, proveedores OAuth distintos de Google y vinculación
  explícita de identidades.
- Integrar un proveedor de email real (Resend/SES/SMTP) en este cambio: se deja la interfaz y el
  adaptador de desarrollo.
- MFA o gestión avanzada de sesiones.

## What Changes

- Nueva capability `password-reset`: pedido de restablecimiento y consumo de token para fijar una
  contraseña nueva.
- Nueva tabla `password_reset_token` (token opaco hasheado, un solo uso, TTL 30 minutos). El pedido
  de un token nuevo invalida los anteriores; el reset exitoso borra todos los tokens y **todas las
  sesiones** del usuario (sin autologin: se exige login explícito).
- Nuevo servicio de email con interfaz de transporte y adaptador `console` (solo desarrollo,
  fail-closed en producción).
- Endpoints nuevos `POST /api/auth/password/forgot` (siempre `202`) y
  `POST /api/auth/password/reset`.
- Páginas `/<locale>/auth/forgot-password` y `/<locale>/auth/reset-password`, más el enlace
  "¿Olvidaste tu contraseña?" y un aviso de éxito en login.
- Códigos de error nuevos `INVALID_RESET_TOKEN` y `EMAIL_CONFIG_MISSING`.

## Capabilities

### New Capabilities

- `password-reset`: pedido de restablecimiento con respuesta genérica anti-enumeración, token de un
  solo uso con expiración corta, definición de contraseña nueva desde el token, invalidación de
  sesiones y tokens, transporte de email desacoplado y superficies web del flujo.

### Modified Capabilities

<!-- Ninguna: no hay specs existentes cuyos requirements cambien. google-oauth no se toca. -->

## Impact

- **Base de datos**: migración `drizzle/0031_password_reset_token.sql` y espejo en
  `src/db/schema.ts` (`PasswordResetTokenRow`).
- **Servicios**: `src/services/auth/password-reset.ts` nuevo; `users.ts` (búsqueda con hash,
  actualización de hash); `src/services/email/` nuevo (interfaz, transporte `console`, plantilla).
- **API**: `src/app/api/auth/password/forgot/route.ts` y `.../reset/route.ts`; esquemas y códigos en
  `src/lib/api/schemas.ts`. Contratos en `docs/04-api/contracts.md` y `errors.md`.
- **Frontend**: páginas y formularios nuevos bajo `src/app/[locale]/auth/` y
  `src/components/auth/`; cambio en `login/page.tsx`; mensajes en `messages/{es,en}/{auth,errors}.json`.
- **Configuración**: `.env.example` suma `EMAIL_TRANSPORT` y `EMAIL_FROM`.
- **Documentación**: ADR 0014 nuevo; `docs/02-architecture/auth.md`, `data-classification.md`,
  `docs/03-data/sql-model.md`, `docs/README.md`.
- **Tests**: unitarios de servicio/rutas/componentes/transporte y
  `scripts/smoke-test-password-reset.ts` (mockea el transporte, BD scratch).
