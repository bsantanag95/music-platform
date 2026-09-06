# Design — add-recording-album-search

## Context

`catalog-search` hoy cubre artistas y álbumes; las canciones quedaron diferidas (D2 en
`add-search-results-page`) porque no existía un camino de ingesta de una grabación suelta. Sin
embargo el usuario que busca `artista + canción` lo que necesita es **llegar al álbum**. El modelo
relacional ya existe (`recording → track → release → release_group`, ver `03-data/sql-model.md`),
y `recording-detail.ts` ya sabe listar las apariciones locales de una canción. Lo que falta es:
(a) buscar recordings en MusicBrainz, (b) resolver sus apariciones en frío, y (c) exponerlas como
sección contextual de `/search` — sin convertir la canción en resultado navegable.

Restricciones del entorno:
- Único punto de salida a MusicBrainz: `src/services/musicbrainz/client.ts` (cola ≥1.1s,
  `User-Agent` obligatorio, caché TTL solo para búsquedas).
- "Cacheo bajo demanda": la ingesta pesada (tracklist, carátula) ocurre al abrir la entidad, no
  al buscar.
- Incidente documentado (AGENTS.md, Pink Floyd 2026-08): datos parciales cacheados pueden
  "congelar" entidades con contenido incompleto. Este diseño no debe poder contaminar la vista
  de álbum.
- API de MusicBrainz (verificada en la doc oficial): el **browse** `/release?recording=<mbid>`
  acepta `inc=release-groups` (hasta 100/página); la **búsqueda** `/recording?query=` acepta
  `inc=artist-credits` y entrega `length` y `first-release-date`. El *lookup* de recording limita
  las entidades ligadas a 25 — por eso se usa browse, no lookup, para las apariciones.

## Goals / Non-Goals

**Goals:**
- `searchCatalog` detecta una canción en la consulta y devuelve los álbumes que la contienen
  (`release_group` deduplicados), con `id` local enlazable a `/album/<id>`.
- Ingesta fría idempotente de una grabación suelta (`findOrIngestRecording`): solo `recording`,
  `credit` y stubs de `release_group` — nunca `release`/`track` parciales.
- Coste acotado: ≤1 request extra de búsqueda cacheada + ≤1 browse por canción nueva detectada.
- Degradación: cualquier fallo en la pata de canción debe ser invisible — `songContext` se omite
  y los resultados de artistas/álbumes se sirven igual.

**Non-Goals:**
- Pestaña "Canciones", tarjetas de canción en `results`, páginas de canción en frío.
- Ingesta de tracklists de los álbumes encontrados (sigue al abrir el álbum).
- Múltiples candidatos de canción por búsqueda (v1: un solo mejor candidato).
- Full-text, paginación, ranking (siguen diferidos).

## Decisions

### D1. `songContext` como clave opcional del endpoint, `results` intacto

`GET /api/catalog/search` pasa a devolver `{ results, songContext? }`. `results` mantiene el
contrato exacto (kind `artist | release-group`); `songContext` es:

```json
{
  "recordingId": "uuid",
  "mbid": "uuid",
  "title": "Stairway to Heaven",
  "artistName": "Led Zeppelin",
  "albums": [
    { "id": "uuid", "mbid": "uuid", "title": "Led Zeppelin IV",
      "category": "studio", "year": 1971 }
  ]
}
```

**Por qué no** meter los álbumes de `songContext` dentro de `results`: mezclaría dos señales de
relevancia distintas (coincidencia de título vs. contención de canción) y rompería el orden
determinista y las pestañas existentes. **Por qué no** un endpoint nuevo: el cliente (Server
Component + `searchCatalog`) ya hace una sola llamada; un endpoint aparte duplicaría la
coordinación y el rate budget sin beneficio. Alternativa descartada: SSE/petición paralela
desde el cliente — complejidad no justificada para una sección secundaria.

`searchCatalog` cambia su firma a `Promise<{ results; songContext }>` (la página `/search` y el
route handler son los únicos consumidores, más tests).

### D2. Pipeline de detección: dos fuentes que se unen (local + MusicBrainz)

