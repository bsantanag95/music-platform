## Context

`musicbrainz.getRelease` pide `recordings+artist-credits+artist-rels+recording-level-rels`
y `personnel-credits.ts` guarda las relaciones de artista de la edición y de cada grabación
en `personnel_credit`, marcando `release.personnel_synced_at`. La página de álbum sincroniza
en segundo plano las ediciones pendientes (lock por edición) y hay un backfill
(`scripts/backfill-personnel-credits.ts`). Sonda del 2026-09-26 sobre *Eyes Wide Open*
(release `c45b4c0c…`): con `+work-rels+work-level-rels` cada grabación trae una relación
`performance` con `work: { id, title, relations[] }`, y las relaciones de la obra traen
`writer` con destino artista; una obra (pista 3) llegó sin autores.

## Decisions

### D1. Misma request

`getRelease` pasa a `inc=recordings+artist-credits+artist-rels+recording-level-rels+
work-rels+work-level-rels`. `MBTrack.recording.relations` admite relaciones con
`target-type: "work"` y `work: { id, title, relations?: MBCreditRelation[] }`.

### D2. Modelo propio para la obra

```
work            (id UUID PK, mbid UUID UNIQUE NOT NULL, title TEXT NOT NULL,
                 created_at, updated_at + trigger)
recording_work  (recording_id → recording ON DELETE CASCADE,
                 work_id → work ON DELETE CASCADE,
                 attributes TEXT[] NOT NULL DEFAULT '{}',
                 PRIMARY KEY (recording_id, work_id))
work_credit     (id UUID PK, work_id → work ON DELETE CASCADE,
                 artist_id → artist ON DELETE CASCADE,
                 relation_type TEXT NOT NULL, attributes TEXT[] NOT NULL DEFAULT '{}',
                 credited_as TEXT, created_at,
                 UNIQUE (work_id, artist_id, relation_type, attributes))
release.works_synced_at TIMESTAMPTZ NULL   -- NULL = autoría pendiente
```

Índices: `recording_work (work_id)`, `work_credit (artist_id)`. Alternativa descartada:
guardar la autoría como `personnel_credit` sobre la grabación — duplicaría los autores en
cada versión y mezclaría dos ejes (obra vs. grabación). `works_synced_at` arranca en NULL
para todas las ediciones existentes: es el estado real (autoría no traída), no un valor
inventado.

### D3. Mapeo y guardado

Función pura `mapWorkRelations(full)` → `{ works: Map<workMbid, { title, credits[] }>,
byRecordingMbid: Map<recordingMbid, { workMbid, attributes }[]> }`, reutilizando
`mapRelation` (solo destino artista; deduplicado). `saveWorkCredits(releaseId, full)`:
stubs de artista antes de la transacción (idempotente, como el personal); dentro de la
transacción, upsert de obras por MBID (título actualizado), reemplazo de `recording_work`
de las grabaciones de la edición y de `work_credit` de las obras tocadas; marca
`works_synced_at`. La ingesta nueva de una edición llama a ambos guardados con la misma
respuesta.

### D4. Sincronización unificada

La condición de pendiente pasa a `personnel_synced_at IS NULL OR works_synced_at IS NULL`
(detalle de álbum, `syncPersonnelCredits`, backfill). Una request; se guarda y marca lo que
estaba pendiente (el personal se reemplaza igual, es idempotente).

### D5. Lectura

`getAlbumPersonnel` agrega `songwriters: { entries: SongwriterEntry[]; byTrack:
Record<recordingId, TrackCreditPerson[]> }` con una consulta `work_credit ⨝ recording_work ⨝
artist` filtrada por las grabaciones de la edición representativa. Devuelve `null` solo si
no hay ni personal ni autoría. `groupCreditsByTrack` gana el grupo `songwriting` (primero).
Canción: `getRecordingSongwriters(recordingId)` con la misma unión.

### D6. UI

- Vista por persona: `CollapsibleLevel` genérico para "Composición" (tras el primer nivel).
- Vista por canción: grupo `songwriting` primero; en ese grupo se omite el rol cuando es
  `writer` sin atributos (redundante con el rótulo).
- Canción: "Escrita por …" bajo el artista.
- i18n: `roles.writer` "composición", `composer` "música", `lyricist` "letra",
  `librettist` "libreto", `translator` "traducción"; `arranger` ya existe.

### D7. Smoke test y limpieza

`smoke-test-personnel-credits.ts` agrega una obra con MBID `5e0ce000-…` y dos autores;
limpia `work` por prefijo de MBID. `AGENTS.md` suma `DELETE FROM work WHERE mbid::text LIKE
'5e0ce000%';` a la limpieza manual (antes de `recording`, aunque el vínculo cae en cascada).

## Risks / Trade-offs

- Respuesta de MusicBrainz más grande por edición → sin requests extra; aceptable.
- Cobertura desigual de autores en MusicBrainz → la UI omite lo que no hay; no se inventa.
- Resincronizar todas las ediciones tras el despliegue → diferido por visita y backfill con
  `--limit`, respetando el límite de 1 request/s.

## Migration Plan

Aplicar `0049_work_credits.sql`; las ediciones existentes quedan con `works_synced_at` NULL
y se completan al visitarlas o con `backfill-personnel-credits.ts --limit N`.

## Open Questions

Ninguna.
