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

## Sección `/me/lists` — plan de diseño (propuesto, sin fase asignada)

Origen: plan de diseño de la sección `me/lists` (2026-09-05). `/me/lists` deja de ser "una
lista de listas" y pasa a ser un **apartado con navegación interna propia**. Nada de esto
está implementado ni comprometido; es el alcance objetivo y su backlog. Mantiene el mundo
visual vigente ("The Vinyl Listening Room", `DESIGN.md`) y los principios de producto (sin
gamificación, grafo social explícito, descubrimiento no algorítmico).

### Alcance objetivo de la sección

- **Sub-navegación** (ARIA tablist, patrón `PopularCommentsTabs`): **Mis listas · Guardadas ·
  Descubrir**. Estado de pestaña en la URL (`?tab=`) para que sea enlazable y sobreviva al
  reload. Encabezado y acción "Nueva lista" persisten entre pestañas.
- **Mis listas:** pared de tarjetas (grid 1-col mobile / 2-col ≥md) con **mosaico de portadas
  apiladas** (estilo pila de vinilos); fallback a la silueta de disco para listas de artistas
  y canciones. Toolbar contextual: búsqueda por texto, filtro por tipo de entidad y orden
  (recencia / alfabético). Creación por **compositor inline** arriba de la pared (reusa
  `ListForm`), sin cambiar de ruta.
- **Guardadas:** listas ajenas visibles que el usuario marcó. "Guardar" es un marcador
  privado; "Seguir" además hace que la actualización de esa lista aparezca en su feed. Una
  lista guardada que pasó a privada o quedó tras un bloqueo se muestra como "ya no
  disponible" y se puede quitar.
- **Descubrir:** listas públicas de la comunidad, orden cronológico/editorial explícito (no
  "para vos"). Muestra dueño (avatar + nombre → perfil), tipo, conteo de ítems y tiempo
  relativo.
- **Gestión en Mis listas:** menú por tarjeta (Editar · Audiencia · Eliminar), audiencia como
  pill con menú, y **"Fijar"** para subir listas favoritas propias arriba (más liviano que un
  orden manual total de listas en v1).
- **Detalle `/me/lists/[listId]`:** conserva URL y comportamiento; recibe pase visual
  (mosaico en cabecera, filas con carátula + disco de fallback, reordenamiento operable por
  teclado).
- La vista de perfil ajeno `/users/[username]/lists` hereda la tarjeta nueva.

### Dependencias de backend (requieren su propio change)

- Tabla `list_save` (`saver_id`, `list_id`, `following` bool, `created_at`) + endpoints +
  chequeo de visibilidad (lista guardada que se volvió privada o con bloqueo → 404 elegante).
- Evento de feed para actualización de lista **seguida** (extiende `kind: "list"` o uno
  nuevo) — coordinar con `add-feed-filters` y la matriz de visibilidad del feed.
- `listMyLists` / `listUserLists` / query de descubrimiento devuelven `itemCount` y
  `coverThumbs[]` (primeras 3–4 carátulas) por lista.
- Query paginada de listas públicas para Descubrir (orden `created_at` desc; orden por
  cantidad de guardados, diferido).
- Señal de "lista fijada": booleano / `pinned_at` en `user_list`.

### Decisiones abiertas

- Si "Duplicar / derivar lista" entra con la primera versión de la sección o después.
- Si el reordenamiento de ítems suma una dependencia de drag-and-drop (hoy ↑/↓ por teclado).
- Orden exacto de Descubrir y si alguna vez se expone públicamente el conteo de guardados
  (por defecto: privado, para no introducir una métrica de competencia).
- Si "Fijar" se modela en `user_list` o en una tabla aparte.

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