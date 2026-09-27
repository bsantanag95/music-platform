## Why

La búsqueda del catálogo mezcla todos los tipos en una sola consulta: buscar un artista dispara
también la búsqueda de álbumes y la pata de canciones, con hasta **8 solicitudes secuenciales a
MusicBrainz** (≥1,1 s cada una por la cola de rate limit) antes de pintar nada. Además de lenta,
es imprecisa: la heurística que separa "artista + canción" elige el nombre de artista **más
largo** contenido en la consulta (`Dokken kiss of death` toma a la banda tributo *Kiss of Death*
como artista y busca una canción llamada "dokken"), los fallos de MusicBrainz se descartan en
silencio (un `Icon` sin la pata de artistas muestra a Ennio Morr**icon**e en vez de la banda) y
los nombres cortos o genéricos (`KISS`, `Destroyer`) devuelven listas mezcladas sin forma de
acotarlas. La búsqueda de usuarios, por su parte, está escondida en una superficie aparte.

Adoptar el modelo de Metal Archives —campo + selector de tipo— elimina el trabajo innecesario
por construcción (un tipo = una solicitud a MusicBrainz) y abre la puerta a más tipos. El reto
es que los dos pasos no se sientan como dos pasos: el tipo vive dentro del campo, hay
sugerencias locales instantáneas mientras se escribe y cambiar de tipo es un clic sin
reescribir.

## What Changes

- **Selector de tipo dentro del campo de búsqueda** (Header y `/search`): Artistas, Álbumes,
  Canciones y Usuarios. El tipo por defecto es siempre **Artistas** (no se recuerda el último
  entre visitas); dentro de `/search` el tipo elegido se mantiene al refinar.
- **Sugerencias locales mientras se escribe** (typeahead) del tipo activo, servidas solo desde
  la base propia con índices trigram — cero solicitudes a MusicBrainz. Incluyen un "puente"
  artista + título (en Artistas, `dokken back for` sugiere el álbum *Back for the Attack*) y
  filas "Buscar en otro tipo".
- **Resultados por tipo en `/search?type=<tipo>&q=<texto>`**: lo local se pinta de inmediato y
  lo de MusicBrainz llega por streaming debajo. **BREAKING**: se retiran las pestañas
  Todo/Artistas/Álbumes y la mezcla de tipos en una misma respuesta.
- **Redirección por coincidencia exacta única** (estilo Metal Archives): en Artistas, si un solo
  artista se llama exactamente así, se abre su perfil con un aviso "¿No era este?"; con
  homónimos (KISS, Icon) se muestra una tarjeta de mejor coincidencia + los homónimos con su
  desambiguación. En Usuarios, un username exacto redirige al perfil.
- **Filtro Persona / Grupo** en Artistas (cubre la búsqueda de "músicos").
- **Emparejamiento flexible artista + título** en Álbumes y Canciones: las palabras pueden
  repartirse entre título y artista en cualquier orden; el orden se decide por cobertura de
  términos, no por una separación rígida. Separador explícito opcional (`KISS - Destroyer`).
- **Canciones como tipo propio**: la sección "aparece en estos álbumes" pasa a ser el resultado
  del tipo Canciones, agrupado por (canción, artista) — nunca mezcla apariciones de artistas
  distintos. La interpretación "canción X de artista Y" se muestra y se puede cambiar. Se
  corrige la selección del artista: solo al inicio o al final de la consulta, priorizando por
  relevancia y no por longitud.
- **Consultas genéricas acotables**: resultados con actividad en la plataforma primero, filtros
  por categoría y década, sugerencia de añadir el artista con los artistas más frecuentes como
  atajos, y "Cargar más" paginando MusicBrainz.
- **Fallo de MusicBrainz visible**: si la parte remota falla, se avisa y se ofrece reintentar en
  lugar de mostrar solo lo local como si fuese todo.
- **Corrección de datos**: los stubs de artista sin tipo en MusicBrainz se guardan como
  `unknown` (hoy quedan como `various`), con migración correctiva de las filas afectadas.
- **BREAKING (API)**: `GET /api/catalog/search` pasa a requerir `type` y devuelve un payload
  por tipo; nuevo `GET /api/search/suggest` para el typeahead.

## Goals

