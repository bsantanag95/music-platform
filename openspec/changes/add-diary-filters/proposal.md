## Why

`/me/diary` (recién rediseñado en `redesign-diary`) es el panel privado y completo del
usuario: todas sus escuchas, sin importar audiencia, con edición y borrado. A medida que
crece, encontrar una entrada puntual sin scroll manual ni "cargar más" repetido se vuelve
cada vez más costoso — y a diferencia del diario público embebido en el perfil (de solo
lectura, filtrado por audiencia, pensado para que *otros* te vean), `/me/diary` es
exactamente el lugar donde tiene sentido invertir en herramientas de gestión propia. El
producto excluye explícitamente gamificación (rachas, estadísticas, "top del mes" —
`PRODUCT.md`, anti-features), así que el enriquecimiento correcto para esta pantalla es
utilidad de búsqueda/filtro sobre los datos que ya existen, no un nuevo tipo de contenido.

## What Changes

- **Búsqueda por texto** sobre el título del objetivo de cada escucha (nombre de artista,
  álbum o canción) — coincidencia parcial, sin distinguir mayúsculas/acentos exactos.
- **Filtro por contexto** (`first_listen` / `relisten` / `rediscovery`).
- **Filtro por reacción** (`liked` / `loved` / `obsessed` / `neutral` / `disliked`, más una
  opción explícita para "sin reacción").
- **Filtro por audiencia** (`private` / `followers` / `public`).
- Los filtros son **combinables** (búsqueda + contexto + reacción + audiencia a la vez) y
  se aplican **en el servidor**, no solo sobre la página ya cargada — necesario porque el
  diario pagina de a 20 y un filtro que solo mirara lo ya traído sería incorrecto para
  cualquier entrada más vieja que la primera página.
- `GET /api/me/diary` gana cuatro query params opcionales (`q`, `context`, `reaction`,
  `audience`) — **aditivo y retrocompatible**: sin params, el comportamiento actual no
  cambia.
- `DiaryActivityList` pasa de paginación manual (`useState` + `handleLoadMore`) a
  `useInfiniteQuery` de TanStack Query — el mecanismo ya usado por
  `ScrollablePreviewList` para el mismo tipo de caso ("recarga, debounce, carga
  progresiva" es exactamente el criterio de `AGENTS.md`/convenciones del proyecto para
  cuándo corresponde TanStack Query). Cambiar un filtro dispara una nueva query
  (`queryKey` incluye los filtros vigentes) en vez de mutar estado de página a mano.
- **No se agrega:** ningún agregado estadístico (conteos, gráficos, rachas), ni
  sincronización de filtros con la URL (querda como estado local del componente — ver
  `design.md`, Non-Goals).

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `listen-diary`:
  - **Requirement "Diario propio"** (MODIFIED): además de listar en orden cronológico
    paginado, el usuario SHALL poder acotar el listado por texto libre sobre el título
    del objetivo, por contexto, por reacción (incluida la ausencia de reacción) y por
    audiencia, de forma combinable.

## Impact

- **Código:**
  - `src/services/diary/diary.ts` — `listMyDiary` gana un parámetro de filtros opcional;
    nuevas condiciones `and(...)` sobre el `where` existente (búsqueda `ilike` sobre
    `artist.name` / `release_group.title` / `recording.title`, `eq`/`isNull` para
    contexto, reacción y audiencia). `listUserDiary` y `listFeed` **no cambian** — el
    alcance es exclusivo del diario propio.
  - `src/app/api/me/diary/route.ts` — el `GET` parsea y valida los cuatro query params
    nuevos (contra los enums cerrados existentes; `VALIDATION_ERROR` si el valor no
    pertenece al enum).
  - `src/lib/api/diary.ts` — `getMyDiary` acepta un objeto de filtros opcional y arma el
    query string.
  - `src/components/diary/DiaryActivityList.tsx` — barra de filtros (buscador + 3
    selects) y migración de la paginación a `useInfiniteQuery`.
  - `src/app/[locale]/me/diary/page.tsx` — sin cambios de contrato (sigue resolviendo la
    primera página en el servidor); pasa a ser el `initialData` de la query.
- **Sin cambios de esquema DB** — todos los filtros son sobre columnas ya existentes;
  sin migraciones nuevas.
- **API:** `GET /api/me/diary` gana 4 query params opcionales. Aditivo — actualizar
  `route.test.ts` y el contrato documentado si existe en `docs/04-api/`.
- **i18n:** `messages/{es,en}/diary.json` — claves nuevas para placeholders/labels de la
  barra de filtros y la opción "sin reacción" si no existe ya como valor filtrable
  (ya existe como copy de formulario, `reaction.none`, reusable).
- **Tests:** `src/services/diary/diary.test.ts` (filtros combinados, casos límite),
  `route.test.ts` (validación de query params), `DiaryActivityList.test.tsx` (UI de
  filtros, refetch, estado vacío "sin resultados" distinto de "sin escuchas").
