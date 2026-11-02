## Context

Después de `add-advanced-search-phase1`:

- `/search` (Server Component) lee `type`, `q` y los filtros de `filters.ts` (`country`, `beginFrom`/`beginTo`,
  `ended`, `yearFrom`/`yearTo`, `artist`, `durMin`/`durMax`). Muestra un botón "Filtros", un panel `GET` y chips.
- Un solo servicio por tipo (`searchArtists`, `searchAlbums`, `searchSongs`) combina la base local (`local-match.ts`,
  trigramas sobre `search_text`) con una página de MusicBrainz (`mb-query.ts`). Cada filtro se traduce a una condición
  SQL y a una cláusula Lucene con el mismo significado.
- `q` es obligatorio en todas partes. Las coincidencias locales se piden por similitud con `q` y el orden lo decide
  `matchTier` / `coverageLevel` sobre `q`.
- Artistas no pagina: una página de MusicBrainz y la redirección por coincidencia exacta única.

La persona quiere el modelo de Metal Archives: una página propia con una pestaña por entidad, y en cada una un formulario
donde el nombre o título es un campo más, opcional.

Verificado contra la API de MusicBrainz (2026-11-01):

- Las consultas solo con campos funcionan: `country:CL AND begin:[1980 TO 1989-12-31] AND type:group` da 53 grupos.
- `country:(CL OR AR)` sirve para varios países.
- `beginarea:"Valparaiso"` encuentra "Valparaíso": el índice ignora los acentos.
- `artist:"…"` y `releasegroup:"…"` funcionan como campos de frase.
- En recordings funcionan `release:"Grace"`, `primarytype:` y `secondarytype:` (los del release-group de sus ediciones).
- Ninguna de esas consultas pide texto libre.

## Goals / Non-Goals

**Goals:**

- Página `/search/advanced` con pestañas y un formulario por entidad, con nombre o título opcional.
- Mismo servicio, mismo contrato de URL y mismo endpoint para el buscador rápido y la página avanzada.
- Todo campo de este cambio se aplica a la base local y a MusicBrainz con el mismo criterio.
- `/search` vuelve a ser solo el buscador rápido.

**Non-Goals:**

- Campos solo del catálogo (género, sello, número de catálogo, formato, país del artista en Álbumes): cambio siguiente.
- Mes en el rango de fechas, estados finos de artista, campos sin datos (letras, temas, notas).
- Índices nuevos: los criterios sin nombre se aplican sobre columnas ya indexadas (`country`, `first_release_year`) o
  sobre un conjunto acotado.

## Decisions

### D1. Página propia con pestañas como enlaces

`/search/advanced?type=artist|album|song` (por defecto `artist`; `user` u otro valor → `artist`). Las pestañas son
enlaces (`role="tablist"` no: son navegación, `aria-current="page"` en la activa), así cada pestaña es una URL. Debajo de
las pestañas va el formulario del tipo y debajo los resultados, con los mismos componentes de `/search` (`ArtistResults`,
`AlbumList`, `SongResults`, `LoadMoreResults`). En escritorio el formulario va en dos columnas, como en Metal Archives
(identidad a la izquierda; país, fechas y tipos a la derecha). En móvil va en una sola. "Buscar" y "Limpiar" van al pie.

*Alternativa descartada:* pestañas dentro de `/search`. Mezcla el buscador rápido (texto + tipo + sugerencias) con un
formulario de muchos campos, que es justo lo que la persona no quiere.

### D2. Un solo contrato de URL

El campo principal de cada pestaña (nombre del artista, título del álbum, título de la canción) sigue siendo `q`, así el
enlace desde `/search` o desde el Header solo cambia la ruta. Parámetros por tipo:

| Tipo | Parámetros |
|---|---|
| Artistas | `q`, `exact`, `artistType`, `country` (repetible), `area`, `beginFrom`, `beginTo`, `ended` |
| Álbumes | `q`, `exact`, `artist`, `artistExact`, `yearFrom`, `yearTo`, `category` (repetible) |
| Canciones | `q`, `exact`, `artist`, `artistExact`, `album`, `albumExact`, `category` (repetible), `durMin`, `durMax` |

`filters.ts` pasa de `AdvancedFilters` a criterios por tipo (`SearchCriteria`): listas para `country` y `category`
(sin repetir, como máximo 10), banderas `exact` (`1`), `area` y `album` (texto de 1 a 200 caracteres). Se mantiene la
lectura tolerante: los valores inválidos o de otro tipo se ignoran sin error. `decade` sigue valiendo en `/search` como
pastilla. En la página avanzada no hay década: el formulario usa años.

### D3. `q` opcional con al menos un criterio

Un criterio es cualquier parámetro del tipo con valor, `q` incluido. Sin ninguno, la página muestra el formulario y no
busca, y el endpoint responde `400 VALIDATION_ERROR` como hoy. Con criterios y sin `q`:

- **MusicBrainz:** la consulta se arma solo con cláusulas de campo, unidas con `AND` (`country:CL AND type:group`).
- **Local:** las coincidencias se piden por los criterios, sin filtro por similitud. Orden: discografía sincronizada
  primero, después por nombre o título. Tope `LOCAL_LIMIT`.
- **Orden final:** sin texto, `matchTier` y `coverageLevel` dan el mismo nivel a todo. Ordenan la actividad, lo
  cacheado y el orden de MusicBrainz, como hoy dentro de un nivel.
- **Canciones sin título:** no se aplica el filtro de relevancia del título. Con `artist`, la interpretación queda fija
  (como en la Fase 1). Sin título ni artista, la consulta es solo de campos (`release:"Grace"`).

### D4. Coincidencia exacta

