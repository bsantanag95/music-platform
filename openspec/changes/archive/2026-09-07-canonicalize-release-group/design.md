## Context

### Estado actual del catálogo de álbumes

```
release_group ──1:N── release ──1:N── track ──N:1── recording
     │                   │
     │ category          │ edition_label = "original"  (siempre, hardcodeado)
     │ cover_thumb_url    │ release_date  (de ESTA edición)
     │ (sin fecha propia) │
     │
     └── rating · favorite · comment · listen_entry · user_list_item
         · user_pinned_item · collection_entry   (todos FK a release_group_id)
```

- **La capa social ya es canónica.** Todas las tablas sociales referencian
  `release_group_id`. Cambiar de edición no toca ni un dato social.
- **La selección de edición no lo es.** `findOrIngestTracklist`
  (`src/services/catalog/ingest-release.ts:34`):
  ```ts
  const chosen = rgWithReleases.releases?.find((r) => r.status === "Official")
    ?? rgWithReleases.releases?.[0];
  ```
  — primera oficial, o primera. `getReleaseGroup` pide `inc: "releases"` y el tipo
  `MBReleaseGroupWithReleases` solo expone `{ id, status?, date? }` por edición. No hay
  país, packaging, disambiguation ni track-count para rankear.
- **`edition_label`** se escribe literal `"original"` (línea 49) sin mirar qué se eligió.
- **Fecha del álbum** = `release.release_date` de la edición ingerida. Un reissue hace que
  el disco figure con el año equivocado. `release_group` no tiene fecha propia.
- **`category`** (`studio | single_ep | compilation | live_other`) se ingiere bien
  (`mapReleaseGroupCategory`), se expone en búsqueda y en el contexto de canción, pero
  **no** en `getAlbumDetail` ni en `GET /api/catalog/release-group/{id}` ni en la página
  de álbum.
- **Congelamiento**: `if (existing) return existing` — la primera elección es permanente.
  El único mecanismo de corrección hoy es `scripts/backfill-release-credits.ts`, que
  sincroniza créditos, no re-elige edición.
- **`release-date-precision`** ya dejó documentado como pendiente `release_year` para
  fechas parciales. Este cambio lo implementa.

### Restricciones

- Migraciones SQL crudas escritas a mano (ADR 0005); `src/db/schema.ts` es un espejo
  manual.
- Todo acceso a MusicBrainz pasa por `src/services/musicbrainz/client.ts` (cola de rate
  limit, `User-Agent`). Las ingestas van "frescas"; solo las lecturas de contexto de
  búsqueda se cachean con TTL.
- El read-model de álbum **no re-consulta MusicBrainz** si el `release` local ya existe
  (una caída de MB no debe romper la vista). Cualquier dato nuevo del release-group debe
  poblarse en el momento de ingesta, no en el path de lectura.
- `catalog-recording-ingestion` prohíbe escribir `release`/`track` fuera de la ingesta de
  álbum. Este cambio respeta esa frontera.

## Goals / Non-Goals

**Goals:**

- Que "el álbum" sea un objeto canónico: una edición representativa elegida de forma
  determinista y corregible, una fecha canónica propia, y un tipo de obra visible.
- Cerrar el pendiente `release_year` de `release-date-precision`.
- No tocar datos sociales ni la resolución de carátula.

**Non-Goals:**

- Ingesta de múltiples ediciones ni selector de edición en la UI.
- Backfill masivo automático (se entrega el script; correrlo es decisión de operación).
- Piezas de `redefine-content-hierarchy` posteriores (reseñas, descubrimiento, seguir
  artista).
- Traducir o normalizar títulos de álbum.

## Decisions

### D1 — La edición representativa se elige con una función pura de ranking

**Decisión.** Extraer `pickRepresentativeRelease(releases): MBRelease | null` como función
pura y testeable, con los 7 criterios ordenados del spec `album-edition-selection`. La
ingesta la llama; el script de re-canonicalización la llama; los tests la cubren con
fixtures de casos reales (original vs deluxe, sin oficiales, ediciones regionales, box
sets).

**Por qué pura y separada.** Hoy la lógica está inline en `findOrIngestTracklist` y es una
línea. Separarla permite testear el ranking sin tocar la base ni MusicBrainz, y reutilizarla
en el script de corrección. Es el mismo patrón que `mapReleaseGroupCategory`.

**Alternativa considerada.** Dejar que MusicBrainz decida (usar su primer resultado).
Rechazada: es el comportamiento actual y no es determinista ni principled.

