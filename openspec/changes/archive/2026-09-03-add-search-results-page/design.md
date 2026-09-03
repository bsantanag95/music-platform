## Context

`GET /api/catalog/search?q=` (`src/app/api/catalog/search/route.ts`) hace hoy:

1. `findOrIngestArtist(q)` — `ilike` local por nombre y, si no hay, `musicbrainz.searchArtist(q)`
   tomando `results.artists[0]` y persistiéndolo.
2. `findOrIngestDiscography(artist)` — trae y cachea **toda** la discografía del artista
   (browse de release-groups + créditos), marcando `discography_synced_at`.

Devuelve `{ artist, releaseGroups }` y el frontend (`SearchForm`, `HeaderSearch`) navega a
`/artist/<id>`.

Dos problemas estructurales:

- **Ambigüedad resuelta al azar.** `artists[0]` es el mejor `score` de MusicBrainz, pero
  ignora homónimos ("Poison" glam vs. thrash) y artistas registrados con nombre corto
  ("Sabrina" vs. "Sabrina Carpenter"). El usuario no ve alternativas.
- **Latencia mal atribuida.** Cada búsqueda paga una ingesta completa contra MusicBrainz
  (rate limit 1 req/seg, cola en memoria de un proceso — ver `client.ts`) aunque el usuario
  todavía no eligió qué abrir.

Restricciones relevantes del proyecto:

- MusicBrainz: 1 req/seg, cola global en memoria de un solo proceso. Es el cuello de botella
  compartido de toda carga de catálogo.
- Patrón establecido: **cachear bajo demanda** — se consulta la fuente externa solo cuando
  alguien pide algo que la base local no tiene.
- `/artist/<id>` (`getArtistById` + `findOrIngestDiscography`) y `/release-group/<id>` ya
  ingieren su contenido pesado bajo demanda en la primera visita. `LazyCoverImage` +
  `/api/catalog/release-group/<id>/cover` ya resuelven carátulas sin bloquear el render.
- `artist` ya tiene el concepto de *stub* (`upsertArtistStub`, `type='unknown'`, se enriquece
  al visitar el perfil). `release_group` admite el mismo patrón sin migración (mbid único
  nullable, `title`, `category`).

## Goals / Non-Goals

**Goals:**

- Separar **buscar** (amplitud, barato, sin ingesta) de **abrir un resultado** (profundidad,
  caro, ya implementado y diferido a la vista destino).
- Que toda búsqueda lleve a `/search?q=` y muestre **todas** las coincidencias de artistas y
  álbumes, con el usuario eligiendo.
- Que el endpoint de búsqueda haga como máximo **una** request a MusicBrainz por tipo y
  **cero** ingesta de discografía / tracklist / carátula.
- Que cada resultado enlace directo a su vista destino (`/artist/<id>`, `/release-group/<id>`)
  sin salto de resolución intermedio, poblando la base local con cada búsqueda.
- Dejar documentado, con motivo y precondición, todo lo que se difiere.

**Non-Goals:**

- **Autocompletado / sugerencias en vivo mientras se teclea** — diferido (ver *Trabajo futuro
  diferido*).
- **Búsqueda de canciones (`recording`)** — diferida; no hay camino de ingesta de grabación
  suelta.
- **Paginación / "cargar más" de resultados** — v1 muestra la primera página de MusicBrainz
  (~25 por tipo) y las coincidencias locales; sin paginación.
- **Ranking de relevancia sofisticado** — v1 usa un orden simple y determinista.
- **Limitador de rate distribuido** (Redis) — ya previsto en
  `docs/02-architecture/scalability-infrastructure.md`; no se aborda aquí, pero es precondición
  del autocompletado.
- Cambiar el modelo de datos (no hay migración).

## Decisions

### 1. Un endpoint "resolver" de búsqueda, sin ingesta

`GET /api/catalog/search?q=<texto>` pasa a un nuevo servicio `searchCatalog(q)` en
`src/services/catalog/search-catalog.ts` que:

1. Consulta la base local: `ilike(artist.name, %q%)` y `ilike(releaseGroup.title, %q%)`
   (límite ~10 por tipo).
2. Consulta MusicBrainz **una vez por tipo**: `musicbrainz.searchArtist(q)` y
   `musicbrainz.searchReleaseGroup(q)` (nuevo método, `GET /release-group?query=&limit=25`).
   Ninguna de las dos ingiere discografía, tracklist ni carátula.
3. Persiste stubs de lo que no exista local, **una operación por tipo**
   (`INSERT ... ON CONFLICT (mbid) DO NOTHING ... RETURNING`), y resuelve los ids locales de
   todo el conjunto.
