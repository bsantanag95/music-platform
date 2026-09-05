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
- **Detalle `/me/lists/[listId]`:** conserva URL y comportamiento; pase visual (mosaico en
  cabecera, filas con carátula + disco de fallback, número de posición, reordenamiento ↑/↓
  por teclado).
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