## Why

El detalle de una lista (`/me/lists/[listId]`) quedó como la parte menos trabajada de la
sección de listas: una única presentación fija de los ítems, edición de metadatos escondida y
mal ubicada, y sin forma de agregar elementos sin salir a las páginas de catálogo. Además, la
vista de lectura de una lista ajena —a la que enlazan Descubrir, Guardadas, el feed, los
perfiles e Inicio— **nunca se construyó como página**: hoy esos enlaces caen en "no
encontrado". Este cambio cierra ese hueco y convierte el detalle en un apartado de gestión y
lectura a la altura del resto de la sección.

## What Changes

- **Tres modos de visualización de los ítems**, conmutables y aplicables por igual a listas de
  artistas, álbumes o canciones:
  - **Detallada**: fila con carátula, título, artista y controles de gestión.
  - **Índice**: filas de texto densas para escanear y reordenar rápido.
  - **Gráfico**: pared de carátulas donde predomina lo visual.
  - La preferencia de modo se recuerda **por visitante, global**, en `localStorage` (default
    `detallada`).
- **Gestión de ítems ampliada** para el propietario: reordenar en los tres modos (↑/↓ en
  Detallada e Índice, **barra de selección** en Gráfico), "mover al principio / al final", y
  **agregar elementos desde el propio detalle**:
  - Listas de artistas y de álbumes: buscador de catálogo embebido (reusa
    `GET /api/catalog/search`).
  - Listas de canciones: buscar un álbum y elegir pistas de su tracklist (reusa
    `GET /api/catalog/release-group/{id}`). Sin endpoint nuevo.
- **Gestión de metadatos** más clara: "Editar" y "Eliminar lista" en un grupo discreto de la
  cabecera; panel de edición con el lenguaje de `ListForm`; `entityType` visible como dato de
  sólo lectura; línea de metadatos con audiencia, tipo, conteo, fecha y estado "Fijada".
- **Vista de lectura de lista ajena**: nueva página `/<locale>/users/[username]/lists/[listId]`
  con el mismo cuerpo de tres modos (sin controles de gestión), atribución al dueño, tiempo
  relativo y la acción Guardar/Seguir. Cierra los enlaces muertos.
- **Carátula representativa para ítems de canción**: los ítems de tipo `recording` se
  enriquecen con la carátula de un álbum representativo, para que el modo Gráfico y el mosaico
  no queden siempre como siluetas de disco.
- **Documentación del backlog**: se registra en `docs/05-features/lists-and-favorites.md` todo
  lo que queda explícitamente fuera de alcance, con el criterio de cuándo conviene abordarlo.

Sin dependencias nuevas. Sin cambios en contratos REST existentes (sólo nuevo consumo de
endpoints ya publicados).

## Capabilities

### New Capabilities

Ninguna. Todo el comportamiento nuevo pertenece a la capacidad `lists` existente.

### Modified Capabilities

- `lists`: se amplía **Agregar y quitar ítems** (alta desde el detalle con búsqueda de
  catálogo); se amplía **Orden manual de la lista** (afordancias de reordenamiento en cada
  modo de presentación, incluida la barra de selección del modo Gráfico y "mover al
  principio/al final"); se amplía **Listas ajenas visibles** (el detalle de una lista visible
  ajena es ahora una página renderizada, no sólo un contrato de API); se **añade** el
  requisito de **modos de visualización del detalle** y el de **carátula representativa para
  ítems de canción**.

## Impact

- **Rutas nuevas**: `src/app/[locale]/users/[username]/lists/[listId]/page.tsx`.
- **Componentes**: `ListDetail` se parte en cabecera + vista de ítems con conmutador y tres
  renderers, compartida entre propietario y visitante vía una prop de capacidad de gestión;
  nuevo hook `useListViewMode`; nuevo componente de búsqueda/alta embebida.
- **Servicios**: `src/services/lists/lists.ts` — `listItems` agrega `artistName` para álbum y
  canción y una carátula representativa para canción; el servicio de detalle de lista ajena
  reusa la matriz de visibilidad existente.
- **Esquemas/validación**: `UserListItemSchema.target` puebla `artistName` (ya opcional) y
  `coverThumbUrl` para canciones; sin campos nuevos obligatorios.
- **APIs**: sin endpoints nuevos. Nuevo consumo de `GET /api/catalog/search`,
  `GET /api/catalog/release-group/{id}` y `GET /api/users/{username}/lists/{listId}` desde el
  cliente.
- **i18n**: nuevas claves ES/EN para modos de vista, búsqueda/alta de ítems, tracklist,
  barra de selección del modo Gráfico e ítem no disponible.
- **Documentación**: `docs/05-features/lists-and-favorites.md` (alcance + backlog),
  `docs/04-api/contracts.md` si cambia algún ejemplo de respuesta de listas.
- **Sin tocar**: modelo de datos de listas y `user_list.updated_at` (trigger), reglas de
  audiencia, sección `/me/lists`, feed de actividad.
