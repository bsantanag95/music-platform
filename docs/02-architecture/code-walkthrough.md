# Walkthrough de código — Fases 1 y 2

Este documento explica, archivo por archivo, todo lo que existe hoy en el repo fuera de `/docs`, y cómo esas piezas se conectan entre sí cuando alguien busca un artista. Está pensado para volver a leerlo en unos meses sin tener que reconstruir el razonamiento desde cero — el resto de `/docs` explica el *por qué* de las decisiones; este documento explica el *cómo* del código concreto.

## Mapa de carpetas

```
music-platform/
├── drizzle/                    Migraciones SQL, en orden, escritas a mano
├── src/
│   ├── app/                    Next.js App Router: páginas y rutas de API
│   ├── db/                     Conexión a la base y su mirror en Drizzle
│   └── services/
│       ├── musicbrainz/        Cliente de la API externa + mapeos de vocabulario
│       ├── catalog/            Orquestación del cacheo bajo demanda
│       └── cover-art.ts        Helper de Cover Art Archive
├── scripts/                    Scripts de desarrollo (no se despliegan)
└── .github/workflows/          CI
```

## `drizzle/` — las migraciones

- **`0000_initial.sql`** — el esquema completo diseñado en la Fase 0: las 10 tablas, sus `CHECK constraints`, los índices únicos parciales, y los dos triggers (`fn_check_membership_types`, `fn_touch_updated_at`). Es la migración fundacional; todo lo demás se construye sobre esto.
- **`0001_artist_type_unknown.sql`** — agrega `'unknown'` a los valores válidos de `artist.type`. Surgió construyendo la Fase 2: al ingerir un crédito (ej. un feat.) no vale la pena gastar una llamada extra a MusicBrainz solo para saber si ese artista es persona o banda, así que se guarda como "desconocido" hasta que alguien visita su perfil directamente.

## `src/db/` — la conexión a la base

- **`schema.ts`** — el mirror en TypeScript de las tablas, usado para dar autocompletado y tipado a las queries (`db.select().from(artist)...`). No genera migraciones — ver ADR 0005 en `/docs`. Al final del archivo se exportan los tipos inferidos de cada tabla (`ArtistRow`, `ReleaseGroupRow`, etc.) que el resto del código importa.
- **`index.ts`** — crea el cliente de Postgres (`postgres.js`) y lo envuelve con Drizzle. Falla explícitamente si falta `DATABASE_URL`.
- **`migrate.ts`** — el runner de migraciones: lee los archivos `.sql` de `/drizzle` en orden, lleva registro de cuáles ya se aplicaron en una tabla `_migrations`, y aplica los pendientes dentro de una transacción cada uno. Se corre con `npm run db:migrate`.

## `src/services/musicbrainz/` — el cliente de la API externa

- **`client.ts`** — el único punto del sistema que le habla a `musicbrainz.org`. Implementa una cola en memoria que fuerza como mínimo 1.1 segundos entre requests (el límite real es 1 req/seg, se deja margen), y exige un `User-Agent` identificable o directamente lanza un error — MusicBrainz penaliza fuerte a los clientes anónimos. Expone cuatro métodos: `searchArtist`, `browseReleaseGroupsByArtist`, `getReleaseGroup`, `getRelease`.
- **`types.ts`** — los tipos mínimos de las respuestas de MusicBrainz que efectivamente se usan (no el esquema completo de su API, que es mucho más grande).
- **`mappers.ts`** — traduce el vocabulario de MusicBrainz al vocabulario propio: `mapArtistType` (`Person`/`Group`/... → `person`/`group`) y `mapReleaseGroupCategory` (`primary-type` + `secondary-types` → `studio`/`single_ep`/`compilation`/`live_other`).

## `src/services/catalog/` — la orquestación del cacheo bajo demanda

Esta es la carpeta que implementa el patrón central del proyecto: consultar la base propia primero, y solo si falta, ir a buscar afuera y guardar el resultado.

