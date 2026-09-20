# ADR 0014 — Recuperación de contraseña: token de un solo uso y transporte de email desacoplado

## Estado

Aceptado

## Contexto

`02-architecture/auth.md` dejó explícitamente fuera de alcance el "flujo de recuperación de
contraseña (reset por email)" desde la Fase 4. Hoy la única vía de recuperación es que un operador
toque la base. El proyecto encara la beta cerrada (Fase 6) y necesita cerrar ese hueco.

Restricciones ya fijadas que condicionan esta decisión:

- Autenticación local con Argon2id y sesión server-side de token opaco hasheado (ADR 0008).
- `app_user.password_hash` es nullable para las cuentas creadas vía Google (ADR 0010), que no tienen
  contraseña local.
- No existe ninguna infraestructura de correo en el repositorio.
- Monolito de un proceso, mismo origen, rate limiting en memoria (`rate-limit.ts`).
- Preferencia por borrado físico sobre soft-delete cuando no hace falta historial (ADR 0009).

## Decisión

- **Token opaco hasheado en tabla propia `password_reset_token`**, no en `session` ni como token
  firmado/estadístico. Se guarda solo el hash SHA-256; el token en claro solo viaja en el link del
  correo. TTL de 30 minutos, un solo uso y un solo token vigente por usuario (pedir uno nuevo
  invalida los previos).
- **Un solo uso por borrado atómico** (`DELETE ... WHERE token_hash = ... AND expires_at > now()
  RETURNING user_id`), sin columna `used_at`. La ausencia de fila invalida el token de inmediato y
  dos requests concurrentes no pueden consumirlo dos veces.
- **Anti-enumeración**: `POST /api/auth/password/forgot` responde siempre `202` para un email bien
  formado; solo genera token y envía correo si el email corresponde a una cuenta con contraseña
  local. Un email inexistente o una cuenta solo-Google son indistinguibles.
- **Sin vinculación implícita**: las cuentas sin `password_hash` no pueden obtener contraseña local
  por esta vía; la coincidencia de email no basta (coherente con ADR 0010).
- **No autologin**: el reset exitoso actualiza el hash, borra todos los tokens y **todas las
  sesiones** del usuario, y obliga a un login normal con la contraseña nueva.
- **No reusar la contraseña actual**: la contraseña nueva se compara contra el hash vigente y, si
  coincide, se responde `PASSWORD_REUSED` **sin consumir el token** (para reintentar con el mismo
  link). Sin historial de contraseñas (NIST desaconseja exigirlo); el chequeo contra listas de
  contraseñas filtradas queda como mejora futura.
- **Transporte de email desacoplado**: `src/services/email/` define la interfaz `EmailTransport` y
  `getEmailTransport()`. Solo se implementa el adaptador `console` (desarrollo). En
  `NODE_ENV=production` sin un proveedor real configurado, falla cerrado con `EMAIL_CONFIG_MISSING`
  (503), análogo a `OAUTH_CONFIG_MISSING`. No se agregan dependencias nuevas para elegir proveedor.
- **Locale del correo** como query param validado (`resolveLocale`, default `es`), no persistido: el
  envío es sincrónico al pedido, a diferencia del redirect de Google.

## Alternativas descartadas

- **Reutilizar `session` como token de reset**: una sesión autentica, un token de reset solo autoriza
  un cambio de contraseña; mezclarlos impide invalidar los tokens de reset sin cerrar sesiones.
- **Token firmado/HMAC sin estado**: habría que mantener igualmente revocación por usuario, y el
  proyecto ya eligió persistir hashes para revocar de inmediato (ADR 0008).
- **Columna `used_at` (soft-use)**: agrega estado que hay que recordar filtrar (la clase de bug que
  ADR 0009 evita) y no hay requisito de auditoría que lo justifique. El borrado atómico es más simple
  y *race-safe*.
- **Revelar si el email existe**, como hace el registro con `EMAIL_TAKEN`: el endpoint de reset es el
  vector clásico de enumeración; no hay razón de UX que lo compense.
- **Permitir reset a cuentas Google (crear contraseña local)**: sería vinculación implícita por email,
  contradice ADR 0010.
- **Integrar ya un proveedor real (Resend/SES/SMTP)**: agrega dependencia y credenciales antes de
  tener necesidad operativa. La interfaz deja el camino preparado.
- **TTL de 15 o 60 minutos**: 15 da poco margen ante filtros de spam; 60 amplía la ventana de
  exposición. 30 minutos equilibra ambos.
- **Guardar historial de contraseñas** (impedir reusar las últimas N): requiere tabla y política
  nuevas, y NIST desaconseja el historial. Solo se compara contra la contraseña actual.

## Consecuencias

- Nueva migración `0031_password_reset_token.sql` y tabla Clase D (efímera) en
  `data-classification.md`.
- La limpieza de tokens vencidos se agrega al job `pnpm run db:cleanup-sessions`.
- El flujo queda funcional en desarrollo (adaptador `console`) pero *fail-closed* en producción hasta
  configurar `EMAIL_TRANSPORT`/`EMAIL_FROM` y un proveedor real que implemente `EmailTransport`.
- Todo consumo de token que no sea válido, expirado o ya usado responde `400 INVALID_RESET_TOKEN` sin
  distinguir el caso.
- Ningún agente de ejecución debe implementar un mecanismo de reset distinto al aquí descrito (ni
  tokens en claro, ni vinculación por email, ni reset con contraseña nueva sin invalidar sesiones) sin
  reabrir este ADR.
