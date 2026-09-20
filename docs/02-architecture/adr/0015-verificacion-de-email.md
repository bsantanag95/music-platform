# ADR 0015 — Verificación de email en el registro

## Estado

Aceptado

## Contexto

El registro local creaba la cuenta y la sesión sin confirmar que la persona controle el email
declarado. Ese email es el único destino del restablecimiento de contraseña (change
`add-password-reset`), así que un email mal escrito o ajeno dejaba la cuenta sin vía de recuperación
y permitía "reservar" el correo de otra persona. Google ya exige `email_verified=true` para altas
nuevas (ADR 0010), pero ese estado no se persistía: `app_user` no tenía columna de verificación.

Al mismo tiempo, no existe todavía un proveedor de email real. La infraestructura de email está
desacoplada (`src/services/email/`, adaptador `console` en desarrollo, fail-closed en producción) y
el patrón de token de un solo uso ya existe para el reset de contraseña.

## Decisión

- **Persistir el estado**: `app_user.email_verified_at` (TIMESTAMPTZ nullable). La migración `0033`
  hace backfill de las cuentas preexistentes (`email_verified_at = created_at`) y las altas de Google
  se marcan al crearse; las altas locales nuevas quedan nulas hasta verificar.
- **Token de un solo uso en tabla dedicada** `email_verification_token`: hash SHA-256, TTL de 24 h,
  single-use por borrado atómico (`DELETE ... RETURNING`) y **único por usuario**
  (`uq_email_verification_token_user` + `INSERT ... ON CONFLICT DO UPDATE`). Un reenvío reemplaza el
  token anterior. Se descarta una tabla genérica `user_token(purpose)` para no migrar el reset recién
  implementado.
- **Modo soft**: la verificación se registra y se avisa (banner + reenvío), pero **no** bloquea el
  login ni ninguna acción. Un helper centralizado (`isEmailVerified`) deja el punto de control listo
  para activar el enforcement cuando exista proveedor real y decisión de producto. Consecuencia
  deliberada: mientras no se active el enforcement, el modo soft **no** impide que alguien registre un
  email ajeno (`EMAIL_TAKEN` sigue aplicando); solo registra el estado y avisa.
- **Envío best-effort al registrar**: el alta dispara el correo sin bloquear ni propagar errores; sin
  transporte real configurado no se crea token y el alta igual se completa. Esto difiere del reset,
  que sí falla cerrado (`EMAIL_CONFIG_MISSING`) porque el usuario pidió explícitamente el correo.
- **Reenvío autenticado**: `POST /api/auth/email/verify/resend` requiere sesión y solo opera sobre la
  cuenta autenticada, con rate limiting por usuario e IP.
- **Verificación por POST, no por GET**: la página valida el token sin consumirlo y el consumo ocurre
  al presionar el botón, para que un escáner de correo que prefetchea el link no verifique solo.
- **No habilita vinculación por email**: el email verificado es una prueba de propiedad más fuerte,
  pero ADR 0010 sigue vigente: el linking automático por email requeriría reabrirlo explícitamente.
- **Locale por parámetro**: el registro acepta `locale?`, validado server-side (default `es`), para
  componer el correo.

## Alternativas descartadas

- **Enforcement duro desde el inicio**: sin proveedor real dejaría sin acceso a todos los registros
  nuevos; requiere además decidir qué se bloquea. Cambio posterior.
- **Tabla genérica `user_token(purpose)`**: mejor a largo plazo, pero obliga a migrar
  `password_reset_token` y sus tests sin necesidad actual.
- **Dejar a los existentes sin verificar**: ruido en la UI y trabajo manual sin beneficio; ya venían
  usando el producto.
- **No persistir el estado y solo usar el claim de Google**: no cubre el registro local, que es donde
  está el hueco.
- **Verificar por GET al abrir el link**: los escáneres de correo consumirían el token.

## Consecuencias

- Nueva migración `0033_email_verification.sql`, columna y tabla documentadas en `sql-model.md`;
  token clasificado como dato efímero (Clase D) en `data-classification.md`.
- El job `pnpm run db:cleanup-sessions` también limpia tokens de verificación vencidos.
- El flujo funciona en desarrollo con el adaptador `console`; en producción, sin proveedor, el envío
  falla y el usuario ve el aviso (puede reenviar), pero nada bloquea su cuenta.
- Activar el enforcement duro es un cambio posterior que solo necesita mover el punto de control
  centralizado, sin reescribir pantallas.
- Ningún agente de ejecución debe implementar bloqueo por email no verificado ni vinculación
  automática por email sin reabrir este ADR o ADR 0010.
