## Context

`rank.ts` ordena por nivel de coincidencia, actividad, notoriedad (`count` de ediciones en MusicBrainz), cacheado y
orden de MusicBrainz. Cada búsqueda persiste sus candidatos como stub, así que "estar en la base" no es señal. Los
índices `gin_trgm_ops` sobre `search_normalize(name|title)` existen desde la migración 0050.

## Decisions

### D1. "Artista explorado" como señal

Un artista con `discography_synced_at` es uno cuya página alguien abrió: es la única señal local que distingue el
disco conocido de los stubs de la búsqueda. `exploredScores` (por id de disco o grabación) y `exploredArtistMbids`
(para grupos de canciones que solo trajo MusicBrainz) se consultan en paralelo con la actividad, en una consulta por
tipo sobre los candidatos de la página. En discos vale 2 si es de estudio y 1 si no, para que "The Wall" (1979) vaya
antes que el sencillo homónimo de 2023 del mismo artista. Va tras la actividad: lo valorado o escuchado manda.

La coincidencia local (`matchLocalReleaseGroups`, `matchLocalRecordings`) suma la misma señal como segundo término
del `ORDER BY` tras la similitud, antes del `LIMIT` de su reserva: sin eso, el álbum podía quedar fuera.

Alternativas descartadas: contar ediciones locales (en scratch las de The Wall son 0); una segunda consulta a
MusicBrainz con `primarytype:album` (cuesta una request por búsqueda).

### D2. "¿Quisiste decir…?" desde el catálogo

`suggestSpelling` usa el operador `%` de pg_trgm (umbral por defecto 0,3) con los índices de la 0050 y exige
similitud ≥ 0,45. Primero el campo del tipo y, en discos y canciones, el nombre de artista ("pink floid" en Álbumes →
"Pink Floyd", que lista sus discos). Ante empate, gana lo de un artista explorado. Se calcula cuando la lista quedó vacía o
es "débil": ningún resultado cubre todas las palabras (`coverageLevel` = 4). La verificación mostró que un error de
tipeo casi nunca deja la lista vacía: MusicBrainz devuelve "Pink" de Four Tet y de Aerosmith para `pink floid`. Una
búsqueda con una coincidencia completa no paga la consulta. Medido en scratch: 5–200 ms.

### D3. Estado vacío según la causa

Con filtro activo la causa es el filtro: "Nada con estos filtros" + "Quitar filtros" (misma búsqueda sin parámetros de
filtro), sin consejos. Sin filtro: título por tipo, sugerencia, consejos, otros tipos y búsqueda avanzada. Las
pastillas se ocultan cuando no hay nada que filtrar.

## Risks / Trade-offs

- Un artista explorado con un disco homónimo poco relevante puede adelantarse a uno muy conocido no explorado; la
  actividad sigue mandando sobre esta señal.
