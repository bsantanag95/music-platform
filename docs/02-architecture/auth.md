# auth.md — Autenticación

Documento narrado de la arquitectura de autenticación del proyecto: qué existe, por qué se
decidió así, y cómo se extiende a futuro. Complementa, sin repetir, `02-architecture/adr/0008-auth-sesiones-y-hash-contrasena.md`
(la decisión y sus alternativas). Este documento describe *cómo funciona el sistema*, análogo
a `02-architecture/i18n.md` para internacionalización o `03-data/sql-model.md` para el esquema.

## Estado

**Diseñado, no implementado todavía.** Este documento fija el diseño para que los agentes de
ejecución (Backend, Datos/Esquema, Seguridad) implementen sin tener que decidir mecanismo por
su cuenta. La migración concreta, los route handlers y los tests son trabajo de Fase 4, no de
este documento.

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

Los parámetros exactos de Argon2id (costo de memoria, iteraciones, paralelismo) se fijan al
escribir la migración e implementación reales — este documento no los prescribe en números
concretos porque son un detalle de tuning, no de arquitectura.

### 2. Sesión — token opaco, no JWT

Al loguearse, el servidor genera un token aleatorio, lo hashea, y guarda el hash en una tabla
`session` nueva (conceptualmente: `id`, `user_id` → `app_user.id`, `token_hash`, `created_at`,
`expires_at`). El token **en texto plano** se envía al cliente exclusivamente vía cookie
`httpOnly`, `secure`, `sameSite=lax` — nunca en el body de una respuesta JSON, nunca accesible
desde JavaScript del cliente.

En cada request que necesite sesión, el servidor recibe el token de la cookie, lo hashea, y
busca ese hash en `session`. Si no hay fila o `expires_at` ya pasó, no hay sesión válida.

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
MusicBrainz). Fuera de alcance mientras el proyecto siga siendo de una sola instancia.

### 5. Autorización en mutaciones

Toda mutación sobre `rating` o `comment` (crear, editar, borrar) resuelve el `user_id` desde la
sesión del servidor — **nunca** desde un campo que venga en el body o los params de la request.
Esto no es una preferencia de estilo: es la única forma de que la unicidad de `rating` por
usuario/objetivo (`sql-model.md`) y el borrado físico (ADR 0009) sigan siendo garantías reales
y no solo convenciones que un cliente malicioso podría sortear.

## Qué no decide este documento

Deliberadamente fuera de alcance acá, para no anticipar decisiones que corresponden a la
implementación real o a un ADR propio cuando haga falta:

- Parámetros exactos de Argon2id (memoria/tiempo/paralelismo).
- Nombre y columnas exactas de la migración de `session` y `app_user.password_hash` — las
  define el agente Datos/Esquema al abrir la tarea correspondiente.
- Códigos `ErrorCode` nuevos para fallos de auth (credenciales inválidas, rate limit excedido,
  sesión expirada) — se agregan a `src/lib/api/schemas.ts` y `04-api/errors.md` cuando el
  agente Backend implemente los endpoints, siguiendo el mismo patrón que ya usa el resto de la
  API.
- Flujo de recuperación de contraseña (reset por email) — no está en el alcance descrito por
  `architecture.md`/PRD para el MVP de Fase 4; se evalúa aparte si se vuelve necesario.
- Integración OAuth con proveedores de streaming — sigue siendo Fase 5+ (`architecture.md`),
  este documento solo garantiza que el esquema no lo bloquea (`password_hash` nullable).

## Relación con otros documentos

- **`adr/0008-auth-sesiones-y-hash-contrasena.md`**: la decisión y sus alternativas. No se
  reescribe si este documento cambia.
- **`adr/0009-borrado-fisico-rating-comment.md`**: decisión relacionada pero independiente —
  borrado de `rating`/`comment`, no de sesión ni de usuario.
- **`conventions.md`**: resumen normativo de uso diario, con puntero acá para el detalle.
- **`01-frontend-architecture.md`**: el patrón de Server Components sin round-trip a la propia
  API, que la resolución de sesión hereda directamente.
- **`04-api/errors.md`**: recibirá los códigos de error de auth cuando se implementen los
  endpoints — este documento no los define de antemano.
