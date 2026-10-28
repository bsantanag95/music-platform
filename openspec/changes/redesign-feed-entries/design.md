## Context

`groupFeedRuns` funde valoración + reseña + comentario contiguos del mismo autor y objetivo (`FeedOpinionRow`), barre
tramos de álbum de canciones y pliega corridas. `/me/feed` muestra `NetworkConvergence` encima del listado y la oculta
sin coincidencias en 7 días. `/activity` ya tiene un riel lateral (`ActivityContextRail`).

## Decisions

### D1. Fila por persona, disco y día

Opt-in (`albumDays`) que solo activa `variant="feed"`: Inicio y `/activity` → Siguiendo también son `variant="feed"`
y la reciben; el rastro propio no. Desde una entrada sobre un álbum (objetivo `release-group`) de tipo escucha,
favorito, valoración, reseña, comentario, colección o búsqueda, se toman las siguientes **estrictamente contiguas** de la
misma persona sobre el mismo álbum y el mismo día calendario (zona horaria de la app), a lo sumo una de cada tipo (un
tipo repetido corta). Hacen falta al menos dos y al menos una que no sea de opinión: con solo valoración, reseña y
comentario sigue la fila de opinión de siempre. Se evalúa antes que la opinión, el barrido y las corridas.

### D2. Anatomía

Misma celda y título que una fila de álbum. La línea de metadato lleva autor y fecha (la más reciente), sin verbo: los
chips lo dicen. Chips en este orden: valoración (estrellas compactas o `86/100`), favorito, escucha (su contexto y
reacción), colección (formato), búsqueda (formato o "cualquier formato"). Debajo: la reseña (tarjeta si `reviewCard`),
el comentario y la nota de escucha, en ese orden.

### D3. Convergencia con respaldo de 30 días

`getNetworkConvergence(viewerId, windowDays)`; la página pide 7 y, si no hay obras, 30. El título dice la ventana
("esta semana" / "este mes"). Umbral y tope sin cambios.

### D4. Quiénes más se movieron

`listMostActiveAuthors` reusa `listFeed` (mismas reglas de visibilidad) sobre las 50 entradas más recientes, cuenta las
de los últimos 7 días por persona y devuelve hasta cinco, de más a menos. Sin cifras: la muestra está acotada y una cifra
chica delata. Cada persona enlaza a `/me/feed?author=…`; `FeedList` lleva `key` con los filtros de la URL para
reiniciarse al navegar.

### D5. Riel

Desde `lg`, grilla `minmax(0,1fr) 280px` como `/activity`; el listado conserva su ancho de lectura. Por debajo, la
convergencia va encima del listado como hasta ahora y "Quiénes más se movieron" no se muestra (la franja de personas
ya cubre a la gente). Sin módulos con contenido, el riel no se renderiza.

### D6. Cierre del bloque "Nuevo"

`withDateSections` marca la primera sección de fecha que sigue a "new" (`afterNew`); el listado dibuja encima "Estás al
día" con una regla. Sin bloque "new", nada cambia.