1. **Fuente local**: `recording`s con `title ILIKE %songPart%` (índice `idx_recording_title` ya
   existe) que tengan al menos una aparición vía `track`. Con hint de artista, además debe
   coincidir el crédito primario. **No es un camino exclusivo**: sus apariciones son una fuente
   más de la unión (rescatan grupos que la página de 100 de MusicBrainz puede truncar). Retorno
   del early-return original: la v1 cortaba acá y la sección ENCOGÍA al calentarse — al abrir un
   álbum, la vista local parcial reemplazaba a la vista remota completa (ver D8).
2. **Fuente MusicBrainz (corre siempre)**: `searchRecording(query)` — con hint de artista,
   cláusula `"<canción>" AND (rgid:…)` acotada a sus release-groups propios; si no, texto libre
   `q` (ver D4). Se browsean los primeros 4 candidatos relevantes y se unen sus apariciones.
3. **Fusión**: dedupe por `release_group` conservando el año mínimo; la identidad del contexto
   (`recordingId`/`mbid`/`title`/`artistName`) es la contribución con mayor `release-count`, y es
   la ÚNICA grabación que se ingiere.
4. **Sin ninguna fuente o fallo total** de la pata de recordings sin aporte local → se omite
   `songContext` (la búsqueda de artistas/álbumes sigue exactamente igual que hoy, incluido el
   502 solo si además no hay nada local). MusicBrainz caído con apariciones locales = sección
   servida solo por local (degradación explícita, no el camino feliz).

El browse de apariciones se **cachea igual que las búsquedas** (`cachedSearch`, clave
`recordingReleases|<mbid>`) porque alimenta contexto de búsqueda, no ingesta: el supuesto de
"frescura al abrir una entidad" no aplica. La página de canción en frío no consume este dato.

### D3. `findOrIngestRecording(mbid, seed)` escribe SOLO recording + créditos + stubs de álbum

- `INSERT recording (mbid, title, duration_sec) ON CONFLICT (mbid) DO NOTHING` y re-read (idemp
  otente, espejo de `upsertReleaseGroupStubs`).
- `ingestCredits(seed.artistCredit, { recordingId })` — reutilizado tal cual (ADR 0004); crea
  los stubs de artista que falten.
- Cada release-group de las apariciones se persiste con `upsertReleaseGroupStubs` (stub: mbid +
  título + categoría; sin tracklist ni carátula).
- **Prohibido** insertar `release`/`track` desde este path: `findOrIngestTracklist` devuelve el
  release existente tal cual sin volver a MusicBrainz, así que un tracklist parcial congelaría el
  álbum con datos incompletos (misma familia de incidente que `discography_synced_at` en
  smoke tests). Las apariciones de la sección de búsqueda se calculan **en vivo** desde la
  respuesta de browse; al re-visitarse, si el álbum ya fue abierto, `getRecordingDetail`-style
  query local (paso 1) toma la versión cacheada completa.
  Consecuencia aceptada: un stub de `recording` creado por búsqueda no tiene apariciones locales
  hasta que se abra uno de sus álbumes — irrelevante porque la búsqueda no enlaza a la canción.

### D4. Selección del candidato: hint de artista con cláusula `rgid`, filtro de tokens y clúster de duplicados

MusicBrainz devuelve recordings para casi cualquier texto, y la verificación contra datos reales
(`Sabrina Carpenter taste` y `Led Zeppelin Stairway to Heaven`, 2026-09) mostró tres trampas que
el "top-1 + contención" ingenuo no sobrevive:

