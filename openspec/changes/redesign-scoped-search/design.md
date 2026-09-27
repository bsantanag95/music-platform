## Context

Hoy `searchCatalog(q)` (`src/services/catalog/search-catalog.ts`) ejecuta en cada búsqueda:
coincidencias locales con `ILIKE '%q%' LIMIT 10` sin orden, búsqueda de artistas y de
release-groups en MusicBrainz y, siempre, la pata de canciones (browse de discografía del
artista "hint", búsqueda de recordings y hasta cuatro browse de apariciones). Todo pasa por la
cola del cliente único (≥1,1 s entre solicitudes), de modo que una búsqueda fría puede encadenar
8 solicitudes (~9 s) antes de responder. Diagnósticos verificados contra MusicBrainz y la base
local (2026-09-26):

- **`Dokken kiss of death`**: `deriveSongQuery` elige el candidato de artista contenido en `q` con
  el nombre **más largo**; MusicBrainz devuelve la banda tributo *Kiss of Death* (13 caracteres)
  además de Dokken (6), así que la parte de canción queda en "dokken".
- **`Icon`**: la banda existe localmente; el síntoma reportado coincide con la pata de artistas de
  MusicBrainz rechazada (`Promise.allSettled` la descarta en silencio) más el `ILIKE` sin orden,
  que devuelve "Ennio Morr**icon**e" y "Jack Perr**icon**e".
- **Tipo `various` espurio**: `mapArtistType(undefined)` devuelve `various`; varios "Icon" stub
  quedaron marcados como Various Artists.
- **Artista + título**: la búsqueda de release-groups de MusicBrainz en texto libre ya resuelve
  `kiss destroyer` y `dokken back for the attack` en primer lugar; la de recordings **no**
  (`dokken kiss of death` devuelve primero canciones tituladas "Dokken").

Consumidores de la búsqueda: la página `/search` (Server Component, llama al servicio directo),
`GET /api/catalog/search` (lo usan los pickers del onboarding vía `useCatalogSearch`) y el
`HeaderSearch`. La búsqueda de usuarios vive aparte (`searchUsers` en
`src/services/social/profiles.ts`, `/users`, `/api/users`).

## Goals / Non-Goals

**Goals:**
- Un tipo por búsqueda, con un presupuesto de MusicBrainz explícito por tipo (1 solicitud en
  Artistas y Álbumes).
- Coincidencias locales rápidas, ordenadas y tolerantes (acentos, errores menores) que sirvan
  para el typeahead sin salir a MusicBrainz.
- Resolver "artista + título" sin exigir separación y corregir la detección de artista en
  Canciones.
- Hacer visible la degradación cuando MusicBrainz falla.

**Non-Goals:**
- Tipos Géneros, Sellos o Músico propio; búsqueda avanzada; motor de búsqueda externo;
  enlazar canciones a `/song/<id>`; retirar `/users`; popularidad de fuentes externas.

## Decisions

### D1. Servicios de búsqueda por tipo con parte local y remota separadas

Se reemplaza `searchCatalog` por un módulo `src/services/catalog/search/` con un archivo por tipo
(`artists.ts`, `albums.ts`, `songs.ts`) y utilidades compartidas (`normalize.ts`,
`coverage.ts`, `activity.ts`, `local-match.ts`). Cada tipo expone `searchLocal(q, opts)` y
`searchRemote(q, opts)` y una función `merge` pura que produce el orden final. Usuarios reusa
`searchUsers` sin duplicarlo.

*Por qué*: la separación local/remota es lo que habilita el streaming (D7) y el typeahead (D9)
sin duplicar lógica; un archivo por tipo reemplaza un orquestador de 800 líneas donde cada pata
condicionaba a las demás. *Alternativa descartada*: agregar `if (type)` al servicio actual —
mantiene el acoplamiento que produjo el bug de Dokken (la pata de canciones dependía de los
candidatos de artistas).

### D2. Coincidencia local con `pg_trgm` + `unaccent`

Migraciones `0050_search_trigram_indexes.sql` y `0051_artist_search_key.sql`:
- `CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS unaccent;`
- función `search_normalize(text)` `IMMUTABLE PARALLEL SAFE` =
  `lower(public.unaccent('public.unaccent'::regdictionary, $1))` (el envoltorio con diccionario
  explícito es lo que permite marcarla inmutable y usarla en índices).
