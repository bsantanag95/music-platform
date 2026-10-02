# ADR 0023 — Géneros: taxonomía CC0 de MusicBrainz y semillas de Wikidata

## Estado

Aceptado (cambio `add-genre-taxonomy`, 2026-10). Amplía el ADR 0021 sin reemplazarlo.

## Contexto

Los géneros de la plataforma eran dos vocabularios desconectados y sin datos reales: la tabla
`release_group_tag`, sembrada a mano por un script (un diccionario de 20 artistas y "rock"/"pop" de
relleno), y la lista cerrada propia de `app_user.genres` ("soul-funk", "indie"). El ADR 0021 decidió
no ingerir los géneros de MusicBrainz y dejó la fuente pendiente, con Wikidata P136 como alternativa
CC0.

Mediciones de la exploración (2026-10-01/02):

- **Licencias.** El dump core de MusicBrainz (`mbdump.tar.bz2`: `genre`, `l_genre_genre`, `link`,
  `link_type`) es CC0. Los votos de género por entidad (`inc=genres`, tablas `*_tag` del dump
  `mbdump-derived`) son etiquetas CC BY-NC-SA 3.0.
- **API.** `ws/2/genre/<mbid>` no devuelve relaciones ni alias: la jerarquía solo existe en el dump.
- **Jerarquía.** 2.209 géneros; 1.591 "subgénero de" (casi un árbol, profundidad ≤ 5), 180 "fusión
  de", 1.749 "influido por"; 112 raíces, 73 de ellas con menos del 0,1% del uso. "Latina" no es una
  rama: lo latino está repartido en ~15 raíces propias y subárboles de otras ramas.
- **Nombres.** MusicBrainz tiene 39 alias en español; Wikidata enlaza 2.182 géneros por P8052 (ID de
  género de MusicBrainz) y ~1.170 tienen etiqueta en español.
- **Semillas.** En un catálogo de prueba de 7.577 álbumes, P136 da géneros traducibles al 40% de los
  artistas y al 43% de los álbumes de estudio; el 93,5% de sus valores corresponde a un género de
  MusicBrainz. El browse de release-groups de MusicBrainz acepta `inc=url-rels` y trae la relación
  `wikidata` de cada álbum.

## Decisión

1. **Taxonomía de MusicBrainz, solo CC0.** Los géneros y sus relaciones salen del dump core. Se
   generan offline (`scripts/build-genre-taxonomy.ts`) a un archivo versionado
   (`data/genres/taxonomy.json`, un género por línea, revisable en el diff) y se cargan con un
   script idempotente (`scripts/load-genre-taxonomy.ts`). Nunca se piden `genres` ni `tags` a
   MusicBrainz.
2. **Nombres en español desde Wikidata (P8052), sin traducción automática.** Si P8052 enlaza un
   ítem de otro concepto ("classical" → "música culta"), una corrección editorial versionada en
   `data/genres/curation.ts` gana. En inglés se usa el nombre de MusicBrainz.
3. **Slug único, en inglés y guardado.** Es la clave de la URL, de la API y de la identidad
   musical, estable por MBID aunque MusicBrainz renombre el género. Se aparta del ADR 0022 (slug
   decorativo, sin guardar, con id): las razones de ese ADR (catálogo creado bajo demanda, carreras
   de escritura, títulos que colisionan) no aplican a una taxonomía fija cargada por script. Sigue
   al ADR 0007 (segmentos neutros en inglés).
4. **20 familias curadas, N:M**, calculadas al generar: raíz → familias, subárboles culturales
   (Latina = Latinoamérica y el Caribe hispano; Brasileña aparte; España va a Folk), huérfanos
   curados, "fusión de", y "Del mundo" por defecto. Descriptores (Instrumental, Navideña, Orquestal;
   Banda sonora desde el tipo `Soundtrack`) y ocultos aparte.
5. **Semillas desde Wikidata P136 (CC0), llegando a Wikidata solo por relaciones que declara
   MusicBrainz** (amplía el ADR 0021): el artista toma P136 de la misma entidad que ya baja el
   enriquecimiento; el álbum guarda la relación `wikidata` que MusicBrainz declara en el browse de
   discografía y se consulta en lotes de 50 en segundo plano. Nunca se busca una entidad por nombre
   ni por P434/P436. Las semillas se guardan aparte de los futuros votos de la comunidad.
6. **Géneros efectivos con herencia en una vista** (`release_group_effective_genre`): las semillas
   propias del álbum o, si no tiene, los 3 primeros géneros de estilo de su artista principal.

## Alternativas descartadas

- **Votos de género de MusicBrainz.** Mejor cobertura y con peso, pero CC BY-NC-SA: no comercial y
  share-alike sobre datos derivados (los puntajes futuros mezclarían votos propios).
- **Jerarquía de Wikidata (P279).** Ruidosa y sin la granularidad de MusicBrainz.
- **Buscar el ítem del álbum en Wikidata por P436.** Funciona, pero rompe la regla del ADR 0021 y no
  hace falta: la relación viene en el browse.
- **Datos de la taxonomía en una migración SQL.** Cada actualización sería una migración enorme que
  mezcla datos con esquema.
- **Heredar todos los géneros del artista.** Un género secundario (5.º de 7 en Pink Floyd) inflaba
  una familia entera en Explorar.

## Consecuencias

- Cobertura parcial de las semillas (más baja en singles y en vivo); la herencia y los votos de la
  comunidad (cambio posterior) cubren el resto.
- Actualizar la taxonomía exige bajar el dump (~7 GB) y extraer 4 tablas con `tar`; es manual y poco
  frecuente, y nadie más necesita el dump.
- Las licencias no cambian: todo lo que se guarda de géneros es CC0 (`docs/03-data/data-licensing.md`).
