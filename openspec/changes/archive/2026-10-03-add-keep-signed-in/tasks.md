## 1. Base de datos

- [x] 1.1 Crear `drizzle/0058_session_remember.sql`: `ALTER TABLE session ADD COLUMN remember boolean NOT NULL DEFAULT true`
- [x] 1.2 Espejar la columna en `session` de `src/db/schema.ts` (y el tipo de fila que ya exporta)
- [x] 1.3 Actualizar `docs/03-data/sql-model.md` con `session.remember`

## 2. Servicio de sesiones

- [x] 2.1 En `src/services/auth/sessions.ts`, añadir `EPHEMERAL_SESSION_TTL_MS` (24 h) y `REMEMBER_COOKIE_MAX_AGE_S` (400 días), conservando `SESSION_TTL_MS` (30 días) para la mantenida
- [x] 2.2 `createSession(userId, { remember })`: guardar `remember` y calcular `expiresAt` según el tipo (default `true`)
- [x] 2.3 `setSessionCookie(response, token, { remember })`: `maxAge` de 400 días solo si `remember`; sin `maxAge` si no
- [x] 2.4 `rotateCurrentSession(userId, options?)`: con `remember` explícito lo usa; sin él lee `remember` de la sesión que reemplaza (y `true` si no había); devolver también `remember` para que el handler arme la cookie
- [x] 2.5 `resolveSession` / `touchLastSeen`: seleccionar `remember` y, para sesiones mantenidas, fijar `expires_at = ahora + 30 días` en la misma sentencia acotada que `last_seen_at` (sin tocar `created_at`)
- [x] 2.6 Pruebas en `sessions.test.ts`: TTL por tipo, cookie con y sin `maxAge`, renovación solo de mantenidas, no renovación de efímeras, una escritura por ventana, rotación que conserva la elección, sesión sin fila previa

## 3. API de login y registro

- [x] 3.1 `LoginRequestSchema` en `src/lib/api/schemas.ts`: `remember: z.boolean().optional()` (no booleano → `VALIDATION_ERROR`)
- [x] 3.2 `POST /api/auth/login`: pasar `remember ?? true` a la rotación y a la cookie
- [x] 3.3 `POST /api/auth/register`: crear la sesión con `remember: true` explícito y la cookie correspondiente
- [x] 3.4 Pruebas en `login/route.test.ts`: con `true`, con `false`, ausente y valor no booleano; verificar atributos de la cookie

## 4. Google OAuth

- [x] 4.1 Añadir `remember: boolean` a `OAuthFlowState` y a `generateOAuthFlowState` en `src/services/auth/oauth-flow.ts`; validar al leer la cookie (ausente en cookies viejas → `true`)
- [x] 4.2 `GET /api/auth/google/start`: leer `remember` (`0` → `false`; cualquier otro valor o ausencia → `true`) y guardarlo en el estado
- [x] 4.3 `GET /api/auth/google/callback`: crear o rotar la sesión (intención `login`) con el `remember` del estado y armar la cookie en consecuencia; la intención `reauth` rota sin elección (conserva la existente)
- [x] 4.4 Pruebas en `google-oauth.test.ts`: `remember=0`, sin `remember`, parámetro manipulado en el callback, cookie de estado antigua sin el campo, `reauth` desde sesión efímera y mantenida

## 5. Interfaz de login

- [x] 5.1 Añadir las cadenas de la casilla en `messages/es` y `messages/en` (etiqueta; sin texto crudo de errores)
- [x] 5.2 Crear `LoginPanel` (componente cliente) que posee el estado `remember` (inicia en `true`) y compone `SocialSignIn` y `AuthForm`; usarlo en `src/app/[locale]/auth/login/page.tsx`
- [x] 5.3 `AuthForm` (modo login): renderizar la casilla asociada a su etiqueta, accesible por teclado, y enviar `remember` en el cuerpo del login; el modo registro no cambia
- [x] 5.4 `SocialSignIn`: propiedad opcional `remember`; con `false` añadir `&remember=0` al `href`; sin la propiedad (registro) el `href` actual
- [x] 5.5 Pruebas en `AuthForm.test.tsx` y de `SocialSignIn`: casilla marcada por defecto, cuerpo enviado con y sin marcar, `href` de Google con la casilla desmarcada
- [x] 5.6 Revisión visual del login (claro/oscuro y móvil): que la casilla se vea y se entienda que también aplica al botón de Google

## 6. Documentación

- [x] 6.1 Crear `docs/02-architecture/adr/0026-sesion-mantenida-y-renovacion.md` (de expiración fija a deslizante para las sesiones mantenidas; cookie de 400 días; alternativas descartadas)
- [x] 6.2 Actualizar la sección "Sesión" de `docs/02-architecture/auth.md` (reemplazar el párrafo de "expiración fija") y referenciar el ADR 0026
- [x] 6.3 Actualizar `docs/04-api/contracts.md`: `remember` en `POST /api/auth/login`, `remember` en `GET /api/auth/google/start` y la frase de la cookie ("expiración fija de 30 días")

## 7. Verificación

- [x] 7.1 Smoke test de sesiones contra BD de scratch (`ALLOW_SMOKE_ON_REAL_DB=1`, otro `DATABASE_URL`): migración `0058` aplicada, TTL y renovación por tipo, sesión existente tratada como mantenida; extender `smoke-test-google-oauth.ts` con `remember=0` y `reauth`; limpiar fixtures al terminar
- [x] 7.2 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build` pasan
- [x] 7.3 Comprobación manual en el navegador: iniciar sesión con y sin casilla (contraseña y Google), inspeccionar los atributos de la cookie y que la sesión efímera deja de valer al borrarla/expirar
