# ADR 0026 — Sesión mantenida con renovación por uso

## Estado

Aceptado (cambio `add-keep-signed-in`, 2026-10). Complementa el ADR 0008 (sesiones server-side) sin reescribirlo: el
token opaco, su hash, la cookie `httpOnly` y la revocación por borrado de la fila siguen igual. Lo que cambia es la
política de expiración, que `auth.md` describía como fija.

## Contexto

Toda sesión duraba 30 días contados desde el login, sin renovarse, y no había forma de indicar que el dispositivo no
era de confianza. Quien usa la plataforma a diario tenía que volver a iniciar sesión cada mes, y quien entraba desde un
computador compartido dejaba una sesión viva 30 días.

Restricciones que condicionan la solución:

- El `middleware.ts` solo hace el ruteo de i18n, excluye `/api` y no accede a la base. Los Server Components, que son
  quienes resuelven la sesión, **no pueden escribir cookies**.
- Las acciones sensibles usan la antigüedad de la sesión (`session.created_at`) como factor de identidad reciente
  (spec `account-credentials`); renovar no puede reiniciar ese reloj.
- Hay tres puntos que crean sesión (login, registro y callback de Google) más la rotación por reautenticación.

## Decisión

- **Dos tipos de sesión** según la nueva columna `session.remember` (`boolean NOT NULL DEFAULT true`):
  - **Mantenida:** dura 30 días desde su **última actividad**. `expires_at` se extiende en la misma escritura acotada
    (como mucho una cada 10 minutos) que ya registra `last_seen_at`. Sin escrituras nuevas.
  - **No mantenida:** cookie de sesión (sin `maxAge`) y `expires_at` fijo a 24 horas del inicio, sin renovación. El
    límite de 24 horas en el servidor existe porque los navegadores pueden restaurar las cookies de sesión al reabrir.
- **La cookie de una sesión mantenida lleva `maxAge` de 400 días** (el tope de los navegadores) y la validez la decide
  siempre `expires_at`. Como la cookie no se puede reescribir al renovar, se la hace sobrevivir a la sesión: una cookie
  sin fila vigente no autentica.
- **Elección en el login:** casilla "Mantener la sesión iniciada en este dispositivo", marcada por defecto; el cuerpo de
  `POST /api/auth/login` lleva `remember` (opcional; ausente = `true`). El registro crea sesiones mantenidas. Con
  Google, `remember` viaja en el estado del flujo (`oauth_state`) y el callback usa solo ese valor.
- **Rotar sin elección nueva conserva la de la sesión que se reemplaza** (reautenticación con Google): no se convierte
  una sesión efímera en persistente ni al revés.
- Las sesiones existentes quedan como mantenidas (`DEFAULT true`): ya eran persistentes, así que no hay backfill.
- La renovación no toca `created_at`, de modo que la autenticación reciente se mide igual que antes.

## Justificación

- **Cookie larga con validez en el servidor** en vez de reescribirla al renovar: reescribirla exige un punto donde se
  puedan escribir cookies en cada navegación (el middleware, que no tiene acceso a la base y excluye `/api`) o limitar
  la renovación a los route handlers, con lo que la cookie caducaría en el cliente aunque el servidor la hubiera
  extendido.
- **Renovar con la escritura de `last_seen_at`** evita una escritura adicional y reutiliza la protección ya existente
  contra ráfagas.
- **Marcada por defecto:** es una biblioteca personal y el uso mayoritario es en dispositivos propios; desmarcada por
  defecto forzaría el login mensual al caso común.
- **`remember` explícito en la fila** en vez de inferirlo de `expires_at - created_at`: lo implícito se rompe en cuanto
  cambie un TTL y no se puede consultar ni probar directamente.

## Alternativas consideradas

- **Sesión de 30 días fija (lo anterior) con casilla:** no aporta nada, porque ya era el comportamiento por defecto.
- **Reescribir la cookie desde el middleware:** obliga a consultar la base en cada navegación o a un runtime edge sin
  Postgres.
- **Token de refresco / segunda cookie:** complejidad sin beneficio para un monolito de un solo proceso.
- **Casilla solo en el formulario y Google siempre persistente:** deja sin cubrir el dispositivo compartido para quien
  entra con Google.
- **Tope absoluto de vida de la sesión:** no se adopta ahora; se revisa si aparece necesidad real.

## Consecuencias

- Una sesión mantenida robada y usada con frecuencia no caduca sola. Se mitiga con el cierre individual y global de
  sesiones en Cuenta y seguridad, con que cambiar o restablecer la contraseña cierra todas las sesiones y con que las
  acciones sensibles exigen contraseña o una sesión reciente.
- El botón "Continuar con Google" del login pasa a renderizarse dentro de un componente cliente (`LoginPanel`) para
  reflejar la casilla; el flujo OAuth (estado, PKCE, intercambio y validación del token) sigue íntegro en el servidor.
- Migración `0058` aditiva y compatible con el código anterior, que ignora la columna.
