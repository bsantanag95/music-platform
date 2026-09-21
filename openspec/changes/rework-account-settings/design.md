## Context

`/me/settings/account` hoy edita el nombre visible, muestra el método de acceso y cierra todas las sesiones (`services/profiles/account-settings.ts`, `DisplayNameForm`, `RevokeSessionsButton`). El resto de la cuenta está fijo desde el registro. Lo que encontramos al investigar y que condiciona el diseño:

- **`app_user.username` es `text unique` sensible a mayúsculas** (el registro acepta `Ana` y `ana` a la vez) y el login compara el usuario exacto. Un cambio de usuario nuevo tiene que comparar sin distinguir mayúsculas para no permitir suplantaciones.
- **Casi todo cuelga de `app_user` con `ON DELETE CASCADE`** (valoraciones, reseñas, comentarios, favoritos, diario, listas, colección, seguimientos, sesiones, identidades, tokens). Eliminar la cuenta es un `DELETE` y la base hace el resto. Las excepciones son `moderation_action.actor_id`, `user_role_action.actor_id`, `editorial_action.actor_id` (`RESTRICT`) y `user_list.editorial_author_id`/`editorial_submitted_by` (sin acción): las cuentas con historial de moderación o editorial no se pueden borrar.
- **No existe vinculación de Google con cuentas locales**: `resolveOrCreateOAuthUser` rechaza con `EMAIL_TAKEN_BY_LOCAL`, y la spec `google-oauth` lo prohíbe expresamente ("Sin vinculación de cuentas existentes") y prohíbe un `returnTo` controlado por el cliente.
- **`session` solo guarda `token_hash`, `created_at` y `expires_at`**: no hay dispositivo ni última actividad. `rotateCurrentSession` borra la sesión actual y crea otra.
- **El idioma es solo de la ruta** (`/es`, `/en`); no hay preferencia persistida. El login y el callback de Google redirigen al idioma del flujo.
- **`app_user.timezone` es texto libre (≤64) y ninguna vista lo muestra.**
- Hay 9 páginas bajo `users/[username]/` (perfil, artists, collection, connections/{followers,following,mutual}, diary, favorites, fingerprint, lists) y 18 servicios que consultan `app_user.username`; ahí es donde una cuenta desactivada tiene que desaparecer.
- No existe almacenamiento de archivos ni sistema de notificaciones. El correo tiene transporte desacoplado y plantillas (`services/email`).

Mockups aprobados: `scratchpad/account-mockup` (Placa **B**, ficha de disco).

## Goals / Non-Goals

**Goals:** las tres fases de la propuesta con el mínimo de superficie nueva; una sola definición de "cuenta activa" y de "autenticación reciente"; ninguna dependencia nueva; cada fase desplegable por separado.

**Non-Goals:** avatar o subida de archivos, notificaciones, verificación en dos pasos, persistir el idioma desde el selector del Header, cambiar la política de moderación.

## Decisions

### D1. Cambio de usuario: enfriamiento en columna, reserva en tabla de alias

`app_user.username_changed_at` (nulo = nunca cambió) implementa "una vez cada 30 días". Al cambiar, en una transacción: se inserta el usuario anterior en `username_alias(user_id, username, expires_at = now() + 30 días)` y se actualiza `app_user.username`. `username_alias.username` tiene un índice único sobre `lower(username)`.

- **Disponibilidad** = ningún `app_user` con ese `lower(username)` distinto de la persona **y** ningún alias vigente de otra persona. La misma regla se aplica en el registro y en `findAvailableUsername` (alta con Google). El propio alias vigente de la persona se puede recuperar (vuelve a su usuario anterior y el alias se borra).
- **Redirección:** las 9 páginas, cuando `getProfileView` no encuentra el usuario, consultan un alias vigente y hacen `redirect` (307, es temporal) a la misma ruta con el usuario nuevo. Se centraliza en un helper `redirectIfRenamed(username, subpath)`. La API `GET /api/users/[username]` **no** redirige: responde 404.
- **Alias vencidos:** las consultas ignoran `expires_at <= now()`; no hace falta un job. Se borran los vencidos del mismo usuario al renombrar.
- El color del monograma se calcula desde el usuario, así que cambia; se avisa en el diálogo.
- *Alternativa descartada:* reservar sin redirigir. Rompe enlaces compartidos justo cuando la persona espera que sigan funcionando. *Descartada también* una tabla de historial permanente: no hay caso de uso y retiene datos.

### D2. Autenticación reciente en vez de pedir siempre la contraseña

Las acciones sensibles (cambiar email, crear contraseña, desactivar, eliminar) exigen un factor fresco:

