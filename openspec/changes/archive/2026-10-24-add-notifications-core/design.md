## Context

Hoy el único aviso es el badge de solicitudes pendientes del menú de usuario (`countPendingFollowRequests`, calculado
en `src/app/[locale]/layout.tsx` y pasado a `Header` → `UserMenu`). Las fuentes de la Fase 1 ya existen y escriben
de forma síncrona dentro de la request (ADR 0011: no hay colas ni eventos):

- `createReply` (`src/services/social.ts`): inserta la respuesta colgada de la raíz (`comment.parent_id`, ADR 0030).
- `followUser`, `approveRequest`, `rejectRequest`, `cancelRequest`, `removeFollower`, `unfollowUser`
  (`src/services/social/following.ts`) sobre `user_follow (status pending|accepted)`. `blockUser` borra los
  seguimientos en ambas direcciones.
- `hideComment` / `restoreComment` / `hideReview` / `restoreReview` / `hideList` / `restoreList`,
  `suspendSocialActivity` / `revokeSocialSuspension` (`src/services/moderation.ts`), que ya registran una fila en
  `moderation_action`.

Restricciones del producto que condicionan el diseño: nada de presión ni gamificación (`vision.md`), likes anónimos
con cifra desde 3 (`add-comment-likes`), borrado físico de comentarios (ADR 0009), cuentas desactivadas invisibles en
superficies sociales (`account-lifecycle`), bloqueos en ambas direcciones (`social-blocking`).

Decisiones de producto ya tomadas con el usuario (2026-10-23): el contador solo cuenta lo dirigido al usuario; las
respuestas en hilos donde se participó se notifican y están activadas por defecto; los hitos de likes (Fase 2) serán
sin nombres y crecientes (10, 25, 50, 100, 500, 1000…); los lanzamientos (Fase 2) cubrirán álbum y EP, con sencillos
como ajuste.

## Goals / Non-Goals

**Goals:**

- Una tabla y un servicio de emisión únicos que las Fases 2 y 3 extiendan solo con tipos y canales.
- Coherencia con bloqueos, desactivación, moderación y borrado sin lógica de limpieza manual.
- Lectura barata: el contador se calcula en cada render del layout autenticado.

**Non-Goals:**

- Tipos de la Fase 2 y canales de la Fase 3 (ver proposal).
- Tiempo real, colas, workers, cron.
- Rediseñar `/me/follow-requests` (sigue existiendo; la notificación es un atajo, no su reemplazo).

## Decisions

### D1. Notificaciones materializadas, no derivadas

Una fila por evento en `notification`, escrita por el servicio que produce el evento, en su misma transacción.

**Alternativa descartada — derivarlas en lectura** de `comment`, `user_follow` y `moderation_action` (lo que sugería
el ADR 0030 para las respuestas). Funciona para una fuente, pero con seis tipos la consulta del contador sería una
unión de seis subconsultas en cada página, el estado de leído necesitaría igual una tabla propia por evento y la
Fase 2 (hitos de likes, lanzamientos con fan-out) no se puede derivar a costo razonable. Se registra en el ADR
`0045` (nuevo; el 0030 no se reescribe).

### D2. Esquema

```
notification
  id uuid PK
  recipient_id uuid NOT NULL → app_user ON DELETE CASCADE
  kind text NOT NULL  CHECK (kind IN ('comment_reply','thread_reply','new_follower','follow_request',
                                      'follow_accepted','moderation'))
  actor_id uuid NULL → app_user ON DELETE CASCADE      -- nunca para 'moderation'
  comment_id uuid NULL → comment ON DELETE CASCADE      -- la respuesta (reply kinds)
  follow_id uuid NULL → user_follow ON DELETE CASCADE   -- follow kinds
  moderation_action_id uuid NULL → moderation_action ON DELETE CASCADE
  group_key text NOT NULL                               -- 'thread:<rootId>' | 'followers' | id propio
  created_at timestamptz NOT NULL DEFAULT now()
  read_at timestamptz NULL
  CHECK de coherencia: cada kind exige exactamente su referencia y prohíbe las otras;
        actor_id NOT NULL salvo en 'moderation'; actor_id <> recipient_id
notification_preference (user_id → app_user CASCADE, kind text, enabled boolean, PK (user_id, kind))
  CHECK kind IN ('comment_reply','thread_reply','new_follower','follow_accepted')   -- solo los desactivables
app_user.notifications_seen_at timestamptz NULL
```

Índices: `(recipient_id, created_at DESC)` para la página; parcial `(recipient_id) WHERE read_at IS NULL` para el
contador; únicos parciales para no duplicar: `(recipient_id, comment_id, kind)` y `(recipient_id, follow_id, kind)`.
Sin `updated_at` (la fila no se edita salvo `read_at`), así que no lleva trigger.

- **Retracción por cascada**: borrar una respuesta, dejar de seguir, rechazar / cancelar una solicitud, quitar un
  seguidor o bloquear (que borra el `user_follow`) borra la notificación sin código extra. Es el mismo principio del
  ADR 0009.
