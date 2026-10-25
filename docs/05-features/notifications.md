# Notificaciones

Bandeja de entrada in-app del usuario: respuestas, seguidores, avisos de moderación, hitos de su contenido y
lanzamientos de artistas que sigue, en un solo lugar. **Fase 1 implementada** (`add-notifications-core`, 2026-10) y
**Fase 2 implementada** (`add-notification-milestones-and-releases`, 2026-10; ADR 0046). La tabla, el servicio de
emisión y la UI están pensados para que la Fase 3 solo agregue canales.

## Principios de invasividad

- Solo **dentro de la aplicación**. Sin email, Web Push, avisos emergentes (toasts), sonido ni contador en el título
  de la pestaña en esta fase.
- El contador es una **bandeja de entrada**, nunca un logro: no hay rachas, medallas ni mensajes de presión
  (`vision.md`).
- **Visto** no es **leído**: abrir la campana o la página pone el contador a cero, pero cada entrada sigue marcada
  como no leída (punto ámbar) hasta que se abre su destino o se elige "Marcar todas como leídas". Las entradas
  sin destino que abrir (moderación) llevan su propio "Marcar como leída".
- Tope visible del contador: **9+**. Las novedades de artistas seguidos no suman a ese contador: la pestaña
  "Novedades" lleva un punto sin cifra.
- La bandeja no interrumpe: se actualiza sola cada 60 s sin recargar, y no hace peticiones mientras la pestaña está en
  segundo plano.

## Tipos de la Fase 1

Todos los avisos se dirigen a la persona, nunca a terceros, y nunca se emiten por una acción propia.

| Tipo | Cuándo | Destinatario | Agrupación | ¿Se puede desactivar? |
|---|---|---|---|---|
| `comment_reply` | Alguien responde al tema que abriste (directamente o a una de tus respuestas) | Autor de la raíz | Por hilo (`thread:<rootId>`) | Sí |
| `thread_reply` | Alguien responde en un hilo donde ya habías respondido | Autores previos de respuestas visibles, sin el autor de la raíz ni quien responde | Por hilo | Sí (activado por defecto) |
| `new_follower` | Alguien empieza a seguirte (perfil público) | El seguido | Por día, en tu zona horaria | Sí |
| `follow_request` | Alguien pide seguirte (perfil privado) | El dueño del perfil | Nunca | No |
| `follow_accepted` | Alguien acepta tu solicitud | Quien pidió | Nunca | Sí |
| `moderation` | Se oculta o restaura tu comentario, reseña o lista; se aplica o revoca tu suspensión social | Autor o dueño afectado | Nunca | No |
| `comment_like_milestone` | Un comentario tuyo llega a una cifra redonda de me gusta | Autor del comentario | Por comentario (`likes:<commentId>`) | Sí (activado) |
| `list_save_milestone` | Una lista o Camino tuyo llega a una cifra redonda de personas que lo guardaron | Dueño de la lista | Por lista (`saves:<listId>`) | Sí (desactivado) |
| `artist_release` | Un artista que sigues publicó un álbum o EP en los últimos 14 días | Sus seguidores activos | Por disco (`release:<rgId>`) | Sí (activado) |
| `artist_release_announced` | Un artista que sigues anunció un disco con fecha futura | Sus seguidores activos | Por disco (`announced:<rgId>`) | Sí (desactivado) |
| `artist_single` | Un artista que sigues publicó un sencillo | Seguidores que activaron el aviso | Por disco (`release:<rgId>`) | Sí (desactivado) |

### Hitos (`add-notification-milestones-and-releases`)

Los hitos avisan de un hecho propio, sin nombres ni actores: nunca dicen quién dio el like ni quién guardó.

- Escala de **me gusta** en un comentario: `10, 25, 50, 100, 500, 1000, 2500, 5000, 10000` y luego cada `10000`. La
  cifra pública se muestra desde 3, pero el aviso empieza en 10: 3 es cuándo se muestra el número, no cuándo vale la
  pena interrumpir.
- Escala de **guardados** de una lista o Camino: `1, 5, 10, 25, 50, 100, 500, 1000` y luego cada `1000`. El primero
  avisa porque guardar una lista es mucho más raro que dar un like.
- Solo se avisa el **hito más alto alcanzado**: un salto de 9 a 30 avisa 25, no 10 y 25.
- El hito se escribe en la misma transacción que el like o el guardado nuevo. Un re-like no cuenta, un unlike no
  retira el aviso y volver a dar like no lo repite.
- El conteo excluye cuentas desactivadas, igual que la cifra pública; al reactivar una cuenta, sus likes vuelven a
  contar para hitos futuros.

### Lanzamientos (`add-notification-milestones-and-releases`)

- La fuente es el **calendario de Inicio** (ADR 0029, ListenBrainz): no hay una segunda fuente ni requests extra.
  Después de reemplazar la ventana, la sincronización emite los avisos en una transacción propia; si fallan, el
  calendario ya quedó actualizado y la próxima sincronización lo reintenta.
- Álbum o EP con fecha en los últimos **14 días** → `artist_release`; fecha futura → `artist_release_announced`;
  sencillo en los últimos 14 días → `artist_single`. Una reedición o un disco con tipo secundario no genera aviso.
- Los destinatarios son las personas que siguen a **alguien acreditado como principal** en el disco, con cuenta
  activa y el tipo activado. El fan-out se resuelve en SQL y es idempotente: un aviso por persona, disco y tipo.