- **Cuenta con contraseña:** la contraseña va en el cuerpo de la petición y se verifica con `verifyPassword`.
- **Cuenta sin contraseña (solo Google):** la sesión tiene que ser reciente: `session.created_at` de hace menos de 10 minutos (`RECENT_AUTH_WINDOW_MS`). Si no lo es, la API responde `REAUTH_REQUIRED` (403) y la UI ofrece "Confirmar con Google", que arranca el flujo con `intent=reauth`.

`requireRecentAuth(session, password?)` vive en `services/auth/recent-auth.ts` (no en `authorization.ts`, para no cargar a todos los que mockean ese módulo) y es el único punto de decisión; `requireSession()` (en `authorization.ts`) entrega la sesión con su fecha de inicio. Cambiar la contraseña exige siempre la actual (hay contraseña por definición). Las verificaciones de contraseña van con `consumeAuthAttempt` por usuario para que una sesión robada no pueda probar contraseñas sin límite.

*Alternativa descartada:* pedir siempre reautenticación con Google. Añade un salto de OAuth a cada acción y no aporta nada si la sesión es de hace un minuto.

### D2b. Intenciones del flujo de Google (`login`, `link`, `reauth`) con retorno fijo

El estado del flujo (cookie `oauth_state`) gana `intent: "login" | "link" | "reauth"`, valor **cerrado y validado**; el cliente solo puede pedir `link` o `reauth` en `/start`, que además exige sesión. No hay `returnTo`: ambas intenciones terminan en la ruta fija `/<locale>/me/settings/account` (con `?google=linked` o `?google=confirmed` para el aviso). Esto mantiene la regla de la spec de no aceptar URLs de retorno del cliente y solo la extiende con un destino fijo más.

- `link`: en el callback exige la sesión, que la identidad de Google no esté vinculada a **otra** cuenta (`OAUTH_IDENTITY_TAKEN`) y crea el `auth_identity`. El email de Google **no** tiene que coincidir con el de la cuenta: la identidad se enlaza por `provider_account_id`, no por email, y no concede nada al dueño de ese email.
- `reauth`: exige que la identidad pertenezca a la persona de la sesión, y rota la sesión (nueva `created_at`).
- `login` no cambia, salvo la reactivación (D9) y el idioma preferido (D6).
- **Desvincular** borra el `auth_identity` solo si la cuenta tiene contraseña; si no, `LAST_ACCESS_METHOD` (409).

### D3. Cambio de email con token propio, no reutilizando el de verificación

*(Implementación: la confirmación al email nuevo, el aviso al anterior y el aviso de contraseña viven en `services/email/templates/email-change.ts` y `password-changed.ts`; el enfriamiento de usuario en `services/auth/username.ts`.)*

Nueva tabla `email_change_token(user_id unique, new_email, token_hash, created_at, expires_at)`, mismo patrón que `email_verification_token` (un solo token vigente por usuario, hash SHA-256, 24 horas). El email actual **no cambia hasta confirmar**. Al confirmar, en transacción: se vuelve a comprobar que el email siga libre (`EMAIL_TAKEN`), se actualiza `app_user.email` y `email_verified_at = now()` (el clic en el correo lo verifica), y se borra el token. Se avisa al email anterior con una plantilla propia.

*Alternativa descartada:* guardar `pending_email` en `app_user`. Mezcla estado transitorio con la fila principal y obliga a filtrarlo en cada consulta; la tabla aparte se borra sola al confirmar o vencer. El envío falla cerrado igual que el reset de contraseña: si el transporte falla no se deja un token colgado.

### D4. Sesiones: etiqueta de dispositivo y última actividad

`session` gana `device_label text` (≤80) y `last_seen_at timestamptz`. La etiqueta se calcula **al crear la sesión** con un analizador propio (`lib/device-label.ts`, navegador · sistema, o "Dispositivo desconocido") a partir del `User-Agent`, y solo se guarda la etiqueta: nunca el User-Agent completo ni la IP (dato personal que no necesitamos). `last_seen_at` se actualiza en `resolveSession` **como mucho una vez cada 10 minutos** por sesión, con un `UPDATE ... WHERE last_seen_at < now() - interval '10 minutes' OR last_seen_at IS NULL`, para no escribir en la base en cada petición. Las sesiones anteriores a la migración quedan con `device_label` nulo y se muestran como "Dispositivo desconocido".

- `GET /api/me/sessions` marca la sesión actual (`current: true`); `DELETE /api/me/sessions/[id]` borra una sesión **propia** (filtra por `user_id`) y rechaza la actual (para eso está el cierre de sesión).
- Cambiar la contraseña con `revokeOtherSessions` borra todas menos la actual.

