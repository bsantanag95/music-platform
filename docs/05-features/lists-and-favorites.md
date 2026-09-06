# Listas y favoritos

**Fase:** 5 (roadmap). **Estado:** ✅ Implementado (cambio `add-favorites-and-lists`). Este
documento es la especificación de producto cerrada; el detalle de implementación vive en el
change de OpenSpec y en `04-api/contracts.md`.

## Favorito

- Señal simple de interés, sin escala numérica. Aplica a **artista, álbum (release group) y
  canción (recording)**.
- Es un toggle idempotente: un usuario tiene a lo sumo un favorito por objetivo; marcarlo de
  nuevo no duplica, y quitarlo cuando no existe no produce error.
- Tiene **audiencia propia** (`private`/`followers`/`public`, default `followers`),
  independiente de la escucha, la valoración y el comentario del mismo objetivo.
- No implica rating, comentario ni escucha; marcarlo no crea ni modifica ninguna de esas
  acciones.
- Se puede quitar. La audiencia se puede cambiar después de publicar.

## Sección `/me/favorites` (cambio `rework-favorites-section`)

**Estado:** ✅ Implementado. `/me/favorites` dejó de ser una lista plana de texto y pasa a ser
el **retrato personal del gusto**: la única vista completa y navegable de todo lo marcado.
Mantiene el mundo visual vigente ("The Vinyl Listening Room") y los principios de producto
(señal liviana sin escala, sin gamificación).

### Alcance de la sección

- **Superficie única, sin sub-navegación.** Deliberadamente no hay pestaña social de
  "favoritos de quienes seguís": ese descubrimiento ya lo cubren el feed y el perfil de cada
  persona. Favoritos es el espacio personal que contrapesa a la sección de listas.
- **Encabezado-retrato:** conteo de favoritos por tipo (`counts`) como dato, para orientar
  sin gamificar.
- **Muro agrupado por tipo** (artistas · álbumes · canciones), una sola consulta ordenada por
  rango de tipo y el cliente la parte en secciones. Tres tratamientos de ficha: **álbum** con
  carátula, **artista** con placa tipográfica (los artistas no exponen carátula), **canción**
  con la silueta de disco del sistema (las canciones tampoco). Nunca un rectángulo vacío.
- **Toolbar:** búsqueda por título del objetivo (`q`), filtro por tipo (`type`), filtro por
  audiencia (`audience`) y orden (`sort`: recencia / alfabético). Todo en servidor, sobre el
  conjunto completo. Mismo patrón que `/me/lists` y `/me/diary`.
- **Gestión de audiencia:** selector inline por ficha (usa el `PATCH` existente) y **cambio
  en lote** — un modo "Seleccionar" con casillas y una barra de acción fija que cambia la
  audiencia de las N seleccionadas de una vez. Cierra el hueco de que la audiencia solo se
  fijaba a `followers` al marcar y no se podía revisar desde ninguna parte.
- **Vista de perfil ajeno `/users/[username]/favorites`** hereda el muro en modo lectura (sin
  toolbar, sin edición de audiencia, sin selección).
- **API:** `GET /api/me/favorites` gana `q`/`type`/`audience`/`sort` y `counts`;
  `PATCH /api/me/favorites` acepta `{ ids: string[], audience }` además de `{ id, audience }`.
  Sin migraciones. Ver `docs/04-api/contracts.md`.

### Fuera de esta entrega

- Descubrimiento social de favoritos (feed y perfil ya lo cubren).
- Nota, texto libre, orden manual o "fijar" por favorito — eso es territorio de listas.
- Rediseño de `FavoriteButton` en las páginas de catálogo.
- Cualquier contador o insignia de "marcaste favorito pero no valoraste / no escuchaste".

## Listas

- Colección curada armada por un usuario, de **un solo tipo de entidad** por lista (solo
  artistas, solo álbumes o solo canciones).
- Primera versión de **propiedad de un único usuario** (no colaborativa).
- Campos: título obligatorio (≤100 caracteres), descripción opcional (≤500), `entityType` fijo
  al crear (no modificable), audiencia propia.
- Orden manual de elementos; un mismo objetivo aparece a lo sumo una vez por lista (agregar de
  nuevo es idempotente).
