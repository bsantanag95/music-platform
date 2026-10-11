## Context

ADR 0032 fija la fuente: curaduría manual en JSON versionado, con resolución de MBID asistida y carga idempotente,
como la taxonomía de géneros (`data/genres/taxonomy.json` → `scripts/load-genre-taxonomy.ts`). La exploración
(2026-10-10) mostró que Wikidata no sirve ni como borrador y que en la búsqueda de MusicBrainz álbumes y artistas
resuelven sin ambigüedad, pero las grabaciones no (mezclas Atmos, megamixes, lyric videos con score 100).

Piezas del catálogo que se reutilizan: `upsertReleaseGroupStub` y `upsertArtistStub` (stubs sin sobrescribir),
`findOrIngestRecording(seed)` (crea la grabación y sus créditos desde una semilla, sin llamar a MusicBrainz), el
cliente `musicbrainz.searchReleaseGroup / searchRecording / searchArtist` (única salida, con cola de rate limit),
`albumHref`, `songHref`, `artistHref` y las carátulas resueltas (`coverThumbUrl`).

## Goals / Non-Goals

**Goals**: modelo con cobertura explícita, curaduría barata, páginas de ceremonia y categoría, entrada desde Explorar,
Grammy 2021–2025 en niveles A y B.

**Non-Goals**: insignias en fichas, comparación con la comunidad, ganadores históricos, otros premios, ceremonias en
curso, curaduría en la app, festivales.

## Decisions

### D1. Modelo

```
award ─< award_ceremony ─< award_category_edition >─ award_category
                                   │
                                   └─< award_nomination ─?─ release_group | recording | artist
```

- `award` (`slug` único, p. ej. `grammy`). El nombre visible es texto de interfaz (`messages/*/awards.json`, clave
  por slug).
- `award_ceremony`: `award_id`, `year` (año de la ceremonia, no de elegibilidad), `edition` (67), `held_on` (`DATE`).
  Único `(award_id, year)` y `(award_id, edition)`.
- `award_category`: `award_id`, `key` estable (`album-of-the-year`), `tier` (`general` | `genre`), `subject_kind`
  (`release_group` | `recording` | `artist`), `honors` (`performer` | `songwriter`: Canción del año premia la
  composición), `name_es`, `name_en`, `predecessor_id` (FK a sí misma, nullable), `sort_order`. Único
  `(award_id, key)`. Una categoría renombrada, fusionada o dividida es otra fila enlazada con `predecessor_id`.
  - Los nombres van en columnas y no en `messages/*.json` porque son datos curados que crecen con cada ceremonia y
    viven en el JSON de la curaduría; solo hay dos locales (es/en).
- `award_category_edition`: una categoría en una ceremonia. `ceremony_id`, `category_id`, `coverage`
  (`complete` | `winner_only`). Único `(ceremony_id, category_id)`.
- `award_nomination`: `category_edition_id`, `won`, `nominee_text` (`NOT NULL`, "Midnights — Taylor Swift"),
  `credit_text` (nullable: productores, compositores), una FK opcional por tipo (`release_group_id`, `recording_id`,
  `artist_id`), `sort_order`.
  - `CHECK` en SQL: como mucho una de las tres FK no nula.
  - FK con `ON DELETE SET NULL`: borrar una fila del catálogo (p. ej. la limpieza de un smoke test) no rompe la
    nominación, que vuelve a mostrarse como texto.
  - La coherencia entre `subject_kind` de la categoría y la FK usada, y que una edición `winner_only` solo tenga
    ganadores, cruzan tablas: las valida el cargador (con la validación Zod del archivo) y el smoke test. No se
    exige un único ganador por categoría: los empates existen.

Alternativa descartada: una tabla de nombres por locale (como `genre_localized_text`): más flexible, innecesaria con
dos locales fijos.

### D2. Archivos de curaduría

```
data/awards/grammy/
├── categories.json          [{ key, tier, subject, honors, name: {es, en}, predecessor? , order }]
└── ceremonies/
    ├── 2021.json            { year, edition, heldOn, categories: [
    ├── …                        { key, coverage, nominees: [
    └── 2025.json                    { title, artist, anchor?, won, credits?, resolved? } ] } ] }
```

- `title` y `artist` los escribe el curador. `anchor` ("álbum o sencillo donde aparece") es obligatorio en
  categorías de `subject: recording`.
- `resolved` lo escribe el script de resolución: `{ status: "exact" | "manual" | "ambiguous" | "not_found", mbid?,
  seed?, candidates? }`. `seed` lleva lo mínimo para crear la fila sin consultar MusicBrainz (release-group: título,
  categoría, fecha; artista: nombre; grabación: título, duración y créditos con MBID). `manual` es una elección
  hecha por el curador entre los candidatos de un `ambiguous`.
- Esquema Zod en `src/services/awards/curation-schema.ts`, compartido por los dos scripts y por una prueba que
  valida todos los archivos de `data/awards/` en CI.

### D3. Resolución (`scripts/resolve-award-nominees.ts`)

