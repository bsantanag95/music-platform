## Context

Los géneros de hoy no son datos reales: `release_group_tag` (migración 0014) se llena con
`scripts/seed-release-group-tags.ts` y alimenta tres lecturas (los chips de `/explore`, el filtro de
`/caminos` y la cresta de géneros de la huella de gusto); `app_user.genres` (migración 0040) es una
lista cerrada de 20 claves propias, validada en la aplicación, con nombres en `messages/*/users.json`.
El ADR 0021 decidió no ingerir los géneros de MusicBrainz y dejó la fuente pendiente.

Mediciones de la exploración (2026-10-01/02), base de las decisiones:

- **Licencias.** `mbdump.tar.bz2` (tablas `genre`, `genre_alias`, `l_genre_genre`, `link`,
  `link_type`) es **CC0**. Los votos de género por entidad (`inc=genres`, tablas `*_tag` de
  `mbdump-derived`) son **CC BY-NC-SA 3.0**.
- **API.** `ws/2/genre/<mbid>` devuelve solo `{id, name, disambiguation}`: ni relaciones ni alias
  (la documentación lo confirma). La jerarquía solo existe en el dump.
- **Jerarquía.** 2.209 géneros; 1.591 relaciones "subgénero de" (casi un árbol: 7 géneros con más de
  un padre, profundidad máxima 5), 180 "fusión de", 1.749 "influido por". 112 raíces (73 con menos del
  0,1% del uso) y 513 huérfanos (3,8% del uso; 48 cubren el 95% de ese uso). "Latina" no es una rama:
  lo latino está repartido en ~15 raíces propias y subárboles de otras ramas.
- **Nombres.** MusicBrainz tiene 39 alias en español. Wikidata enlaza 2.178 géneros vía P8052 y ~1.173
  tienen etiqueta en español.
- **Semilla.** En el catálogo real, Wikidata P136 da géneros mapeables al 40% de los artistas y al
  42,6% de los álbumes de estudio (menos en singles, compilados y vivo); el 93,5% de los valores P136
  se traduce a un género de MusicBrainz. El browse de release-groups de MusicBrainz acepta
  `inc=url-rels` y trae la relación `wikidata` de cada álbum.
- **Datos actuales.** 3.355 filas sembradas en `release_group_tag`; 2 usuarios con géneros de
  identidad (rock, shoegaze, jazz, metal).

## Goals / Non-Goals

**Goals:**

- Taxonomía CC0 con jerarquía, slugs estables, nombres en español y familias curadas N:M.
- Semillas de género por artista y álbum desde Wikidata, sin requests nuevas a MusicBrainz y llegando
  a Wikidata solo por la relación que declara MusicBrainz.
- Una sola definición de "géneros efectivos de un álbum" (con herencia) que usen todas las lecturas.
- Reemplazar los datos falsos y unificar la identidad musical con la taxonomía.

**Non-Goals:**

- Votos de la comunidad y su puntaje (cambio 2): este diseño solo deja las semillas separadas.
- Chips de género en Artista/Álbum/Canción, página de género y selector abierto (cambio 3).
- Géneros propios de canción.

## Decisions

### D1. Fuentes por licencia: taxonomía de MusicBrainz, semillas de Wikidata

La lista de géneros y sus relaciones salen del dump core de MusicBrainz (CC0); los nombres en español y
los géneros por entidad salen de Wikidata (CC0). Nunca se piden `genres` ni `tags` a MusicBrainz.

- *Alternativa: votos de MusicBrainz.* Mejor cobertura y con peso, pero CC BY-NC-SA: no comercial y
  share-alike sobre los datos derivados (los puntajes del cambio 2 mezclarían votos propios). Revierte
  la decisión del ADR 0021. Descartada por el usuario.
- *Alternativa: jerarquía de Wikidata (P279).* Ruidosa y sin la granularidad de MusicBrainz.
- *Alternativa: leer la web de MusicBrainz.* Fuera de la API, descartada.

Lo registra un ADR nuevo (`0023-generos-taxonomia-y-semillas.md`) que **amplía** el ADR 0021 (géneros
del artista y entidad de Wikidata del álbum) sin reescribirlo.

### D2. Generación offline a un archivo versionado y carga por script

