## Context

El detalle de lista (`src/components/lists/ListDetail.tsx`) hoy: cabecera con mosaico + título
+ botón Editar, panel de edición inline (título/descr./audiencia), y una lista de ítems con
una única presentación (fila con carátula de 44px, número, ↑/↓ y "Quitar"). El botón "Eliminar
lista" está mal ubicado junto al encabezado "Elementos". No hay forma de agregar ítems desde
acá: el alta ocurre sólo desde las páginas de catálogo (`AddToListButton`).

Hueco detectado: la ruta `/<locale>/users/[username]/lists/[listId]` **no existe como página**
aunque la API (`GET /api/users/[username]/lists/[listId]`) y el cliente (`getUserListDetail`)
sí. Enlazan a ella `DiscoverListsTab`, `SavedListsTab`, `FeedActivityList`, `PublicLists` y
`ListsList` — todos esos clics caen hoy en `[...unknown]`.

Datos disponibles por ítem (`UserListItemSchema.target` = `FavoriteTargetInfoSchema`): `id`,
`title`, `artistName?` (opcional, hoy sólo lo puebla el feed), `coverThumbUrl`. El servicio
`listItems` en `lists.ts` arma `title`/`coverThumbUrl` a mano por tipo: para `release_group`
usa la carátula del release group; para `artist` y `recording` no hay carátula. `artistName`
no se puebla en el detalle.

Restricciones del proyecto: Server Components para carga inicial; TanStack Query sólo para
interacción post-render; todo HTTP por `apiFetch`; errores por `ApiError.code`; Zod en todas
las respuestas; sin dependencias nuevas sin justificación; `updated_at` sólo por trigger;
mundo visual "The Vinyl Listening Room" (sin sombras, ámbar ≤10%, silueta de disco como
placeholder, tríada tipográfica).

## Goals / Non-Goals

**Goals:**
- Tres modos de visualización de ítems (Detallada / Índice / Gráfico) conmutables, con
  preferencia global por visitante.
- Gestión interna de ítems desde el detalle: reordenar en los tres modos, mover a extremos,
  quitar.
- Cabecera de gestión de metadatos más clara.
- Página de lectura de lista ajena que cierra los enlaces muertos.
- Ítems de canción con carátula representativa.
- Backlog fuera de alcance documentado con criterio de priorización.

**Non-Goals:**
- **Alta de ítems desde el detalle.** El alta sigue en las páginas de catálogo
  (`AddToListButton`). Se evaluó un buscador embebido y se descartó (ver decisión 4).
- Rating del autor inline por ítem (documentado, iteración siguiente).
- Nota por ítem, toggle rankeada/sin-orden, portada elegible por el dueño, duplicar lista.
- Drag-and-drop (se mantiene ↑/↓ + barra de selección; sin librería nueva).
- Cambios en el modelo de datos, en la sección `/me/lists` o en el feed.

## Decisions

### 1. Un solo cuerpo compartido propietario/visitante

`ListDetail` se parte en:
- `ListDetailHeader` — título, metadatos, y (si `canManage`) el grupo Editar/Eliminar + panel
  de edición; si es visitante, atribución al dueño + tiempo relativo + `SaveListButton`.
- `ListItemsView` — el conmutador de modo + el renderer activo (`ItemsDetailed` /
  `ItemsIndex` / `ItemsGraphic`). Recibe `items`, `entityType`, `canManage` y callbacks de
  gestión (`onReorder`, `onRemove`, `onMoveToEdge`). En modo visitante los callbacks no se
  pasan y los renderers no muestran controles.

**Por qué:** evita duplicar tres renderers entre dos páginas. La alternativa (dos árboles de
componentes) multiplicaba la superficie de i18n y de pruebas.

### 2. Preferencia de modo: `localStorage` global, no por lista, no servidor

Hook `useListViewMode()` → `["detailed"|"index"|"graphic", setMode]`. Clave
`music-platform:list-view-mode`. Lee en `useEffect` tras el montaje; SSR y primer render usan
`"detailed"`. Escrituras y lecturas envueltas en `try/catch` (modo privado, storage
bloqueado).

**Por qué global y no por lista:** decisión del usuario; es una preferencia de cómo le gusta
leer listas, no un atributo de cada lista. Por lista exigiría persistirlo en algún lado (BD o
storage con muchas claves) sin beneficio claro.

**Por qué no servidor:** no hay identidad para el visitante anónimo que igual ve listas
públicas; evita una columna y una request. Coste: un frame de reconciliación Detallada →
(modo guardado) al hidratar. Aceptable — el contenido es el mismo, sólo cambia el layout, y
no se anima con `prefers-reduced-motion`.

### 3. Reordenar sin drag-and-drop

- Detallada e Índice: botones ↑/↓ (como hoy) + acciones "al principio"/"al final".
- Gráfico: seleccionar un tile (un `button` que envuelve la carátula) activa una **barra de
  acciones** sobre la cuadrícula: Subir · Bajar · Al principio · Al final · Quitar · Listo. La
  selección se anuncia por `aria-live`.
- Todas las afordancias terminan llamando a `reorderListItems(listId, itemIds)` con el orden
  completo — la operación de servidor no cambia.