### D2 — Ampliar el `inc` de `getReleaseGroup`, no añadir llamadas

**Decisión.** `getReleaseGroup` pasa de `inc: "releases"` a
`inc: "releases+release-groups"` con los subcampos que el ranking necesita: por cada
`release`, `status`, `date`, `country` / `release-events`, `packaging`, `disambiguation`,
`title` y `media` (para `track-count`). MusicBrainz devuelve `first-release-date` del
release-group sin `inc` extra (es campo core). Sigue siendo **una** petición por álbum en
la primera visita.

**Por qué.** El presupuesto de MusicBrainz es una preocupación explícita del proyecto
(`catalog-recording-ingestion`). Enriquecer una llamada existente es gratis; añadir un
`GET /release/{id}` por candidato multiplicaría el coste.

**Trade-off.** La respuesta de `getReleaseGroup` crece. Aceptable: es una ingesta, no una
lectura caliente, y ya se está pidiendo `releases`.

**Nota de implementación.** Si un subcampo (p. ej. `media.track-count`) no viene en el
browse de release-group y exigiera un `GET /release/{id}`, el criterio 6 (track-count) se
degrada a "no se aplica" en Fase 1 en vez de gastar N llamadas. El ranking ya es correcto
sin él en la mayoría de los casos.

### D3 — Fecha canónica en dos columnas del release-group

**Decisión.** `release_group.first_release_date DATE NULL` +
`release_group.first_release_year SMALLINT NULL`. Se pueblan desde `first-release-date` de
MusicBrainz con `normalizeReleaseDate` (fecha completa) y `yearFromMbDate` (año), funciones
que ya existen en `mappers.ts`. Se pueblan en dos momentos:
- `upsertReleaseGroupStub` / `upsertReleaseGroupStubs` cuando el dato viene en la búsqueda
  (`MBReleaseGroupSearchItem.first-release-date` ya está tipado).
- `findOrIngestTracklist`, al traer el release-group completo, como fuente autoritativa
  (rellena o corrige lo que el stub dejó).

**Por qué dos columnas.** `release-date-precision` es explícito: no inventar `YYYY-01-01`.
Una fila con año 1985 y sin fecha exacta es un estado legítimo y distinto de "sin dato".

**Por qué en el release-group y no derivada.** Derivar "año del álbum" del `min(release.
release_date)` local fallaría: solo se ingiere una edición, y puede no ser la más
temprana. MusicBrainz ya calcula `first-release-date` sobre todas las ediciones.

**Alternativa considerada.** Una sola columna TEXT con el valor crudo de MusicBrainz.
Rechazada: obliga a parsear en cada lectura y rompe el orden de discografía por año.

### D4 — `category` se expone tal cual; la UI decide qué etiquetar

**Decisión.** El read-model añade `category` sin transformarla. La página de álbum muestra
etiqueta localizada solo para `compilation` / `live_other` / `single_ep`; `studio` no
lleva etiqueta. Los textos viven en el namespace `album` de i18n.

**Por qué en la UI y no en el read-model.** "Qué categorías merecen badge" es una decisión
de presentación que puede cambiar; el dato es neutro. Mismo criterio que
`interfaz localizada sin traducir datos musicales`.

**Nota.** `single_ep` mezcla singles y EPs. En Fase 1 se etiqueta como "Single / EP" (o el
equivalente localizado) sin separarlos; separar `single` de `ep` requeriría otra columna y
está fuera de alcance.

### D5 — Re-canonicalización idempotente vía script, no automática

**Decisión.** `recanonicalizeReleaseGroup(releaseGroupId, { dryRun })` en el servicio;
`scripts/recanonicalize-release-group.ts` como CLI (un id, una lista de ids, o `--all`
por lotes con pausa entre llamadas para respetar el rate limit). Reemplaza `release` +
`track` en una transacción; nunca toca tablas sociales. `--dry-run` reporta y no escribe.

**Por qué no automática.** Re-elegir en cada visita re-consultaría MusicBrainz en el path
de lectura (viola la restricción de que una caída de MB no rompa la vista) y sería caro.
La corrección es un evento raro (mejoras de datos en MB, bug del ranking) y operacional.

**Por qué es seguro.** `track.recording_id` es `ON DELETE restrict`, pero borrar `track`
antes que `release` (o `ON DELETE cascade` desde `release`) libera las filas; los
`recording` quedan (los puede referenciar otro álbum o el diario). Las FK sociales son a
`release_group`, intactas.

