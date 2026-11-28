## Context

Después de la fase 1, cada tipo de `/search` se reparte en `ResultsLayout` (pestañas, resultados y columna lateral). Los
datos de la respuesta ya llegan en la búsqueda:

- **Artistas.** Cada resultado trae `exact`, `cached` y `discCount` (discos principales en el catálogo; `null` si la
  discografía no se exploró), `photoUrl` y años. Hoy la «Mejor coincidencia» es el primer `exact`.
- **Álbumes.** Trae `title`, `artistName`, `category`, `year`, `cached` (tracklist ingerida) y `community`. El orden ya
  pone primero la coincidencia completa (`coverageLevel`).
- **Canciones.** El primer grupo es el resuelto (`recordingId`, `albums`, `durationSec`).

Muestras reales del 28 nov 2026, en la base local y MusicBrainz:

| Consulta | Exactos con discos | Catálogo que contiene la consulta | Respuesta hoy |
| --- | --- | --- | --- |
| pink | ninguno (6 exactos sin explorar) | Pink Floyd 233, The Legendary Pink Dots 175, BONNIE PINK 55, Pink Martini 19, Pink Floyd (colectivo) 1 | PINK (grupo japonés) |
| kiss | KISS 282 | Kiss Kiss 3 | KISS |
| queen | Queen 219 | — (Madonna y Ella Fitzgerald llegan por alias, no por nombre) | Queen |
| icon | Icon 5 | — | Icon |
| nirvana | ninguno (7 exactos sin explorar) | — | primer Nirvana |
| the wall | — | — | (Álbumes) The Wall de Pink Floyd, `cached: false` |
| creep | — | — | (Canciones) Radiohead, 12 discos, 5:24 |

P!nk aparece con «pink» por un alias, pero su nombre normalizado no contiene «pink», así que no entra en la elección.

## Goals / Non-Goals

**Goals:** una respuesta por tipo con una regla explicable; la columna lateral con «x en otros tipos» sin solicitudes a
MusicBrainz.

**Non-Goals:** rejilla de carátulas y «sin resultados» (fase 3); alias; actividad de la comunidad en la regla;
`/search/advanced`.

## Decisions

### D1. Regla de la respuesta de Artistas (`pickArtistAnswer`, pura)

Entrada: los resultados en su orden y la consulta. Salida: `{ kind: "answer", artist }`, `{ kind: "choice", candidates }`
o `{ kind: "none" }`.

1. **Exacto con discos:** entre los `exact` con `discCount ≥ 1`, el de más discos (empate: el primero en el orden) →
   `answer`. KISS, Queen e Icon quedan como hoy, pero elegidos por el catálogo y no por la posición.
2. **Elección:** si no hay exacto con discos, los no exactos con `discCount ≥ 2` cuyo nombre (tokenizado, `tokenize`)
   contiene todas las palabras de la consulta, ordenados por discos. Se toman hasta dos, más el primer exacto si existe →
   `choice` (con «pink»: Pink Floyd, The Legendary Pink Dots y PINK). Con un solo candidato del catálogo y sin exactos
   también es `choice` de uno, que se muestra como `answer` con la nota «Más cercano en el catálogo».
3. **Nada de lo anterior:** el primer exacto como `answer`, igual que hoy (Nirvana). Sin exactos → `none` (lista simple).

`discCount ≥ 2` en la elección deja fuera los proyectos de un solo disco (el colectivo «Pink Floyd» de 2023). La regla vive
en `src/services/catalog/search/artist-answer.ts`, con tests de ejemplo (las filas de la tabla) y de propiedades:
la respuesta siempre está entre los resultados, nunca hay más de 3 candidatos y un exacto con discos siempre gana.

Los géneros de la tarjeta (hasta 3) se piden para la respuesta, o para cada candidato si hay elección (como mucho tres
lecturas locales, en paralelo).

*Alternativa descartada:* ordenar toda la lista por discos. Cambia la relevancia y el contrato del endpoint, y mezcla
«contiene la palabra» con «se llama así».

### D2. Presentación de Artistas

- `answer`: la tarjeta actual crece. Foto de 96 px (circular), nombre en display, meta, géneros, «N discos en el catálogo» y
  «Ver perfil». Si la respuesta salió de la regla 2, lleva la nota «Más cercano en el catálogo».
