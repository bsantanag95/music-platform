## 1. Fase 1 — Base compartida (migración, reglas, autenticación reciente)

- [x] 1.1 Verificar el siguiente número libre en `drizzle/` y crear la migración de la Fase 1: `app_user.username_changed_at`, `app_user.locale` (`CHECK IN ('es','en')`), tabla `username_alias` (índice único sobre `lower(username)`), tabla `email_change_token` (`user_id` único, `new_email`, `token_hash`, `created_at`, `expires_at`), `session.device_label` (≤80) y `session.last_seen_at`; reflejarlo en `src/db/schema.ts`
- [x] 1.2 Crear `services/auth/account-rules.ts` con las reglas de usuario (3–32, `^[a-zA-Z0-9_]+$`) y contraseña (8–128) y hacer que `RegisterRequestSchema` las importe (sin cambiar su comportamiento)
- [x] 1.3 Agregar `requireRecentAuth(session, password?)` en `services/auth/recent-auth.ts` (y `requireSession()` a `services/auth/authorization.ts`) (contraseña verificada, o sesión de menos de 10 minutos; si no, `REAUTH_REQUIRED` 403) con el límite de intentos por usuario vía `consumeAuthAttempt`; registrar los códigos nuevos (`REAUTH_REQUIRED`, `USERNAME_TAKEN`, `USERNAME_CHANGE_COOLDOWN`, `EMAIL_TAKEN`, `LAST_ACCESS_METHOD`, `OAUTH_IDENTITY_TAKEN`, `OAUTH_IDENTITY_MISMATCH`) en `ErrorCodeSchema`, en `withErrorHandling` y en `messages/*/errors.json`
- [x] 1.4 Pruebas de `requireRecentAuth` (contraseña correcta/incorrecta, sesión reciente/antigua, límite de intentos)

## 2. Fase 1 — Sesiones por dispositivo

- [x] 2.1 Crear `lib/device-label.ts` (navegador · sistema, "Dispositivo desconocido"; sin guardar el User-Agent) con pruebas de los navegadores y sistemas comunes y de entradas vacías
- [x] 2.2 `createSession`/`rotateCurrentSession` guardan `device_label` desde el encabezado `user-agent`; `resolveSession` actualiza `last_seen_at` como mucho cada 10 minutos (`UPDATE ... WHERE last_seen_at IS NULL OR last_seen_at < now() - interval '10 minutes'`)
- [x] 2.3 Servicio `listMySessions(userId, currentSessionId)` y `revokeSession(userId, sessionId, currentSessionId)` (filtra por `user_id`, rechaza la actual) con pruebas, incluida la sesión de otra persona
- [x] 2.4 `GET /api/me/sessions` y `DELETE /api/me/sessions/[id]` con esquemas Zod y pruebas de ruta
- [x] 2.5 Cambiar `revokeOtherSessions` en el servicio de contraseña reutilizando un helper `deleteOtherSessions(userId, currentSessionId)` con prueba

## 3. Fase 1 — Cambio de usuario

- [x] 3.1 Servicio `checkUsernameAvailability(userId, candidate)` (válido + disponible sin distinguir mayúsculas, considerando alias vigentes ajenos) con pruebas
- [x] 3.2 Servicio `changeUsername(userId, newUsername)`: transacción con enfriamiento de 30 días (`USERNAME_CHANGE_COOLDOWN` con la fecha), reserva del anterior en `username_alias`, recuperación del propio alias, y limpieza de alias vencidos propios; pruebas de cada escenario de la spec
- [x] 3.3 Aplicar la reserva en `registerUser` y `findAvailableUsername` (alta con Google) y en la comparación sin distinguir mayúsculas donde corresponda; pruebas
- [x] 3.4 `GET /api/me/account/username/availability?q=` y `PUT /api/me/account/username` con esquemas Zod y pruebas de ruta
- [x] 3.5 Helper `redirectIfRenamed(username, subpath)` y usarlo en las 9 páginas bajo `users/[username]/` cuando el perfil no exista; verificar que `GET /api/users/[username]` no redirige; pruebas del helper y de una página