4. Fusiona y deduplica por `mbid`, ordena (ver decisión 4) y devuelve
   `{ results: CatalogSearchResult[] }`.

**Por qué:** aísla la latencia y el consumo del rate limit al acto de buscar (2 requests
encoladas como mucho, independientes del tamaño de la discografía). La ingesta pesada queda
donde ya vive: la primera visita a `/artist/<id>` o `/release-group/<id>`.

**Alternativa descartada:** mantener la ingesta en el endpoint de búsqueda "solo para el
primer resultado". Sigue siendo lento y no resuelve la ambigüedad.

**Alternativa descartada:** no persistir stubs; devolver `mbid` y resolver en una ruta
`/artist/by-mbid/<mbid>` con redirect al hacer clic. Mantiene la tabla más limpia pero agrega
un salto de red en cada clic y una ruta nueva. Se descarta porque el objetivo acordado es que
**todo artista termine con registro propio** y que el clic sea lo más rápido posible; el coste
de un `INSERT ... ON CONFLICT DO NOTHING` con ~25 filas es despreciable y va poblando la base.

### 2. Stubs con el tipo real; nuevo stub-upsert de `release_group`

La respuesta de `GET /artist?query=` de MusicBrainz incluye `type` y `disambiguation`, así que
los stubs de artista creados desde la búsqueda se insertan con su `type` mapeado
(`mapArtistType`) y `bio = disambiguation`, **no** como `type='unknown'`. Solo quedan sin
discografía ni membresías, que ya son perezosas.

`upsertReleaseGroupStub(mbid, title, category)` — nuevo, espejo de `upsertArtistStub` — inserta
en `release_group` con `category` mapeada de `primary-type` / `secondary-types`
(`mapReleaseGroupCategory`, ya existe). `discography_synced_at` no aplica a release-groups; la
primera visita a `/release-group/<id>` ingiere su tracklist como hoy.

**Por qué:** un stub de artista con `type='unknown'` fuerza un enriquecimiento extra
(`enrichIfUnknown` → 1 request a MusicBrainz) en la primera visita al perfil. Con el `type` ya
resuelto desde la búsqueda ese request se ahorra en la mayoría de los casos.

**Riesgo asumido:** el `type` de la búsqueda podría diferir del detalle completo. En la
práctica coinciden; si no, la vista de artista puede reconciliarlo en una iteración futura sin
bloquear este cambio.

### 3. `/search` como Server Component que renderiza la lista

- `src/app/[locale]/(catalog)/search/page.tsx` lee `searchParams.q`. Si viene y no está vacío
  tras normalizar, llama al servicio de búsqueda **en el servidor** y renderiza la lista.
- `SearchForm` (`src/components/catalog/SearchForm.tsx`) se simplifica: solo campo + validación
  local de entrada vacía; al enviar hace `router.push('/search?q=<consulta>')`. Deja de llamar
  a `searchCatalog`, de manejar estados de carga/no-encontrado/error y de navegar a
  `/artist/<id>`. El estado de carga pasa a ser el `loading.tsx` de la ruta.
- Nuevo `src/components/catalog/SearchResults.tsx` (Client Component solo para el estado de
  pestaña activa con `useState`): pestañas **Todo / Artistas / Álbumes**, cada fila enlaza a su
  vista. Fila de artista: nombre + tipo + `disambiguation`. Fila de álbum: título + artista
  principal + año + carátula vía `LazyCoverImage`.
- El aviso de "primera importación" se traslada conceptualmente a las vistas destino (que ya lo
  tienen para su propia ingesta). La página de búsqueda ya no lo necesita porque no ingiere.

**Por qué Server Component para la búsqueda:** es carga inicial de datos a partir de la URL,
sin interacción — la convención del proyecto es Server Component. Compartir el servicio
`searchCatalog` entre el Route Handler y el Server Component evita un fetch interno.

**Nota:** `searchCatalog` en `src/lib/api/catalog.ts` se conserva para uso desde cliente si
hiciera falta (y para no romper la forma de test), pero devuelve la nueva forma de lista
validada por Zod.

### 4. Orden de resultados: simple y determinista

Dentro de cada pestaña:

1. Resultados que ya estaban en la base local **con** `discography_synced_at` /
   contenido cacheado (el usuario probablemente ya los conoce) — o, para álbumes, los ya
   vistos.
2. Resto de coincidencias locales.
3. Coincidencias solo-MusicBrainz, en el orden de `score` que devuelve MusicBrainz.