```
  mbdump.tar.bz2 ──tar (4 tablas)──▶ dir local ─┐
  Wikidata (SPARQL P8052: QID, es) ─────────────┼─▶ build-genre-taxonomy.ts ─▶ data/genres/taxonomy.json
  data/genres/curation.ts (familias, huérfanos, ─┘        (determinista,        │  (versionado,
     descriptores, ocultos, nombres corregidos)            orden estable)       │   diff revisable)
                                                                                ▼
                                                        load-genre-taxonomy.ts ─▶ genre, genre_relation,
                                                        (idempotente)       genre_family_member
```

- **Extracción:** el operador baja el dump y extrae solo 4 tablas y la marca del dump con el `tar` del
  sistema (`tar -xjf mbdump.tar.bz2 TIMESTAMP mbdump/genre mbdump/l_genre_genre mbdump/link
  mbdump/link_type`). `genre_alias` no hace falta: MusicBrainz tiene 39 alias en español y los nombres
  salen de Wikidata. `tar` con bzip2 viene en Linux, macOS y Windows 10+. El script recibe la carpeta.
  *Alternativa: descomprimir en streaming desde Node* — exige dependencias de bzip2 y tar; descartada
  por la regla de no sumar dependencias para un paso operativo de baja frecuencia.
- **Nombres:** una consulta SPARQL (`?item wdt:P8052 ?mbid`, etiqueta `es`) por el cliente de
  Wikimedia, que suma un método `sparql()` (mismo User-Agent y cola: sigue siendo el único punto de
  salida). Solo lo usa el script offline. Si P8052 enlaza un ítem de otro concepto (`classical` →
  "música culta", que es "art music"), una corrección editorial en `curation.namesEs` gana; no es
  traducción automática y queda en el diff. Si dos ítems enlazan el mismo género gana el de menor QID
  (con el dump de 2026-09-30 no hay ningún caso).
- **Archivo generado:** `data/genres/taxonomy.json` con, por género: `mbid`, `slug`, `name`
  (MusicBrainz), `nameEs` (o `null`), `wikidataId`, `kind`, `families`, y las relaciones. Ordenado por
  `mbid` para que el diff de una actualización muestre solo lo que cambió.
- **Carga:** `scripts/load-genre-taxonomy.ts` hace upsert por `mbid` en una transacción y reemplaza
  relaciones y pertenencias. Un género que ya no viene en el archivo (MusicBrainz lo fusionó o borró) se
  conserva con `kind = 'hidden'`, para no romper semillas ni URLs.
- *Alternativa: los datos en una migración SQL.* Cada actualización sería una migración de ~300 KB y
  mezclaría refresco de datos con cambios de esquema. Descartada; la migración solo crea el esquema.

### D3. Slugs estables

Se derivan del nombre de MusicBrainz (minúsculas, sin diacríticos, `&` → `and`, lo no alfanumérico →
`-`; "hip hop" → `hip-hop`, "r&b" → `r-and-b`). Al regenerar, el script **conserva el slug** de cada
`mbid` del `taxonomy.json` anterior, así un cambio de nombre en MusicBrainz no rompe URLs ni la
identidad musical. Las colisiones se resuelven con un sufijo determinista. `genre.slug` es único y tiene
`CHECK` de formato.

El slug es **uno solo, en inglés**, para todos los idiomas: es a la vez la URL (`?genero=`, y la futura
página de género), el parámetro de la API y la clave de la identidad musical. Sigue el criterio de los
ADR 0007 (segmentos neutros en inglés) y 0022 (el slug sale del nombre original, sin traducir); el nombre
visible sí se localiza (D4).

Se aparta del ADR 0022 en un punto, y el ADR 0023 lo justifica: el slug de género **se guarda y no lleva
id**. Las razones del ADR 0022 para no guardarlo (catálogo creado bajo demanda, carreras de escritura,
títulos que colisionan en masa) no aplican a una taxonomía fija, cargada por script, con nombres únicos.

- *Alternativa: slug por idioma (`rock-progresivo`).* Solo ~54% de los géneros tiene etiqueta en
  español, así que las URLs quedarían mezcladas; un cambio de etiqueta en Wikidata exigiría historial y
  redirecciones; habría dos URLs canónicas y haría falta otra clave para la identidad. Descartada.