## 4. Fase 1 — Cambio de email

- [x] 4.1 Servicio `requestEmailChange(userId, sessionId, newEmail, password?)` con `requireRecentAuth`, validaciones (`EMAIL_TAKEN`, igual al actual), token de un solo uso con hash y 24 h (un pedido nuevo reemplaza al anterior), y fallo cerrado si el envío falla (no queda token); pruebas
- [x] 4.2 Servicio `confirmEmailChange(token)`: transacción que revalida disponibilidad, actualiza `email` y `email_verified_at`, borra el token y avisa al email anterior; pruebas de vencido, ya usado y carrera por email tomado
- [x] 4.3 Plantillas `email-change-confirm`, `email-change-notice` y `password-changed-notice` en `services/email/templates` con `escapeHtml`, es/en, siguiendo las de verificación y reset; pruebas de las plantillas
- [x] 4.4 Rutas `POST /api/me/account/email` y `POST /api/auth/email/change/confirm` (con rate limiting como las de verificación) y `GET` del cambio pendiente; pruebas de ruta
- [x] 4.5 Página `/auth/email/change` (confirmación desde el enlace) con estados de éxito, vencido y error, siguiendo `/auth/email/verify`

## 5. Fase 1 — Contraseña y Google

- [x] 5.1 Servicio `changePassword(userId, sessionId, current, next, revokeOtherSessions)` (rechaza igual a la actual, borra tokens de reset, avisa por correo) y `createPassword(userId, sessionId, next)` (solo cuentas sin contraseña, con `requireRecentAuth`); pruebas de cada escenario
- [x] 5.2 Rutas `PUT /api/me/account/password` y `POST /api/me/account/password` con esquemas Zod y pruebas de ruta
- [x] 5.3 Añadir `intent` (`login`|`link`|`reauth`, valor cerrado) al estado del flujo en `oauth-flow.ts` y a `/api/auth/google/start` (exige sesión para `link`/`reauth`; otro valor = `login`); pruebas
- [x] 5.4 Callback de Google: rama `link` (crea `auth_identity`, `OAUTH_IDENTITY_TAKEN`, no rota la sesión) y rama `reauth` (`OAUTH_IDENTITY_MISMATCH`, rota la sesión); ambas redirigen a `/<locale>/me/settings/account?google=linked|confirmed`; el flujo `login` no cambia; pruebas por intención, incluida la ausencia de `returnTo`
- [x] 5.5 Servicio `unlinkGoogle(userId)` (`LAST_ACCESS_METHOD` sin contraseña) y ruta `DELETE /api/me/account/identities/google`; pruebas
- [x] 5.6 Mostrar los códigos de error del callback (`OAUTH_IDENTITY_TAKEN`, `OAUTH_IDENTITY_MISMATCH`) en la pantalla de error y en Ajustes

## 6. Fase 1 — Idioma

- [x] 6.1 Servicio y ruta `PATCH /api/me/preferences` (`locale`) con Zod y pruebas
- [x] 6.2 Aplicar `user.locale` al iniciar sesión: la respuesta del login incluye `locale` y `LoginForm` redirige si difiere; el callback de Google usa `user.locale ?? flowState.locale`; el selector del Header no cambia la preferencia; pruebas

## 7. Fase 1 — Pantalla Cuenta y seguridad