- **`ingest-artist.ts`** — `findOrIngestArtist(name)` es el punto de entrada: busca localmente por nombre, y si el registro que encuentra no tiene `mbid` (un "stub" creado desde un crédito de otro artista) lo enriquece en vez de devolverlo tal cual. Si no hay nada local, busca en MusicBrainz y hace upsert. También expone `upsertArtistStub`, usado por `ingest-discography.ts` para crear referencias mínimas a artistas credited.
- **`ingest-discography.ts`** — `findOrIngestDiscography(artistMbid)` trae todos los álbumes donde ese artista aparece acreditado y los cachea. `ingestCredits(...)` es la pieza más interesante: toma el array `artist-credit` que devuelve MusicBrainz y lo mapea casi 1:1 al modelo `CREDIT` del proyecto — posición 0 es `primary`, el resto `featured`, y el `joinphrase` de MusicBrainz es literalmente el `join_phrase` propio.
- **`ingest-release.ts`** — `findOrIngestTracklist(releaseGroupId, releaseGroupMbid)` trae la edición "oficial" de un álbum (o la primera disponible) con su tracklist completo, crea las `recording` y `track` correspondientes, y llama a `ingestCredits` por cada canción que tenga créditos propios.

## `src/services/cover-art.ts`

Un solo helper: `coverThumbUrl(releaseMbid)` arma la URL de la miniatura de 250px en Cover Art Archive. Nunca construye una URL de resolución completa — es la decisión de licencia documentada en `03-data/data-licensing.md` aplicada directamente en código, no solo como política.

## `src/app/` — lo que expone la aplicación

- **`layout.tsx`** / **`page.tsx`** — el placeholder mínimo de la Fase 1, solo confirma que el esqueleto levanta. El diseño real de producto llega en la Fase 3.
- **`api/catalog/search/route.ts`** — `GET ?q=nombre`: llama a `findOrIngestArtist` y después a `findOrIngestDiscography`, devuelve ambos en JSON. Es la ruta que ejercita el flujo completo descripto abajo.
- **`api/catalog/release-group/[id]/route.ts`** — `GET` sobre un álbum ya conocido: llama a `findOrIngestTracklist`, arma la URL de carátula, y devuelve el tracklist con duración de cada canción.

## `scripts/smoke-test-ingestion.ts`

No se despliega — es un fixture de desarrollo. Reemplaza `global.fetch` por uno que devuelve respuestas con la forma exacta de MusicBrainz (usando los mbid reales de Pink Floyd y Roger Waters) y corre el pipeline completo contra una base Postgres real, sin necesitar salida a internet. Sirve para probar cambios en la lógica de ingesta sin gastar el rate limit real, y quedó como referencia para escribir tests de verdad más adelante.

## El flujo completo de una búsqueda

El diagrama de arriba es exactamente lo que hace `GET /api/catalog/search?q=...`:

1. La ruta llama a `findOrIngestArtist(nombre)`.
2. Si ya existe en la base local **con `mbid`**, se devuelve directo — sin tocar la red.
3. Si no existe (o existe como stub sin `mbid`), se consulta MusicBrainz respetando el rate limit, y el resultado se cachea (`upsert` sobre `artist`).
4. Con el `mbid` del artista ya resuelto, se llama a `findOrIngestDiscography`: trae los álbumes, los cachea, y por cada uno crea sus créditos — lo que puede a su vez crear artistas "stub" nuevos si hay colaboradores todavía no vistos.
5. La ruta responde con el artista y su discografía en JSON.

Abrir después un álbum puntual (`GET /api/catalog/release-group/[id]`) dispara el mismo patrón un nivel más abajo: si esa edición todavía no tiene tracklist cacheado, se pide a MusicBrainz, se guardan `recording` + `track` + créditos por canción, y recién ahí se responde.

## Algo que la propia construcción destapó

Corriendo esto contra una base real, aparecieron dos casos que el diseño original no contemplaba, ambos en `findOrIngestArtist`:

1. **Un stub sin `mbid` en absoluto** (ej. datos cargados a mano) se devolvía tal cual sin intentar completarlo. Corregido: ahora se trata igual que si no existiera.
2. **Un stub creado desde un feat., que ya tiene `mbid` real pero `type: 'unknown'`** (ej. Farruko aparece credited en un track de Sabrina Carpenter, y alguien busca "Farruko" directamente después). El chequeo original (`if (local?.mbid) return local`) confundía "tiene `mbid`" con "ya está completo" — un stub también tiene `mbid`, así que nunca se enriquecía. Corregido: ahora se distingue `mbid` de `type !== 'unknown'`, y cuando falta solo el tipo, se consulta a MusicBrainz **por id directo** (`getArtist(mbid)`), no por nombre — para no arriesgar traer un homónimo distinto al artista que ya había quedado credited.
