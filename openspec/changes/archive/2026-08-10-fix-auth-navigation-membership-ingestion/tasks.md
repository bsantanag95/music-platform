## 1. Preparación y contratos

- [x] 1.1 Revisar proposal, design, specs, auth.md, ADR 0008/0010 y el flujo actual de ingesta.
- [x] 1.2 Definir mensajes, códigos y shapes necesarios para logout, redirects y memberships.
- [x] 1.3 Confirmar con fixtures mockeados la forma de `artist-rels` que consumirá el cliente MusicBrainz.

## 2. Migración y modelo de datos

- [x] 2.1 Crear una migración SQL nueva para `artist.memberships_synced_at`.
- [x] 2.2 Detectar y resolver duplicados existentes de `membership` en la BD scratch antes de añadir unicidad.
- [x] 2.3 Añadir índice único `UNIQUE(person_id, group_id)` y conservar el trigger de tipos.
- [x] 2.4 Sincronizar `src/db/schema.ts` y `docs/03-data/sql-model.md` con la migración.
- [x] 2.5 Aplicar la migración en la BD scratch y verificar rollback/estado registrado en `_migrations`.

## 3. Navegación de autenticación

- [x] 3.1 Convertir las acciones anónimas de Header en enlaces/botones primarios visibles y localizados.
- [x] 3.2 Añadir botón de logout autenticado con llamada a `DELETE /api/auth/logout`, estados de espera y error.
- [x] 3.3 Actualizar el Header tras logout sin exponer tokens ni campos privados al Client Component.
- [x] 3.4 Redirigir usuarios autenticados desde `/[locale]/auth/login` y `/[locale]/auth/register` a `/{locale}/search`.
- [x] 3.5 Mantener enlaces cruzados visibles entre login y registro con locale preservado.
- [x] 3.6 Añadir mensajes `es`/`en` y tests de Header, logout, redirects, accesibilidad y navegación.

## 4. Cliente MusicBrainz y mapeo de relaciones

- [x] 4.1 Añadir tipos `MBArtistRelation` y `MBArtistDetail` con target artist, dirección, atributos y fechas.
- [x] 4.2 Implementar `musicbrainz.getArtistWithRelations(mbid)` usando exclusivamente `mbFetch` e `inc=artist-rels`.
- [x] 4.3 Crear mapeadores puros para filtrar `member of band`, detectar persona/grupo y normalizar roles/fechas.
- [x] 4.4 Añadir tests para ambas direcciones, tipos Group/Orchestra/Choir, relaciones inválidas y fechas parciales.

## 5. Ingesta idempotente de memberships

- [x] 5.1 Implementar `ensureArtistMemberships()` separado de `getArtistMemberships()` y limitado a la ingesta fría.
- [x] 5.2 Crear/actualizar artistas relacionados con tipo confirmado antes de insertar memberships.
- [x] 5.3 Consolidar varios roles de una misma pareja persona/grupo y conservar el intervalo más amplio representable.
- [x] 5.4 Hacer upsert de memberships usando la unicidad SQL y marcar `memberships_synced_at` solo al completar con éxito.
- [x] 5.5 No marcar sincronización ante errores externos y evitar llamadas por integrante.
- [x] 5.6 Integrar la sincronización antes de leer memberships y componer discografía en el flujo de artista.
- [x] 5.7 Añadir tests de ingesta fría, cacheada, error recuperable, idempotencia y composición sin duplicados.
- [x] 5.8 Corregir hallazgos de revisión: transacción con lock advisory y relectura del flag, reconciliación selectiva de relaciones stale, consolidación de fechas parciales y tests de rollback/concurrencia observable; añadir smoke Postgres con cache, concurrencia, stale selectivo y fallo externo.

## 6. API y catálogo

- [x] 6.1 Actualizar el endpoint de artista y sus schemas para devolver memberships después de la sincronización.
- [x] 6.2 Verificar que una segunda lectura cacheada no llama a MusicBrainz.
- [x] 6.3 Añadir tests de route handler, read-model y contratos de memberships.
- [x] 6.4 Actualizar `docs/04-api/contracts.md`, `docs/04-api/errors.md` y `docs/05-features/catalog-browsing.md`.

## 7. Validación integrada

- [x] 7.1 Ejecutar `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` y `pnpm run build`. QA: typecheck OK; 43 archivos y 181 tests OK; lint OK con 2 warnings preexistentes; build OK.
- [x] 7.2 Ejecutar `smoke-test-membership-sync.ts` contra Postgres scratch con `ALLOW_SMOKE_ON_REAL_DB=1`; OK: frio, segunda lectura sin fetch, lock concurrente, stale selectivo y rollback por fallo externo.
- [x] 7.3 Verificar Pink Floyd/Roger Waters: integrantes visibles, discografía combinada y sin duplicados.
- [x] 7.4 Verificar login, registro, logout y redirects en `es` y `en` con navegador y cookie `Secure`. Validación manual confirmada.
- [x] 7.5 Ejecutar revisión de Seguridad y Revisor antes de archivar. Seguridad sin bloqueantes; Revisor sin defectos técnicos actuales. 7.4 manual permanece pendiente.