- [x] 7.1 Reorganizar `settings/account/page.tsx` en las tarjetas Datos de la cuenta, Cómo iniciás sesión, Sesiones activas y Preferencias (los controles de las Fases 2 y 3 no se muestran todavía)
- [x] 7.2 Componente de diálogo para acciones sensibles reutilizando `ConfirmDialog`/patrón de portal (Escape, foco, bloqueo de scroll) con estados de carga, error recuperable y éxito
- [x] 7.3 Diálogos "Cambiar usuario" (disponibilidad con debounce y vista previa del enlace, avisos de enfriamiento y redirección) y "Cambiar email" (con aviso de cambio pendiente); pruebas de componente
- [x] 7.4 Diálogos "Cambiar contraseña" / "Crear contraseña" (validación en línea, opción de cerrar otras sesiones) y bloque de Google (Vincular / Desvincular con la explicación cuando es el único acceso); botón "Confirmar con Google" cuando la API responde `REAUTH_REQUIRED`; pruebas
- [x] 7.5 Lista de sesiones con "Esta sesión", "Cerrar" por fila y el cierre de todas existente; selector de idioma que guarda y navega; pruebas
- [x] 7.6 Claves `messages/es|en/users.json` del bloque `settings.account.*` (sin cadenas fijas en componentes)
- [x] 7.7 Actualizar `settings-screens.ts`/menú si cambia algún criterio, y `settings.test.tsx` para las pantallas nuevas

## 8. Fase 1 — Verificación y documentación

- [x] 8.1 `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build` en verde
- [x] 8.2 Aplicar la migración a la base local y probar en el navegador: cambiar usuario y abrir el enlace anterior, cambiar email con el correo de consola, cambiar contraseña, cerrar una sesión ajena, cuenta de Google (crear contraseña, desvincular bloqueado) y vincular Google si hay credenciales de prueba
- [x] 8.3 Documentar la Fase 1 en `docs/05-features/user-profile.md` y los contratos nuevos en `docs/04-api`

## 9. Fase 2 — Identidad musical: datos y servicio

- [x] 9.1 Verificar el siguiente número libre y crear la migración de la Fase 2: `app_user.self_roles`, `genres`, `listening_formats` (`text[] NOT NULL DEFAULT '{}'` con `CHECK (cardinality(...) <= N)`), `show_local_time boolean NOT NULL DEFAULT false`, tabla `user_profile_prompt` (único `(user_id, prompt_key)`, `answer` ≤100), y la limpieza de `timezone` con valores fuera de `pg_timezone_names`; actualizar `schema.ts`
- [x] 9.2 Crear `services/profiles/music-identity.ts` con las listas cerradas (roles, géneros, formatos, preguntas), sus límites y los esquemas Zod, más `getMusicIdentity` y `replaceMusicIdentity`/`replacePrompts` (reemplazo atómico); pruebas de máximos, repetidos, valores fuera de la lista y respuestas de una línea
- [x] 9.3 Validar `timezone` contra `Intl.supportedValuesOf("timeZone")` con lista de respaldo y `showLocalTime` (exige zona); extender `PATCH /api/me/profile`, el servicio de identidad y `OwnProfileResponseSchema`; pruebas
- [x] 9.4 Rutas `PUT /api/me/profile/music-identity` y `PUT /api/me/profile/prompts` con Zod y pruebas de ruta
- [x] 9.5 Incluir la identidad musical, las preguntas y la hora local en `getProfileView`/`ProfileView` solo para perfiles accesibles; pruebas

## 10. Fase 2 — Editores y Placa B

- [x] 10.1 `OwnerMusicIdentityEditor` (roles, géneros y formatos como chips con contador y tope) y `OwnerPromptsEditor` (selector de pregunta, respuesta con contador, agregar y quitar); mismos contrato `editor-host` y estados que los editores existentes; pruebas
- [x] 10.2 Reemplazar el campo de zona horaria de `OwnerIdentityEditor` por un selector **con buscador** (`TimezonePicker`, combobox ARIA con la lista en línea, filtro sin tildes ni mayúsculas y teclado) y añadir el interruptor "mostrar mi hora local"; pruebas
- [x] 10.3 Montar los editores en la pantalla Perfil de Ajustes y en el panel lateral del modo edición (bloque de la ficha con `EditableBlock` y marco vacío solo en modo edición); pruebas
- [x] 10.4 `ProfileFicha` (síncrono, `<dl>` con etiquetas en mono, filas y bloque omitidos si están vacíos) dentro de `Placa` y la hora local junto a la ubicación; nunca en `PrivateProfileCard`; pruebas de perfil completo, parcial, vacío y privado
- [x] 10.5 Claves `messages/es|en/users.json` (roles, géneros, formatos, preguntas con etiqueta larga y corta, hora local)

