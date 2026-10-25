# Notificaciones

Bandeja de entrada in-app del usuario: respuestas, seguidores, avisos de moderación, hitos de su contenido, lanzamientos
de artistas que sigue y premios de esos artistas, en un solo lugar. **Fase 1 implementada** (`add-notifications-core`,
2026-10), **Fase 2 implementada** (`add-notification-milestones-and-releases`, 2026-10; ADR 0046) y **Fase 3
implementada en parte** (`add-notification-digest-and-awards`, 2026-10; ADR 0047): resumen semanal por **email** y
avisos de premios. Web Push queda en la Fase 6 del roadmap.

## Principios de invasividad

- Solo **dentro de la aplicación**, salvo el **resumen semanal por email**, que es opt-in, llega una vez por semana y
  solo con lo que la persona ya tenía sin leer. Sin avisos emergentes (toasts), sonido ni contador en el título de la
  pestaña.
- El contador es una **bandeja de entrada**, nunca un logro: no hay rachas, medallas ni mensajes de presión
  (`vision.md`).
- **Visto** no es **leído**: abrir la campana o la página pone el contador a cero, pero cada entrada sigue marcada
  como no leída (punto ámbar) hasta que se abre su destino o se elige "Marcar todas como leídas". Las entradas
  sin destino que abrir (moderación) llevan su propio "Marcar como leída".
- Tope visible del contador: **9+**. Las novedades de artistas seguidos no suman a ese contador: la pestaña
  "Novedades" lleva un punto sin cifra.
- La bandeja no interrumpe: se actualiza sola cada 60 s sin recargar, y no hace peticiones mientras la pestaña está en
  segundo plano.

## Tipos de aviso

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
| `artist_award_nomination` | Un artista que sigues recibe una nominación | Sus seguidores activos | Por ceremonia (`award:<ceremonyId>`) | Sí (activado) |
| `artist_award_win` | Un artista que sigues gana un premio o entra en un Salón de la Fama | Sus seguidores activos | Por ceremonia (`award:<ceremonyId>`) | Sí (activado) |

### Hitos (`add-notification-milestones-and-releases`)

Los hitos avisan de un hecho propio, sin nombres ni actores: nunca dicen quién dio el like ni quién guardó.

- Escala de **me gusta** en un comentario: `10, 25, 50, 100, 500, 1000, 2500, 5000, 10000` y luego cada `10000`. La
  cifra pública se muestra desde 3, pero el aviso empieza en 10: 3 es cuándo se muestra el número, no cuándo vale la
  pena interrumpir.
- Escala de **guardados** de una lista o Camino: `1, 5, 10, 25, 50, 100, 500, 1000` y luego cada `1000`. El primero
  avisa porque guardar una lista es mucho más raro que dar un like.
- Solo se avisa el **hito que cruza** el like o el guardado nuevo: un comentario que ya tenía 15 likes antes de que
  existieran los hitos (o con el aviso apagado) no recibe el 10 con retraso; su próximo aviso es el 25.
- El hito se escribe en la misma transacción que el like o el guardado nuevo. Un re-like no cuenta, un unlike no
  retira el aviso y volver a dar like no lo repite.
- El conteo excluye cuentas desactivadas, igual que la cifra pública; al reactivar una cuenta, sus likes vuelven a
  contar para hitos futuros.

### Lanzamientos (`add-notification-milestones-and-releases`)

- La fuente es el **calendario de Inicio** (ADR 0029, ListenBrainz): no hay una segunda fuente ni requests extra.
  Después de reemplazar la ventana, la sincronización emite los avisos en una transacción propia; si fallan, el
  calendario ya quedó actualizado y la próxima sincronización lo reintenta.
- Álbum o EP con fecha en los últimos **14 días** → `artist_release`; álbum o EP con fecha futura →
  `artist_release_announced`; sencillo en los últimos 14 días → `artist_single` (un sencillo por salir no se anuncia). Una reedición o un disco con tipo secundario no genera aviso.
