# auth.md — Autenticación

Documento narrado de la arquitectura de autenticación del proyecto: qué existe, por qué se
decidió así, y cómo se extiende a futuro. Complementa, sin repetir, `02-architecture/adr/0008-auth-sesiones-y-hash-contrasena.md`
(la decisión y sus alternativas). Este documento describe _cómo funciona el sistema_, análogo
a `02-architecture/i18n.md` para internacionalización o `03-data/sql-model.md` para el esquema.

## Estado

**Implementado para autenticación local.** Este documento describe el mecanismo que deben seguir
los agentes de ejecución y conserva la preparación de identidades externas para el cambio posterior
de Google. La migración, los route handlers y los tests de autenticación local ya forman parte de
la implementación de Fase 4.

La implementación usa Argon2id con `memoryCost=19456`, `timeCost=2` y `parallelism=1`, centralizados
en `src/services/auth/password.ts`.

La interfaz común de adaptadores externos ya está preparada en
`src/services/auth/providers/`, pero no hay ningún proveedor habilitado. Google y cualquier
flujo OAuth/OIDC, incluidos sus rutas, callbacks, secretos e intercambio de códigos, se
implementarán en un cambio posterior.

## Por qué existe este documento aparte del ADR

Mismo criterio que separa `adr/0007-i18n-next-intl.md` de `i18n.md`: el ADR es el registro
histórico de la decisión y sus alternativas, no se reescribe. Este documento describe el
sistema tal como debe quedar construido, y se actualiza cada vez que algo del mecanismo cambia.

## Piezas del sistema

### 1. Contraseñas — Argon2id

Ninguna contraseña se guarda en texto plano ni con un hash sin salt. Se hashea con Argon2id al
registrar, y se verifica con la misma función al iniciar sesión. `app_user.password_hash` es
**nullable** desde el día uno — un usuario creado en el futuro vía OAuth no tendría contraseña
propia, y esa columna nula es justamente lo que permite eso sin migración destructiva (ver
ADR 0008, consecuencia ya prevista en `architecture.md`).

Los parámetros implementados de Argon2id son `memoryCost=19456`, `timeCost=2` y `parallelism=1`.
Si el entorno de despliegue requiere modificar el tuning, debe actualizarse esta documentación y
validarse el impacto antes de cambiar el mecanismo.

### 2. Sesión — token opaco, no JWT

Al loguearse, el servidor genera un token aleatorio, lo hashea, y guarda el hash en una tabla
`session` nueva (conceptualmente: `id`, `user_id` → `app_user.id`, `token_hash`, `created_at`,
`expires_at`). El token **en texto plano** se envía al cliente exclusivamente vía cookie
`httpOnly`, `secure`, `sameSite=lax` — nunca en el body de una respuesta JSON, nunca accesible
desde JavaScript del cliente.

En cada request que necesite sesión, el servidor recibe el token de la cookie, lo hashea, y
busca ese hash en `session`. Si no hay fila o `expires_at` ya pasó, no hay sesión válida.

La sesión utiliza expiración fija, adecuada para el uso como PWA: no se extiende en cada request.
El token se rota después de autenticarse y después de eventos sensibles, pero no en cada request
normal. Un usuario puede tener varias sesiones activas en distintos dispositivos.

La revocación puede ser individual, eliminando una sesión concreta, o global, eliminando todas las
sesiones asociadas al usuario. El cierre de sesión normal elimina la sesión actual; una acción
global de seguridad elimina todas las sesiones. No se necesita una columna `revoked_at` para
consultar la validez: la ausencia de la fila invalida el token inmediatamente.

Las sesiones expiradas se eliminan mediante un job periódico y también mediante limpieza
oportunista durante operaciones normales de autenticación o resolución de sesión. La limpieza no
debe bloquear la respuesta principal.

El job periódico se ejecuta en el monolito con `pnpm run db:cleanup-sessions` (requiere
`DATABASE_URL` en `.env`). El scheduler del entorno de despliegue debe invocarlo con la frecuencia
operativa elegida, por ejemplo cada hora. El comando es idempotente y comparte
`cleanupExpiredSessions()` con la limpieza oportunista; esta última conserva su ejecución
asíncrona y no bloqueante dentro de las requests.

**Por qué esto y no JWT:** ver ADR 0008. La razón corta es que el proyecto es un monolito de
un proceso — no hay beneficio de "stateless" que cobrar, y sí hay costo real: un JWT robado
sigue siendo válido hasta que expira, salvo que se mantenga una lista de revocación (que es
volver a tener estado, pero peor).

**Server Components leen sesión sin round-trip.** Igual que `01-frontend-architecture.md` ya
decidió que la carga inicial de página llama directo a `src/services/catalog/*` en vez de a la
propia API, la resolución de sesión en un Server Component consulta la cookie + la tabla
`session` directamente — nunca hace un `fetch` a un endpoint propio de "¿quién soy?".

### 3. CSRF

La defensa principal es `sameSite=lax` en la cookie de sesión: un request de mutación (POST,
PATCH, DELETE) originado desde otro sitio no lleva la cookie, así que no hay sesión que
falsificar. Esto cubre el alcance actual del proyecto (mismo origen siempre, sin necesidad de
embeds cross-site ni integraciones de terceros que posteen a la API).