### D5. Identidad ampliada en columnas de arreglo y una tabla para las preguntas

- `self_roles`, `genres`, `listening_formats`: `text[] NOT NULL DEFAULT '{}'` en `app_user`, con `CHECK (cardinality(...) <= N)` (3, 5, 5). **Los valores permitidos se validan en la aplicación** (Zod, listas cerradas en `services/profiles/music-identity.ts`), no en la base: agregar un género es cambiar código, no una migración, a diferencia del `CHECK` de tipos de enlace. Se guardan claves estables (`post-punk`, `vinyl`) y se traducen en `messages/*`.
- Preguntas: tabla `user_profile_prompt(id, user_id, prompt_key, answer, position)`, único `(user_id, prompt_key)`, máximo 3 por usuario (validado en el servicio dentro de la transacción que reemplaza el conjunto), `answer` ≤100. `prompt_key` es de una lista cerrada de 8 en la aplicación; cada una tiene su pregunta completa (editor) y una etiqueta corta (Placa).
- **Se reemplaza el conjunto completo** al guardar (mismo patrón que enlaces y destacados) en una transacción.
- *Alternativa descartada:* una tabla por atributo. Cuatro tablas y cuatro joins para datos que siempre se leen juntos con el perfil y tienen tope de 3 a 5 valores.

### D6. Zona horaria válida y hora local

- El servidor valida `timezone` contra `Intl.supportedValuesOf("timeZone")` (Node ≥ 18, sin dependencia) y rechaza otro valor. El editor pasa a un selector agrupado por región con esa lista.
- `app_user.show_local_time boolean NOT NULL DEFAULT false`. La hora se calcula **al renderizar en el servidor** (`Intl.DateTimeFormat` con la zona) y se muestra como "14:32 hora local". No se actualiza sola: es la de la carga de la página, aceptable para una pista de contexto.
- La migración deja en `NULL` los `timezone` que no existan en `pg_timezone_names`; los datos que ya eran zonas válidas se conservan.

### D7. Idioma preferido

`app_user.locale text` (nulo = sin preferencia; `CHECK IN ('es','en')`). `PATCH /api/me/preferences` lo guarda y la UI navega al mismo lugar en el otro idioma. En el login por contraseña la respuesta incluye `locale` y el cliente redirige si difiere del actual; en el callback de Google se usa `user.locale ?? flowState.locale`. El selector del Header no persiste (fuera de alcance).

### D8. Datos: exportar sincrónico, eliminar por cascada

- **Exportar:** `GET /api/me/export` arma el JSON en la petición y lo devuelve con `Content-Disposition: attachment`. Incluye perfil y preferencias, enlaces, destacados, diario (con notas privadas), valoraciones, reseñas, comentarios, favoritos, por escuchar, listas con sus ítems, colección y deseos, artistas seguidos, y los usernames de seguidores, seguidos y bloqueados. **Excluye** hash de contraseña, tokens, sesiones y datos de otras personas. Límite de una exportación por minuto por usuario. Se descartó el trabajo en segundo plano con correo y enlace: no hay infraestructura de trabajos ni almacenamiento, y el volumen por persona es acotado. Si crece, se pagina en lotes por tabla dentro de la misma respuesta.
- **Eliminar:** `DELETE /api/me/account` con el usuario como confirmación y el factor de D2. Ejecuta `DELETE FROM app_user`; una violación de clave foránea (`23503`, por historial de moderación o editorial) se traduce a `ACCOUNT_DELETION_BLOCKED` (409) y la transacción no cambia nada. Se limpia la cookie de sesión. No hay período de gracia: **Desactivar** cubre "quiero una pausa".

### D9. Desactivar: una columna y un solo criterio de "cuenta activa"

`app_user.deactivated_at timestamptz` (nulo = activa). Desactivar exige D2, fija la fecha, **borra todas las sesiones** y limpia la cookie; por eso una cuenta desactivada nunca tiene sesión y no hace falta una vista "desactivada" para su dueña. **Iniciar sesión (contraseña o Google) pone `deactivated_at` en nulo.** El restablecimiento de contraseña de una cuenta desactivada funciona igual y la reactiva al iniciar sesión.

Para que la persona desaparezca sin tocar 18 consultas a mano, se exporta desde `services/auth/account-status.ts`:

- `activeUserCondition` = `sql\`${appUser.deactivatedAt} IS NULL\`` para las consultas que **listan** personas o su contenido social (búsqueda, seguidores/seguidos/mutuos y sus conteos, feed, actividad de la comunidad, Home, listas descubiertas y guardadas, pendientes de seguimiento, hover card, afinidad);
- `DEACTIVATED_AUTHOR` para las que **muestran autoría** de contenido que se conserva (reseñas y comentarios): la fila se devuelve con el nombre `null`, marca `deactivated: true` y sin enlace.

Las valoraciones (puntajes agregados), el catálogo y las reseñas y comentarios se conservan; el perfil (`getProfileView`) trata a la persona como inexistente para terceros. La moderación (`moderation-queries`) **sí** ve la identidad real. Los seguimientos no se borran: reaparecen al reactivar.

### D10. Un solo lugar para las reglas de cada campo

Las listas cerradas (roles, géneros, formatos, preguntas), los límites y las reglas de usuario/contraseña viven en `services/profiles/music-identity.ts` y `services/auth/account-rules.ts`, y los esquemas de la API los importan. El registro pasa a usar las mismas reglas de usuario que el cambio de usuario, con una sola diferencia: se conserva el `regex` actual.

### D11. Placa B en el perfil, solo para perfiles accesibles

`ProfileFicha` (síncrono, recibe `t` y la hora ya formateada) se renderiza **solo dentro de `Placa`**, después de los enlaces, con un `<dl>` de etiquetas en mono (`Soy`, `Géneros`, `Escucho en`, y las preguntas con su etiqueta corta). Cada fila se omite si está vacía y el bloque entero si no hay ninguna. **No** aparece en `PrivateProfileCard`: es identidad de "quién soy", no de "cómo me encuentro"; la bio y los enlaces ya son públicos en un perfil privado y se deja así, pero no se amplía esa superficie sin que la persona lo decida. La hora local aparece en la línea "miembro desde · ubicación" de la Placa. Se edita con los mismos patrones de `profile-edit-mode`: un editor por bloque en el panel lateral y los mismos editores en Ajustes.

## Risks / Trade-offs

- **[Cuenta desactivada que sigue apareciendo en una superficie olvidada]** → `activeUserCondition` centralizado, una prueba por servicio afectado y una prueba de integración que recorre los 18 servicios con una cuenta desactivada sembrada; el requisito de la spec enumera las superficies.
- **[Eliminar con datos que no cascadean]** → una prueba contra la base real con una cuenta que tiene contenido en todas las tablas comprobando que no queda ninguna fila; el error `23503` se traduce en vez de filtrarse.
- **[Vincular Google abre la puerta a tomar la cuenta de otra persona]** → solo con sesión iniciada, con `state`/PKCE/`nonce` del flujo existente y sin `returnTo`; una identidad ya vinculada a otra cuenta se rechaza; el email de Google no se usa para enlazar.
- **[Bloqueo por robo de sesión]** → cambiar email o eliminar exige contraseña o sesión reciente; el aviso al email anterior da tiempo de reaccionar.
- **[`last_seen_at` genera escrituras]** → actualización con umbral de 10 minutos.
- **[Zona horaria: el navegador o Node sin `Intl.supportedValuesOf`]** → se usa una lista de respaldo estática si la función no existe; una prueba fija el comportamiento.
- **[Suplantación por mayúsculas al cambiar usuario]** → comparación con `lower()`; los duplicados por mayúsculas anteriores no se tocan.
- **[Redirección de alias filtra que el usuario existió]** → es información pública de todos modos (el enlace se compartió) y expira a los 30 días.
- **[Una exportación grande satura la respuesta]** → límite de frecuencia y consultas por tabla; ver alternativa por lotes en D8.

## Migration Plan

Tres migraciones aditivas, una por fase, con números a verificar antes de crearlas (hoy la siguiente libre es `0039`). Ninguna reescribe datos salvo la limpieza de `timezone` de la Fase 2 (irreversible, aceptado: eran texto libre que nunca se mostraba). Cada fase se puede desplegar sin las siguientes: las columnas nuevas tienen valores por defecto y las pantallas solo muestran los controles de las fases entregadas (`SETTINGS_SCREENS` ya oculta pantallas sin controles). Reversión: las tablas y columnas nuevas se pueden dejar sin uso; el único cambio de comportamiento existente es el retiro de "Sin vinculación de cuentas existentes".

## Open Questions

- ¿Las claves y etiquetas finales de los 8 pedidos de "preguntas del perfil" y de los géneros? Se proponen en `specs/profile-music-identity` y se ajustan en la implementación sin cambiar la estructura.
- ¿Se quiere un correo de despedida al eliminar la cuenta? Fuera de alcance por ahora (no se guarda nada después de borrar).