- Los destinatarios son las personas que siguen a **alguien acreditado como principal** en el disco, con cuenta
  activa y el tipo activado. El fan-out se resuelve en SQL y es idempotente: un aviso por persona, disco y tipo.
- Los **sencillos** solo se verifican y vinculan si alguien activó `artist_single` y sigue al artista. No entran al
  calendario ni al riel de Inicio, que siguen siendo de álbumes y EPs.
- El disco de un artista seguido se verifica y vincula **antes** que el resto de la cola, para que el tope de la
  sincronización no deje sin aviso a quien lo sigue.

### Premios (`add-notification-digest-and-awards`)

- La fuente es la **carga de premios** (`scripts/load-awards.ts`, ADR 0032), no una consulta en vivo. Al terminar de
  escribir un premio, la carga emite los avisos de las ceremonias que tocó, en una transacción propia; un fallo al
  emitir se registra y **no** invalida la carga (los premios ya quedaron guardados).
- **La historia no avisa.** Solo emiten las ceremonias de **competencia** de los últimos **30 días** y las clases de
  **Salón de la Fama** del año en curso. Cargar `data/awards/` con años anteriores no dispara una avalancha de avisos.
  Un anuncio de ceremonias futuras emite nominaciones, nunca victorias.
- Una nominación avisa a quien sigue a **alguien acreditado**: el artista nominado directamente o el artista `primary`
  del disco o la canción nominados. Una victoria avisa a quien sigue a un **ganador**. Los Salones de la Fama solo
  emiten `artist_award_win` ("entró"), porque no tienen nominaciones.
- El aviso apunta a la **ceremonia**, nunca a la nominación: la carga reemplaza todas las nominaciones de una categoría
  cuando cambian, y un aviso que apuntara a una de ellas desaparecería en la recarga. El único parcial
  `(recipient_id, award_ceremony_id, kind)` hace idempotente la carga repetida.
- La fila no guarda a quién: al leer se calculan los artistas seguidos de esa ceremonia, cuántos son y cuántas
  nominaciones o premios suman. Una recarga que corrige nominaciones se refleja sin reescribir avisos; si ya no queda
  ningún artista seguido, la entrada no se muestra.
- Las **dos clases comparten una sola preferencia** (`artist_award`): la persona no elige por separado
  "nominaciones" y "premios". Una victoria y una nominación de la misma ceremonia se agrupan en **una entrada**, y la
  agregación prefiere la victoria.

Reglas comunes:

- Nunca se notifica a la persona por su propia acción.
- En los tipos con actor, no se emite nada si hay un **bloqueo** en cualquier dirección entre actor y destinatario. Los
  hitos, los lanzamientos y los premios no tienen actor: un like o un guardado de alguien bloqueado no llega a existir
  (la acción se rechaza antes) y un disco o una ceremonia no pertenecen a ninguna persona.
- La notificación nace y desaparece con su objeto: borrar la respuesta, el comentario, la lista, el disco o la
  ceremonia, dejar de seguir, rechazar o cancelar una solicitud, quitar un seguidor, bloquear o eliminar la cuenta
  borra el aviso sin código de limpieza.
- Un tipo desactivado no escribe avisos nuevos; no borra los que ya existían.
- Los avisos de moderación muestran **acción, objeto y motivo**, nunca quién moderó.
- Los hitos, los lanzamientos y los premios tampoco exponen a nadie: no hay actor que mostrar.

## Privacidad de la lectura

La bandeja y el contador aplican las mismas reglas que el resto de las superficies sociales:

- Se excluye a los actores con la cuenta **desactivada**.
- Se excluye cualquier notificación entre personas con un **bloqueo** en cualquier dirección.
- Se excluyen las respuestas **ocultas** por moderación y las de una raíz oculta.
- Se excluye un hito de comentario si el comentario o su raíz dejaron de ser visibles, y un hito de lista si la lista
  dejó de ser visible para su dueño (privacidad, bloqueo).
