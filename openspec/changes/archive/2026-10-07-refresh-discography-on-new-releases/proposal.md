## Why

La discografía de un artista se resincroniza solo cuando alguien visita su página y la última
sincronización completa tiene más de 7 días: un disco nuevo puede tardar más de una semana en aparecer.
Además, cada resincronización recorre todas las páginas del browse aunque nada haya cambiado. Hoy son
~1.140 requests por ciclo para 803 artistas con discos, y 145 de ellos ocupan más de una página (hasta
21). Ese costo crece con el catálogo y compite en la cola de MusicBrainz (1 request cada 1,1 s) con las
visitas reales. El calendario de lanzamientos (`add-home-release-calendar`) ya recibe a diario el feed de
lanzamientos nuevos: se puede usar como señal para refrescar solo a quien lo necesita, sin sondear.

## Goals

- Que un lanzamiento nuevo de un artista con discografía guardada aparezca en la visita siguiente a que
  el calendario lo detecte, sin esperar los 7 días.
- Reducir el costo de la resincronización periódica de los artistas con más de 100 release-groups a una
  sola request cuando su discografía no cambió.
- Costo marginal cero en MusicBrainz para la detección: solo se refresca quien tiene un disco nuevo.
- Conservar la resincronización completa como red de seguridad (bajas, cambios de tipo, marcas).

## Non-Goals

- Cron, scheduler o job periódico: el refresco sigue siendo bajo demanda.
- Mostrar el disco nuevo en la misma visita que dispara el refresco (basta con la siguiente).
- Refrescar artistas que nadie visita, ni los que aún no tienen discografía guardada.
- Detectar lanzamientos que ListenBrainz no publica (la resincronización semanal los cubre).
- Refrescar tracklists, ediciones o créditos de álbumes ya ingeridos.
- Cambiar el intervalo de 7 días.

## What Changes

- **Disparo por lanzamiento detectado:** al terminar cada sincronización del calendario, los artistas con
  discografía guardada que figuran en una entrada válida del calendario cuyo disco todavía no está en su
  discografía quedan con una solicitud de resincronización. Su próxima visita lanza la resincronización
  completa en segundo plano, aunque no hayan pasado 7 días. A lo sumo una por artista por día.
- **Verificación barata antes de la resincronización:** si la discografía de un artista ocupa más de una
  página, la resincronización periódica pide primero la página 1 y compara el total de MusicBrainz con el
  de la última sincronización completa. Si coincide, guarda esa página, da la discografía por verificada y
  omite el resto. Si difiere, sigue con todas las páginas, reusando la primera.
- **Recorrido completo forzado:** cada 30 días, cuando hay una solicitud de resincronización o cuando no se
  conoce el total anterior, se hace el recorrido completo sin atajo.
- Nueva migración `0064_artist_discography_refresh.sql` (aditiva) con tres columnas en `artist`: el total
  de MusicBrainz de la última sincronización completa, la fecha de la última verificación y la de la
  solicitud de resincronización. Espejo en `src/db/schema.ts`.
- Docs: `docs/03-data/sql-model.md`, `docs/04-api/contracts.md` (comportamiento de la resincronización),
  `docs/02-architecture/code-walkthrough.md` si describe el ciclo.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `artist-discography`: la actualización periódica pasa a considerar la verificación barata y la
  solicitud de resincronización. Se suman los requisitos de disparo por lanzamiento detectado y de
  verificación barata.

## Impact

- **Código:** `src/services/catalog/ingest-discography.ts` (frescura, atajo de la página 1 y recorrido
  forzado), `src/services/home/release-calendar-sync.ts` (marca de artistas al terminar la
  sincronización), `scripts/backfill-artist-discography.ts` (que siga forzando el recorrido completo).
- **Esquema:** migración `0064` + `src/db/schema.ts`. `discography_complete_at` conserva su significado
  (última sincronización completa); lo leen la página de artista y el descubrimiento de géneros.
- **MusicBrainz:** menos requests por ciclo (~1.140 → ~800 con el catálogo actual, más ahorro cuanto más
  grandes los artistas); unas decenas de resincronizaciones extra por día como mucho, por el calendario.
- **Sin dependencias nuevas** ni cambios de contrato REST.