**Alternativa descartada:** `@dnd-kit` (u otra). DnD accesible por teclado es caro de hacer
bien y suma dependencia. Se difiere hasta que la fricción de ↑/↓ en listas largas sea un
pedido real y medido (ver backlog).

### 4. Agregar ítems desde el detalle — descartado

Se implementó un buscador de catálogo embebido en el detalle (`ListItemSearch`) y se retiró
tras probarlo: para álbumes/artistas reusaba `GET /api/catalog/search`; para canciones, como
el catálogo no busca `recording`, obligaba a buscar un álbum y elegir pistas de su tracklist
(`getReleaseGroupDetail`). El flujo resultó confuso y poco fiable en la práctica (búsqueda
fría de MusicBrainz lenta, rodeo indirecto para canciones).

**Decisión:** el detalle sirve sólo para la **gestión interna** de los ítems ya agregados. El
alta sigue siendo la acción contextual "Añadir a lista" de las páginas de artista/álbum/
canción (`AddToListButton`), que ya existe y no se toca. Un buscador de catálogo dentro del
editor —o un endpoint de búsqueda de canciones que lo haría viable— queda como backlog, no
comprometido.

### 5. Enriquecimiento de datos en `listItems`

`listItems(listId)` pasa a:
- Poblar `artistName` para ítems de `release_group` (artista del release group) y de
  `recording` (artista de la grabación). Ya se hace el `leftJoin` a `artist`.
- Para `recording`: subconsulta de una carátula representativa — el `coverThumbUrl` de
  cualquier `release_group` que contenga esa grabación y tenga carátula (p. ej. el más
  antiguo, o el primero por `mbid`). Un `leftJoin` lateral acotado; si no hay, queda `null`.

`serializeDetail` ya deriva `coverThumbs` de `items[].target.coverThumbUrl`, así que las
listas de canciones pasan a tener mosaico real sin tocar esa función. `UserListItemSchema` no
cambia (los campos ya son opcionales/nullable). Se actualiza `docs/04-api/contracts.md` si
algún ejemplo de respuesta lo amerita.

**Riesgo de coste:** la subconsulta de carátula por ítem de canción. Mitigación: una sola
consulta con `DISTINCT ON`/agregación sobre `recording_release_group` (o la tabla puente
equivalente) uniendo por `listId`, no N consultas. Índices existentes sobre la puente.

### 6. Página de lectura de lista ajena

`src/app/[locale]/users/[username]/lists/[listId]/page.tsx` — Server Component:
`await params`, valida `listId` uuid → `notFound()`, resuelve visitante con
`requirePageUser()` (o el patrón de página pública si aplica), llama al servicio de detalle
ajeno que ya aplica la matriz de visibilidad, `catch → notFound()`. Renderiza
`ListDetailHeader` + `ListItemsView` con `canManage={false}`.

**Por qué reusar el servicio existente:** `getUserListDetail`/su servicio ya filtra por
audiencia, bloqueo y relación. No se reimplementa nada de visibilidad.

### 7. El conmutador de modo

Grupo de tres opciones (`role="radiogroup"` + `role="radio"`, o `button` con `aria-pressed`),
navegable con flechas, en la cabecera de la sección de ítems, enfrentado a "Elementos (N)".
Etiquetas mono (`IBM Plex Mono`) en ≥sm; sólo icono con `sr-only` en <sm. Foco visible 2px
ámbar (heredado). El único uso de ámbar en reposo es el estado activo — dentro de la Regla de
Rareza.

## Risks / Trade-offs

- **Flash de reconciliación del modo al hidratar** → sin animación, mismo contenido; sólo
  reflows de layout. Si molesta, se puede leer una cookie no-httpOnly como pista de SSR en una
  iteración posterior (no ahora).
- **Coste de la carátula representativa de canciones** → una consulta agregada por carga de
  detalle, no N; índices existentes sobre la tabla puente.
- **Modo Gráfico con listas muy largas (100+ ítems)** → la cuadrícula de carátulas monta
  muchas `<Image>`. Mitigación: `loading="lazy"` (comportamiento de `next/image`), tamaños
  chicos. Ventaneo (virtualización) sólo si se mide un problema — fuera de alcance.
- **`ListItemsView` compartido acopla dos páginas** → se contiene con una prop `canManage` y
  callbacks opcionales; los renderers no conocen el origen.
- **Regresión en el detalle propio** → el reparto de `ListDetail` mantiene el contrato de
  `ListDetailProps` (`initial: UserListDetail`); las pruebas existentes del detalle se migran
  y se agregan las de los tres modos.

## Migration Plan

Sin migración de datos ni de esquema. Cambios sólo de servicio/UI/rutas. Rollback = revertir
el commit; no hay estado persistido nuevo salvo la clave de `localStorage`, inocua.

## Open Questions

Ninguna pendiente. Decisiones de alcance cerradas con el usuario:
- Alta de ítems desde el detalle: **fuera de alcance** (se probó el buscador embebido y se
  retiró; el alta queda en las páginas de catálogo).
- Rating inline: fuera de v1, documentado.
- Nota por ítem: backlog.
- Preferencia de modo: global por visitante.
- Reorden en Gráfico: barra de selección.
- Carátula representativa de canciones: incluida.