- **Re-seguir** tras dejar de seguir crea un `user_follow` nuevo y, por tanto, una notificación nueva. Se acepta: el
  único sujeto que puede repetirlo es el propio actor, y el agrupado diario lo reduce a una fila visible.
- **Moderación** no tiene actor visible: la acción la ejecuta un moderador, pero la bandeja no lo nombra (igual que la
  cola de moderación no se expone al usuario). El texto sale de `moderation_action.action` + el objetivo + `reason`.

### D3. Emisión: un servicio, dentro de la transacción

`src/services/notifications/emit.ts` expone `emitNotifications(tx, events)` y lo llaman los servicios fuente pasando
su `tx`. Así una acción que falla no deja notificación huérfana y una notificación no se pierde si la acción tuvo
éxito. Reglas que aplica el emisor (y solo él):

- nunca al propio actor; nunca si hay bloqueo entre actor y destinatario;
- respeta `notification_preference` (si el tipo está desactivado, no escribe — la preferencia mira hacia adelante);
- `ON CONFLICT DO NOTHING` sobre los únicos parciales.

Fuentes que pasan a usar transacción: `createReply`, `approveRequest`, `hideList` / `restoreList`,
`suspendSocialActivity`, `revokeSocialSuspension` (hoy hacen dos escrituras sueltas o una sola).

Destinatarios por evento:

| Evento | Tipo | Destinatario |
|---|---|---|
| Respuesta | `comment_reply` | autor de la raíz |
| Respuesta | `thread_reply` | autores distintos de respuestas visibles previas del hilo, sin el autor de la raíz ni el que responde (`INSERT … SELECT DISTINCT`) |
| `followUser` → accepted | `new_follower` | el seguido |
| `followUser` → pending | `follow_request` | el seguido |
| `approveRequest` | `follow_accepted` | quien pidió; además borra la `follow_request` del dueño |
| hide/restore comentario, reseña, lista | `moderation` | autor / dueño |
| suspender / revocar | `moderation` | `user_restriction.user_id` |

Si el autor de la raíz también respondió en el hilo, recibe solo `comment_reply` (prioridad sobre `thread_reply`).
El `followUser` que consolida un seguimiento mutuo pendiente no emite nada extra por la fila del otro.

### D4. Filtros en lectura

La lectura (contador, panel, página) une con `app_user` del actor y excluye:

- actores desactivados (`activeUserCondition()`), y bloqueos en cualquier dirección (los follow ya caen por cascada,
  las respuestas no);
- respuestas ocultas por moderación o cuya raíz está oculta;
- **excepción**: `moderation` siempre se muestra, aunque el contenido esté oculto (es justamente su asunto).

Filtrar en lectura (y no solo al emitir) hace que restaurar un contenido o desbloquear deje la bandeja coherente
sin reescribir filas. La suspensión social del destinatario no afecta su bandeja (`social-suspension`: conserva el
acceso personal).

### D5. Agrupación en lectura

Las filas se agrupan en la consulta por `(group_key, día local para 'followers', leído / no leído)`:

- `thread:<rootId>` reúne `comment_reply` y `thread_reply` del mismo hilo: "Ana y 3 personas más respondieron…".
- `followers` se parte por día en la zona de la cookie `tz` (`src/lib/time-zone.ts`, respaldo UTC).
- `follow_request`, `follow_accepted` y `moderation` usan su propio id como clave: nunca se agrupan (cada solicitud
  tiene sus botones; cada acción de moderación su motivo).

El grupo muestra hasta dos nombres más el resto como cifra, la fecha del evento más reciente y se ordena por ella;
la paginación es por cursor sobre `(max(created_at), group_key)`. Marcar como leído un grupo marca todas sus filas.

**Alternativa descartada — agrupar al escribir** (una fila con contador). Complica la retracción (borrar una
respuesta tendría que descontar) y pierde la cascada de D2.

### D6. Visto vs. leído

- **Contador** = grupos con filas no leídas y `created_at > notifications_seen_at`. Abrir la campana o la página hace
  `PUT /seen` y el contador vuelve a 0.
- **Leído** = por grupo, al abrir su destino o con "Marcar todas como leídas". Las no leídas se distinguen en la lista
  con un punto ámbar, no con negrita en toda la fila.
- Tope visible "9+". El contador se presenta como bandeja de entrada, nunca como logro.

### D7. Entrega: render del servidor + consulta periódica

El layout calcula el contador inicial (reemplaza a `countPendingFollowRequests` en el Header; la pantalla Red lo
sigue usando). En el cliente, `NotificationBell` usa TanStack Query sobre `GET /count` con `refetchInterval` de 60 s,
sin refetch en segundo plano y con refetch al recuperar el foco. Sin websockets ni SSE: no hay infraestructura para
ellos y un minuto de latencia es aceptable para avisos no urgentes. La consulta del contador usa el índice parcial de
no leídas.