Un token de doble-submit (header custom + cookie, ambos deben coincidir) queda anotado como
escalón futuro — se agrega solo si aparece una necesidad concreta (por ejemplo, si en Fase 5
un flujo de scrobbling externo empieza a postear directo a la API desde otro origen), no antes.

### 4. Rate limiting de login/registro

Un limitador en memoria, por IP y/o por identificador de usuario, con ventana deslizante —
mismo patrón que ya usa `musicbrainz/client.ts` para las llamadas salientes, aplicado ahora a
llamadas **entrantes**. Comparte la misma limitación documentada ahí: en un deploy con más de
una instancia sirviendo tráfico, dos instancias distintas podrían sumar más intentos que el
límite nominal entre ambas. Para ese escenario hace falta un limitador distribuido (token
bucket en Redis, mismo camino ya previsto en `architecture.md` para el rate limit de
MusicBrainz). La IP del runtime se usa cuando está disponible; `X-Forwarded-For` solo se acepta si
`AUTH_TRUSTED_PROXY=1` está configurado explícitamente. Sin esa configuración la IP se considera
desconocida, pero el límite por identificador se conserva. El mapa tiene limpieza de entradas
expiradas y un máximo de cardinalidad. Fuera de alcance mientras el proyecto siga siendo de una
sola instancia.

### 5. Autorización en mutaciones

Toda mutación sobre `rating` o `comment` (crear, editar, borrar) resuelve el `user_id` desde la
sesión del servidor — **nunca** desde un campo que venga en el body o los params de la request.
Esto no es una preferencia de estilo: es la única forma de que la unicidad de `rating` por
usuario/objetivo (`sql-model.md`) y el borrado físico (ADR 0009) sigan siendo garantías reales
y no solo convenciones que un cliente malicioso podría sortear.

### 6. Identidades externas — Google y futuros proveedores

La identidad dentro del producto (`app_user`) se separa de la identidad entregada por un
proveedor OAuth/OIDC. Una tabla `auth_identity` relaciona ambas mediante un `provider` y el
`provider_account_id` estable que entrega ese proveedor, con unicidad por la pareja. Para
proveedores OIDC, `provider_account_id` corresponde al claim sub y provider identifica
inequívocamente al issuer.

Google será el primer proveedor externo previsto. Su flujo vive en el backend de la misma
aplicación Next.js, con adaptadores bajo `src/services/auth/providers/` y route handlers bajo
`src/app/api/auth/`. El flujo utiliza Authorization Code con state y PKCE; para OIDC utiliza
además `nonce`. El authorization code se intercambia exclusivamente en el backend.

Después de validar el callback y la identidad del proveedor, el flujo resuelve una identidad
externa existente o crea una nueva y desemboca en la misma sesión server-side de token opaco
definida para la autenticación local. Ratings y comentarios no distinguen el método de inicio de
sesión.

No se vinculan cuentas automáticamente por email. La vinculación de una identidad externa con un
`app_user` existente es una operación explícita iniciada desde una sesión autenticada y requiere
un flujo OAuth/OIDC completo; la coincidencia de email por sí sola no es suficiente.

En el callback OIDC se validan `issuer`, `audience`, firma, expiración y `nonce`, además de
`state`, PKCE, `redirect_uri` y el authorization code conforme al flujo implementado.

No se almacenan tokens OAuth cuando no sean necesarios para consumir APIs del proveedor. Los
secretos y credenciales de proveedor viven solo en variables de entorno del servidor.

Durante la Fase 4 se implementará únicamente la autenticación local y se dejará preparada la
persistencia y la interfaz de proveedores externos. Google se implementará inmediatamente después,
como el primer incremento posterior de autenticación, sin cambiar el modelo de sesión ni el
modelo de usuario.

## Qué no decide este documento

Deliberadamente fuera de alcance acá:

- Flujo de recuperación de contraseña (reset por email) — no está en el alcance descrito por
  `architecture.md`/PRD para el MVP de Fase 4; se evalúa aparte si se vuelve necesario.
- Google y otros flujos OAuth/OIDC — se implementarán en un cambio posterior usando la interfaz
  y la persistencia preparadas en esta fase.
- El scrobbling con proveedores de streaming sigue siendo Fase 5+ (`architecture.md`).

## Relación con otros documentos

- **`adr/0008-auth-sesiones-y-hash-contrasena.md`**: la decisión y sus alternativas. No se
  reescribe si este documento cambia.
- **`adr/0010-identidades-externas-y-proveedores-oauth.md`**: separación entre usuario e
  identidad externa y ubicación de los adaptadores OAuth/OIDC.
- **`adr/0009-borrado-fisico-rating-comment.md`**: decisión relacionada pero independiente —
  borrado de `rating`/`comment`, no de sesión ni de usuario.
- **`conventions.md`**: resumen normativo de uso diario, con puntero acá para el detalle.
- **`01-frontend-architecture.md`**: el patrón de Server Components sin round-trip a la propia
  API, que la resolución de sesión hereda directamente.
- **`04-api/errors.md`**: documenta los códigos de error de autenticación y su forma estable para
  el cliente.