- El propietario puede agregar/quitar ítems, reordenarlos, editar título/descripción/audiencia
  y borrar la lista (borrado físico, elimina ítems en cascada).
- Visibilidad por audiencia; las listas ajenas se filtran por la matriz de visibilidad (bloqueos,
  perfil privado, relación de seguimiento).

## Decisiones cerradas (antes del cambio)

- Favorito en tres niveles (artista/álbum/canción) — contradice la definición anterior del
  `domain-model.md` ("solo artista"), corregida en el mismo cambio.
- Listas de un solo tipo de entidad (no mixtas en v1).
- Listas de propietario único (no colaborativas en v1).
- El feed incluye favoritos y eventos de listas (creación y actualización de metadatos, no por ítem).

## Lo que quedó fuera de esta entrega

- Listas mixtas y colaborativas.
- "Añadir a lista" dentro del editor como búsqueda de catálogo (la acción contextual en las
  páginas de artista/álbum/canción agrega el objetivo actual a una lista compatible).

## Sección `/me/lists` (cambio `rework-lists-section`)

**Estado:** ✅ Implementado, salvo la integración al feed de las listas seguidas (ver abajo).
`/me/lists` dejó de ser "una lista de listas" y pasa a ser un **apartado con navegación
interna propia**. Mantiene el mundo visual vigente ("The Vinyl Listening Room", `DESIGN.md`)
y los principios de producto (sin gamificación, grafo social explícito, descubrimiento no
algorítmico).

### Alcance de la sección

- **Sub-navegación** (ARIA tablist, patrón `PopularCommentsTabs`): **Mis listas · Guardadas ·
  Descubrir**. Estado de pestaña en la URL (`?tab=`) para que sea enlazable y sobreviva al
  reload. Encabezado y acción "Nueva lista" persisten entre pestañas.
- **Mis listas:** pared de tarjetas (grid 1-col mobile / 2-col ≥md) con **mosaico de portadas
  apiladas** (estilo pila de vinilos); fallback a la silueta de disco para listas de artistas
  y canciones. Toolbar contextual: búsqueda por texto, filtro por tipo de entidad y orden
  (recencia / alfabético). Creación por **compositor inline** arriba de la pared (reusa
  `ListForm`), sin cambiar de ruta.
- **Guardadas:** listas ajenas visibles que el usuario marcó (tabla `list_save`, PK
  `(saver_id, list_id)`). "Guardar" es un marcador privado; el guardado tiene además el eje
  `following`. Una lista guardada que pasó a privada o quedó tras un bloqueo se muestra como
  "ya no disponible" (`unavailable: true`) y se puede quitar, nunca se filtra en silencio.
- **Descubrir:** listas de audiencia `public` de perfiles `public`, excluyendo las propias y
  cualquier bloqueo, en orden cronológico descendente (no "para vos"). Muestra dueño (→
  perfil), tipo, conteo de ítems y tiempo relativo.
- **Gestión en Mis listas:** por tarjeta, Fijar/Desfijar · Editar (→ detalle) · Eliminar con
  confirmación. **"Fijar"** sube las listas propias favoritas arriba (tabla aparte
  `user_list_pin`, para no tocar `user_list.updated_at`); no es un orden manual total en v1.
- **Detalle `/me/lists/[listId]`:** en `rework-lists-section` recibió un pase visual (mosaico
  en cabecera, filas con carátula, número de posición, ↑/↓ por teclado). Reelaborado a fondo
  en `rework-list-detail` (ver la sección de más abajo): tres modos de vista, gestión interna
  de ítems y vista de lectura de lista ajena.
- La vista de perfil ajeno `/users/[username]/lists` hereda la tarjeta nueva (mosaico +
  conteo) y la acción Guardar/Seguir.
- **API:** `GET /api/me/lists` gana `q`/`entityType`/`sort`; nuevos `POST|DELETE
  /api/me/lists/{id}/pin`, `POST|GET /api/me/saved-lists`, `DELETE /api/me/saved-lists/{id}`,
  `GET /api/lists/discover`. Ver `docs/04-api/contracts.md`.

