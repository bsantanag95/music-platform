## 1. Datos

- [x] 1.1 Migración `drizzle/0095_concert_tours_links.sql`: `concert_series` (`mbid` único, `name` 1–300, `created_at`); en
  `concert`, `series_id` (`ON DELETE SET NULL`), `parent_id` (`ON DELETE SET NULL`, `CHECK` distinto de `id`), `end_date`
  (`CHECK` ≥ `event_date`) e índices parciales por `series_id` y `parent_id`; `concert_link_dismissal` (`entry_id` y
  `concert_id` con `ON DELETE CASCADE`, PK de los dos, `created_at`)
- [x] 1.2 Espejo en `src/db/schema.ts` y `docs/03-data/sql-model.md`

## 2. Sincronización de MusicBrainz

- [x] 2.1 Browse con `inc=place-rels+area-rels+artist-rels+series-rels+event-rels`; tipos en `types.ts`
- [x] 2.2 Mapper: gira (primera serie `Tour`), festival padre (`parts` backward a un `Festival`) y
  `end_date`; ignorar las demás relaciones entre eventos; fixtures y tests
- [x] 2.3 `saveConcerts`: upsert de giras, del padre sin pisar uno existente (solo `end_date` si faltaba) y enlaces

## 3. Sugerencias y desvincular

- [x] 3.1 Servicio de sugerencias (D1) con su consulta en SQL, tope por recuerdo y total
- [x] 3.2 Enlazar (validación de D1, conflicto, confirmación), descartar y desvincular (D3)
- [x] 3.3 Rutas `POST`/`DELETE /api/me/concerts/[id]/link`, `POST /api/me/concerts/[id]/dismissals`; códigos
  `CONCERT_LINK_INVALID` y `CONCERT_LINK_CONFLICT`
- [x] 3.4 Tests del servicio y las rutas

## 4. Giras, festivales y MusicBrainz

- [x] 4.1 Lecturas: gira y festival en el resumen y la página del concierto; página de la gira; partes y cartel reunido
  del festival; "Estuve ahí" copia la gira al crear
- [x] 4.2 Ruta de catálogo `tour` (`tourSegment`, `tourHref`, `resolveCatalogRoute`)
- [x] 4.3 Verificar en el formulario de MusicBrainz los nombres de los campos del evento y construir el enlace de alta en
  `src/services/musicbrainz/`
- [x] 4.4 Tests

## 5. Interfaz

- [x] 5.1 Mis conciertos: bloque "¿Son estos tus conciertos?" (Enlazar, No es este, "y N más") y "Desvincular" en el menú
- [x] 5.2 Pestaña del artista: "Gira: …" y "Parte de …" en cada fila
- [x] 5.3 Página del concierto: gira, festival padre, partes y cartel reunido de un festival, "Agregar a MusicBrainz"
- [x] 5.4 Página de la gira
- [x] 5.5 Mensajes `es`/`en`, `pnpm run i18n:client-messages` y tests de componentes

## 6. Documentación

- [x] 6.1 ADR nuevo "Giras, festivales y sugerencias de enlace de conciertos"
- [x] 6.2 `contracts.md`, `errors.md`, `business-rules.md`, `domain-model.md`, `docs/05-features/my-concerts.md`,
  `docs/03-data/data-licensing.md` (series y relaciones de eventos de MusicBrainz)
- [x] 6.3 Smoke test `scripts/smoke-test-concert-links-tours.ts` (MusicBrainz simulado; usuarios `smoke_ct_*`, artistas
  sintéticos `5e0ce000-…`): `CHECK`, giras y festival padre (sin pisar uno existente), sugerencias (fecha exacta ±1,
  mes, año, ciudad, país, descarte, tope, ya enlazado), enlazar (inválido, conflicto, confirmación), desvincular (no
  borra, no se vuelve a sugerir), "Estuve ahí" con gira, cascadas y la lectura de sugerencias bajo 100 ms con 500
  recuerdos; documentarlo en AGENTS.md

## 7. Verificación

- [x] 7.1 Aplicar `0095` en la BD de scratch
- [x] 7.2 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 7.3 Verificar en el navegador: sugerencias, enlazar, descartar y desvincular en Mis conciertos; gira y festival de
  un artista con eventos en MusicBrainz; enlace de alta en MusicBrainz