- Se excluye un aviso de lanzamiento si el disco dejó de estar en el catálogo o quedó marcado como fuera de la
  discografía del artista.
- Se excluye un aviso de premio si la ceremonia ya no tiene ningún artista seguido con nominación o victoria visibles
  (una recarga que corrige las nominaciones puede vaciarlo).
- La única excepción es `moderation`, que se muestra aunque el contenido esté oculto: es justamente su asunto.
- Restaurar un contenido o desbloquear vuelve a mostrar los avisos que sigan existiendo, sin reescribir filas.

## Resumen semanal por email (`add-notification-digest-and-awards`)

El resumen es **opt-in** y llega **una vez por semana** (lunes). No es un canal nuevo de avisos: es el mismo
contenido de la bandeja, sin leer, redactado con los mismos textos de la app.

- **Qué incluye.** Solo entradas **no leídas** cuyo evento más reciente cae en la ventana desde el último envío (o
  desde hace 7 días, si nunca se envió) hasta ahora, en dos secciones —"Para ti" y "Novedades"— de hasta **8 entradas**
  cada una, con "y N más" y un enlace a la bandeja. Los premios de artistas seguidos entran en "Novedades".
- **Una semana vacía no se envía** y no mueve la marca del último envío, así que la siguiente corrida sigue mirando la
  misma ventana.
- **Requisitos para recibirlo**: resumen activo (`app_user.notification_digest_enabled`), email **verificado**, cuenta
  **activa** y que la marca del último envío sea anterior al **lunes 00:00 UTC** de la semana en curso. Activar el
  resumen sin email verificado responde `409 EMAIL_NOT_VERIFIED`. Si el email cambia y queda sin verificar, el envío se
  salta sin apagar la preferencia: al verificar el nuevo, vuelve a llegar.
- **Idempotencia.** `scripts/send-notification-digests.ts` (con `--dry-run`) toma un lock de asesoría
  `notification-digest`: si otra corrida está en curso, sale sin hacer nada. La marca del último envío se escribe
  **después** de que el transporte acepta el mensaje; un fallo de una persona se registra y no corta el lote ni mueve
  su marca, así que la corrida siguiente lo reintenta. Se envía en serie con una pausa mínima
  (`DIGEST_SEND_INTERVAL_MS`).
- **Transporte.** Resend por HTTP (`src/services/email/resend-transport.ts`, ADR 0047); `EMAIL_TRANSPORT=resend` exige
  `RESEND_API_KEY` y `EMAIL_FROM` o falla cerrado. El adaptador de consola sigue prohibido en producción.
- **Baja en un clic.** Cada resumen lleva un enlace a `/<locale>/notifications/unsubscribe?token=…` y las cabeceras
  `List-Unsubscribe` / `List-Unsubscribe-Post` (RFC 8058). El token es un HMAC-SHA256 con
  `EMAIL_UNSUBSCRIBE_SECRET`, **no expira** y solo apaga el resumen. El `POST` del cliente de correo da de baja sin
  sesión; el `GET` de la página solo pide confirmar, porque un escáner de enlaces abre el correo y no debe dar de baja
  a nadie. Un token inválido responde `400 INVALID_UNSUBSCRIBE_TOKEN` sin distinguir si la cuenta existe.
- **Sin presión.** El asunto es neutro y lleva solo la cifra de entradas; no hay rachas, días sin entrar ni "te estás
  perdiendo". El resumen expone solo lo que la persona ya ve en la bandeja.

## Superficies

- **Campana del Header** (con sesión): entre "Añadir" y el menú de usuario en escritorio. Abre un panel con dos
  pestañas (`tablist`): **"Para ti"** (respuestas, seguidores, moderación e hitos) y **"Novedades"** (lanzamientos,
  anunciados, sencillos y premios de artistas seguidos). "Novedades" lleva un punto sin cifra cuando hay entradas sin
  ver. Abrirla hace `PUT /seen?tab=releases` y apaga el punto sin marcar las entradas como leídas. El panel muestra las
  últimas 10 entradas de la pestaña activa, "Marcar todas como leídas" y "Ver todas". Se abre con clic o teclado
  (`Escape` cierra y devuelve el foco; también se cierra al navegar). Por debajo de `lg`, la campana va en la fila
  superior junto al botón del panel y es un enlace directo a `/me/notifications`.