### Continuación pendiente: listas seguidas en el feed

El efecto de `following` sobre el feed de actividad —que la actualización de una lista
seguida aparezca en el feed de quien la sigue— se implementa en el cambio de continuación
**`add-followed-lists-to-feed`**, que modifica `activity-feed` (sexta fuente en la
composición bajo demanda + deduplicación por clave de evento). `following` ya se persiste y
se expone (`src/services/lists/saved-lists.ts`: `followedListIds`, `savedStateFor`).

### Decisiones abiertas

- Si "Duplicar / derivar lista" entra en una iteración posterior de la sección.
- Si el reordenamiento de ítems suma una dependencia de drag-and-drop (hoy ↑/↓ por teclado).
- Si alguna vez se expone públicamente el conteo de guardados (por defecto: privado, para no
  introducir una métrica de competencia).

### Ideas futuras (backlog, no comprometidas)

- **Listas rankeadas vs. sin orden:** toggle de presentación para mostrar la lista numerada
  (ranking) o como colección sin jerarquía. El orden manual de ítems ya existe; esto es solo
  cómo se presenta.
- **Temas / etiquetas de lista:** taxonomía ligera (p. ej. "por década", "shoegaze",
  "regalos") para agrupar las listas propias y para alimentar el filtrado de Descubrir sin
  recurrir a recomendación algorítmica.
- **Clonar / derivar una lista ajena:** partir de una lista pública como base de una lista
  propia, con atribución visible al autor original.
- **Listas colaborativas:** propiedad compartida entre varios usuarios (varios editores,
  reglas de permiso, resolución de orden). Explícitamente fuera de v1 del modelo de datos.
- **"Lista de la semana" / destacados de la comunidad:** curaduría editorial o por señal
  social agregada, mostrada en Descubrir. Debe evitar convertirse en ranking competitivo.
- **Nota por ítem dentro de una lista:** un campo corto por elemento ("por qué está acá"),
  visible en el detalle.
- **Portada elegible por el dueño:** en vez del mosaico automático, el dueño elige una
  carátula destacada o un tono como imagen de portada única de la lista. Refinamiento
  posterior del mosaico, no reemplazo.
- **Listas mixtas:** más de un tipo de entidad por lista (hoy: un solo tipo, decisión
  cerrada en `add-favorites-and-lists`).
- **Exportar / compartir fuera de la app:** enlace público con OpenGraph propio, export a
  texto plano.
