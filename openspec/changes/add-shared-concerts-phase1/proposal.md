## Why

"Mis conciertos" (`add-my-concerts`, ADR 0056) registra recuerdos personales, pero cada persona escribe su concierto por
separado: no hay un concierto compartido donde ver quién más estuvo, ni una lista de conciertos en la página del
artista. Se descartó la API de setlist.fm (clave, cuota, uso no comercial, sin guardar datos). Un spike del 2026-11-11
mostró que MusicBrainz tiene eventos de muy buena calidad (97–100 % con fecha completa y recinto, CC0, misma fuente del
catálogo) pero con cobertura despareja: cientos para Metallica o Taylor Swift, casi nada para el catálogo latino (Soda
Stereo 3, Los Bunkers 0). La dirección es un catálogo de conciertos compartidos con dos orígenes: los eventos de
MusicBrainz como semilla verificada y, después, los que cree la comunidad con confirmación entre personas.

Este cambio es la **Fase 1 de 3**: la entidad compartida, la semilla de MusicBrainz y "Estuve ahí". Sin creación
comunitaria todavía.

## Goals

- Una entidad de **concierto compartido** con su recinto, ciudad, fecha y artistas, a la que el registro personal se
  enlaza de forma opcional (el enlace que dejó previsto el ADR 0056), sin reescribir lo que la persona escribió.
- Traer bajo demanda los eventos de MusicBrainz de un artista (conciertos y festivales con fecha completa), por el único
  cliente de MusicBrainz y con su cola.
- Una pestaña **Conciertos** en la página del artista y una página por concierto, con "Estuve ahí" para sumarse en un
  clic y ver quiénes más estuvieron, respetando la audiencia de cada registro.

## Non-Goals (fases siguientes)

- **Fase 2:** que la comunidad cree conciertos (pendientes hasta confirmarse entre varias personas o con prueba externa),
  plausibilidad contra la actividad del artista, detección de duplicados, límites, reportes y fusión por moderación, y
  "registrado por" en lo confirmado.
- **Fase 3:** sugerir enlazar registros personales existentes, desvincular, navegar un festival por días y escenarios,
  y proponer a MusicBrainz los conciertos confirmados.
- Repertorio (canciones), entradas, fotos o calificación de conciertos, feed, Láminas y notificaciones.

## What Changes

- Migración `0092`: tablas `concert` (compartido, `mbid` único, nombre, tipo concierto/festival, fecha exacta,
  recinto, ciudad, país, origen, cancelado, sincronizado) y `concert_performer` (artistas del concierto con su rol, el
  `mbid` y el nombre de MusicBrainz y el artista del catálogo si existe); `artist.concerts_synced_at`; y
  `concert_entry.concert_id` opcional con unicidad por persona y concierto.
- Cliente de MusicBrainz: browse paginado de eventos de un artista con sus relaciones de recinto, área y artistas.
- Sincronización bajo demanda al abrir la pestaña (la primera página antes de responder, el resto y los refrescos cada
  30 días en segundo plano), solo `Concert` y `Festival`, con fecha completa.
- Pestaña **Conciertos** (`/artist/{id}/concerts`) para grupos y personas: próximos y por año, con recinto, ciudad,
  festival, cuántas personas estuvieron y "Estuve ahí".
- Página de concierto (`/concert/{id}`): fecha, recinto, cartel (principales y teloneros, enlazados si están en el
  catálogo), personas que estuvieron (según la audiencia de cada registro) y "Estuve ahí".
- "Estuve ahí": crea el registro personal enlazado con los datos del concierto, o enlaza uno propio del mismo artista y
  la misma fecha que no estuviera enlazado. Mis conciertos muestra el enlace al concierto.
- ADR nuevo (catálogo de conciertos compartidos, orígenes y confirmación), `data-licensing.md` (eventos de MusicBrainz,
  CC0), contratos, modelo y reglas.

## Capabilities

### New Capabilities

- `shared-concerts`: concierto compartido, pestaña Conciertos del artista, página del concierto, "Estuve ahí", personas
  que estuvieron y su cifra.
- `musicbrainz-event-sync`: browse de eventos de un artista, filtro y normalización, sincronización bajo demanda y
  refresco.

### Modified Capabilities

- `artist-page-layout`: la barra suma la pestaña Conciertos.
- `concert-log`: un registro personal puede estar enlazado a un concierto compartido (uno por persona y concierto) y Mis
  conciertos lo muestra.

## Impact

- Esquema: `drizzle/0092_shared_concert.sql`, `src/db/schema.ts`, `docs/03-data/sql-model.md`.
- Código: `src/services/musicbrainz/` (browse de eventos y tipos), `src/services/concerts/` (sincronización, lectura,
  asistencia), rutas `/api/concerts/*` y `/api/me/concerts`, pestaña y página nuevas, `ArtistTabs`, Mis conciertos,
  mensajes `es`/`en`.
- Externo: más requests a MusicBrainz (una por cada 100 eventos de un artista, solo al abrir su pestaña y cada 30 días),
  por la misma cola de ≥1,1 s.
- Sin dependencias nuevas.
