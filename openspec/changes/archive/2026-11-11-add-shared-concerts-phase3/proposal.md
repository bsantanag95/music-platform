## Why

Con las Fases 1 y 2 (ADR 0057 y 0058) existen conciertos compartidos de MusicBrainz y de la comunidad, pero los
recuerdos que la gente ya registró en Mis conciertos siguen sueltos: solo se enlazan si la persona vuelve a la pestaña
del artista y pulsa "Estuve ahí" en el concierto exacto. Tampoco hay forma de deshacer un enlace sin perder el recuerdo,
y los conciertos se muestran aislados aunque MusicBrainz sepa a qué gira o a qué festival pertenecen. Un spike del
2026-11-11 mostró que el mismo browse de eventos que ya hacemos trae la gira de casi todos los conciertos de los artistas
grandes (85 de 100 en Metallica, 97 de 100 en Depeche Mode) y el festival padre de los días y escenarios (7 a 10 de cada
100), sin requests extra.

Este cambio es la **Fase 3 de 3**.

## Goals

- Sugerir en Mis conciertos qué concierto compartido corresponde a cada recuerdo sin enlazar, para enlazarlo con un clic
  o descartarlo, usando solo los datos de la propia persona.
- Desvincular un recuerdo de su concierto sin borrarlo.
- Agrupar los conciertos de MusicBrainz por gira (página de la gira) y por festival (página del festival con sus días y
  escenarios y el cartel reunido), y llevar la gira al recuerdo que crea "Estuve ahí".
- Facilitar que un concierto de la comunidad confirmado llegue a MusicBrainz con un enlace a su formulario de alta
  precargado; cuando MusicBrainz lo tenga, la fusión automática de la Fase 2 lo integra.

## Non-Goals

- Sugerir crear un concierto a partir de recuerdos coincidentes de **otras** personas: revelaría la existencia de
  recuerdos privados ajenos, aunque fuera como una cifra. Las sugerencias de enlace cubren el caso en cuanto una persona
  lo comparte.
- El país de los conciertos de MusicBrainz por la jerarquía de áreas (requests por área y saltos); queda para otro cambio.
- Avisos ("tu concierto se confirmó", "hay un concierto que coincide con tu recuerdo").
- Ediciones de un festival a lo largo de los años (series de tipo festival), repertorio, fotos o entradas.
- Que la comunidad edite conciertos confirmados o de MusicBrainz.
- Enviar datos a MusicBrainz desde el servidor: el alta la hace la persona en MusicBrainz, con su cuenta.

## What Changes

- Migración `0095`: `concert_series` (giras de MusicBrainz: `mbid` único y nombre); en `concert`, `series_id`
  (`ON DELETE SET NULL`), `parent_id` (festival padre, `ON DELETE SET NULL`, nunca él mismo) y `end_date` (≥ la fecha);
  `concert_link_dismissal` (recuerdo × concierto descartado, `ON DELETE CASCADE` por los dos lados).
- **Sugerencias de enlace** en Mis conciertos: un bloque "¿Son estos tus conciertos?" con, para cada recuerdo sin
  enlazar, hasta 3 conciertos visibles del mismo artista con fecha compatible (misma fecha ±1 día, mismo mes o mismo año
  según lo que recuerde) y la misma ciudad normalizada (obligatoria si la fecha no es exacta). "Enlazar" enlaza sin tocar
  lo escrito y suma para confirmar uno por confirmar; "No es este" lo descarta para siempre.
- **Desvincular** en el menú de un recuerdo enlazado: quita el enlace, conserva el recuerdo y no lo vuelve a sugerir.
- **Giras y festivales**: el browse de eventos agrega `series-rels+event-rels`. La gira (serie de tipo `Tour`) se guarda
  en `concert_series` y se enlaza; el festival padre de un día o escenario (relación `parts`) se guarda como concierto
  sin cartel y con rango de fechas, y sus hijos lo enlazan. Página de la gira (`/tour/{slug}`: fechas, en cuántas
  estuviste); la página de un festival muestra sus días y escenarios y el cartel reunido; la de un concierto, su gira y
  su festival. "Estuve ahí" copia el nombre de la gira al recuerdo que crea.
- **Agregar a MusicBrainz**: en un concierto de la comunidad confirmado, con sesión, un enlace al formulario de alta de
  eventos de MusicBrainz precargado (nombre, tipo, fecha y el setlist como fuente).
- API: `POST`/`DELETE /api/me/concerts/{id}/link`, `POST /api/me/concerts/{id}/dismissals`; códigos
  `CONCERT_LINK_INVALID` y `CONCERT_LINK_CONFLICT`.
- ADR nuevo, docs y smoke test.

## Capabilities

### New Capabilities

- `concert-tours-festivals`: giras y festivales de MusicBrainz como agrupaciones navegables de conciertos.

### Modified Capabilities

- `concert-log`: sugerencias de enlace y desvincular en Mis conciertos.
- `musicbrainz-event-sync`: browse con giras y relaciones entre eventos; festival padre.
- `community-concerts`: enlace para agregar un concierto confirmado a MusicBrainz.

## Impact

- Datos: migración `0095`, espejo en `src/db/schema.ts`, `docs/03-data/sql-model.md`.
- Código: `src/services/musicbrainz/event-mappers.ts` y `client.ts` (inc), `src/services/concerts/concert-sync.ts`,
  `shared.ts`, `concerts.ts`, un servicio nuevo de sugerencias y otro de giras; rutas nuevas; Mis conciertos, pestaña,
  página del concierto y página de la gira.
- Los conciertos ya importados ganan gira y festival en su próximo refresco (cada 30 días); no hay script de relleno.
- Sin dependencias nuevas.
