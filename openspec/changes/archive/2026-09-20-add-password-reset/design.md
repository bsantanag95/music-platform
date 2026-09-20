## Context

La autenticación local (Argon2id + sesión de token opaco en cookie `httpOnly`) existe desde la
Fase 4. `app_user.password_hash` es nullable para admitir cuentas creadas vía Google OAuth (ADR
0010), que no tienen contraseña local. El patrón de secretos del proyecto es: nunca guardar el
secreto en claro, persistir su hash (ver `session.token_hash`) y usar expiración fija.

No hay ninguna infraestructura de correo en el repositorio. `auth.md` dejó este flujo fuera de
alcance explícitamente. Restricciones vigentes que condicionan el diseño:

- Monolito de un proceso, mismo origen, sin necesidad de enlaces cross-site.
- Rate limiting en memoria (`src/services/auth/rate-limit.ts`), con la limitación de una sola
  instancia ya documentada.
- Reglas de negocio y garantías críticas viven en SQL/índices, no solo en la capa de aplicación
  (AGENTS.md).
- Preferencia por borrado físico sobre soft-delete (ADR 0009) cuando no hay necesidad de historial.

## Goals / Non-Goals

**Goals:**

- Restablecer la contraseña de una cuenta con contraseña local demostrando control del email.
- Respuesta indistinguible para email inexistente, cuenta solo-Google y cuenta local (anti-enumeración).
- Token de un solo uso, corto, hasheado en base, con invalidación de tokens previos y de todas las
  sesiones al completar.
- Envío de correo desacoplado del proveedor: adaptador de desarrollo funcional y contrato claro para
  el proveedor real.
- Cumplir las convenciones del proyecto (Server Components para carga inicial, Zod, `ApiError.code`,
  `withErrorHandling`, migraciones SQL a mano).

**Non-Goals:**

- Cambio de contraseña autenticado (superficie de settings) y verificación de email en el registro.
- Integrar un proveedor de email real o agregar dependencias en este cambio.
- Permitir contraseña local a cuentas Google (sería vinculación implícita; ADR 0010).
- MFA o gestión avanzada de sesiones.

## Decisions

### 1. Token opaco hasheado en tabla propia, no reutilizar `session`

Se crea `password_reset_token` con `token_hash` (SHA-256) y `expires_at`. El token en claro (32
bytes `base64url`) solo viaja en el link del email.

- **Por qué no `session`**: una sesión autentica; un token de reset solo autoriza un cambio de
  contraseña. Mezclarlos permitiría que un link de reset se use como sesión o viceversa, y no
  permitiría invalidar todos los tokens de reset al resetear sin tocar sesiones.
- **Por qué no un token firmado/estadístico (HMAC/JWT)**: habría que definir revocación por usuario
  igualmente, y el proyecto ya eligió persistir hashes para revocar de inmediato (ADR 0008).
- **Alternativa descartada**: guardar el token en claro — rompe el criterio de "nunca guardar el
  secreto real".

### 2. Un solo uso por borrado atómico, sin columna `used_at`

El consumo es `DELETE FROM password_reset_token WHERE token_hash = $1 AND expires_at > now()
RETURNING user_id`, en una sola sentencia. La ausencia de fila invalida el token de inmediato,
igual que `session`.

- **Por qué**: evita la clase de bug "olvidé filtrar `used_at`" (razonamiento de ADR 0009) y hace el
  single-use race-safe: dos requests concurrentes con el mismo token solo pueden obtener una fila.
- **Alternativa descartada**: soft-flag `used_at` — agrega estado que hay que recordar consultar, sin
  requisito de auditoría que lo justifique.
- **Consecuencia**: un token usado y uno expirado son indistinguibles para el usuario
  (`INVALID_RESET_TOKEN`), lo cual es deliberado.

### 3. TTL de 30 minutos y un solo token activo por usuario

- 30 min equilibra seguridad y margen para revisar el correo (se descartan 15 min por fricción de
  filtros de spam y 60 min por ventana de exposición más larga).
- Un solo token vigente por usuario: `uq_password_reset_token_user` es un índice **único** sobre
  `user_id`, y un pedido nuevo reemplaza el anterior con `INSERT ... ON CONFLICT (user_id) DO
  UPDATE`. El enforcement a nivel de SQL (no solo en la aplicación) evita que dos pedidos
  concurrentes dejen dos links válidos, y no acumula secretos activos.

### 4. Respuesta genérica `202` anti-enumeración

`POST /api/auth/password/forgot` responde `202 { ok: true }` para todo email bien formado, exista o
no, sea local o solo-Google. Solo se genera token y se envía correo si `user.password_hash != null`.

- **Por qué**: a diferencia de `EMAIL_TAKEN` en el registro (decisión de producto ya aceptada), un
  endpoint de reset es el vector clásico de enumeración; no hay razón de UX que compense.