Coincidencia exacta de nombre (case-insensitive) sube al tope de su grupo.

**Por qué:** predecible y testeable; no introduce un motor de ranking. La pestaña **Todo**
intercala por grupo (artistas y álbumes) preservando este orden relativo.

### 5. `HeaderSearch` siempre delega a `/search?q=`

Se elimina el `try { searchCatalog } catch` que hoy navega a `/artist/<id>` en el caso feliz.
El Header solo valida entrada no vacía y hace `router.push('/search?q=<consulta>')`.

**Por qué:** con resultados múltiples ya no existe "el artista resuelto"; toda búsqueda tiene
el mismo destino. Simplifica el componente y su test.

### 6. Contrato y códigos de error

- `GET /api/catalog/search?q=` → `200 { results: [...] }`. Lista vacía es `200`, **no** `404`:
  "sin coincidencias" es un estado de la página, no un error. `ARTIST_NOT_FOUND` deja de
  emitirse desde este endpoint.
- `400 VALIDATION_ERROR` si falta `q` (igual que hoy).
- `502 INTERNAL_ERROR` si MusicBrainz falla de forma no recuperable, tras los reintentos que
  el cliente ya hace. La búsqueda local sí puede devolverse aunque MusicBrainz falle
  (degradación parcial): si hay resultados locales, `200` con lo que haya y sin error.

`CatalogSearchResult` (Zod, en `src/lib/api/schemas.ts`):

```
{
  kind: "artist" | "release-group",
  id: string (uuid local),
  mbid: string | null,
  name: string,              // nombre del artista o título del álbum
  subtitle: string | null,   // artista: disambiguation; álbum: artista principal
  artistType: "person" | "group" | "various" | "unknown" | null,  // solo artist
  category: "studio" | "single_ep" | "compilation" | "live_other" | null,  // solo release-group
  year: number | null,       // solo release-group, si MusicBrainz lo trae
  cached: boolean            // ya tenía contenido en la base local
}
```

## Trabajo futuro diferido

Todo lo que se acordó **no** hacer en este cambio, con su motivo y la precondición para
retomarlo. Se replica como nota en `docs/00-product/roadmap.md`.

### D1. Autocompletado / sugerencias en vivo

**Qué:** desplegable con coincidencias mientras la persona teclea, en el campo del Header y/o
en `/search`.

**Por qué se difiere:**
- El rate limit de MusicBrainz es 1 req/seg con cola global en memoria de un proceso. Un
  autocompletado (aunque tenga debounce) suma varias requests por búsqueda y saturaría la cola
  que ya usan las cargas de página reales, degradando la latencia de todos.
- El modelo es "cachear bajo demanda": la base local solo tiene lo ya visitado, así que un
  autocompletado contra la base local devuelve poco; contra MusicBrainz en vivo, viola lo
  anterior.
- El valor de desambiguar de un vistazo ("Poison (glam)" vs. "Poison (thrash)") ya lo entrega
  la página de resultados.

**Precondición para retomarlo:** (a) un índice de búsqueda propio — full-text de PostgreSQL
sobre un catálogo ya poblado, o una réplica del dump de MusicBrainz — que no dependa de la API
en vivo por pulsación; y (b) idealmente el limitador de rate distribuido de
`scalability-infrastructure.md`. Hasta entonces, la página de resultados cubre la necesidad.

### D2. Búsqueda de canciones (`recording`)

**Qué:** pestaña **Canciones** en `/search`, resultados de `GET /recording?query=`.

**Por qué se difiere:** la *búsqueda* no es más cara (MusicBrainz pagina de a 25 igual que
artistas). Lo que falta es el **camino de ingesta de una grabación suelta**: hoy los
`recording` solo se crean como subproducto de ingerir el tracklist de un `release`
(`ingest-discography.ts` → `ingestCredits`), y `GET /api/catalog/recording/<id>` **solo lee
cache, no ingiere**. Un stub de canción abierto desde la búsqueda mostraría una página vacía
(sin créditos ni apariciones).

**Precondición para retomarlo:** un servicio `findOrIngestRecording(mbid)` que traiga
`inc=artist-credits+releases`, persista créditos y al menos las apariciones en álbumes, y una
decisión de producto sobre qué muestra e ingiere la página de una canción abierta "en frío"
(¿todos sus releases? ¿solo el canónico?). Es un cambio propio. Cuando exista, se añade la
pestaña **Canciones** y `upsertRecordingStub`.

### D3. Paginación de resultados

**Qué:** "cargar más" / paginación cuando hay más de ~25 coincidencias por tipo en MusicBrainz.

