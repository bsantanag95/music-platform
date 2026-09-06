## Why

Hoy `/me/collection` es una lista plana de texto: filas con el título del álbum, su artista, el
formato, los atributos y la nota, más "quitar" y "cargar más". No hay portadas —aunque cada
entrada *es* un álbum con carátula ya resuelta—, ni agrupación, ni orden configurable, ni
búsqueda. Y aunque `updateEntry` y `PATCH /api/me/collection/{entryId}` existen, **ningún
componente de `/me/collection` los invoca**: el formato, los atributos, la nota y la audiencia
de una copia solo se pueden tocar borrándola y recreándola desde la página del álbum (mismo
hueco de gestión que tenía la audiencia en favoritos antes de `rework-favorites-section`). La
colección es la superficie más visual del producto y la que peor aprovecha ese material.

Este cambio implementa el plan de diseño aprobado en la fase de shape: convierte
`/me/collection` en **la estantería personal** —el retrato completo y navegable de las copias
físicas propias, con la carátula al frente— y en el lugar donde se gestiona cada copia y su
privacidad. Mantiene el mundo visual vigente ("The Vinyl Listening Room", `DESIGN.md`) y los
principios de producto (se presume, no se puntúa; sin gamificación; grafo social explícito;
descubrimiento no algorítmico).

## What Changes

- **`/me/collection` pasa a ser una superficie única enriquecida, sin sub-navegación.**
  Deliberadamente **no** se agrega una pestaña social ("Descubrir coleccionistas", colecciones
  de quienes seguís): ese eje ya lo cubren el perfil de cada persona y —a futuro— el contador
  de coleccionistas por álbum; la colección queda como el espacio personal, contrapeso de la
  sección de listas (ya volcada a lo social con Guardadas y Descubrir).

- **Encabezado-retrato:** conteo por formato como dato (`IBM Plex Mono`) — p. ej. "24 vinilos ·
  11 CD · 3 cassettes" — para orientar sin gamificar (sin barras de progreso, sin "pendientes
  de valorar", sin medallas).

- **Tres modos de visualización a elegir**, con preferencia **local por visitante**
  (`localStorage`), **global** (no por página) — mismo mecanismo que el detalle de lista
  (`rework-list-detail`):
  - **Estantería:** cuadrícula responsiva de carátulas cuadradas (1 col mobile → 3–5 desde
    `sm`), predominio visual, pie con título + artista y chip de formato. Silueta de disco
    (`DiscPlaceholder`) ante la ausencia de carátula.
  - **Lista detallada:** fila con `CoverThumb`, título + artista enlazados, chip de formato,
    chips de atributos, nota, audiencia y fecha, con editar y quitar.
  - **Índice:** filas compactas (`NN · Álbum — artista · formato`), controles en hover/focus.

- **Toolbar contextual** (mismo patrón que `/me/lists`, `/me/favorites` y `/me/diary`:
  `FilterSelect` + buscador con debounce + `useInfiniteQuery`):
  - **Búsqueda por texto** sobre el título del álbum y el nombre del artista acreditado
    (`coalesce`, `ilike`, sin `unaccent`, igual criterio que el buscador de listas y favoritos).
  - **Filtro por formato** y **filtro por atributo** (se conservan).
  - **Orden:** recencia (default) · alfabético (título) · artista · formato.
  - **Agrupación:** sin agrupar (default) · por formato · por artista. El servidor ordena por
    (clave de grupo, orden pedido, id) y el cliente secciona con título + conteo por grupo
    (mismo enfoque que `FavoritesWall` con los tipos).
  - Filtros combinables, aplicados en servidor sobre el conjunto completo; van a la URL
    (`searchParams`) solo cuando difieren del default, para que una estantería filtrada sea
    enlazable y sobreviva al reload.

- **Edición de entrada en línea (cierra el hueco de gestión):** desde cualquier modo, "Editar"
  abre un panel embebido con selector de formato, toggles de atributos, input de nota (≤140) y
  audiencia — consumiendo el `PATCH /api/me/collection/{entryId}` ya existente, con
  actualización optimista y rollback (patrón de `SaveListButton` / favoritos). El formulario se
  extrae de `CollectionAlbumAction` a un componente compartido `CollectionEntryForm` sin
  cambiar el contrato ni el comportamiento de la acción en la página de álbum.

- **Cambio de audiencia en lote (capacidad de gestión nueva):** un modo "Seleccionar" agrega
  casillas a las fichas/filas; una barra de acción fija (sticky en mobile) cambia la audiencia
  de las N copias seleccionadas de una vez. `PATCH /api/me/collection` (nuevo, a nivel
  colección) acepta `{ ids: string[] (1..50), audience }`. Idempotente; los ids ajenos o
  inexistentes del conjunto se ignoran.

- **Vista de perfil ajeno `/users/[username]`** hereda la estantería (mismos tres tratamientos
  de ficha y la misma agrupación) en modo lectura: sin toolbar, sin edición, sin selección, sin
  quitar. La matriz de visibilidad no cambia. Sin ruta `/users/[username]/collection` dedicada
  (igual criterio que favoritos; reabrir si se pide).

- **API aditiva y retrocompatible:**
  - `GET /api/me/collection` y `GET /api/users/[username]/collection` aceptan `q` y `sort`
    opcionales (además de `format` y `attribute`) y devuelven además `counts` (conteo por
    formato). La forma de `entry` no cambia.
  - `PATCH /api/me/collection` (nuevo) acepta `{ ids, audience }`.
    `PATCH /api/me/collection/{entryId}` sigue igual.

## Capabilities

### New Capabilities