- *Alternativa: `<nombre-localizado>-<id base58>` como el ADR 0022.* Coherente con el catálogo, pero
  URLs largas para un conjunto chico y estable, y también exige una clave aparte. Descartada.

### D4. Modelo de datos (migración 0056)

```
genre                     id UUID PK · mbid UUID UNIQUE · slug TEXT UNIQUE (CHECK formato)
                          name TEXT · name_es TEXT NULL · wikidata_id TEXT NULL (CHECK ^Q[0-9]+$)
                          kind TEXT CHECK IN ('style','descriptor','hidden') · created_at · updated_at
genre_relation            genre_id → genre · related_genre_id → genre
                          kind TEXT CHECK IN ('subgenre_of','fusion_of','influenced_by')
                          PK (genre_id, related_genre_id, kind) · CHECK genre_id <> related_genre_id
genre_family              key TEXT PK (CHECK formato) · tier CHECK IN ('main','more') · position UNIQUE
genre_family_member       genre_id → genre ON DELETE CASCADE · family_key → genre_family · PK ambos
artist_genre_seed         artist_id → artist CASCADE · genre_id → genre · position SMALLINT · PK
release_group_genre_seed  release_group_id → release_group CASCADE · genre_id → genre · position · PK
release_group             + wikidata_id TEXT NULL (CHECK) · + genres_synced_at TIMESTAMPTZ NULL
release_group_tag         DROP TABLE
```

- La dirección de `genre_relation` es siempre "`genre_id` es subgénero de / fusión de / influido por
  `related_genre_id`", la forma natural de recorrer hacia la raíz.
- Las 20 familias se insertan en la migración (son esquema de producto, no datos de MusicBrainz). Sus
  nombres viven en `messages/*` (vocabulario propio de la interfaz).
- Los nombres de género son datos del catálogo: `name_es` sale de la etiqueta de Wikidata y `name` de
  MusicBrainz; no hay traducción automática. Mismo criterio que los textos por idioma del perfil de
  artista (ADR 0021). Se documenta en `business-rules.md` (sección de internacionalización).
- Las semillas viven en tablas propias, separadas de los votos del cambio 2. El orden (`position`) es el
  de Wikidata y sirve de desempate.
- El artista no suma columna de vigencia: sus géneros se refrescan con `wikimedia_synced_at`.
- *Alternativa: `TEXT[]` de slugs en artista y álbum.* Sin FK ni índice por género; descartada.

### D5. Familias calculadas al generar, no en tiempo de ejecución

`data/genres/curation.ts` (TypeScript, con comentarios que explican cada decisión curada) define:
raíz → familias; subárboles culturales (lo latino y lo brasileño en otras ramas, p. ej. `latin pop`,
`trap latino`, `rock andino`, `latin jazz`); huérfanos curados (~80); descriptores; ocultos.
Para cada género, el script aplica en orden: oculto/descriptor → huérfano curado → raíces por
"subgénero de" (unión) + subárboles culturales (el género o un ancestro) → familias de los géneros de
los que es "fusión de" → por defecto `mundo`. El resultado queda materializado en `taxonomy.json` y en
`genre_family_member`.

El script **falla** si un nombre curado no existe en MusicBrainz (detecta renombres), si una familia
principal queda vacía o si aparece una clave de familia desconocida.

*Alternativa: calcular la pertenencia en SQL con CTE recursivas.* Esconde la curaduría en consultas y el
cambio de una regla no se vería en el diff de datos. Descartada.

### D6. Semilla del artista: P136 de la entidad que ya se baja

`fetchWikimediaEnrichment` ya pide la entidad del artista con `claims`. Un paso nuevo, aislado como los
demás (`tryStep`), lee P136 con semántica *truthy* (si hay valores `preferred`, solo esos; si no, los
`normal`; nunca `deprecated`), traduce cada QID a un género por `genre.wikidata_id`, descarta los que no
mapean o son `hidden`, y reemplaza `artist_genre_seed` en la misma escritura del enriquecimiento. Un
fallo del paso conserva las semillas anteriores. Sin entidad de Wikidata, el artista queda sin semilla.
Cero requests nuevas.

### D7. Semilla del álbum: entidad declarada en el browse + P136 en lote