- índices GIN `gin_trgm_ops` sobre `search_normalize(artist.name)`,
  `search_normalize(release_group.title)`, `search_normalize(recording.title)`,
  `search_normalize(app_user.username)` y `search_normalize(app_user.display_name)`.

- (0051, surgida en la implementación) función `search_key(text)` = `search_normalize` + la
  misma regla de puntuación que `normalizeSearchText`, con índice B-tree sobre
  `search_key(artist.name)`: la detección de "artista en un extremo" es una igualdad por lista
  (`= ANY`) que sin índice recorría `artist` completa (~36 ms con 12k filas) en cada tecla.
  Llama a `public.search_normalize` calificado: desde PostgreSQL 17 las funciones de un índice
  se evalúan con `search_path` restringido.

Consulta local: filtro `search_normalize(col) % search_normalize($q) OR search_normalize(col)
LIKE search_normalize('%q%')`, grupo de 40 candidatos ordenado por `similarity` y orden final
en TypeScript (`matchTier`: exacta → palabra completa → prefijo → resto) antes del tope. Esto
corrige el caso Icon/Morricone por construcción y deja las comparaciones exactas en una sola
normalización (TS), también para nombres con puntuación ("AC/DC").

*Por qué*: el orden antes del tope es el problema real; trigramas dan tolerancia a errores y
sirven para prefijos del typeahead con un solo índice por columna. *Alternativas*: full-text
(`tsvector`) — malo para nombres propios cortos, prefijos y errores de tipeo; motor externo
(Meilisearch/Elastic) — infraestructura nueva sin justificación a este volumen (~12k artistas,
~6k álbumes, ~21k grabaciones). Ambas extensiones vienen en `contrib` y son *trusted* desde
PostgreSQL 13 (las crea el dueño de la base sin superusuario). Sin dependencias npm.

### D3. Normalización única, espejada en TypeScript