_(Ninguna. Todo el cambio recae sobre la capacidad `physical-collection` existente; no se
introduce descubrimiento social, contador de coleccionistas ni modelo de datos nuevo.)_

### Modified Capabilities

- `physical-collection`:
  - `Requirement: Colección propia en formato lista` — la respuesta acepta parámetros
    opcionales de búsqueda (`q`) y orden (`sort`), combinables con los filtros existentes y
    aplicados en servidor sobre el conjunto completo; incluye el conteo por formato (`counts`);
    y la presentación pasa de una lista plana a una superficie con tres modos de visualización
    a elegir.
  - `Requirement: Colección ajena en el perfil` — la superficie de lectura se presenta como la
    misma estantería (tres tratamientos de ficha, agrupación), en modo lectura; acepta `q` y
    `sort` e incluye `counts`.
  - `Requirement: Editar y quitar una entrada propia` — el dueño puede editar formato,
    atributos, nota y audiencia **desde la superficie `/me/collection`**, no solo desde la
    página del álbum.

- **Added Requirements (dentro de `physical-collection`):**
  - `Requirement: Modos de visualización de la colección` — `/me/collection` y la vista de
    perfil se presentan en tres modos (estantería, lista detallada, índice); la preferencia se
    guarda local por visitante y es global; ante la ausencia de carátula se usa la silueta de
    disco; encabezado con el conteo por formato; sin sub-navegación.
  - `Requirement: Cambio de audiencia en lote de entradas de colección` — el usuario puede
    cambiar la audiencia de varias entradas propias a la vez de forma idempotente;
    comportamiento ante ids inexistentes o ajenos en el conjunto; la operación no crea, modifica
    ni elimina favoritos, escuchas, ratings, comentarios ni listas.

## Impact

- **Base de datos:** sin migraciones. `collection_entry` ya tiene `audience` y marcas de
  tiempo; el cambio en lote es un `UPDATE ... WHERE id = ANY(:ids) AND user_id = :user` y el
  conteo por formato es un agregado acotado (`GROUP BY format`) sobre la misma tabla, con el
  índice existente por `user_id`.
- **API:**
  - `GET /api/me/collection`, `GET /api/users/[username]/collection`: nuevos query params
    (`q`, `sort`) y campo nuevo en la respuesta (`counts`). Aditivo — actualizar
    `route.test.ts` y `docs/04-api/contracts.md`.
  - `PATCH /api/me/collection` (nuevo): body `{ ids: string[], audience }`. Nueva ruta y test.
- **Servicios:** `src/services/collection/collection.ts` — `listOwnCollection` /
  `listProfileCollection` (params `q`/`sort` + orden por clave de grupo + `counts`),
  `updateEntriesAudienceBulk` (nuevo, sobre la validación de propiedad existente). El artista
  acreditado ya se resuelve (`primaryArtistsFor`); el buscador `q` reusa ese join.
  `src/services/social/visibility.ts` se reutiliza sin cambios de reglas.
- **Frontend:**
  - `src/app/[locale]/me/collection/page.tsx` (siembra de filtros desde `searchParams`),
    `src/app/[locale]/users/[username]/page.tsx` (la sección de colección pasa a la estantería
    de lectura).
  - `src/components/collection/*`: nuevos `CollectionShelf`, `CollectionModeSwitcher`,
    `ShelfGrid` / `EntriesDetailed` / `EntriesIndex`, `CollectionToolbar`,
    `CollectionEntryForm` (extraído de `CollectionAlbumAction`), barra de acción de selección;
    se retira `CollectionList` o se reduce. `CollectionAlbumAction` mantiene su contrato
    (reusa `CollectionEntryForm`).
  - Reutiliza `FilterSelect`, `EmptyState`, `Button`, `CoverThumb`, `DiscPlaceholder`,
    `useInfiniteQuery`, `queryKeys`, el buscador con debounce de `MyListsTab` / `FavoritesWall`
    y el conmutador de modos de `rework-list-detail`.
- **Capa de acceso:** `src/lib/api/collection.ts` — `getMyCollection` / `getUserCollection` con
  `q`/`sort`, `updateEntriesAudienceBulk`; esquemas Zod nuevos en `src/lib/api/schemas.ts`;
  claves en `src/lib/query/keys.ts` (`queryKeys.myCollection(filters)`).
- **i18n:** `messages/{es,en}/collection.json` — claves nuevas (encabezado con conteos, modos
  de vista, toolbar de orden/agrupación, modo selección y barra de acción en lote, estados
  vacío y filtrado-vacío, edición en línea).
- **Tests:** servicios (`q` / `sort` / orden por grupo / `counts` / cambio en lote idempotente
  y con ids ajenos), rutas (params y campos nuevos, `ids` en el `PATCH` de colección,
  retrocompatibilidad), componentes (tres modos, conmutador con `localStorage`, edición en
  línea optimista, modo selección y barra de acción, estados vacío y filtrado-vacío, estantería
  agrupada, vista de perfil en modo lectura).
- **Docs:** `docs/04-api/contracts.md`, `docs/05-features/physical-collection.md` (mover el plan
  a implementado y actualizar "Superficies"), `docs/05-features/README.md`. Documentar en la
  propuesta los anti-objetivos con criterios de cuándo abordarlos (descubrimiento social de
  colecciones, contador "N personas tienen este disco", colección en el feed, buscador de
  catálogo embebido, wishlist, imagen de portada por entrada).
- **Sin dependencias nuevas.** Sin cambios en el `Header`, en el feed de actividad, en el
  sistema de doble rating, en el modelo de datos ni el vocabulario de la colección, ni en el
  contrato de la acción contextual de la página de álbum.
