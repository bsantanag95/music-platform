## 1. Preparación

- [ ] 1.1 Guardar como fixture de test el lookup real recortado de Mötley Crüe con `artist-rels+url-rels` (pertenencias con varios períodos, `original`, `additional`, sin fechas, apoyo instrumental) y el de una persona con pertenencias y apoyo dado (p. ej. Randy Castillo)
- [ ] 1.2 Revisar que el fixture de Pink Floyd cubra un grupo terminado (Última alineación)

## 2. Esquema

- [ ] 2.1 Crear `drizzle/0055_artist_lineup.sql`: `membership_period` (FK con cascada, fechas parciales con `CHECK`, `ended`, `instruments`, `is_founder`, `is_additional`, `CHECK` de años), `artist_support` (`musician_id`, `artist_id`, `kind` con `CHECK`, instrumentos, fechas, `CHECK` de distintos, índices) y `artist.lineup_synced_at` (design.md D1, D2, D4)
- [ ] 2.2 Espejar en `src/db/schema.ts` con sus tipos `*Row`
- [ ] 2.3 Actualizar `docs/03-data/sql-model.md`
- [ ] 2.4 Aplicar la migración en la BD de scratch

## 3. Mapeo desde MusicBrainz

- [ ] 3.1 Tipos de relación de apoyo (`instrumental supporting musician`, `vocal supporting musician`, `supporting musician`) y campo `ended` en `src/services/musicbrainz/types.ts`
- [ ] 3.2 Mapper puro de períodos: una entrada por relación `member of band`, instrumentos sin `original`/`additional`, marcas, fechas parciales, fechas incoherentes → sin fechas
- [ ] 3.3 Mapper puro de apoyo: dirección (quién apoya a quién), tipo, instrumentos o tipo de voz, fechas
- [ ] 3.4 Tests de los mappers con el fixture de Mötley Crüe

## 4. Sincronización

- [ ] 4.1 `saveArtistLineup(tx, artist, detail)`: reemplazo por lado de pertenencias, períodos y apoyo, stubs de artistas relacionados, resumen de `membership` desde los períodos, `lineup_synced_at` (design.md D3)
- [ ] 4.2 `ensureArtistMemberships` usa `saveArtistLineup` (sincronización fría)
- [ ] 4.3 `syncArtistProfileFacts` guarda también la alineación; `needsProfileRefresh` considera `lineup_synced_at` nulo (design.md D4)
- [ ] 4.4 Tests: reemplazo por lado (sincronizar a un integrante no toca al resto), períodos reemplazados completos, apoyo a un solista, `role` sin marcas

## 5. Clasificación y lectura

- [ ] 5.1 `classifyLineup` puro: actuales, antiguos, Última alineación, apoyo actual/anterior, período desconocido, orden, líneas de instrumentos por conjunto de períodos (design.md D5)
- [ ] 5.2 Tests de `classifyLineup` (Mötley Crüe, Pink Floyd terminado, sin fechas, Tommy Lee)
- [ ] 5.3 `getArtistLineup(artistId)`: grupo (clasificado, año de muerte, otras afiliaciones en lote sin el grupo visto, pendientes) y persona (grupos con foto y discos principales, apoyo dado, apoyo recibido) (design.md D7)
- [ ] 5.4 Tests de la lectura con mocks de DB

## 6. Integrantes en segundo plano

- [ ] 6.1 `scheduleLineupMembersSync(artistId)`: integrantes y músicos de apoyo pendientes o vencidos con MBID, prioridad, tope de 10, `pg_try_advisory_lock` por artista, sin Wikimedia, fallos aislados, omitido fuera de una request (design.md D6)
- [ ] 6.2 Tests: tope, prioridad, candado tomado, fallo de una persona

## 7. Scripts y verificación

- [ ] 7.1 `scripts/backfill-artist-lineup.ts` con `--limit` y `--dry-run` (design.md D8)
- [ ] 7.2 `scripts/smoke-test-artist-lineup.ts` con el prefijo `5e0ce000-0000-4000-8000-*` y limpieza al terminar; documentarlo en `AGENTS.md`
- [ ] 7.3 Correr el smoke test y el backfill en la BD de scratch

## 8. Documentación y cierre

- [ ] 8.1 `docs/01-domain/domain-model.md` (pertenencia con períodos, músico de apoyo) y `docs/01-domain/business-rules.md` (clasificación de la alineación)
- [ ] 8.2 `docs/04-api/contracts.md`: `memberships[].role` sin las marcas `original` y `additional`
- [ ] 8.3 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