### D6 — Sin `is_representative` en `release` todavía

**Decisión.** Mantener la invariante "un `release` por `release_group`" (el código ya
asume `.limit(1)`). No añadir un booleano de representatividad ni permitir varias
ediciones.

**Por qué.** El multi-edición es un Non-Goal. Añadir la columna ahora sería especular. La
re-canonicalización reemplaza en el sitio, así que el modelo no necesita distinguir.
Cuando llegue el multi-edición, esa migración añade `is_representative` y relaja la
invariante.

## Risks / Trade-offs

- **[Álbumes ya ingeridos con edición subóptima no se corrigen solos]** → Se entrega el
  script con `--all`; se documenta en `docs/` como paso de operación. El impacto visible
  (año equivocado, tracklist deluxe) ya existe hoy, no es una regresión.

- **[El ranking elige mal en un caso no previsto]** → La función es pura y con tests de
  fixtures; el `--dry-run` permite auditar por lotes antes de escribir; corregir el
  ranking + re-correr el script no toca datos sociales.

- **[MusicBrainz no da todos los subcampos en el browse de release-group]** → El criterio
  que dependa de un subcampo ausente se degrada a "no aplica" (D2), no se gastan llamadas
  extra. El ranking sigue siendo determinista con los criterios disponibles.

- **[`edition_label` cambia de `"original"` a otros valores → clientes que lo asumían]** →
  El campo siempre fue `string` libre en el schema Zod (`editionLabel: z.string()`);
  ningún consumidor hace match exacto contra `"original"`. Se revisa en el PR.

- **[Migración sobre `release_group` en una tabla grande]** → `ADD COLUMN ... NULL` sin
  default es instantáneo en PostgreSQL moderno. El backfill de fecha/año es vía script,
  desacoplado de la migración.

- **[Box sets y splits: category `studio` pero no son "un álbum" en el sentido crítico]**
  → Fuera de alcance afinar su tratamiento; el ranking los maneja como cualquier grupo y
  `category` los deja pasar como `studio`. Se anota como Open Question.

## Migration Plan

1. **Migración SQL** (`drizzle/NNNN_release_group_canonical_date.sql`):
   `ALTER TABLE release_group ADD COLUMN first_release_date DATE`,
   `ADD COLUMN first_release_year SMALLINT`,
   `CREATE INDEX idx_release_group_first_year ON release_group (first_release_year)`.
   Espejo en `src/db/schema.ts`.
2. **Tipos + cliente MusicBrainz**: ampliar `MBReleaseGroupWithReleases` y el `inc` de
   `getReleaseGroup`; tipar `first-release-date` en el detalle de release-group.
3. **`pickRepresentativeRelease`** + tests con fixtures.
4. **Ingesta**: `findOrIngestTracklist` usa la función nueva y deriva `edition_label`;
   poblar fecha/año canónico en ingesta de grupo y en stubs.
5. **Read-model + API + Zod**: exponer `category`, `firstReleaseDate`, `firstReleaseYear`.
   Actualizar `docs/` del endpoint.
6. **UI**: etiqueta de tipo de obra en la página de álbum; año + orden en las tarjetas de
   discografía; mensajes i18n.
7. **Script** `scripts/recanonicalize-release-group.ts` con `--dry-run` / `--all`.
8. **Backfill** (operación, no despliegue): correr el script por lotes; correr un
   backfill de fecha/año canónico para release-groups ya existentes (puede ser el mismo
   script o uno hermano).

**Rollback.** Las columnas nuevas son nullable y aditivas; revertir la lectura (no exponer
los campos, volver al ranking viejo) es un cambio de código sin migración inversa
obligatoria. Las columnas pueden quedar y dejar de leerse.

## Open Questions

- **OQ1** — ¿El backfill de `first_release_date` para release-groups existentes se hace en
  el mismo script de re-canonicalización o en uno aparte? (afinable en implementación;
  probablemente el mismo con dos fases).
- **OQ2** — Box sets: ¿se excluyen de "álbum" en el sentido crítico, o se dejan pasar con
  `category = studio`? Afecta a `redefine-content-hierarchy` D3 más que a este cambio;
  aquí se dejan pasar.
- **OQ3** — Lista de marcadores de "edición no estándar" para el criterio 3: ¿fija en
  código o configurable? Fase 1: fija, en una constante junto a la función.
- **OQ4** — `single_ep`: ¿vale la pena separar `single` de `ep` en `category` a futuro
  para el descubrimiento? Fuera de alcance; anotado para `album-discovery`.