- `choice`: encabezado «¿Cuál «x» buscas?» y una fila de 2–3 tarjetas con foto grande (o inicial), nombre, meta y una línea
  de por qué («233 discos en el catálogo» / «Nombre idéntico a «x»»). En el teléfono es un riel con desplazamiento horizontal.
- Homónimos: «Otros artistas llamados «x»» muestra los 3 primeros y un botón «Ver los N» que despliega el resto (cliente,
  sin navegar). Los que ya están en la elección no se repiten.
- «Más resultados» sigue como hoy, sin los que ya están arriba.

### D3. Ficha de Álbumes

Hay respuesta cuando el primer resultado tiene `coverageLevel ≤ 2` (título igual a la consulta, o artista + título). La
ficha lleva:

- carátula de 200 px (160 en el teléfono, con `LazyCoverImage` en 250 px, sin resolución completa);
- título, artista, categoría · año y la media de la comunidad en la forma compacta de `rating-display` (si hay media);
- tracklist: si el disco tiene una edición representativa ya guardada (`release.is_representative`), las primeras
  6 canciones y «y N más». Se lee con `getStoredTracklistPreview(releaseGroupId)`, una consulta local que **no ingiere**:
  si no hay edición guardada, la ficha va sin canciones;
- «Ver el disco» (botón principal) y, si en la misma página de resultados hay otros discos del mismo artista con el mismo
  título, enlaces «También: Single · 2023».

El resto de la lista va bajo «Otros álbumes», sin la respuesta ni los «También». *Alternativa descartada:* ingerir la
tracklist desde la búsqueda. Viola «la búsqueda no ingiere» (spec `catalog-search`) y gastaría el presupuesto de MusicBrainz.

### D4. Ficha de Canciones

`SongAnswer` reemplaza a `SongGroupPanel` en la búsqueda rápida; la avanzada no lo usa. Lleva la carátula del primer
disco, el título, el artista y la duración (`durationSec`), «Aparece en N discos» con una tira de hasta 5 carátulas
(«Ver N más» despliega el resto en el cliente, como hoy), y «Ver la canción» si hay `recordingId`. La interpretación
(«Interpretado como…») sigue sobre la ficha.

### D5. «x» en otros tipos (columna lateral)

`OtherTypePanel` se transmite en su propio `Suspense` (fallback `null`). Llama a la búsqueda del otro tipo con
`localOnly: true`, sin filtros, y toma 3 filas. El mapeo es Artistas → álbumes, Álbumes → canciones y Canciones → álbumes;
Usuarios no tiene panel. Lleva título «"x" en álbumes», filas mini (carátula 40 px o icono, título, artista · año) y el
enlace «Ver álbumes →» a `/search?type=album&q=x`. Sin filas, no se pinta. Va después de los filtros y «Acotar». En el teléfono va **después** de los resultados (es un desvío, no un filtro): `ResultsLayout` suma un slot `asideAfter`, que desde `lg` se pinta en la misma columna lateral fija bajo `aside` y por debajo de `lg` sigue a la lista.

Coste: una consulta local por página, en paralelo con la pata remota. *Alternativa descartada:* contar en MusicBrainz.
Con el límite de ≥1,1 s por solicitud, duplicaría el tiempo de la página.

## Risks / Trade-offs

- [La regla no ve alias: P!nk no entra con «pink»] → Documentado. La elección muestra lo que el catálogo puede justificar; P!nk sigue en «Más resultados».
- [Discografías aún no exploradas (Nirvana) no cuentan] → Se mantiene el comportamiento de hoy. A medida que se visitan artistas, la regla mejora sola.
- [Una consulta local extra por página] → Va en paralelo y en `Suspense` propio. La lista no la espera.
- [La ficha de álbum sin tracklist puede parecer vacía] → Lleva carátula, datos y botones. La tracklist es un extra cuando existe.

## Migration Plan

Solo interfaz y lecturas locales; se revierte con el commit.

## Open Questions

Ninguna bloqueante. Habrá que medir en la fase 3 si «Otros álbumes» se vuelve rejilla solo cuando los títulos son
idénticos a la consulta.