- **MusicBrainz:** la cláusula de campo va como frase (`artist:"…"`, `releasegroup:"…"`, `recording:"…"`, `release:"…"`).
  Después se filtra lo que vuelve por igualdad del nombre normalizado (`normalizeSearchText`, sin mayúsculas, acentos ni
  espacios extra).
- **Local:** igualdad de `search_key`.
- **Artista en Álbumes y Canciones:** `artistExact` exige que algún artista principal acreditado se llame exactamente así.
  Sin `artistExact`, vale lo de la Fase 1 (palabras completas).

### D5. Campos nuevos, dos traducciones

| Campo | Local (SQL) | MusicBrainz (Lucene) |
|---|---|---|
| `country` (varios) | `artist.country IN (…)` | `country:(AR OR CL)` |
| `area` | `search_key(begin_area_name)` contiene `search_key(area)` como palabras completas | `beginarea:"…"` sin acentos |
| `category` (varios) | `release_group.category IN (…)`; en Canciones, el álbum de la aparición | `(<cláusula 1>) OR (<cláusula 2>)` con `CATEGORY_CLAUSE`, en release-groups y en recordings |
| `album` (Canciones) | título del álbum de una aparición local (palabras completas o exacto) | `release:"…"` |
| `exact` | `search_key(nombre) = search_key(q)` | frase en el campo + igualdad normalizada |

Como en la Fase 1, una fila sin el dato que pide un criterio no coincide. En Artistas, la fila local y la de MusicBrainz
se fusionan por `mbid` antes de filtrar (un stub sin ficha vuelve con los datos de MusicBrainz). Las categorías se
reaplican sobre la categoría mapeada, como hoy con una sola.

### D6. Paginación en Artistas

Sin nombre, una búsqueda de Artistas puede tener miles de resultados (`country:US`). `searchArtists` acepta `offset` y
devuelve `total` y `nextOffset`, igual que Álbumes. Lo local solo acompaña a la primera página. `LoadMoreResults` suma
`kind: "artist"`. "Cargar más" cuesta una solicitud. El esquema de respuesta de Artistas gana `total` y `nextOffset`
(opcionales en el cliente, para no romper a quien no los lea).

### D7. `/search` vuelve al buscador rápido

- Se retiran `AdvancedSearchPanel`, `AdvancedSearchToggle`, `ActiveFilterChips` y el `persistParams` de `SearchForm`.
- Junto al campo de `/search` queda un enlace "Búsqueda avanzada" a `/search/advanced?type=<tipo>&q=<texto>`.
- Si la URL de `/search` trae algún criterio que la búsqueda rápida no tiene (todo lo de D2 salvo `q`, `artistType`, una
  sola `category`, `decade`, `all` y `offset`), la página redirige a `/search/advanced` con los mismos parámetros. Los
  enlaces de la Fase 1 siguen funcionando.
- Las pastillas, la redirección por coincidencia exacta única y "Buscar en otro tipo" no cambian.
- En el Header, "Búsqueda avanzada" apunta a `/search/advanced?type=<tipo>&q=<texto>` (sin `filters=1`, que se retira).

### D8. Cambiar de pestaña

Cada pestaña enlaza a su tipo conservando solo los parámetros que significan lo mismo en el destino: `artist` y
`artistExact` entre Álbumes y Canciones, y `category` entre Álbumes y Canciones. `q` no se arrastra: es el nombre del
artista en una pestaña y el título en otra. Con eso, pasar de "Canciones de Jeff Buckley" a Álbumes da "Álbumes de Jeff
Buckley".

### D9. Formulario sin JavaScript y con JavaScript

Formulario `GET` nativo hacia `/search/advanced`. Los países y tipos múltiples son casillas, que se envían repetidas sin
JavaScript. Con JavaScript, el envío quita los campos vacíos antes de navegar. El país usa el selector con buscador de
la Fase 1 (`SearchablePicker`), ampliado a varios valores: cada país elegido queda como una etiqueta que se puede
quitar. Los tipos de lanzamiento son las cuatro categorías propias, como casillas. La duración se muestra en `m:ss`.

## Risks / Trade-offs

- **[Consultas amplias sin nombre]** `country:US` devuelve decenas de miles de artistas en orden de MusicBrainz, que no
  es significativo. → La paginación lo hace navegable. Lo local (con discografía sincronizada) va primero. La página
  sugiere sumar campos cuando el total pasa de 500 (umbral propio, más alto que el de "acotar" de la búsqueda rápida,
  pensado para consultas con texto).
- **[Stubs]** Cada página sin nombre persiste hasta 25 stubs nuevos, como cualquier búsqueda. → Mismo costo que hoy por
  página. No se ingiere nada pesado.
- **[Exacto con frase]** La frase de MusicBrainz devuelve también nombres más largos ("Kiss" → "Kiss Kiss"). El filtro
  exacto deja pocos resultados de una página. → Se acepta: la paginación sigue y el total que se muestra es el de
  MusicBrainz. Una aclaración "coincidencias exactas de esta página" necesitaría que la respuesta diga cuántas filas
  descartó; queda fuera de este cambio.
- **[Ciudad local incompleta]** `begin_area_name` solo existe con la ficha sincronizada. → La fusión con MusicBrainz
  recupera los que aparecen en la página remota.
- **[Retirar la UI de la Fase 1]** Lleva un día publicada. → La redirección conserva los enlaces. Los parámetros no cambian
  de nombre.

## Migration Plan

Sin migraciones. Los enlaces de la Fase 1 redirigen. Para revertir, se restaura el panel en `/search` (los parámetros son
los mismos).

## Open Questions

- Ninguna que bloquee. El cambio siguiente decide cómo convive el aviso "solo catálogo" con los campos de este cambio
  (un campo solo local deja la búsqueda sin MusicBrainz).