- Solo procesa nominados sin `resolved` o con `not_found`/`ambiguous` si se pasa `--retry`. Idempotente.
- Álbum: `searchReleaseGroup('releasegroup:"…" AND artist:"…"')`; `exact` si el primero tiene score ≥ 95 y ningún
  otro candidato sin tipos secundarios llega a 95.
- Artista: `searchArtist`, mismo criterio.
- Grabación: primero resuelve el `anchor` como álbum y luego `searchRecording('recording:"…" AND rgid:<anchor>')`. Si
  devuelve una sola grabación distinta, `exact`; si hay varias (versiones dentro del mismo disco), `ambiguous` con
  candidatos.
- Reporte al final: conteo por estado y la lista de ambiguos y no encontrados con sus candidatos, para editar a mano
  (cambiar `status` a `manual` y elegir el `mbid`).
- Todo pasa por el cliente de MusicBrainz (rate limit y `MUSICBRAINZ_USER_AGENT`); no construye URLs.

### D4. Carga (`scripts/load-awards.ts`)

- Valida todos los archivos con Zod; aborta sin escribir si alguno falla (incluidas las reglas cruzadas: tipo de
  sujeto coherente, `winner_only` solo con ganadores, `anchor` en grabaciones, clave de categoría existente).
- En una transacción por ceremonia: upsert de `award`, `award_category` (por `(award_id, key)`), `award_ceremony` y
  `award_category_edition`; las nominaciones de la ceremonia se reemplazan completas (borrar e insertar). Hoy nada
  referencia una nominación, así que reemplazar es seguro; si el cambio de insignias lo necesita, pasará a claves
  estables.
- Para nominados resueltos crea el stub que falte con `upsertReleaseGroupStub`, `upsertArtistStub` o
  `findOrIngestRecording(seed)`. No consulta MusicBrainz. Los no resueltos quedan solo con `nominee_text`.
- Correrlo dos veces seguidas no cambia nada (lo verifica el smoke test).

### D5. Páginas (Server Components, sin endpoint nuevo)

- `/awards`: premios cubiertos con sus ceremonias, de la más reciente a la más antigua.
- `/awards/[award]/[year]`: cabecera ("Premios Grammy 2025 · 67.ª edición · 2 feb 2025"), chips para saltar a las
  otras ceremonias, y categorías agrupadas por nivel (campo general primero, luego "Mejor álbum de …" por
  `sort_order`). En cada categoría, el ganador primero y destacado, después los nominados en el orden del archivo.
  Cada nominado muestra la carátula (álbum o grabación vía su disco) o la foto del artista si existe, enlazado a su
  ficha; sin resolver, solo el texto. Si la edición es `winner_only`, una nota lo dice. Enlace a la historia de cada
  categoría.
- `/awards/[award]/categories/[key]`: por ceremonia, de la más reciente a la más antigua, el ganador y, si la
  cobertura es completa, los nominados. Enlaces "Antes llamada …" y "Después llamada …" por `predecessor_id`.
- Año o clave inexistente → `notFound()`. `params` es `Promise` (Next 15).
- Servicio de lectura en `src/services/awards/read.ts` con consultas planas (sin requests externos al renderizar).

### D6. Entrada desde Explorar

Sección "Premios" en la portada de `/explore`, después de Próximos lanzamientos: una tarjeta por ceremonia cubierta
(las últimas 5) más "Ver todos los premios" a `/awards`. Se omite si no hay ceremonias cargadas, como las demás.
No se añade a la navegación global en este cambio.

### D7. Marca

"Grammy" se usa solo como nombre descriptivo ("Premios Grammy 2025"). Sin logos, imágenes de la estatuilla ni
lenguaje que sugiera afiliación. Las carátulas son las del catálogo (miniatura 250px, `data-licensing.md`).

## Risks / Trade-offs

- [Error de curaduría: un ganador equivocado] → Cada ceremonia se revisa en un PR contra la fuente (Wikipedia o la
  web oficial); el JSON lleva `sourceUrl` por ceremonia para la revisión.
- [El índice de búsqueda de MusicBrainz va atrasado o un título no coincide] → `not_found` queda en el reporte; el
  nominado se publica como texto y se resuelve después.
- [La carga crea stubs en el catálogo] → Es el mismo cacheo bajo demanda que la búsqueda; un nominado es un disco
  relevante. La primera visita a su ficha ingiere el resto.
- [Reemplazar nominaciones en cada carga] → Seguro mientras nada las referencie; documentado para el cambio de
  insignias.
- [Nombres de categoría en columnas] → Una tercera lengua exigiría migración; aceptable con dos locales.

## Migration Plan

1. `0068_music_awards.sql` (tablas, `CHECK`, índices, triggers de `updated_at` donde aplique). Sin backfill.
2. Correr `scripts/load-awards.ts` después de migrar y cada vez que cambie `data/awards/`.
3. Rollback: las tablas son nuevas y nada externo las referencia; se pueden vaciar o dejar sin uso.

## Open Questions

- Ninguna de diseño. La exactitud de los datos de 2021–2025 depende de la revisión humana de cada archivo.
