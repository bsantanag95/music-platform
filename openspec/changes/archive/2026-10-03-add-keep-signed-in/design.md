## Context

Una sesión es una fila `session` con el hash del token y `expires_at`, y una cookie `music_session`
(`httpOnly`, `secure`, `sameSite=lax`) con `maxAge` de 30 días. La expiración es fija: `auth.md`
dice explícitamente que no se extiende en cada request. `resolveSession()` ya hace una escritura
acotada (como mucho una vez cada 10 minutos por sesión) para `last_seen_at`
(`touchLastSeen`).

Restricciones que condicionan el diseño:

- El `middleware.ts` solo hace el ruteo de i18n y excluye `/api`; los Server Components **no pueden
  escribir cookies**. Renovar la cookie en cada visita no es posible sin añadir trabajo al
  middleware (que además no debería tocar la base).
- La "autenticación reciente" (`account-credentials`) usa `session.created_at`; no debe verse
  afectada por la renovación.
- `google-oauth` mantiene el flujo OAuth en el servidor y la redirección post-login fija.
- Hay tres puntos que crean sesión: login (`rotateCurrentSession`), registro (`createSession`) y el
  callback de Google (crea o rota), más la rotación por reautenticación con Google.

## Goals / Non-Goals

**Goals:**

- Dos tipos de sesión, "mantenida" y "solo esta visita", elegidos al iniciar sesión.
- Renovación deslizante de las mantenidas sin tocar la cookie en cada request.
- Que la elección valga igual para contraseña y para Google.
- Compatibilidad total: sesiones existentes y clientes que no envían el campo siguen funcionando.

**Non-Goals:**

- Tope absoluto de vida, tokens de refresco, segunda cookie, "recordar dispositivo" independiente.
- Casilla en el registro; indicar en la lista de dispositivos qué sesiones son mantenidas.
- Cambiar el hash, el formato del token o la política de autenticación reciente.

## Decisions

### 1. Columna `session.remember` y un solo mecanismo de expiración

Se añade `remember boolean NOT NULL DEFAULT true` (migración `0058`). El servidor sigue siendo la
fuente de verdad de la validez mediante `expires_at`; la cookie solo transporta el token.

- `remember = true` → `expires_at = ahora + 30 días`, renovado con el uso.
- `remember = false` → `expires_at = ahora + 24 horas`, fijo.

`DEFAULT true` hace que las sesiones existentes queden como "mantenidas", que es lo que ya eran
(cookie de 30 días), sin backfill ni valores inventados.

*Alternativa descartada:* inferir el tipo comparando `expires_at - created_at`. Es implícito, se
rompe en cuanto cambie un TTL y no se puede consultar ni testear directamente.

### 2. La cookie de una sesión mantenida dura 400 días; el servidor decide

Para renovar la sesión sin reescribir la cookie (los Server Components no pueden), la cookie de una
sesión mantenida lleva `maxAge` de 400 días (el tope que aplican los navegadores) y la caducidad
real la impone `expires_at`. Una cookie que sobrevive a su sesión es inofensiva: sin fila vigente no
hay sesión. Una sesión no mantenida lleva cookie **de sesión** (sin `maxAge`): se borra al cerrar el
navegador.

*Alternativas descartadas:*

- Reescribir la cookie desde el middleware: obliga a consultar la base en cada navegación (o a un
  runtime edge sin acceso a Postgres) y excluye `/api`.
- Renovar solo en route handlers: la cookie caducaría en el cliente aunque el servidor la haya
  extendido, en cuanto la persona navegue solo con Server Components.

### 3. Renovación acoplada a la última actividad

`touchLastSeen` ya limita las escrituras a una cada 10 minutos por sesión. Para una sesión mantenida
la misma sentencia fija además `expires_at = ahora + 30 días`; no se añade ninguna escritura nueva.
`resolveSession` pasa a seleccionar `remember`. La renovación no modifica `created_at`, así que la
autenticación reciente no cambia.

Una sesión no mantenida no se renueva: sus 24 horas cuentan desde el inicio de sesión.

*Riesgo de la ventana deslizante sin tope:* una cookie robada y usada con frecuencia no caduca sola.
Se mitiga con lo que ya existe (cierre individual y global en Cuenta y seguridad, y que cambiar o
restablecer la contraseña cierra todas las sesiones) y con que las acciones sensibles exigen
contraseña o sesión reciente. Un tope absoluto queda fuera de alcance y se revisa si aparece
necesidad.

