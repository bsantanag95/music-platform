# ADR 0008 — Sesiones server-side con Argon2id, en vez de JWT

**Estado:** Aceptado

## Contexto

`architecture.md` ya fijaba la dirección general de autenticación ("propia, email/username + contraseña, con espacio para OAuth más adelante") pero dejaba el mecanismo concreto para un `auth.md` dedicado "cuando se implemente en la Fase 4" — este ADR y `02-architecture/auth.md` son ese momento.

Restricciones ya fijadas por decisiones previas que condicionan esta:

- **Server Components como estrategia por defecto** (`01-frontend-architecture.md`): la carga inicial de cualquier página que dependa de sesión (ej. "¿este usuario ya valoró este álbum?") debe poder resolverse en el servidor sin round-trip a la propia API — mismo criterio que ya evitó tRPC innecesario en ADR 0006.
- **REST, no tRPC** (ADR 0006).
- **PWA, no app nativa** (ADR 0001) — mismo origen siempre, sin necesidad de compartir sesión entre dominios ni apps distintas.
- **Arquitectura de un solo proceso hoy** — mismo supuesto que ya limita la cola de rate-limit de MusicBrainz (`musicbrainz/client.ts`), documentado ahí como limitación conocida a resolver si el proyecto escala a múltiples instancias.

## Decisión

- **Sesiones server-side con token opaco aleatorio**, no JWT. El token vive en una cookie `httpOnly`, `secure`, `sameSite=lax`. Del lado de la base, se persiste **hasheado** (nunca en texto plano) en una tabla `session` nueva — mismo criterio de "nunca guardar el secreto real" que ya aplica a las contraseñas.
- **Contraseñas hasheadas con Argon2id** (parámetros de memoria/tiempo/paralelismo a fijar en la migración concreta — ver `auth.md`).
- **CSRF**: la defensa principal es `sameSite=lax` en la cookie de sesión, suficiente para el alcance actual (mismo origen, sin necesidad de embeds cross-site). Un token de doble-submit queda anotado como escalón futuro, solo si aparece necesidad real — mismo criterio de "no resolver antes de tener evidencia" que ya aplica al riesgo 9 de `04-risks.md`.
- **Rate limiting de login/registro**: limitador en memoria por IP/usuario, mismo patrón — y misma limitación de una sola instancia — que ya documenta `musicbrainz/client.ts` para las llamadas salientes.
- **`app_user.password_hash` nullable desde el día uno**: deja espacio estructural para OAuth futuro sin migración destructiva, cumpliendo lo que `architecture.md` ya prometía ("sin que eso requiera cambios estructurales en el modelo de Usuario").

## Justificación

- **Sesión server-side sobre JWT stateless**: el proyecto es un monolito de un solo proceso — no hay múltiples servicios que se beneficien de la propiedad "stateless" de un JWT. A cambio, una sesión server-side revoca instantáneamente (logout, incidente de seguridad), mientras que invalidar un JWT antes de su expiración exige mantener una lista de revocación — es decir, volver a tener estado igual, pero peor diseñado. Además, una sesión en cookie es exactamente lo que necesita un Server Component para leer "¿hay usuario logueado?" sin round-trip a la propia API, continuando el patrón ya elegido en `01-frontend-architecture.md`.
- **Argon2id sobre bcrypt**: bcrypt sigue siendo aceptable, pero Argon2id es el estándar recomendado actual (ganador de la Password Hashing Competition), resistente a cracking acelerado por GPU de forma más robusta que bcrypt. El proyecto no tiene legado que lo ate a bcrypt, así que no hay costo de migración que pagar por elegir el estándar más nuevo.
- **Auth propia sobre un proveedor gestionado** (Auth.js, Clerk, etc.): mismo criterio que ADR 0005 aplicó a Prisma — un proveedor externo resuelve una necesidad (OAuth multi-proveedor, gestión de sesiones a escala) que el proyecto todavía no tiene. Postgres + Drizzle + route handlers ya alcanza para email/contraseña con sesión propia.

## Alternativas consideradas

- **JWT en `localStorage` o cookie no-httpOnly**: descartado — expone el token a robo por XSS. Con `comment.body` como superficie de texto libre de usuario (aunque React escapa por defecto), conviene defensa en profundidad.
- **bcrypt**: no descartado por debilidad real, sino porque Argon2id es el estándar más nuevo sin costo de adopción en un proyecto sin legado.
- **Auth.js / Clerk / proveedor gestionado**: descartado por ahora — mismo argumento que Prisma en ADR 0005, se revisita si aparece necesidad real de OAuth multi-proveedor a escala.

## Consecuencias

- Requiere una migración nueva (tabla `session` + `app_user.password_hash`) — la escribe el agente Datos/Esquema cuando se abran las tareas de Fase 4; este documento fija el diseño, no la migración.
- El paquete de hashing Argon2id para Node (`argon2`) requiere compilación nativa — riesgo operativo a vigilar si el deploy termina siendo serverless/edge sin soporte de binarios nativos. Si eso bloquea, el fallback es `bcrypt` puro-JS, sin que eso invalide el resto de esta decisión (sesión server-side, cookie httpOnly, rate limiting).
- Ningún agente de ejecución (Backend, Datos/Esquema, Seguridad) debe implementar un mecanismo distinto al aquí descrito sin reabrir este ADR.