- **Cuentas Google**: no pueden restablecer. La página muestra una nota ("si entrás con Google, usá
  Google") sin revelar el caso particular del email consultado.

### 5. Sin autologin; el reset cierra todas las sesiones

Al completar, se actualiza `password_hash`, se borran todos los `password_reset_token` del usuario y
se eliminan todas sus sesiones en una **única transacción**, de modo que un fallo no deje la
contraseña cambiada con sesiones vivas. El token se valida sin consumirlo y se calcula el hash antes
del consumo atómico, para que un token inválido no gaste Argon2 y un fallo del hash no consuma el
token. Antes de hashear se compara la contraseña nueva contra la vigente (`verifyPassword`): si
coincide se responde `PASSWORD_REUSED` sin consumir el token (política solo contra la actual, sin
historial). El cliente redirige a `/<locale>/auth/login?reset=1`.

- **Por qué**: si un tercero obtuvo acceso, el reset debe expulsarlo; y una contraseña recién
  elegida debe validarse con un login normal.
- **Trade-off**: fricción extra de un login; se acepta a cambio de la garantía de seguridad.

### 6. Transporte de email desacoplado; adaptador `console` solo en desarrollo

`src/services/email/` define `EmailTransport` y `getEmailTransport()`. Sin `EMAIL_TRANSPORT` (o
`console`) se usa un adaptador que escribe el mensaje por consola; en `NODE_ENV=production` sin
transporte real configurado, `getEmailTransport()` lanza y la ruta responde `EMAIL_CONFIG_MISSING`
(503), fail-closed, análogo a `OAUTH_CONFIG_MISSING`.

- **Por qué**: completa el flujo y las pruebas sin credenciales ni dependencias nuevas (regla de
  diseño: no introducir dependencias sin necesidad). El proveedor real (Resend/SMTP/SES) se agrega
  después implementando la misma interfaz.
- **Riesgo asociado**: loguear el link en producción filtraría tokens; por eso el adaptador `console`
  está prohibido en producción.

### 7. Locale del correo como query param validado, no persistido

`POST /api/auth/password/forgot` acepta `locale` opcional, validado contra `src/i18n/routing.ts`
(default `es`), y se usa directamente para construir asunto/cuerpo y la URL del link. No se persiste
porque el envío es sincrónico al pedido (no hay redirect de un proveedor externo que lo pierda,
a diferencia de Google OAuth en `auth.md` sección 6).

### 8. Pre-validación del token en Server Component, consumo en la ruta

`/<locale>/auth/reset-password` es un Server Component que lee el `token` del query string y llama a
`findValidResetToken(token)` (no consume) para decidir si renderiza el formulario o el estado
"link inválido/expirado". El consumo real ocurre solo en `POST /api/auth/password/reset`, de forma
atómica. Se aplica `Referrer-Policy: no-referrer` en la página para no filtrar el token por
`Referer` a terceros.

### 9. Reutilizar el rate limiter y la política de contraseñas existentes

- `consumeAuthAttempt`: `password-forgot:ip:<ip>` + `password-forgot:email:<email>` y
  `password-reset:ip:<ip>`; `clearAuthAttempts` al completar con éxito.
- Contraseña nueva: `min(8).max(128)`, idéntica a `RegisterRequestSchema`, reutilizando
  `hashPassword` (Argon2id) sin re-tuning.

### 10. Migración SQL a mano, no destructiva

`drizzle/0031_password_reset_token.sql` nueva (nunca editar una aplicada), espejo en `schema.ts` y
`sql-model.md`. No hay backfill ni cambio de columnas existentes; el rollback es `DROP TABLE`.

## Risks / Trade-offs

- **[Token filtrado en logs de producción]** → el adaptador `console` está prohibido con
  `NODE_ENV=production`; la ruta nunca loguea el token ni la URL; solo se loguean fallos del envío
  con el `user_id`, nunca el secreto.
- **[Enumeración por timing]** → la respuesta es genérica y el envío se dispara de forma no
  bloqueante (`void send(...).catch(log)`), de modo que el tiempo de respuesta no dependa de si el
  email existe ni de la latencia del proveedor. Riesgo residual aceptado y documentado.
- **[Correo demorado o en spam con TTL de 30 min]** → trade-off aceptado; si aparece evidencia de
  fricción real se reevalúa el TTL (ver Open Questions), sin cambiar el mecanismo.
- **[Abuso del endpoint para enviar correo a terceros]** → rate limit por IP y por email; la
  respuesta no confirma envío. El costo de un envío de más es acotado.
- **[Carrera entre dos pedidos de reset]** → índice único `user_id` + `INSERT ... ON CONFLICT`
  reemplaza el token anterior de forma atómica; el consumo (`DELETE ... RETURNING`) garantiza un solo
  ganador por token.
- **[Cuentas solo-Google confundidas]** → nota en la página de forgot y enlace a login con Google; no
  se implementa vinculación implícita (ADR 0010).
- **[Sin proveedor real, el flujo no sirve en producción]** → es intencional: el despliegue queda
  fail-closed (`EMAIL_CONFIG_MISSING`) hasta configurar el transporte, sin exponer un flujo que no
  entrega correo.

## Migration Plan

1. Aplicar `drizzle/0031_password_reset_token.sql` y `drizzle/0032_password_reset_token_unique_user.sql`
   con `pnpm run db:migrate` (idempotente, registra en `_migrations`).
2. Sincronizar `src/db/schema.ts` y `docs/03-data/sql-model.md`.
3. Desplegar código; sin `EMAIL_TRANSPORT` real en producción el endpoint responde 503
   `EMAIL_CONFIG_MISSING` (no rompe login/registro existentes).
4. Configurar `EMAIL_TRANSPORT`/`EMAIL_FROM` y el proveedor cuando se elija.
5. **Rollback**: revertir el deploy y `DROP TABLE password_reset_token` (no hay datos de negocio que
   preservar).

## Open Questions

- Proveedor de email real y remitente (`EMAIL_FROM`) definitivos; no bloquea este cambio.
- ¿Reenviar el correo desde la misma página ("reenviar link")? Se puede resolver como iteración de UI
  sin cambios de contrato si se decide.
- ¿Reevaluar el TTL a 60 min si la beta muestra correos demorados?
- ¿Permitir en el futuro reset a cuentas solo-Google previa verificación de email? Requeriría reabrir
  ADR 0010; fuera de alcance.