### 4. `createSession` / `rotateCurrentSession` reciben la elección

Ambas aceptan `{ remember }`:

- Login por contraseña: usa el campo del cuerpo (ausente → `true`).
- Registro: `remember: true` explícito (comportamiento de siempre, sin casilla).
- Callback de Google, intención `login`: usa la elección guardada en el estado del flujo.
- Reautenticación con Google (`reauth`): no recibe elección; `rotateCurrentSession` lee la de la
  sesión que reemplaza, para no convertir una sesión efímera en persistente (ni al revés). Sin
  sesión previa, `true`.

### 5. La elección viaja a Google en el estado del flujo

`GET /api/auth/google/start` acepta `remember=0|1`; cualquier otro valor o su ausencia equivale a
`1`. Se guarda en `OAuthFlowState` (cookie `oauth_state`, protegida por `state`, PKCE y `nonce`) y el
callback la lee de ahí, nunca del query del callback. Va en el estado y no en un parámetro del
callback porque Google no reenvía los parámetros propios del `/start` (ya ocurre con `locale`).

### 6. Una sola casilla para formulario y botón de Google

La casilla vive en el formulario de login, pero el botón "Continuar con Google" está encima y es un
enlace. Se introduce un componente cliente delgado, `LoginPanel`, que posee el estado `remember` y
lo pasa a `SocialSignIn` (que solo añade `&remember=0` al `href` cuando está desmarcada) y a
`AuthForm`. El flujo OAuth sigue íntegramente en el servidor: el componente cliente solo compone una
URL. Por eso `google-oauth` ("Acceso desde login y registro") deja de decir que el botón no puede
estar en un componente cliente y pasa a decir que el **flujo** permanece en el servidor.

La página de registro sigue usando `SocialSignIn` sin la propiedad, con el `href` actual.

*Alternativa descartada:* casilla solo en el formulario y Google siempre persistente. Deja sin cubrir
justo el caso de dispositivo compartido para quien entra con Google.

### 7. Valores por defecto y duraciones

Marcada por defecto: es una biblioteca personal y casi todo el uso es en dispositivos propios; el
costo de un valor por defecto "desmarcado" sería forzar el login mensual al caso mayoritario.
Constantes en `sessions.ts`: `SESSION_TTL_MS` (30 días, mantenida), `EPHEMERAL_SESSION_TTL_MS`
(24 horas) y `REMEMBER_COOKIE_MAX_AGE_S` (400 días).

### 8. Documentación

ADR 0026 (nuevo; el 0008 no se reescribe) registra el paso de expiración fija a deslizante para las
sesiones mantenidas y el motivo de la cookie larga. Se actualiza la sección "Sesión" de `auth.md`
(hoy dice "expiración fija"), el contrato de `POST /api/auth/login` y de
`GET /api/auth/google/start` en `contracts.md` (incluida la frase "expiración fija de 30…" de la
cookie) y `sql-model.md`.

## Risks / Trade-offs

- [Sesión robada que no caduca mientras se use] → cierre individual/global ya existente, contraseña
  o sesión reciente para acciones sensibles, y revisión de un tope absoluto si hace falta.
- [Cookie larga sin sesión vigente] → inofensiva: el servidor valida siempre contra `session`.
- [El navegador restaura las cookies de sesión al reabrir (modo "continuar donde lo dejé")] → por
  eso la sesión no mantenida también caduca en el servidor a las 24 horas.
- [Google queda arriba de la casilla y la persona puede no verla] → la casilla va marcada por defecto
  y el botón respeta su estado en cada clic; se evalúa en la revisión visual.
- [Más escrituras] → ninguna nueva: se reutiliza la escritura ya limitada a una cada 10 minutos.
- [Sesiones existentes empiezan a renovarse al desplegar] → es el comportamiento buscado; no hay
  migración de datos más allá del `DEFAULT true`.

## Migration Plan

1. Aplicar `0058` (añadir columna con `DEFAULT true`): compatible con el código viejo, que ignora la
   columna.
2. Desplegar el código nuevo.
3. Rollback: volver al código anterior; la columna sobrante no estorba. Las sesiones efímeras ya
   creadas siguen siendo filas válidas con su `expires_at`.

## Open Questions

- Ninguna bloqueante. Se asumen 24 horas para la sesión no mantenida y 30 días de ventana para la
  mantenida; ambas son constantes de una línea si se quieren cambiar.