- `browseReleaseGroupsByArtist` pasa a `inc=artist-credits+url-rels`; `saveDiscographyReleaseGroups`
  guarda `release_group.wikidata_id` desde la relación `wikidata` (y la pone en `NULL` si MusicBrainz la
  quitó). Cero requests nuevas a MusicBrainz.
- Al terminar la sincronización de la discografía (mismo `after()`), se toman los álbumes del artista
  con `wikidata_id` y `genres_synced_at` nulo o de más de 30 días, y se piden sus entidades a Wikidata
  con `wbgetentities` (`props=claims`) en lotes de 50. Para cada álbum: misma regla *truthy* que D6,
  reemplazo de `release_group_genre_seed` y `genres_synced_at = now()`. Un álbum sin `wikidata_id` se
  marca sincronizado sin semillas. Un fallo de un lote conserva las semillas de esos álbumes.
- Costo: un artista con 100 álbumes enlazados a Wikidata = 2 requests a Wikidata, en segundo plano.
- Un álbum que entró por búsqueda sin pasar por la discografía de su artista no tiene `wikidata_id`
  hasta que esa discografía se sincroniza; mientras, hereda (D8).
- *Alternativa: buscar el ítem en Wikidata por P436 (MBID del álbum).* Funciona, pero rompe la regla del
  ADR 0021 (llegar a Wikidata solo por la relación que declara MusicBrainz) y no hace falta, porque la
  relación viene gratis en el browse.

### D8. Géneros efectivos con herencia: una vista SQL

Vista `release_group_effective_genre (release_group_id, genre_id, position, inherited)`: las semillas
propias del álbum si tiene alguna; si no, los **3 primeros géneros de estilo** del **artista principal**
(primer crédito `primary` por `position`, misma regla que `primary-artists.ts`), con
`inherited = true`. Excluye `hidden`; los descriptores no se heredan. Explorar, Caminos y la huella la
consultan; ninguna repite la regla. El cambio 2 la redefine en una migración nueva para sumar votos.

El tope de 3 salió de la verificación en scratch: Pink Floyd tiene 7 géneros en Wikidata y el 5.º es
"blues rock"; heredando todos, sus 177 álbumes sin semilla propia inflaban la familia Blues (178 en
Explorar). Las primeras posiciones de P136 suelen ser los géneros principales (rock progresivo, rock
psicodélico, art rock). *Alternativa: heredar todos* — familias infladas; *solo el primero* — pierde
matices en artistas mixtos.

Los descriptores se leen aparte: los géneros efectivos de `kind = 'descriptor'` más "Banda sonora"
cuando `secondary_types` contiene `Soundtrack`. En este cambio ninguna superficie los muestra; las
lecturas de géneros filtran `kind = 'style'`.

*Alternativa: resolver la herencia en cada servicio.* Tres copias de la misma regla; descartada.

### D9. Lecturas que cambian

- **Explorar:** los chips muestran las 17 familias principales con su número de álbumes (las 3
  secundarias detrás de "Más"). `?familia=<clave>` lista los álbumes con algún género efectivo de la
  familia; `?genero=<slug>` lista los álbumes con ese género **o un subgénero** (CTE recursiva sobre
  `subgenre_of`). Prioridad si llegan varios: `decada` > `familia` > `genero`. Una clave o slug
  desconocido muestra el estado vacío. El orden del listado no cambia.
- **Caminos:** el selector ofrece familias; `/api/caminos/discover` acepta `family` y `genre` (slug,
  con subgéneros).
- **Huella de gusto (híbrida):** la cresta cuenta álbumes visibles por **familia** (top 8; un álbum suma
  una vez a cada familia de sus géneros efectivos) y, dentro de cada familia, nombra sus 2–3 géneros de
  estilo más presentes. Así sirve a los dos públicos: la barra da la lectura general ("Rock 12") y los
  géneros dan el carácter ("shoegaze, post-punk"). `genreDataAvailable` conserva su significado. La
  frase de resumen combina ambos niveles: "Su familia más presente es Rock, sobre todo shoegaze".
  - *Alternativa: solo familias.* Legible, pero "Rock 12" no dice nada al especialista. Descartada.
  - *Alternativa: solo géneros finos.* Demasiado fino para el usuario común, y los géneros heredados del
    artista pesan de más en 8 barras. Descartada.