**Por qué se difiere:** la primera página cubre la enorme mayoría de las búsquedas reales
(nombres de artista/álbum). Añadir paginación implica arrastrar `offset` a MusicBrainz y a la
UI, y mezclar paginación local con paginación remota.

**Precondición para retomarlo:** evidencia de uso real (Fase 6, beta cerrada) de que hay
búsquedas legítimas que no encuentran su objetivo en la primera página.

### D4. Ranking de relevancia sofisticado

**Qué:** ordenar por popularidad, número de ratings/escuchas en la plataforma, similitud
tipográfica, etc.

**Por qué se difiere:** requiere señales que aún no existen a escala (la plataforma está
pre-beta) y un motor de scoring. El orden simple de la decisión 4 es suficiente y predecible.

**Precondición para retomarlo:** datos de uso agregados (ratings, escuchas) y una necesidad
demostrada de mejor ordenamiento.

### D5. Filtros adicionales en la página de resultados

**Qué:** filtrar por país, década, tipo de artista, categoría de álbum.

**Por qué se difiere:** sin volumen de resultados que lo justifique (ligado a D3). Las
pestañas por tipo son el único corte necesario en v1.

## Risks / Trade-offs

- **La base `artist` / `release_group` acumula stubs de resultados que nadie abre.** → Aceptado
  explícitamente: es coherente con "todo artista termina con registro propio", los stubs son
  filas mínimas, `idx_artist_name` ya existe, y cada búsqueda mejora la resolución local
  futura. Si a futuro molesta, una tarea de limpieza puede borrar stubs sin
  `discography_synced_at` ni referencias — no bloquea este cambio.
- **`type` del stub tomado de la búsqueda puede no coincidir con el detalle completo.** →
  Bajo impacto; la vista de artista puede reconciliarlo después. No se persigue en este cambio.
- **Degradación cuando MusicBrainz falla.** → Si hay resultados locales se devuelven igual con
  `200`; si no hay ninguno y MusicBrainz falló, `502 INTERNAL_ERROR` con reintento en la UI.
  La página distingue "sin coincidencias" (vacío) de "no se pudo buscar" (error).
- **Dos requests a MusicBrainz por búsqueda (artista + álbum) en vez de una.** → Siguen siendo
  O(1) respecto al tamaño de la discografía y muchísimo más baratas que la ingesta que se
  elimina. Se encolan en el mismo limiter; peor caso ~2.2s para una búsqueda totalmente fría,
  contra los ~3s+ actuales que además ingieren.
- **BREAKING del contrato interno de `GET /api/catalog/search`.** → El endpoint es de consumo
  propio (frontend del mismo repo); se actualizan cliente, schema Zod, componentes, tests y
  `docs/04-api/contracts.md` en el mismo cambio.
- **Pérdida temporal del "atajo": buscar un artista conocido ya no salta directo a su perfil,
  ahora muestra una lista de 1-2 elementos.** → Aceptado: es el precio de no volver a elegir al
  azar. La coincidencia exacta queda al tope y a un clic.

## Migration Plan

1. Backend: `musicbrainz.searchReleaseGroup` + tipos, `upsertReleaseGroupStub`, servicio
   `searchCatalog`, reescritura del Route Handler. Tests de servicio y de endpoint.
2. Contrato: actualizar `docs/04-api/contracts.md` y `docs/04-api/errors.md`.
3. Frontend: `schemas.ts` (`CatalogSearchResultSchema`), `catalog.ts` (`searchCatalog` nueva
   forma), `SearchResults.tsx`, reescritura de `SearchForm.tsx` y `search/page.tsx` +
   `loading.tsx`, `HeaderSearch.tsx`, mensajes i18n `es`/`en`. Reescritura de sus tests.
4. Docs de producto: `docs/05-features/catalog-browsing.md` (sección 1) y nota de diferidos en
   `docs/00-product/roadmap.md`.
5. Specs: aplicar deltas de `catalog-search` y `header-search` al archivar.
6. Verificación manual: "Poison" y "Sabrina" muestran varias opciones; artista cacheado
   aparece al tope; abrir un resultado frío dispara su ingesta en la vista destino con su
   propio estado de carga; búsqueda sin coincidencias muestra vacío, no error.

**Rollback:** el cambio es de una sola pieza (contrato + frontend acoplados). Revertir el
commit restaura el comportamiento anterior; no hay datos que migrar de vuelta (los stubs
creados quedan y son válidos).

## Open Questions

- Ninguna. El alcance y los diferidos quedaron acordados con el responsable del proyecto.
