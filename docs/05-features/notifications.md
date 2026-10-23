# Notificaciones

Bandeja de entrada in-app del usuario: respuestas, seguidores y avisos de moderación en un solo lugar. **Fase 1
implementada** (`add-notifications-core`, 2026-10). La tabla, el servicio de emisión y la UI están pensados para que
las Fases 2 y 3 solo agreguen tipos y canales.

## Principios de invasividad

- Solo **dentro de la aplicación**. Sin email, Web Push, avisos emergentes (toasts), sonido ni contador en el título
  de la pestaña en esta fase.
- El contador es una **bandeja de entrada**, nunca un logro: no hay rachas, medallas ni mensajes de presión
  (`vision.md`).
- **Visto** no es **leído**: abrir la campana o la página pone el contador a cero, pero cada entrada sigue marcada
  como no leída (punto ámbar) hasta que se abre su destino o se elige "Marcar todas como leídas".
- Tope visible del contador: **9+**.
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

Reglas comunes:

- Nunca se notifica a la persona por su propia acción.
- No se emite nada si hay un **bloqueo** en cualquier dirección entre actor y destinatario.
- La notificación nace y desaparece con su objeto: borrar la respuesta, dejar de seguir, rechazar o cancelar una
  solicitud, quitar un seguidor, bloquear o eliminar la cuenta borra el aviso sin código de limpieza.
- Un tipo desactivado no escribe avisos nuevos; no borra los que ya existían.
- Los avisos de moderación muestran **acción, objeto y motivo**, nunca quién moderó.

## Privacidad de la lectura

La bandeja y el contador aplican las mismas reglas que el resto de las superficies sociales:

- Se excluye a los actores con la cuenta **desactivada**.
- Se excluye cualquier notificación entre personas con un **bloqueo** en cualquier dirección.
- Se excluyen las respuestas **ocultas** por moderación y las de una raíz oculta.
- La única excepción es `moderation`, que se muestra aunque el contenido esté oculto: es justamente su asunto.
- Restaurar un contenido o desbloquear vuelve a mostrar los avisos que sigan existiendo, sin reescribir filas.

## Superficies

- **Campana del Header** (con sesión): entre "Añadir" y el menú de usuario en escritorio. Abre un panel con las
  últimas 10 entradas, "Marcar todas como leídas" y "Ver todas". Se abre con clic o teclado (`Escape` cierra y
  devuelve el foco; también se cierra al navegar). Por debajo de `lg`, la campana va en la fila superior junto al
  botón del panel y es un enlace directo a `/me/notifications`.
- **Página `/me/notifications`**: lista paginada ("Cargar más"), "Marcar todas como leídas", enlace a los ajustes y
  estado vacío sobrio ("Aquí verás respuestas, seguidores y avisos de tu cuenta"). Sin sesión redirige al inicio de
  sesión.
- **Ajustes → Notificaciones** (`/me/settings/notifications`): un interruptor por tipo desactivable; solicitudes y
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
