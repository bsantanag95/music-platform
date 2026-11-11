## 1. Datos

- [x] 1.1 Migración `drizzle/0092_shared_concert.sql`: `concert` (`mbid` único, nombre, tipo, fecha exacta, recinto + `place_mbid`, ciudad + `area_mbid`, país, `source`, `status`, `cancelled`, `synced_at`, `CHECK` de origen/estado/fecha/país, índices por fecha), `concert_performer` (rol, `artist_mbid`, nombre, `artist_id` opcional, `UNIQUE (concert_id, artist_mbid, role)`), `artist.concerts_synced_at`, `concert_entry.concert_id` (`ON DELETE SET NULL`, único parcial por `(user_id, concert_id)`), triggers de `updated_at`
- [x] 1.2 Espejo en `src/db/schema.ts` y `docs/03-data/sql-model.md`

## 2. MusicBrainz

- [x] 2.1 Tipos de evento en `src/services/musicbrainz/types.ts` y `musicbrainz.browseArtistEvents(mbid, offset)` en el cliente
- [x] 2.2 Mapper puro: filtro `Concert`/`Festival` con fecha completa, recinto (`held at`), ciudad, país solo si el área es país, cancelado, artistas por rol
- [x] 2.3 `src/services/concerts/concert-sync.ts`: primera página sincrónica, resto y refresco de 30 días con `after()`, tope 1.000, upsert por `mbid`, reemplazo del cartel, enlace por `mbid` a artistas del catálogo, `concerts_synced_at` solo en recorrido completo
- [x] 2.4 Tests del mapper (con fixtures reales del spike) y de la sincronización (paginado, idempotencia, fallo, interrumpida)

## 3. Lectura y "Estuve ahí"

- [x] 3.1 `src/services/concerts/shared.ts`: conciertos de un artista (próximos + pasados por año, paginado), detalle con cartel, cifra de personas (umbral 5) y lista visible para el lector (matriz de visibilidad, cuentas activas, tope 50)
- [x] 3.2 Asistencia: crear, enlazar el registro existente (mismo artista y fecha exacta), idempotencia, rechazos (no confirmado, cancelado, futuro), quitar (desenlaza; borra solo si no se editó)
- [x] 3.3 Rutas `POST/DELETE /api/concerts/[id]/attendance` con `withErrorHandling`, `await params` y Zod; código `SHARED_CONCERT_NOT_FOUND`
- [x] 3.4 `concertId` en la forma del registro personal y en la exportación
- [x] 3.5 Tests del servicio y las rutas

## 4. Interfaz

- [x] 4.1 `ArtistTabs`: pestaña `concerts` al final para grupos y personas
- [x] 4.2 Pestaña `/artist/[id]/concerts`: dispara la sincronización, Próximos + años, filas con Festival, cifra y "Estuve ahí", paginación, estado vacío
- [x] 4.3 Página `/concert/[id]` con slug: datos, cartel, cifra, lista de personas y "Estuve ahí"
- [x] 4.4 Botón "Estuve ahí" / "Estuviste" (cliente) con actualización sin recargar
- [x] 4.5 Mis conciertos y la página de conciertos del perfil: enlace al concierto en los registros enlazados
- [x] 4.6 Mensajes `es`/`en`, `pnpm run i18n:client-messages` y tests de componentes y páginas

## 5. Documentación

- [x] 5.1 ADR nuevo "Catálogo de conciertos compartidos" (dos orígenes, estados, recuerdo vs. hecho, fases)
- [x] 5.2 `docs/03-data/data-licensing.md` (eventos de MusicBrainz, CC0), `docs/04-api/contracts.md` y `errors.md`, `business-rules.md`, `domain-model.md`, `docs/05-features/my-concerts.md`
- [x] 5.3 Smoke test `scripts/smoke-test-shared-concerts.ts` (MusicBrainz simulado, artista y eventos sintéticos `5e0ce000-…`): `CHECK`, sincronización e idempotencia, "Estuve ahí" (crear, enlazar, rechazos, quitar), cifra y visibilidad, `ON DELETE SET NULL`; documentarlo en AGENTS.md

## 6. Verificación

- [x] 6.1 Aplicar `0092` en la BD de scratch
- [x] 6.2 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 6.3 Verificar en el navegador con un artista real (Metallica o Kuervos del Sur): pestaña, página, "Estuve ahí" y Mis conciertos