- Una búsqueda de Artistas o Álbumes en frío hace **una** solicitud a MusicBrainz; lo local se
  ve sin esperarla.
- Que elegir el tipo no se sienta como un paso extra: valor por defecto razonable, sugerencias
  instantáneas y cambio de tipo sin reescribir.
- Resolver bien "artista + título" en cualquier orden y los casos reportados (`Icon`, `KISS`,
  `Dokken kiss of death`, `Destroyer`).
- Integrar la búsqueda de usuarios en el mismo buscador.

## Non-Goals

- Tipos Géneros, Sellos o Músico como tipo propio: tendrán su propio cambio.
- Búsqueda avanzada (varios campos, filtros combinados por año/país/sello).
- Enlazar resultados de canción a `/song/<id>`: la navegación sigue siendo hacia los álbumes.
- Retirar la página `/users`: sigue existiendo; el buscador global solo gana el tipo Usuarios.
- Rediseñar la página de resultados más allá de lo que exige el tipo (se conserva su estructura
  y la sección de apariciones de canción).
- Señales de popularidad externas (Last.fm, Spotify): solo actividad propia de la plataforma.

## Capabilities

### New Capabilities

- `search-scopes`: selector de tipo, tipo por defecto, contrato de URL `?type=`, cambio de tipo
  sin reescribir, redirección por coincidencia exacta única, tarjeta de mejor coincidencia,
  filtro Persona/Grupo y tipo Usuarios.
- `search-typeahead`: sugerencias locales instantáneas por tipo, puente artista + título,
  navegación por teclado y presupuesto cero de MusicBrainz.
- `search-query-matching`: emparejamiento flexible por cobertura de términos, separador
  explícito, detección de artista en Canciones, agrupación por (canción, artista), orden por
  actividad y herramientas para acotar consultas genéricas.

### Modified Capabilities

- `catalog-search`: la búsqueda deja de mezclar tipos (endpoint y página por tipo, sin
  pestañas), presupuesto de MusicBrainz por tipo, resultados locales primero con streaming,
  fallo remoto visible, contexto de canción limitado al tipo Canciones y stubs de artista sin
  tipo como `unknown`.
- `header-search`: el Header incorpora selector de tipo y sugerencias, navega a
  `/search?type=&q=` y una sugerencia elegida abre directamente la entidad.
- `social-profiles`: el buscador global deja de estar separado de la búsqueda de usuarios (tipo
  Usuarios); `/users` se mantiene.
- `catalog-recording-ingestion`: el presupuesto de MusicBrainz de la resolución de canciones
  aplica solo al tipo Canciones y la selección del artista cambia de regla.

## Impact

- **Código**: `src/services/catalog/search-catalog.ts` (se divide por tipo y en local/remoto),
  `src/services/musicbrainz/client.ts` (offset/limit en búsquedas), `mappers.ts`
  (`mapArtistType`), `ingest-artist.ts`, `src/app/api/catalog/search/route.ts`, nuevo
  `src/app/api/search/suggest/route.ts`, `src/app/[locale]/(catalog)/search/page.tsx`,
  `src/components/catalog/{SearchForm,SearchResults,RecentSearches,search-tabs}`,
  `src/components/layout/HeaderSearch.tsx`, `src/lib/api/{catalog,schemas}.ts`,
  `src/lib/search/recent-searches.ts`, consumidor del onboarding
  (`src/components/onboarding/useCatalogSearch.ts`) y mensajes i18n.
- **Base de datos**: nueva migración con `pg_trgm` y `unaccent` (función inmutable envoltorio),
  índices GIN trigram sobre `artist.name`, `release_group.title`, `recording.title`,
  `app_user.username`/`display_name`, y corrección `various → unknown` de stubs. Espejo en
  `src/db/schema.ts` y `docs/03-data/sql-model.md`.
- **API/Docs**: `docs/04-api/contracts.md` (contrato de `/api/catalog/search` y nuevo
  `/api/search/suggest`), `docs/04-api/errors.md` si cambia la validación de `type`,
  `docs/02-architecture/code-walkthrough.md` (flujo de búsqueda).
- **Sin dependencias npm nuevas.** Las extensiones de Postgres son parte de la distribución
  estándar (`contrib`).
