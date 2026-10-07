## Why

El riel "Lanzamientos recientes / Próximos lanzamientos" de Inicio muestra hoy datos de maqueta
(`listHomeReleases` asigna fechas sintéticas a release-groups reales). MusicBrainz no ofrece un feed
usable de lanzamientos y nuestra discografía se sincroniza una sola vez, así que un disco anunciado
después de la primera visita a un artista nunca aparece. Una prueba contra ListenBrainz (2026-10-06)
mostró que su feed "Fresh Releases" (CC0, datos de MusicBrainz) más su endpoint de popularidad de
artistas permiten un calendario real, filtrado y con carátula.

## Goals

- Reemplazar la maqueta por un calendario real de lanzamientos de los últimos 30 días y de los próximos.
- Usuario anónimo: una selección acotada y relevante (no el feed completo), solo con carátula.
- Usuario logueado: lanzamientos de los artistas con los que el propio usuario tiene relación.
- Respetar el Principio 4: el feed externo vive en una tabla de calendario aparte; al catálogo solo
  entra lo que efectivamente se muestra.

## Non-Goals

- Curación editorial manual (roles de plataforma, `product_philosophy.md` §7).
- Notificaciones o avisos de lanzamientos (correo, push, feed de actividad).
- Página completa de calendario con filtros; el riel queda como único punto de entrada.
- Personalización por gustos inferidos (géneros, afinidad) para quien no tiene relación con artistas.
- Infraestructura de cron: el refresco se hace bajo demanda y con un script operativo.

## What Changes

- Nuevo cliente `src/services/listenbrainz/client.ts`: único punto de salida a ListenBrainz
  (fresh-releases y popularidad de artistas), con `LISTENBRAINZ_USER_AGENT` obligatorio.
- Nueva tabla `release_calendar_entry` (migración `0063`) con la ventana del feed, la popularidad del
  artista, el resultado de la verificación en MusicBrainz y el vínculo opcional al `release_group`.
- Sincronización diaria del calendario: bajo demanda al renderizar Inicio cuando el calendario tiene
  más de 24 h (en `after()`, con lock), y por script `scripts/sync-release-calendar.ts`.
- Verificación de finalistas con una búsqueda por lote en MusicBrainz (vía el cliente existente):
  descarta en vivo, recopilatorios y demás tipos secundarios, y reediciones.
- Los discos elegidos para mostrarse se registran como stubs de `release_group` (mismo patrón que la
  búsqueda), para que la tarjeta enlace a `/album/{id}` y la carátula use el pipeline existente.
- `listHomeReleases` deja de ser maqueta: selección anónima (30 días atrás / 60 adelante, 12 + 12,
  un disco por artista, tope por familia de géneros) y selección personal para el usuario logueado.
- `/album/[id]` maneja un disco que aún no salió y no tiene tracklist.
- Docs: `docs/05-features/home.md`, `docs/03-data/sql-model.md`, `docs/03-data/data-licensing.md` y un
  ADR nuevo (`0029`) sobre ListenBrainz como fuente y la resolución del Principio 4.

## Capabilities

### New Capabilities
- `home-release-calendar`: calendario de lanzamientos de Inicio — origen de los datos, sincronización,
  filtros de calidad, selección anónima y personal, y presentación en el riel.

### Modified Capabilities
(ninguna — el spec `home` no define requisitos sobre este riel)

## Impact

- **Código:** `src/services/listenbrainz/` (nuevo), `src/services/home/` (calendario y selección),
  `src/components/home/HomeReleases.tsx` y `ReleaseRail.tsx` (estado "Anunciado", marca "Destacado"),
  `AnonymousHome.tsx`/`AuthenticatedHome.tsx`, página `/album/[id]`, mensajes i18n.
- **Esquema:** migración `0063_release_calendar.sql` + espejo en `src/db/schema.ts`.
- **Externo:** nueva dependencia de servicio (ListenBrainz API, sin autenticación); nueva variable
  `LISTENBRAINZ_USER_AGENT` en `.env.example`. Sin dependencias npm nuevas.
- **MusicBrainz:** una búsqueda por lote al día para verificar finalistas (por el cliente con rate limit).