- **Scrobbling → lista automática:** listas derivadas de la actividad ("lo más escuchado
  este mes"), condicionado a scrobbling automático (Fase 6) y sin caer en gamificación.

## Detalle de lista (cambio `rework-list-detail`)

**Estado:** ✅ Implementado. El detalle `/me/lists/[listId]` deja de ser una única
presentación fija y pasa a ser un apartado de **gestión interna** de los ítems ya agregados y
de lectura. Se agrega además la vista de lectura de una lista ajena, que no existía como
página. Mantiene el mundo visual vigente ("The Vinyl Listening Room") y los principios de
producto.

El **alta de ítems no se toca**: sigue siendo la acción contextual "Añadir a lista" de las
páginas de artista/álbum/canción. Se probó un buscador de catálogo embebido en el detalle y
se descartó (flujo confuso, búsqueda fría de MusicBrainz lenta, rodeo indirecto para
canciones al no existir búsqueda de `recording`).

### Alcance entregado

- **Tres modos de visualización de los ítems**, conmutables y aplicables por igual a listas
  de artistas, álbumes o canciones:
  - **Detallada:** fila con carátula, título, artista y controles de gestión.
  - **Índice:** filas de texto densas para escanear y reordenar listas largas.
  - **Gráfico:** pared de carátulas donde predomina lo visual.
  - La preferencia de modo es **global por visitante** (`localStorage`, sin tocar servidor
    ni afectar a otros), con `detailed` por defecto.
- **Gestión interna de ítems** para el propietario en los tres modos: reordenar (↑/↓ en
  Detallada e Índice, barra de selección en Gráfico), **mover al principio / al final** y
  quitar en dos pasos.
- **Gestión de metadatos:** "Editar" y "Eliminar lista" en un grupo discreto de la
  cabecera; `entityType` visible como dato de sólo lectura; línea de metadatos con
  audiencia, tipo, conteo, fecha y "Fijada".
- **Vista de lectura de lista ajena** `/<locale>/users/[username]/lists/[listId]`: mismo
  cuerpo de tres modos sin controles de gestión, atribución al dueño, tiempo relativo y la
  acción Guardar/Seguir. Cierra los enlaces que Descubrir, Guardadas, el feed, los perfiles
  e Inicio ya apuntaban ahí.
- **Carátula representativa para ítems de canción:** cada `recording` se enriquece con la
  carátula de un álbum representativo que la contiene, para que el modo Gráfico y el mosaico
  de la tarjeta no queden siempre como siluetas de disco.

Sin dependencias nuevas. Sin endpoints nuevos. Sin cambios de esquema.

### Fuera de alcance — cuándo conviene abordarlo

El criterio es el principio de producto "crecimiento por uso real": no se construye para una
escala o una necesidad que todavía no se observó.

**Por cercanía al cambio (pronto, riesgo bajo — completan lo recién entregado):**

- **Rating del autor inline en el modo Detallada:** mostrar la valoración del autor de la
  lista junto a cada ítem. ~1–1.5 unidades de trabajo, sin migración, reusa `FeedRatingMeter`
  y una función batch de ratings nueva (hoy `getRatings` es de a uno). Es lo más "Letterboxd"
  del backlog; buen candidato para la iteración siguiente.
- **Toggle rankeada / sin orden:** presentación de la lista como ranking numerado o como
  colección sin jerarquía. Pura presentación (interactúa con el badge de Nº del modo
  Gráfico). Gatillo: la primera lista sin jerarquía real ("shoegaze esencial", "regalos").
  Cuidar que no se lea como métrica competitiva.

**Por señal de usuarios (esperar un pedido concreto o evidencia de workaround manual):**

- **Nota por ítem** ("por qué está acá"): campo corto por elemento, visible en el detalle.
  Requiere columna nueva + API por ítem. Gatillo: descripciones de lista que en realidad
  hablan de ítems puntuales.
- **Portada elegible por el dueño:** en vez del mosaico automático, el dueño elige una
  carátula o un tono. Requiere columna nueva + selector. Gatillo: volumen de listas que haga
  ver el mosaico automático como genérico o repetido.
- **Duplicar / derivar una lista ajena** con atribución al autor original. Requiere semántica
  de copia + campo de procedencia. Gatillo: gente recreando a mano listas que vio en
  Descubrir; depende de que Descubrir tenga tráfico real.

  Nota: nota-por-ítem y portada-elegible tocan las tablas de listas — conviene una sola
  migración para los dos, no una cada uno.

**Por fricción medida (esperar dolor real y repetido; traen dependencia o backend grande):**

- **Drag-and-drop para reordenar:** reemplazaría ↑/↓ y la barra de selección. Suma
  dependencia y un costo alto de accesibilidad (DnD por teclado). Gatillo: quejas repetidas
  sobre ↑/↓ en listas de 30+ ítems. Es el que más conviene diferir.
- **Buscador de catálogo embebido en el detalle** (para agregar ítems sin ir a la página de
  catálogo): se implementó y se retiró por el flujo pobre. Volvería a tener sentido junto con
  un **endpoint de búsqueda de canciones** (búsqueda + ingesta de `recording` en MusicBrainz),
  que hoy no existe y obliga al rodeo álbum → tracklist. Backend real, cambio propio. Gatillo:
  pedidos concretos de agregar desde el editor.

**Regla:** el grupo 1 entra en la próxima iteración; el grupo 2 espera un pedido; el grupo 3
espera una métrica. Nunca "por las dudas". Y ninguno de estos debía entrar en
`rework-list-detail`: ya tenía 6 piezas y sumar más subía el riesgo de la entrega sin
acelerar el aprendizaje.

### Decisiones abiertas heredadas

- Si el reordenamiento suma drag-and-drop (hoy ↑/↓ + barra de selección) — ver arriba.
- El resto de decisiones abiertas de `rework-lists-section` sigue vigente.