`normalizeSearchText` (TS) aplica NFD + eliminación de diacríticos, minúsculas, puntuación a
espacio (apóstrofo interno eliminado) y colapso de espacios; es la que usan cobertura (D4),
detección de artista (D5) y redirección exacta (D6). En SQL, `search_normalize` cubre acentos y
mayúsculas; la puntuación se normaliza en TS antes de enviar `$q`. Tests de tabla verifican que
ambos lados coinciden en los casos del spec (Motörhead, AC/DC, Guns N' Roses).

### D4. Cobertura de términos como función pura

`coverageLevel(query, title, artistNames)` clasifica cada candidato en los cuatro niveles del
spec: los tokens del artista acreditado como secuencia contigua al inicio o al final de la
consulta y el resto igual al título normalizado (nivel 1); título igual a la consulta completa
(nivel 2 — debe ganarle a "todas las palabras cubiertas", o *Destroyer Demos* quedaría a la par
de *Destroyer* para `destroyer`); todos los tokens en título ∪ artista (nivel 3); resto (nivel 4). Desempate: actividad (D10) → cacheado → orden de MusicBrainz.

Para Álbumes la consulta a MusicBrainz sigue siendo texto libre (ya cubre artista + título); para
Canciones se usa texto libre solo sin interpretación (D5). Con separador ` - ` se usan campos
explícitos (`releasegroup:"B" AND artist:"A"` / `recording:"B" AND artist:"A"`), una consulta
por orden probado dentro del mismo presupuesto (el segundo orden solo si el primero no da
resultados de nivel 1–2).

*Por qué*: resuelve `destroyer kiss` y `kiss destroyer` igual, sin adivinar dónde corta el
artista; el reranking es local y no cuesta solicitudes. MusicBrainz trae 25 candidatos por
página, suficientes para que el correcto esté entre ellos en los casos probados.

### D5. Interpretaciones en Canciones: extremos, relevancia, máximo dos

Candidatos de artista = locales (consulta exacta sobre `search_normalize(name)` para los
prefijos/sufijos de tokens de `q`, una sola query con `IN`) ∪ resultado de `searchArtist(q)` de
MusicBrainz. Califica un candidato si su nombre normalizado es prefijo o sufijo de `q` en límite
de palabra y deja ≥2 caracteres. Orden: actividad local, luego score de MusicBrainz (Dokken 100 >
Kiss of Death 86). Se prueba la primera interpretación con el mecanismo `rgid:` existente
(se conserva: es lo que encuentra grabaciones canónicas sin artist-credit, como *Stairway to
Heaven*); si no hay candidato relevante, el texto libre de la consulta completa (con separador
explícito, los dos órdenes). Probar una segunda lectura con artista en vez del texto libre
dejaba vacío `kiss of death`: "KISS" y "Death" ocupan sus extremos y ninguna tiene la canción.
La cobertura de términos ya ordena bien el texto libre. Grabaciones sin artist-credit se unen al
artista interpretado o al grupo del mismo título base. La respuesta incluye `interpretation {song, artistId, artistName}` y
`alternatives[]`, que la UI muestra como enlaces con separador explícito
(`/search?type=song&q=Kiss%20of%20Death%20-%20dokken`).

*Por qué*: el fallo de Dokken venía de elegir por longitud y de aceptar el artista en cualquier
posición; limitar a extremos y a dos intentos acota el presupuesto y hace la elección visible y
corregible.

### D6. Redirección por coincidencia exacta única en el servidor

La página `/search` (Server Component) resuelve Artistas completo (local + la única solicitud a
MusicBrainz), deduplica por `id` y cuenta las coincidencias con nombre normalizado igual a `q`.
Si es exactamente una, `remoteFailed` es falso y no llega `all=1`, llama a `redirect()` de
`@/i18n/navigation` hacia `/artist/<id>?from=search&q=<q>`. La página de artista lee esos
parámetros y renderiza `SearchOriginNotice` ("¿No era este? Ver todos los resultados"), enlazando
a `/search?type=artist&q=<q>&all=1`. Usuarios: `lower(username) = lower(q)` → `/users/<username>`.

*Por qué en la página y no en el Header*: una sola fuente de verdad (el spec `header-search`
prohíbe que el Header resuelva) y la decisión necesita los datos de MusicBrainz para saber si hay
homónimos. *Costo*: Artistas no se transmite por streaming (espera 1 solicitud, cacheada 10 min);
se compensa con el typeahead, que navega directo sin pasar por `/search`.

### D7. Streaming local → remoto en Álbumes y Canciones

La página renderiza `<Suspense fallback={<LocalResults …/> + indicador}>` y dentro un Server
Component asíncrono que espera `searchRemote` y renderiza la lista **completa ya fusionada**.
Así el fallback muestra lo local al instante y el reemplazo aplica el orden final determinista
(no hay "anexar al final"). `loading.tsx` actual sigue cubriendo la navegación inicial.

*Alternativa descartada*: pedir lo remoto desde el cliente con TanStack Query — duplica el
merge en el cliente y rompe la regla de Server Components para la carga inicial.

### D8. Contrato de API y paginación

`GET /api/catalog/search?type=artist|album|song&q=&offset=&artistType=&category=&decade=`:
unión discriminada por `type` en Zod (`src/lib/api/schemas.ts`):
`{ type, results, remoteFailed, total?, nextOffset?, interpretation?, alternatives? }`.
"Cargar más" es un Client Component con estado explícito (como `UserSearch`: es una acción de
la persona, no un dato a cachear) que llama al endpoint vía `src/lib/api/catalog.ts` con
`offset` (solo remoto; lo local va en la primera página) y descarta ids ya mostrados. Filtros:
`artistType` → `AND type:person|group` en la consulta de artistas; `category` → cláusulas de
`primarytype`/`secondarytype`; `decade` → `firstreleasedate:[AAAA TO AAAA+9]`. El cliente de
MusicBrainz gana `offset` y `limit` opcionales en `searchArtist/searchReleaseGroup/
searchRecording` (la clave de caché los incluye). Validar la sintaxis exacta de cada campo
contra MusicBrainz durante la implementación antes de fijarla en tests.

Es un cambio **BREAKING** del endpoint. Consumidores externos a `/search`: `useCatalogSearch`
(onboarding) y `RegisterListenDialog` (registrar escucha, descubierto en la implementación).
Ambos pasan a un tipo por solicitud con un conmutador compacto (`SearchTypeToggle`): el
onboarding Álbum/Canción, el diálogo Álbum/Canción/Artista, álbum por defecto; de Canciones solo
es registrable la canción resuelta (la única con grabación identidad).

### D9. Typeahead: `GET /api/search/suggest`

Vive fuera de `/api/catalog` porque incluye usuarios. Solo lecturas locales (D2), máximo 6
filas, `Cache-Control: private, max-age=30`. Cliente: componente `ScopedSearchField`
compartido por Header (variante compacta) y `/search` (variante completa), con debounce de
150 ms y cancelación por `AbortController` a mano — **sin** TanStack Query: el Header vive fuera
de `<Providers>` (no hay `QueryClientProvider` en su árbol, mismo criterio que
`RegisterListenDialog`) —, patrón combobox ARIA y
sin reasignar Tab. Puente artista + título (solo Artistas): misma detección de extremos que D5
contra artistas locales y luego `release_group` con crédito primario de ese artista cuyo título
normalizado empieza por el resto.

*Por qué un componente compartido*: Header y página deben comportarse igual (selector, teclado,
sugerencias); hoy son dos formularios distintos.

### D10. Señal de actividad propia

`activityScores(kind, ids)` agrega en una consulta por tipo sobre los candidatos de la página
(≤ ~35 ids): álbumes → `rating` + `review` + `listen_entry` por `release_group`; artistas →
`artist_follow` + actividad de sus álbumes; canciones → `listen_entry`/`rating` de las
grabaciones del grupo. Sin tablas ni vistas materializadas nuevas; si el costo crece se evalúa
materializar en otro cambio.

### D11. Stubs de artista sin tipo → `unknown` y migración correctiva

`upsertArtistStubsFromSearch` usa `unknown` cuando `mbType` es `undefined` (no toca
`mapArtistType`, que sigue sirviendo a la ingesta completa). La migración 0050 incluye
`UPDATE artist SET type = 'unknown' WHERE type = 'various' AND mbid <> '<VA mbid>'`: `unknown`
no inventa un dato (significa "no confirmado") y el enriquecimiento de stubs existente
(`ingest-artist.ts`) re-deriva el tipo real en la primera visita.

### D12. URL, tipo por defecto y búsquedas recientes

`parseSearchType` reemplaza `parseSearchTab` y mapea valores heredados. El Header arranca y
vuelve a Artistas tras navegar; la página arranca con el tipo de la URL. `recent-searches`
guarda `{ q, type }` y lee las entradas antiguas (string) como Artistas.

## Risks / Trade-offs

- [Artistas espera a MusicBrainz para decidir la redirección (~1,1 s en frío)] → caché TTL de
  10 min, typeahead que navega directo y streaming en los demás tipos.
- [Redirección a un homónimo que MusicBrainz no rankea entre los 25 primeros] → el aviso "¿No era
  este?" con `all=1` deja volver a la lista en un clic.
- [Sintaxis de campos de MusicBrainz (filtros, separador) distinta de la esperada] → verificar
  cada consulta contra la API real con un script de exploración antes de fijar tests; los
  filtros degradan a filtrar lo local si la consulta remota falla.
- [`CREATE EXTENSION` sin permisos en algún entorno] → ambas son *trusted* en PG ≥13; si falla,
  la migración aborta completa y se documenta el requisito en `sql-model.md`.
- [La cobertura puede subir falsos positivos cuando el artista es una palabra común ("Death")]
  → el nivel 1 exige que el resto iguale el título; los empates se rompen por actividad y score.
- [Cambio BREAKING del endpoint] → único consumidor externo (onboarding) se actualiza en el
  mismo cambio; `contracts.md` documenta el nuevo contrato.
- [Dos interpretaciones duplican el costo de Canciones en el peor caso] → tope explícito de dos,
  cachés por consulta y el tipo Canciones solo corre cuando se elige.

## Migration Plan

1. Aplicar `0050_search_trigram_indexes.sql` (extensiones, función, índices, corrección de
   `various`). Los índices son aditivos; la corrección de tipo es segura porque el
   enriquecimiento la resuelve.
2. Desplegar servicios, endpoints y UI juntos (el endpoint cambia de forma).
3. Rollback: revertir el código; los índices y la función pueden quedarse (no afectan al código
   anterior). La corrección `various → unknown` no se revierte: el estado previo era incorrecto.

## Open Questions

- Umbral de "consulta genérica" (50 coincidencias en MusicBrainz): ajustar tras probar con datos
  reales.
- Si el filtro por década debe existir también en Canciones (fuera de este cambio salvo que sea
  trivial).