### D8. UI

- **Escritorio (`lg`+)**: botón campana entre "Añadir" y el menú de usuario, con `aria-label` que incluye la cifra
  ("Notificaciones, 3 sin ver"). Abre un panel (no al pasar el cursor: a diferencia del menú, se abre solo con clic o
  teclado) con los últimos 10 grupos, "Marcar todas como leídas" y "Ver todas". `Escape` cierra y devuelve el foco;
  se cierra al navegar.
- **Móvil (< `lg`)**: la campana va en la fila superior, junto al botón del panel, y es un enlace a
  `/me/notifications` (un panel flotante en 375 px compite con el panel del Header).
- **Fila**: avatar del actor (o icono de moderación), texto con el objeto enlazado (artista del hilo, perfil), fecha
  relativa. `follow_request` lleva Aprobar / Rechazar en línea, que llaman a los endpoints existentes de
  `/api/me/follow-requests`; al resolverse, la fila desaparece (la `follow_request` cae por cascada o la borra
  `approveRequest`).
- **Página `/me/notifications`**: misma fila, paginación "Cargar más", estado vacío sobrio ("Aquí verás respuestas,
  seguidores y avisos de tu cuenta"), enlace a ajustes. Una sola sección en la Fase 1; la pestaña "Novedades" llega
  con la Fase 2.
- **Menú de usuario**: el ítem "Solicitudes" se queda pero pierde el badge (`badge` sale de
  `user-menu-items.ts` para la superficie `header` / `panel`; la pantalla Red lo conserva).
- Componentes en `src/components/notifications/`; textos en `messages/{es,en}` con plurales ICU.

### D9. Preferencias

Pantalla **Notificaciones** en `/me/settings/notifications`: un interruptor por tipo desactivable
(`comment_reply`, `thread_reply`, `new_follower`, `follow_accepted`), todos activados por defecto; solicitudes y
moderación se listan como fijas con su explicación. Solo se guardan filas para lo que difiere del defecto. La
exportación de datos incluye las preferencias; no incluye notificaciones (contienen nombres y textos de otras
personas, `account-lifecycle`).

### D10. Retención en código

Al servir `GET /api/me/notifications`, un `after()` borra las filas leídas del destinatario con más de 90 días y
cualquier fila con más de 180. Va en código y no en un script operativo para que no dependa de que alguien lo corra.

### D11. API

Todas con sesión (`AUTH_REQUIRED`), envueltas en `withErrorHandling`, validadas con Zod:

- `GET /api/me/notifications?cursor=` → `{ groups: NotificationGroup[], nextCursor }`
- `GET /api/me/notifications/count` → `{ unseen: number }`
- `PUT /api/me/notifications/seen` → `204`
- `POST /api/me/notifications/read` body `{ groupKeys: string[] } | { all: true }` → `204`
- `GET|PUT /api/me/notification-preferences` → `{ preferences: Record<kind, boolean> }`; un tipo no desactivable en el
  `PUT` → `VALIDATION_ERROR`.

## Risks / Trade-offs

- [Un servicio nuevo que lea o escriba `user_follow` / `comment` sin pasar por el emisor no notifica] → el emisor es
  el único punto; cada fuente lleva su prueba unitaria y el smoke recorre todas contra Postgres real.
- [Fan-out de `thread_reply` en hilos grandes] → un `INSERT … SELECT DISTINCT` acotado a los autores del hilo; los
  hilos son de un nivel y hoy cortos. Si aparece abuso, tope de destinatarios en una fase posterior.
- [Contador en cada render del layout] → índice parcial de no leídas; presupuesto < 10 ms medido en el smoke.
- [Consulta periódica cada 60 s con muchas pestañas abiertas] → sin refetch en segundo plano; endpoint de una sola
  cuenta indexada.
- [Quitar el badge del menú puede pasar desapercibido a quien lo usaba] → la campana muestra la solicitud con acciones;
  la pantalla Red conserva la cifra.
- [Re-seguir repetido genera filas] → únicos parciales por `follow_id` + agrupado diario; aceptado (D2).

## Migration Plan

1. `drizzle/0075_notifications.sql` (aditiva: dos tablas, una columna nula). Sin backfill: la bandeja empieza vacía;
   no se inventan notificaciones de eventos pasados. Las solicitudes pendientes anteriores siguen visibles en
   `/me/follow-requests` y en la pantalla Red.
2. Despliegue del código; la campana aparece con contador 0.
3. Rollback: revertir el código. La migración es aditiva y puede quedarse; si hace falta retirarla, un `0076` que
   borre tablas y columna.

## Open Questions

- Ninguna bloqueante. Para la Fase 2 queda decidir si los hitos de likes empiezan en 10 aunque la cifra pública se
  muestre desde 3 (decidido: sí, 10) y cómo se escalan después de 1000 (propuesta: 2500, 5000, 10000…).
