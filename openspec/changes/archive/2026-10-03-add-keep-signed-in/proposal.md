## Why

Hoy toda sesión dura 30 días con expiración **fija** (no se renueva con el uso) y no hay forma de
indicar que el dispositivo no es de confianza: en un computador compartido o público la sesión
también dura 30 días, y quien usa la plataforma a diario igualmente tiene que volver a iniciar
sesión cada mes. Falta (1) poder elegir si la sesión se mantiene en el dispositivo y (2) que, si se
mantiene, no caduque mientras la persona la siga usando.

## Goals

- Casilla "Mantener la sesión iniciada en este dispositivo" en el login, **marcada por defecto**.
- Marcada: la sesión se renueva con el uso (ventana deslizante de 30 días de inactividad), de modo
  que quien entra con frecuencia no vuelve a iniciar sesión.
- Desmarcada: la sesión muere al cerrar el navegador y, aunque el navegador restaure la pestaña,
  caduca en el servidor a las 24 horas.
- La elección se respeta también al entrar con Google.
- Las sesiones existentes siguen válidas y quedan como "mantenida".

## Non-Goals

- No hay casilla en el registro: el alta crea una sesión mantenida, como hasta ahora.
- No se cambia la política de autenticación reciente (acciones sensibles): sigue basada en la fecha
  de inicio de la sesión (`created_at`), que la renovación no toca.
- No se añade un tope absoluto de vida de la sesión ni "recordar dispositivo" separado de la sesión.
- No se muestra en la lista de dispositivos si una sesión es mantenida o no.
- No se cambia la forma del token, el hash ni el almacenamiento (ADR 0008 sigue vigente).
- No se añade token de refresco ni segunda cookie.

## What Changes

- Columna `session.remember` (migración `0058`, `boolean NOT NULL DEFAULT true`).
- `POST /api/auth/login` acepta `remember` (booleano, opcional; ausente equivale a `true`).
- `GET /api/auth/google/start` acepta `remember` (`0`/`1`) y lo guarda en el estado del flujo; el
  callback crea o rota la sesión con esa elección.
- `createSession` / `rotateCurrentSession` reciben la elección; rotar sin indicarla (reautenticación
  con Google) conserva la de la sesión que reemplaza.
- Cookie `music_session`: con `remember` lleva `maxAge` de 400 días (tope de los navegadores) y la
  validez la decide el servidor; sin `remember` es cookie de sesión (sin `maxAge`).
- `resolveSession` renueva `expires_at` (+30 días) de las sesiones mantenidas en la misma escritura
  acotada que ya registra la última actividad (como mucho cada 10 minutos).
- Login: casilla en el formulario, compartida con el botón de Google.
- **BREAKING (interno, documentado):** se abandona la "expiración fija" que describía `auth.md`
  para las sesiones mantenidas → ADR nuevo (el 0008 no se reescribe).

## Capabilities

### New Capabilities

- `keep-signed-in`: elección de mantener o no la sesión en el dispositivo, duración y renovación de
  cada tipo de sesión, y atributos de la cookie.

### Modified Capabilities

- `google-oauth`: el inicio del flujo acepta la elección, viaja en el estado del flujo y la sesión
  resultante la respeta; el botón de Google del login refleja la casilla.

## Impact

- Código: `src/services/auth/sessions.ts`, `src/services/auth/oauth-flow.ts`,
  `src/app/api/auth/{login,register,google/start,google/callback}/route.ts`,
  `src/lib/api/schemas.ts` (`LoginRequestSchema`), `src/components/auth/{AuthForm,SocialSignIn}.tsx`,
  `src/app/[locale]/auth/login/page.tsx`, `src/db/schema.ts`, `messages/{es,en}`.
- Base de datos: migración nueva `drizzle/0058_session_remember.sql` + `schema.ts` +
  `docs/03-data/sql-model.md`.
- API: `POST /api/auth/login` y `GET /api/auth/google/start` (campos opcionales, compatibles hacia
  atrás) → `docs/04-api/contracts.md`.
- Documentación: ADR 0026, `docs/02-architecture/auth.md` (sección Sesión).
- Pruebas: `sessions.test.ts`, `login/route.test.ts`, `google-oauth.test.ts`, `AuthForm.test.tsx`;
  smoke test de sesiones contra BD de scratch.
- Sin dependencias nuevas.
