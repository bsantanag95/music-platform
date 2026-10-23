# ADR 0045 — Notificaciones in-app materializadas

## Estado

Aceptado (cambio `add-notifications-core`, 2026-10). Cierra el pendiente "Sin notificaciones en esta etapa" del
ADR 0030 (respuestas de un nivel) sin reescribirlo: la nota de por qué se materializan vive aquí. Extiende el
ADR 0011 (nada de colas ni eventos: todo ocurre dentro de la request) y se apoya en el ADR 0009 (borrado físico)
para la retracción.

## Contexto

Hasta ahora el único aviso era el badge de solicitudes pendientes del menú de usuario
(`countPendingFollowRequests`, calculado en el layout y pasado al Header). Eso deja cuatro huecos:

- Quien abre un tema en un artista no se entera de las respuestas hasta volver a la página. El ADR 0030 lo señaló
  como el principal motivo para priorizar las notificaciones y propuso **derivarlas en lectura** de
  `comment.parent_id`.
- Un perfil privado solo ve sus solicitudes en el badge del menú.
- Nadie sabe que alguien empezó a seguirle: el feed omite a propósito los eventos cuyo objetivo es el propio lector
  (`activity-feed.md`).
- Quien es moderado no recibe el motivo en ninguna parte.

Las fuentes de la Fase 1 ya existen y escriben de forma síncrona dentro de la request: `createReply`,
`followUser` / `approveRequest`, y las acciones de `src/services/moderation.ts` (que ya registran
`moderation_action`). El producto pide avisos **sin presión ni gamificación**, con las mismas reglas de privacidad
que el resto de las superficies sociales (bloqueos, cuentas desactivadas, contenido moderado, borrado físico).

## Decisión

1. **Una fila por evento, escrita en la misma transacción que la acción** (`notification`). No se derivan en lectura:
   con seis tipos el contador sería una unión de seis subconsultas en cada render, el estado leído necesitaría igual
   una tabla por evento, y la Fase 2 (hitos con fan-out, lanzamientos de artistas seguidos) no se puede derivar a
   costo razonable. Es la alternativa que el ADR 0030 dejó abierta; aquí se descarta y se registra por qué.
2. **Un único emisor** (`src/services/notifications/emit.ts`, `emitNotifications(tx, events)`). Los servicios fuente le
   pasan su transacción, así una acción que falla no deja una notificación huérfana y una que tiene éxito no la
   pierde. Solo el emisor aplica las reglas: nunca al propio actor, nunca si hay bloqueo entre actor y destinatario,
   respeta las preferencias del destinatario y usa `ON CONFLICT DO NOTHING` sobre los únicos parciales por evento.
3. **Retracción por cascada, no por código de limpieza.** Las referencias (`comment_id`, `follow_id`,
   `moderation_action_id`) llevan `ON DELETE CASCADE`: borrar una respuesta, dejar de seguir, rechazar o cancelar una
   solicitud, quitar un seguidor o bloquear (que borra el `user_follow`) borra su notificación sin lógica extra. Es el
   mismo principio del ADR 0009.
4. **Filtros en lectura, no solo al emitir.** La bandeja une con `app_user` del actor y excluye actores
   desactivados, bloqueos en cualquier dirección, respuestas ocultas o con la raíz oculta. La excepción es
   `moderation`, que se muestra aunque el contenido esté oculto (es justamente su asunto). Filtrar al leer hace que
   restaurar un contenido o desbloquear deje la bandeja coherente sin reescribir filas.
5. **Agrupación en lectura.** Se agrupa por `(group_key, día local para los seguidores, leído / no leído)`:
   `thread:<rootId>` reúne las respuestas del mismo hilo, `followers` se parte por día en la zona del usuario (cookie
   `tz`, respaldo UTC) y solicitudes, aceptaciones y moderación usan su propio id (nunca se agrupan). El grupo muestra
   hasta dos nombres más el resto como cifra y se pagina por cursor sobre `(max(created_at), group_key)`. Agrupar al
   escribir complicaría la retracción y perdería la cascada del punto 3.
6. **Visto distinto de leído.** El contador cuenta grupos con filas no leídas posteriores a
   `app_user.notifications_seen_at`; abrir la campana o la página hace `PUT /seen` y lo pone a cero. Cada entrada
   sigue sin leer hasta abrir su destino o "Marcar todas como leídas". Tope visible "9+".
7. **Entrega sin tiempo real.** El layout calcula el contador inicial en el servidor y el cliente lo refresca con
   TanStack Query cada 60 s, sin refetch en segundo plano, sobre el índice parcial de no leídas. No hay websockets ni
   SSE: no existe infraestructura para ellos y un minuto de latencia es aceptable para avisos no urgentes.
8. **Preferencias hacia adelante.** Solo se guardan filas que difieren del defecto (todo activado); la ausencia
   significa activado. `follow_request` y `moderation` no son desactivables. Desactivar un tipo no borra lo ya
   recibido.
9. **Retención en código.** Al servir `GET /api/me/notifications`, un `after()` borra las filas leídas con más de 90
   días y cualquier fila con más de 180, para no depender de que alguien corra un script.

## Alternativas consideradas

- **Derivarlas en lectura** (lo que sugería el ADR 0030 para las respuestas): válido para una fuente, inviable para
  seis tipos, el estado leído y las fases con fan-out.
- **Una tabla por tipo** (`comment_notification`, `follow_notification`…): duplica la lectura, la paginación, las
  preferencias y la retención; la bandeja tendría que unir todas en cada consulta.
- **Agrupar al escribir** (una fila con contador): complica la retracción (borrar una respuesta tendría que
  descontar) y pierde la cascada.
- **Tiempo real con websockets o SSE**: infraestructura nueva para avisos que no son urgentes.
- **Un script operativo de retención**: depende de que alguien lo corra; mejor en el camino de lectura que ya existe.
- **Correo o Web Push en esta fase**: quedan para la Fase 3; la tabla y el servicio ya los admiten como canales.

## Consecuencias

- La bandeja empieza vacía: no se inventan notificaciones de eventos pasados. Las solicitudes pendientes anteriores
  siguen visibles en `/me/follow-requests` y en la pantalla Red.
- Un servicio nuevo que escriba `user_follow` o `comment` sin pasar por el emisor no notificará. Cada fuente lleva su
  prueba unitaria y el smoke recorre todas contra Postgres real.
- El contador se calcula en cada render del layout autenticado: presupuesto de menos de 10 ms, medido en el smoke,
  sobre el índice parcial de no leídas.
- Quitar el badge de solicitudes del menú puede pasar desapercibido a quien lo usaba; la campana muestra la solicitud
  con sus acciones y la pantalla Red conserva la cifra.
- Re-seguir tras dejar de seguir genera una fila nueva; se acepta porque solo lo puede repetir el propio actor y el
  agrupado diario lo reduce a una entrada visible.
- El esquema es aditivo (dos tablas y una columna nula) y el rollback es revertir el código; retirarlo del todo es un
  `0076` que borre tablas y columna.
