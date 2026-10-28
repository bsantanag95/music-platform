## Context

`/me/feed` (tras la Fase 1) filtra por `q`, `kind` y `author` en la URL, con selects. `/activity` tiene `KindChips`
local a `CommunityActivitySection`. Las notificaciones guardan su marca de "visto" como columnas de `app_user`
(`notifications_seen_at`, `notifications_releases_seen_at`).

## Decisions

### D1. Marca de última visita en `app_user.feed_seen_at`

Mismo patrón que las notificaciones: una columna nula en `app_user` (nula = nunca abrió el feed). Se descartó una tabla
aparte: es un dato por persona, sin historia.

### D2. Se marca al abrir, desde el cliente

La página lee la marca anterior en el servidor y la pasa al listado; al montarse, el listado llama a
`PUT /api/me/feed/seen`. Marcar en el render del servidor movería la marca con un prefetch que la persona nunca vio.
Recargar la página hace desaparecer el bloque de novedades: es lo esperado de una marca de visita.

### D3. Primera visita sin novedades

Sin marca anterior no hay bloque "Nuevo" ni puntos: todo sería nuevo y el bloque no diría nada.

### D4. Punto por persona acotado

Quién tiene novedades se calcula con la misma composición del feed (mismas reglas de audiencia, perfil y bloqueo):
`listFeed` con las 50 entradas más recientes, quedándose con los autores de las posteriores a la marca. Una persona
cuya única novedad está más allá de esas 50 no lleva punto; se acepta a cambio de no duplicar las reglas de visibilidad.

### D5. Franja de personas

Botones con `aria-pressed` (avatar de 40 px, nombre recortado, punto con texto para lectores). Orden: con novedades
primero y luego alfabético. Una sola fila con desplazamiento horizontal en todos los anchos. Elegir a la persona activa
otra vez vuelve a "Todas". `author` en la URL sigue siendo el nombre de usuario.

### D6. Chips compartidos

`KindChips` sale de `CommunityActivitySection` a `FeedKindChips` (mismo aspecto). `/me/feed` muestra los nueve tipos
en orden de uso: Escuchas, Valoraciones, Reseñas, Comentarios, Favoritos, Colección, En búsqueda, Listas, Para completar.

### D7. Bloque "Nuevo"

`withDateSections` acepta `newSince`: las filas posteriores van bajo "Nuevo desde tu última visita" y el resto sigue con
los bloques de fecha. Una fila agrupada usa la fecha de su entrada más reciente, como hoy.
