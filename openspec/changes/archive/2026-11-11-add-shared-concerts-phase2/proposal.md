## Why

La Fase 1 (`add-shared-concerts-phase1`, ADR 0057) sembró los conciertos compartidos con los eventos de MusicBrainz, pero
el spike mostró que el catálogo latino e independiente casi no tiene eventos ahí (Los Bunkers 0, Soda Stereo 3, Mon
Laferte 2). Para esos artistas la pestaña Conciertos queda vacía. La Fase 2 deja que la comunidad cree los conciertos
que faltan, sin que eso abra la puerta a datos falsos ni a un "reconocimiento" que se gane inventando: un concierto
creado por la comunidad no es público hasta que otras personas lo confirman.

Este cambio es la **Fase 2 de 3**.

## Goals

- Que una persona cree un concierto compartido de un artista (desde su pestaña Conciertos o a partir de un recuerdo de
  Mis conciertos), quedando ella como primera asistente.
- Que el concierto nazca **por confirmar** y solo se haga público al confirmarlo varias personas independientes o con
  una prueba externa verificable.
- Frenar los datos falsos y duplicados: plausibilidad contra la actividad del artista, búsqueda de duplicados antes de
  crear, requisitos de cuenta, límites, reportes y moderación (ocultar, restaurar, fusionar).
- Reconocer a quien registró un concierto de forma discreta y solo cuando ya está confirmado.

## Non-Goals

- Fase 3: sugerir crear o enlazar conciertos a partir de recuerdos coincidentes de varias personas, desvincular desde
  Mis conciertos, navegar festivales por días y escenarios, proponer conciertos confirmados a MusicBrainz.
- Resolver el país de los conciertos de MusicBrainz por su jerarquía de áreas (la búsqueda de duplicados usa la ciudad).
- Que la comunidad edite conciertos confirmados o de MusicBrainz (solo la moderación los oculta o fusiona).
- Notificaciones (por ejemplo, "tu concierto fue confirmado"), insignias o rankings de quién registra más.
- Repertorio, fotos o entradas.

## What Changes

- Migración `0093`: en `concert`, `created_by` (`ON DELETE SET NULL`), `setlistfm_url` (prueba externa), `city_key`
  (ciudad normalizada para duplicados, columna generada con `search_key`), `confirmed_at` y `merged_into_id`; `CHECK` de coherencia (un comunitario tiene
  recinto, ciudad y país; fusionado implica oculto). `content_report.concert_id` y `moderation_action.concert_id`
  con la acción `merge`.
- Crear un concierto: `POST /api/concerts` con artista principal (y hasta 10 artistas más del catálogo como principales o
  teloneros), fecha exacta, recinto, ciudad, país, nombre opcional y enlace opcional a un setlist de setlist.fm. Crea el
  concierto **por confirmar** y la asistencia de quien lo crea.
- Antes de crear: `GET /api/concerts/candidates` muestra conciertos del mismo artista en fechas cercanas ("¿Es alguno de
  estos?") para sumarse en vez de duplicar; el mismo artista, la misma fecha y la misma ciudad se rechazan como
  duplicado.
- Plausibilidad: no futura, y dentro de la actividad del artista (no antes de formarse, no después de separarse o morir).
- Requisitos y límites para crear: email verificado, cuenta de al menos 7 días, sin suspensión social, hasta 5 por día.
- Confirmación: 3 personas distintas que estuvieron (con email verificado y cuentas de al menos 7 días, contando a quien
  lo creó) o un enlace a setlist.fm cuyo artista y año coinciden. Al confirmarse pasa a público y no vuelve atrás salvo
  por moderación.
- Por confirmar: visibles solo para personas con sesión, en una sección propia de la pestaña y en su página con el aviso
  de cuántas confirmaciones faltan; no cuentan en ninguna cifra, no se indexan y no muestran quién lo registró.
- Conciertos confirmados de la comunidad: "Registrado por @usuario", discreto.
- Reportar un concierto (no ocurrió, duplicado, datos erróneos) y moderarlo desde la cola: ocultar, restaurar y fusionar
  en otro (los recuerdos pasan al concierto destino sin duplicar a nadie).
- Al importar de MusicBrainz un concierto que coincide con uno de la comunidad (mismo artista, fecha y ciudad), el de la
  comunidad se fusiona en el de MusicBrainz.
- Mis conciertos: un recuerdo con fecha completa, ciudad y país sin enlazar ofrece "Compartir este concierto", que abre la
  creación con sus datos.

## Capabilities

### New Capabilities

- `community-concerts`: creación, plausibilidad, duplicados, requisitos y límites, confirmación, visibilidad de lo por
  confirmar y crédito de quien lo registró.

### Modified Capabilities

- `shared-concerts`: la pestaña y la página muestran también lo por confirmar a personas con sesión; "Estuve ahí" suma
  confirmaciones.
- `musicbrainz-event-sync`: un comunitario coincidente se fusiona en el importado.
- `content-moderation`: reportes y acciones sobre conciertos (ocultar, restaurar, fusionar).
- `concert-log`: "Compartir este concierto" desde un recuerdo.

## Impact

- Esquema: `drizzle/0093_community_concert.sql`, `src/db/schema.ts`, `docs/03-data/sql-model.md`.
- Código: `src/services/concerts/` (creación, candidatos, confirmación, fusión), sincronización de MusicBrainz, servicio y
  cola de moderación, rutas `/api/concerts`, `/api/concerts/candidates`, `/api/concerts/[id]/report`, acciones de
  moderación; pestaña, página, formulario de creación, Mis conciertos y cola de moderación; mensajes `es`/`en`.
- Docs: ADR nuevo (confirmación comunitaria), contratos, errores, reglas, modelo y la feature.
- Sin dependencias nuevas.