## 11. Fase 2 — Verificación y documentación

- [x] 11.1 `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build` en verde
- [ ] 11.2 Probar en el navegador con una cuenta de prueba: completar cada campo, ver la ficha en la Placa, editar desde el modo edición, perfil vacío sin hueco, perfil privado sin ficha y hora local con zona
- [x] 11.3 Documentar la Fase 2 en `docs/05-features/user-profile.md`

## 12. Fase 3 — Desactivar: columna, criterio único y superficies

- [x] 12.1 Verificar el siguiente número libre y crear la migración de la Fase 3: `app_user.deactivated_at`; actualizar `schema.ts`
- [x] 12.2 Crear `services/auth/account-status.ts` con `activeUserCondition` y el modelo de autoría desactivada; pruebas
- [x] 12.3 Aplicar el criterio en perfil (`getProfileView`, `getProfileByUsername`) y las 9 páginas, búsqueda de usuarios, seguidores/seguidos/mutuos y sus contadores, solicitudes pendientes, vista rápida y afinidad; pruebas por servicio
- [x] 12.4 Aplicarlo en feed, feed ambiente, actividad de la comunidad y Home; y en listas descubiertas, guardadas y de la comunidad; pruebas por servicio
- [x] 12.5 Reseñas y comentarios: autoría «Cuenta desactivada» sin enlace, sin vista rápida (componentes `Reviews`, `Comments`, `UserHoverCard`); las consultas de moderación conservan la identidad real; pruebas
- [x] 12.6 Rechazar seguir y bloquear a una cuenta desactivada (usuario inexistente); prueba de integración que siembra una cuenta desactivada y recorre todos los servicios de 12.3 a 12.5

## 13. Fase 3 — Desactivar, reactivar, eliminar y exportar

- [x] 13.1 Servicio y ruta `POST /api/me/account/deactivate` (con `requireRecentAuth`, borra todas las sesiones, limpia la cookie); pruebas
- [x] 13.2 Reactivar al iniciar sesión: `authenticateUser`/login por contraseña, callback de Google y restablecimiento de contraseña limpian `deactivated_at`; pruebas de cada camino
- [x] 13.3 Servicio y ruta `DELETE /api/me/account` (usuario de confirmación + factor de identidad, `DELETE FROM app_user`, `23503` → `ACCOUNT_DELETION_BLOCKED`, limpia la cookie); prueba contra la base real con una cuenta con contenido en todas las tablas comprobando que no queda ninguna fila, y con una cuenta con historial de moderación
- [x] 13.4 Servicio y ruta `GET /api/me/export` (JSON adjunto, sin hashes, tokens ni sesiones, con límite de una por minuto); pruebas del contenido y de la exclusión de datos ajenos
- [x] 13.5 Tarjetas "Pausar o salir" y "Eliminar cuenta" en Cuenta y seguridad con sus diálogos (desactivar con lista de qué se oculta y qué se conserva; eliminar con lista de lo que se borra, enlace a Desactivar y confirmación del usuario); pruebas de componente
- [x] 13.6 Claves `messages/es|en` de estos flujos

## 14. Fase 3 — Verificación, documentación y cierre

- [x] 14.1 `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build` en verde
- [ ] 14.2 Probar en el navegador: desactivar y comprobar que el perfil, la búsqueda y el feed la ocultan y que una reseña muestra «Cuenta desactivada»; volver a entrar y ver todo restaurado; exportar; eliminar una cuenta de prueba
- [x] 14.3 Documentar la Fase 3 en `docs/05-features/user-profile.md` y `docs/04-api`; actualizar `AGENTS.md` si algún procedimiento cambia
- [ ] 14.4 `openspec validate rework-account-settings --strict` y archivar (`## Purpose` en los specs que se toquen; ver las notas de archivo)