- **Destino de cada entrada**: las respuestas llevan **al hilo** en la página del artista (`?thread=<rootId>`): el
  hilo se abre solo y se lleva a la vista; si la raíz no está en la primera página de comentarios se trae aparte
  (`GET /api/catalog/comments/{id}`) y se pone primera. Los seguimientos llevan al perfil de la persona. Un hito de
  comentario lleva a su hilo; uno de lista, a la lista o al Camino del dueño; un lanzamiento, a la página del disco;
  un premio, a la ceremonia (`/awards/<slug>/<year>`) o a la clase del Salón de la Fama
  (`/hall-of-fame/<slug>/<year>`). Los grupos de seguimiento nombran hasta dos personas y el resto como cifra ("Ana,
  Bruno y 3 personas más te empezaron a seguir"); los hitos, los lanzamientos y los premios no tienen personas.
- **Página `/me/notifications`**: mismas dos pestañas, lista paginada ("Cargar más"), "Marcar todas como leídas",
  enlace a los ajustes y estado vacío propio por pestaña. Sin sesión redirige al inicio de sesión.
- **Ajustes → Notificaciones** (`/me/settings/notifications`): un interruptor por tipo desactivable, agrupado en
  **"Para ti"** (respuestas, seguidores e hitos) y **"Novedades"** (discos, anunciados, sencillos y "Premios de
  artistas que sigues", una sola clave para nominaciones y victorias). Solicitudes y moderación se listan como fijas
  con su explicación. La sección **"Por email"** lleva el interruptor del **resumen semanal**; sin email verificado
  queda deshabilitado y enlaza a `/me/settings/account`.
- **Página `/notifications/unsubscribe`**: la única superficie de notificaciones **sin sesión**. Valida el token en el
  `GET` y solo el botón hace el `POST`; muestra confirmación, hecho o enlace inválido, y enlaza a los ajustes y al
  inicio.
- **Solicitudes de seguimiento**: la fila de la bandeja lleva **Aprobar / Rechazar** y usa los mismos endpoints que
  `/me/follow-requests`; al resolverse, la fila desaparece. La pantalla Red conserva su contador de pendientes; el
  menú de usuario ya no lo repite.

## Retención

Al abrir la bandeja se borran las notificaciones **leídas** de más de **90 días** y cualquier notificación de más de
**180 días** de esa persona. Va en el camino de lectura, no en un proceso operativo que alguien deba recordar correr.

## Fases posteriores (decisiones ya tomadas)

- **Fase 2 — más tipos in-app** (implementada): hitos de likes de comentarios **sin nombres** y **crecientes** (10,
  25, 50, 100, 500, 1000…), aunque la cifra pública de likes se muestre desde 3; guardados de listas y Caminos, lista
  destacada; lanzamientos de artistas seguidos (**álbum y EP**; los sencillos como ajuste). Llegó también la pestaña
  "Novedades" de la página.
- **Fase 3 — canales** (implementada en parte): resumen semanal por **email** (opt-in, lunes, baja en un clic) y
  avisos de **premios** de artistas seguidos (nominaciones y victorias en la misma preferencia). **Web Push** queda en
  la Fase 6 del roadmap: requiere service worker, manifest y una decisión de permisos que el producto todavía no tomó;
  la tabla y el servicio de emisión ya lo admiten como canal.

Fuera de alcance incluso en esas fases: respuestas o likes en reseñas, menciones `@usuario`, tiempo real
(websockets/SSE) y avisos de seguridad de la cuenta (inicio de sesión, cambio de email), que siguen por email.
