## Context

`findOrIngestOwnDiscography` (`src/services/catalog/ingest-discography.ts`) llama una vez a
`musicbrainz.browseReleaseGroupsByArtist` (`limit=100`, sin `offset`, sin filtro de estado),
hace upsert de cada release-group con su `category` y sus créditos, y marca
`artist.discography_synced_at`. A partir de ahí la discografía se lee solo de la base y nunca
se refresca. `mapReleaseGroupCategory` reduce los tipos de MusicBrainz a cuatro categorías y
descarta el resto.

Verificación en vivo (2026-09-27):

| Artista | Total en MB | `website-default` | Guardado hoy |
|---|---|---|---|
| Pink Floyd | 651 | 219 | 100 (orden no documentado) |
| Sabrina Carpenter | 92 | 84 | 84 |
| Los Bunkers | 19 | 19 | 19 |

En Pink Floyd, 301 de los 651 son `Album+Live`, casi todos bootlegs. Sin bootlegs quedan 13
`Album`, 3 `EP`, 67 `Album+Live`, 48 `Single`, 28 `Single+Live`, 27 `Album+Compilation` y el
resto repartido en tipos menores. En Sabrina Carpenter, 28 de 84 tienen créditos compartidos.

Consumidores de la discografía y de `category`: página de artista, `GET
/api/catalog/artist/{id}`, recorridos (`artist-journeys.ts`, preselección `studio`), franja de
discografía del álbum (`album-neighbors.ts`), búsqueda y descubrimiento.

## Goals / Non-Goals

**Goals:**

- Guardar la discografía oficial completa de cada artista.
- Excluir los bootlegs, también los que ya se guardaron.
- Guardar los tipos originales y derivar las secciones del rediseño.
- Mantener la discografía al día sin bloquear la página.

**Non-Goals:**

- Cambiar la presentación de la discografía (lo hace `redesign-artist-page`).
- Cambiar `category`, su `CHECK` o sus consumidores (recorridos, franja del álbum, búsqueda).
- Dejar de mezclar la discografía de las bandas en la de un solista: `findOrIngestDiscography`
  conserva ese comportamiento para sus consumidores actuales; la página nueva usa una lectura
  propia (ver `redesign-artist-page`).
- Resolver las carátulas de forma diferida por visibilidad (también en el rediseño).

## Decisions

**D1 — Browse paginado con el filtro del sitio.** `browseReleaseGroupsByArtist(mbid, offset)`
pide `limit=100`, `offset` y `release-group-status=website-default`, que es el criterio del
sitio de MusicBrainz: incluye un release-group si tiene al menos una edición que no es
bootleg. Tope de 20 páginas (2.000 release-groups) para acotar el costo de un artista
anómalo; si se alcanza, se registra y la discografía queda como completa con lo traído.
*Alternativa descartada:* traer todo (`all`) y filtrar por estado de cada edición, que
exigiría un browse de ediciones por release-group.

**D2 — Primera visita: 3 páginas síncronas, el resto en segundo plano.** Tres páginas cubren
a casi todos los artistas (≈3,3 s en el peor caso, con la cola de 1,1 s). Lo que exceda se
programa con `after()`. *Alternativa descartada:* todo síncrono, que para un artista de 2.000
release-groups serían 22 s.

**D3 — Marca de discografía completa separada de la de sincronización.** Columna nueva
`artist.discography_complete_at` (NULL = incompleta o nunca sincronizada completa). Todas las
filas existentes quedan en NULL por migración, lo que dispara la sincronización completa en
segundo plano en la próxima visita sin inventar valores. `discography_synced_at` conserva su
significado ("hay datos guardados"). La resincronización periódica compara
`discography_complete_at` con 7 días.

**D4 — Marca de fuera de la discografía a nivel release-group.** Columna nueva
`release_group.discography_unlisted_at`. Al terminar una sincronización completa, los
release-groups acreditados al artista que no volvieron en el browse se marcan y los que
volvieron se desmarcan, en una sola transacción. El carácter de "solo bootleg" es una
propiedad del release-group, no del artista, así que la marca a nivel release-group es
correcta aunque el disco esté acreditado a varios artistas. Una sincronización interrumpida
no marca nada.
*Alternativa descartada:* borrar los créditos del artista a esos release-groups, que rompería
la línea de artista en la página del álbum.

**D5 — Tipos originales como columnas, `category` intacta.** `release_group.primary_type
text` y `release_group.secondary_types text[]`, guardados crudos. `category` se sigue
calculando con `mapReleaseGroupCategory`.

**D6 — Secciones como función pura.** `discographySection({ primaryType, secondaryTypes,
category, creditRole })` implementa el orden de reglas del spec. La lectura de discografía
devuelve también el rol del crédito del artista (`primary` o `featured`). Default a
confirmar: `Soundtrack` solo no saca un disco de Principal (Pink Floyd tiene *More* y
*Obscured by Clouds* como `Album+Soundtrack`).

**D7 — Resincronización con candado.** `pg_advisory_xact_lock` por artista, igual que las
sincronizaciones de ediciones y créditos. Upsert de release-groups y créditos con la misma
lógica actual; la fecha canónica no se pisa si ya está resuelta.

**D8 — Las lecturas excluyen lo marcado.** `findOrIngestDiscography` filtra
`discography_unlisted_at IS NULL`, así que página, API y recorridos dejan de ver bootlegs sin
cambios en cada consumidor.

## Risks / Trade-offs

- [Un release-group borrado o fusionado en MusicBrainz queda marcado como fuera de la
  discografía, no eliminado] → es el comportamiento deseado: conserva los datos de usuarios.
- [El filtro `website-default` no está documentado formalmente en la API] → es el mismo que
  usa el sitio y lo verificamos en vivo; si cambia, el smoke test con fixtures lo detecta en
  el mapeo, y el backfill en simulación permite medir el impacto antes de escribir.
- [Un recorrido que tenía seleccionado un bootleg deja de verlo] → aceptable: los bootlegs
  nunca debieron estar; el ítem de la lista se conserva en la base.
- [Número de migración]: el cambio `redesign-song-page` también planea una migración;
  el número se confirma al implementar.

## Migration Plan

1. Migración: `discography_complete_at`, `discography_unlisted_at`, `primary_type`,
   `secondary_types` (todas nulas).
2. Deploy: la próxima visita de cada artista completa su discografía en segundo plano.
3. Backfill (`scripts/backfill-artist-discography.ts --limit --dry-run`) para los artistas
   más visitados.
4. Rollback: las columnas son aditivas; volver al código anterior ignora las marcas.

## Open Questions

- ¿`Soundtrack` solo en Principal (D6)? Default propuesto: sí.