1. **Bootlegs por texto libre**: la query literal `sabrina carpenter taste` puntúa con score 100
   a `sabrina carpenter - taste (dudda bootleg)` (un bootleg cuyo TÍTULO es la consulta entera) y
   entierra la grabación real. Reglas:
   - **Hint de artista + cláusula `rgid`**: si un candidato de artista ya reconocido en esta misma
     búsqueda (local o pata de artistas de MusicBrainz) está contenido literalmente en `q`, la
     búsqueda de recordings se acota a sus release-groups PROPIOS:
     `"<songPart>" AND (rgid:a OR rgid:b …)`. `rgid` es un campo del índice de recordings
     ("MBID de cualquier release group que incluya esta grabación"), y la lista de rgids sale de
     créditos locales (coste cero) o de un `browseReleaseGroupsByArtist` del hint, **ordenada por
     categoría** (estudio primero) antes del tope de 120: truncar en orden de uuid dejó fuera
     [Led Zeppelin IV] / *Short n' Sweet* en la verificación inicial.
   - **Por qué no `artist:"nombre"` ni `arid:`** (descartados empíricamente): `artist:` busca por
     NOMBRE del crédito y está contaminado por bandas de cover acreditadas literalmente como el
     artista real (misma puntuación, apariciones basura); y la grabación de estudio de *Stairway
     to Heaven* **no tiene artist-credit** en MusicBrainz (defecto de datos real), así que
     ninguna consulta por artista (nombre o mbid) la encuentra — solo la acota el rgid del álbum.
     Sin lista de rgids disponible se degrada a `artist:"nombre"` (peor pero algo), y sin hint a
     texto libre.
   - **Techo de tokens extra**: cuando el título contiene la consulta pero le sobran más de 2
     tokens, se descarta — evita que "sabrina carpenter - taste (dudda bootleg)" pase por "taste"
     cuando no hay hint. Versiones tipo "Taste (live)" siguen pasando.
 2. **Grabaciones legítimas duplicadas**: "Taste" de Sabrina Carpenter son SEIS `recording`
    distintas con score 100 idéntico; la primera aparece solo en un pseudo-álbum de un solo
    release y la canónica (52 releases, incluye *Short n' Sweet*) es la tercera del lote. El
    orden dentro de un empate de score no es fiable, y ninguna grabación individual tiene todas
    las apariciones (la de estudio vive en IV y en compilaciones; la del Live Festival vive en
    *How the West Was Won* — y el dominio propio trata la canción como una entidad que acumula
    apariciones, ver `01-domain/domain-model.md`). Regla: se browsean los **primeros 4
    candidatos** relevantes en orden de score y se **unen** sus apariciones (ver D8); el
    `release-count` del browse no corta el recorrido sino que solo decide la **identidad** del
    contexto (la grabación canónica), que es la única que se ingiere. Cada browse está cacheado
    por mbid con la TTL de búsquedas, así que el coste completo es solo del primer golpe.

Variantes (live/remix/edit): siguen siendo otro candidato del lote ("Taste (demo)" score 92); el
filtro de título y el orden de score las dejan detrás de la canónica, que es el comportamiento
deseado. La sección se rotula con el título de la canción, y "Álbumes que contienen «X»" sigue
siendo cierto aunque X sea una variante.

### D5. Deduplicación y orden de los álbumes de `songContext`

Muchos releases (prensiones distintas) comparten `release_group`: se agrupa por rg (mbid), se
conserva el `year` = año del release **más antiguo** del grupo (proxy del álbum original); al unir
varias fuentes (D8) el año mínimo se propaga entre contribuciones. Orden:
categoría (`studio` → `single_ep` → `compilation` → `live_other`), luego año asc, luego título.
Techo de **12** álbumes mostrados (el browse pide 100 releases; con grouping suele sobrar). Los
álbumes se excluyen si ya aparecen en `results` como coincidencia de título — evitar duplicados
visuales obvios en la misma página.

### D6. UI: sección contextual sobre las pestañas, sin pestaña nueva

`SearchResults` recibe `songContext?` y renderiza arriba de las pestañas un bloque
"Álbumes que contienen «<título>»" con filas de álbum idénticas a las existentes
(`LazyCoverImage` por `releaseGroupId`, enlace a `/album/<id>`). Las pestañas **Todo/Artistas/
Álbumes** quedan intactas. La sección no se filtra por pestaña (es contexto, no listado).
Mensajes nuevos en namespace `catalog` (es/en): título de sección con interpolación del nombre de
canción.

### D7. Contrato y docs

- `docs/04-api/contracts.md`: sección de `search` documenta `songContext` (opcional, puede
  omitirse en cualquier momento — los clientes deben tratarlo como dato adicional no esencial).
- `openspec/specs/catalog-search`: delta reemplaza la requirement de "canciones fuera de alcance"
  (queda "sin pestaña de canciones" pero con resolución a álbumes).
- Roadmap: nota de D2 resuelto parcialmente (la pestaña Canciones sigue diferida: sigue sin
  decidirse qué muestra la página de canción en frío; `findOrIngestRecording` ya existe).
- `code-walkthrough.md`: nuevos métodos del cliente y `ingest-recording.ts`.
- Sin migración SQL (no hay cambio de esquema) → sin actualización de `sql-model.md`.

### D8. Corrección: unión de versiones y fin del early-return local (validación con usuarios, 2026-09)

Dos defectos detectados al probar la v1 contra datos reales y uso caliente:

1. **La sección encogía al calentarse**: el early-return de la pata local hacía que, una vez
   abierto un álbum de la canción, la búsqueda pasara a mostrar SOLO los álbumes con tracklist
   ingerido (el caso Led Zeppelin: tras abrir IV, la sección quedó en un solo álbum). Un caché no
   puede hacer la vista menos informativa.
2. **Una sola grabación nunca tiene todas las apariciones**: MB fragmenta la canción entre tomas
   (la de estudio en IV/compilaciones, la del Festival in Reading en *How the West Was Won*), y
   elegía una por `release-count` y mostraba solo las suyas.

**Corrección adoptada (opción A, aprobada)**: el contexto es la **unión** de las apariciones de
las dos fuentes — primeros 4 candidatos de la búsqueda de recordings (cada uno en su propia
ventana de caché por mbid) ∪ apariciones locales ya ingeridas. La identidad del contexto sigue
siendo una sola grabación (mayor `release-count`) y sigue habiendo UNA sola ingesta de
grabación por búsqueda. El coste del plan alternativo (tabla SQL `recording_appearance` con
política de staleness) queda descartado para v1: el presupuesto por mbid cacheado lo hace
amortizable; si la latencia cold (~4–5s primera vez, 0 dentro de TTL) molesta en beta, se
reconsidera como mejora futura.

## Risks / Trade-offs

- [Canción con >100 releases (compilaciones masivas)] → el browse devuelve la primera página
  (orden alfabético por gid, no cronológico): pueden faltar álbumes de esa grabación. Mitigación
  extra (D8): la unión de 4 candidatos + apariciones locales cubre más que una sola fuente; aun
  así es una señal, no la fuente de verdad de la canción — la página del álbum sigue siendo el
  camino canónico. Se documenta en contracts.md. Paging completo queda como mejora futura.
- [Falso positivo: la consulta era un álbum homónimo a una canción] → convive: `results` muestra
  el álbum igual; la sección es aditiva y etiquetada. El filtro D4 evita ruido para consultas
  arbitrarias.
- [Falso negativo del hint] → si el nombre del artista en `q` no coincide literalmente con ningún
  candidato (typo, alias), se cae a la búsqueda por texto libre con el filtro de tokens: peor
  precisión, pero sin requests extra.
- [Latencia en primer golpe en frío] → worst case 7 requests serializados por la cola (~7–8s:
  artista + álbum + recording + 4 browses de candidatos, +1 discografía si el hint no tiene
  créditos locales). Mitigaciones: cada browse queda cacheado por mbid (TTL 10 min) — las
  búsquedas populares se pegan en la ventana; una falla en esta pata jamás rompe `results`; y la
  unión hace que el coste por request rinda más álbumes. Aceptado para v1 — es la asimetría
  habitual del "cacheo bajo demanda".
- [Versiones en vivo/remix mezcladas en la lista] → decisión de producto explícita (aprobada
  2026-09): a efectos de "álbumes que contienen «canción»", cualquier versión cuenta; coherente
  con el dominio (una Canción acumula apariciones). El orden por categoría/año mantiene la toma
  canónica arriba.
- [Caché del browse en TTL 10min puede servir apariciones desactualizadas] → irrelevante: si
  cambia la discografía, la visita al álbum ya trae lo fresco.
- [Stubs de recording sin apariciones locales] → por diseño (D3); nada en la UI enlaza a la
  canción desde la búsqueda, y cuando el álbum se abra la canción quedará completamente ingerida.

## Migration Plan

Sin cambios de esquema. Deploy normal. Rollback = revertir el commit: `songContext` es aditivo y
los consumidores lo tratan como opcional.

## Open Questions

- Ninguno bloqueante. Candidatos a iteración futura (fuera de alcance): pestaña Canciones real
  (precondición D2 original ya existe en parte — falta decisión de producto sobre la página en
  frío), paging del browse, y ranking cross-tipo cuando haya datos de uso.