- **Identidad musical:** `GENRES` pasa a 22 slugs de la taxonomía (`rock`, `punk`, `post-punk`,
  `indie-rock`, `indie-pop`, `shoegaze`, `metal`, `hip-hop`, `electronic`, `ambient`, `jazz`, `soul`,
  `funk`, `folk`, `blues`, `classical`, `pop`, `latin`, `reggae`, `experimental`, `country`,
  `bossa-nova`). La validación sigue siendo de lista cerrada; un test verifica que cada clave existe en
  `taxonomy.json` con `kind = 'style'`. Las etiquetas salen de la taxonomía según el idioma; se quitan
  las claves `musicIdentity.genres.*` de los mensajes.

### D10. Migración de `app_user.genres` sin inventar valores

La migración reescribe: `soul-funk` → `soul`, `funk`; `indie` → `indie-rock`, `indie-pop`; el resto
conserva su clave (los slugs coinciden). Quita duplicados conservando el orden. Si el resultado de un
usuario supera 5 géneros, la migración **aborta** con un error que nombra al usuario (falla cerrada),
en vez de truncar su elección. En la base real no hay valores afectados.

### D11. Retiro de los datos sembrados

`DROP TABLE release_group_tag` en la migración 0056 y se borra `scripts/seed-release-group-tags.ts`
(los datos eran inventados; no hay nada que migrar). Se actualizan las referencias en docs.

## Risks / Trade-offs

- [Cobertura parcial de Wikidata: ~40% de artistas, ~43% de álbumes de estudio, menos en singles y
  vivo] → herencia artista → álbum (D8) y votos de la comunidad (cambio 2). Las superficies muestran el
  estado vacío existente cuando no hay datos.
- [P136 a veces es grueso ("rock" para todo) o desordenado] → es solo semilla; el cambio 2 la corrige con
  votos y el orden de Wikidata solo desempata.
- [MusicBrainz renombra, fusiona o borra géneros] → slugs conservados por `mbid` (D3), géneros ausentes
  quedan `hidden` (D2) y el build falla si un nombre curado desaparece (D5).
- [El dump pesa 7 GB] → la regeneración es manual y poco frecuente; `tar` extrae solo 4 tablas y el
  archivo generado queda versionado, así que nadie más necesita el dump.
- [`url-rels` agranda la respuesta del browse] → mismo número de requests; el tamaño extra son unas pocas
  URLs por álbum.
- [Contrato roto de la identidad musical] → solo 2 usuarios con valores y ninguno afectado; la migración
  falla cerrada (D10).
- [La etiqueta en español falta en ~la mitad de los géneros] → se muestra el nombre de MusicBrainz; la
  mayoría de esos nombres se usa así en español ("shoegaze", "post-punk").
- [La vista de géneros efectivos en consultas de Explorar] → catálogo de ~7.500 álbumes; índices por
  `genre_id` en las tablas de semillas y de pertenencia.

## Migration Plan

1. `pnpm run db:migrate` (0056: esquema, familias, `DROP release_group_tag`, reescritura de
   `app_user.genres`).
2. `npx tsx --env-file=.env scripts/load-genre-taxonomy.ts` (carga `data/genres/taxonomy.json`).
3. `npx tsx --env-file=.env scripts/backfill-genre-seeds.ts` con `--limit` y `--dry-run`:
   (a) artistas con `wikidata_id`: P136 en lotes de 50; (b) artistas con discografía sincronizada:
   vuelve a recorrer el browse (guarda `wikidata_id` de sus álbumes) y siembra los álbumes.
4. Regenerar la taxonomía (solo al actualizarla): bajar el dump, extraer las 4 tablas y `TIMESTAMP`,
   `scripts/build-genre-taxonomy.ts --dump <dir>`, revisar el diff de `taxonomy.json`, commitear y
   volver al paso 2.

Rollback: las migraciones no tienen bajada. Revertir es una migración nueva. Las tablas nuevas son
independientes. Los datos borrados de `release_group_tag` eran sembrados y se pueden recrear con el
script desde el historial de git si hiciera falta.

## Open Questions

- ¿"Del mundo", "Religiosa" y "Palabra y escena" muestran contadores en el "Más" de Explorar o solo el
  enlace? Se decide en la implementación de la UI mínima; no afecta datos.
- Frecuencia de regeneración de la taxonomía (propuesta: trimestral o a pedido). Operativo, no bloquea.