- Los **sencillos** solo se verifican y vinculan si alguien activó `artist_single` y sigue al artista. No entran al
  calendario ni al riel de Inicio, que siguen siendo de álbumes y EPs.
- El disco de un artista seguido se verifica y vincula **antes** que el resto de la cola, para que el tope de la
  sincronización no deje sin aviso a quien lo sigue.

Reglas comunes:

- Nunca se notifica a la persona por su propia acción.
- En los tipos con actor, no se emite nada si hay un **bloqueo** en cualquier dirección entre actor y destinatario. Los
  hitos y los lanzamientos no tienen actor: un like o un guardado de alguien bloqueado no llega a existir (la acción
  se rechaza antes) y un disco no pertenece a ninguna persona.
- La notificación nace y desaparece con su objeto: borrar la respuesta, el comentario, la lista, el disco, dejar de
  seguir, rechazar o cancelar una solicitud, quitar un seguidor, bloquear o eliminar la cuenta borra el aviso sin
  código de limpieza.
- Un tipo desactivado no escribe avisos nuevos; no borra los que ya existían.
- Los avisos de moderación muestran **acción, objeto y motivo**, nunca quién moderó.
- Los hitos y los lanzamientos tampoco exponen a nadie: no hay actor que mostrar.

## Privacidad de la lectura

La bandeja y el contador aplican las mismas reglas que el resto de las superficies sociales:

- Se excluye a los actores con la cuenta **desactivada**.
- Se excluye cualquier notificación entre personas con un **bloqueo** en cualquier dirección.
- Se excluyen las respuestas **ocultas** por moderación y las de una raíz oculta.
- Se excluye un hito de comentario si el comentario o su raíz dejaron de ser visibles, y un hito de lista si la lista
  dejó de ser visible para su dueño (privacidad, bloqueo).
- Se excluye un aviso de lanzamiento si el disco dejó de estar en el catálogo o quedó marcado como fuera de la
  discografía del artista.
- La única excepción es `moderation`, que se muestra aunque el contenido esté oculto: es justamente su asunto.
- Restaurar un contenido o desbloquear vuelve a mostrar los avisos que sigan existiendo, sin reescribir filas.

## Superficies

- **Campana del Header** (con sesión): entre "Añadir" y el menú de usuario en escritorio. Abre un panel con dos
  pestañas (`tablist`): **"Para ti"** (respuestas, seguidores, moderación e hitos) y **"Novedades"** (lanzamientos,
  anunciados y sencillos de artistas seguidos). "Novedades" lleva un punto sin cifra cuando hay entradas sin ver.
  Abrirla hace `PUT /seen?tab=releases` y apaga el punto sin marcar las entradas como leídas. El panel muestra las
  últimas 10 entradas de la pestaña activa, "Marcar todas como leídas" y "Ver todas". Se abre con clic o teclado
  (`Escape` cierra y devuelve el foco; también se cierra al navegar). Por debajo de `lg`, la campana va en la fila
  superior junto al botón del panel y es un enlace directo a `/me/notifications`.
- **Destino de cada entrada**: las respuestas llevan **al hilo** en la página del artista (`?thread=<rootId>`): el
  hilo se abre solo y se lleva a la vista; si la raíz no está en la primera página de comentarios se trae aparte
  (`GET /api/catalog/comments/{id}`) y se pone primera. Los seguimientos llevan al perfil de la persona. Un hito de
  comentario lleva a su hilo; uno de lista, a la lista o al Camino del dueño; un lanzamiento, a la página del disco.
  Los grupos de seguimiento nombran hasta dos personas y el resto como cifra ("Ana, Bruno y 3 personas más te
  empezaron a seguir"); los hitos y los lanzamientos no tienen personas.
- **Página `/me/notifications`**: mismas dos pestañas, lista paginada ("Cargar más"), "Marcar todas como leídas",
  enlace a los ajustes y estado vacío propio por pestaña. Sin sesión redirige al inicio de sesión.
- **Ajustes → Notificaciones** (`/me/settings/notifications`): un interruptor por tipo desactivable, agrupado en
  **"Para ti"** (respuestas, seguidores e hitos) y **"Novedades"** (discos, anunciados y sencillos). Solicitudes y
  moderación se listan como fijas con su explicación.
- **Solicitudes de seguimiento**: la fila de la bandeja lleva **Aprobar / Rechazar** y usa los mismos endpoints que
  `/me/follow-requests`; al resolverse, la fila desaparece. La pantalla Red conserva su contador de pendientes; el
  menú de usuario ya no lo repite.

## Retención

Al abrir la bandeja se borran las notificaciones **leídas** de más de **90 días** y cualquier notificación de más de
**180 días** de esa persona. Va en el camino de lectura, no en un proceso operativo que alguien deba recordar correr.

## Fases posteriores (decisiones ya tomadas)

- **Fase 2 — más tipos in-app**: hitos de likes de comentarios **sin nombres** y **crecientes** (10, 25, 50, 100,
  500, 1000…), aunque la cifra pública de likes se muestre desde 3; guardados de listas y Caminos, lista destacada;
  lanzamientos de artistas seguidos (**álbum y EP**; los sencillos como ajuste). Llega también la pestaña
  "Novedades" de la página.
- **Fase 3 — canales**: resumen por **email** y **Web Push**. Las preferencias por tipo se extienden a canales; la
  tabla y el servicio de emisión ya los admiten.

Fuera de alcance incluso en esas fases: respuestas o likes en reseñas, menciones `@usuario`, tiempo real
(websockets/SSE) y avisos de seguridad de la cuenta (inicio de sesión, cambio de email), que siguen por email.
