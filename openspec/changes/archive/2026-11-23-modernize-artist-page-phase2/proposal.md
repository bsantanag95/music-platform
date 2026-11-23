## Why

La propuesta **D · Mezcla** (auditoría de la ficha de artista del 2026-11-21, `mockups/artist-2026-11/d-mezcla.html`) pide sumar
a la pestaña Integrantes la línea de tiempo de la propuesta A, «La banda a lo largo del tiempo», sobre la alineación estilo Metal
Archives que ya existe y que el usuario prefiere conservar tal cual (decisión del 22 de noviembre). Hoy la historia de un grupo
con muchos cambios (Iron Maiden: 6 actuales, 18 antiguos) solo se lee fila por fila; una vista en el tiempo muestra de un vistazo
quién estuvo cuándo y en qué rol. Esta es la Fase 2 de tres (la Fase 1, la portada, está publicada en `main` 463ed015).

## What Changes

- **Línea de tiempo de la alineación** en la pestaña Integrantes de un grupo, encima del filtro de sub-vistas: una fila por
  integrante (actuales y antiguos, sin músicos de apoyo) con barras por período, la voz en un tono y los instrumentos en otro, y
  un eje de años desde la formación hasta hoy (o hasta la separación).
- Los períodos sin año de inicio arrancan en la formación del grupo y los terminados sin año de fin se dibujan con el extremo
  desvanecido; cada fila tiene su texto equivalente para lectores de pantalla.
- La línea de tiempo solo aparece cuando al menos dos integrantes tienen un período con año; si no, la pestaña queda como hoy.
- La alineación estilo Metal Archives (filas, ★ fundador, † muerte, «También en», sub-vistas) **no cambia**.

### Goals

- Leer la historia de la formación de un vistazo sin perder el detalle de la lista.

### Non-Goals

- **Biografía:** ya tiene su ficha lateral (primer y último álbum, número de álbumes, integrantes actuales y antiguos) desde
  `refine-artist-page-phase3`; esta fase no la cambia.
- La pestaña Bandas de una persona y los músicos de apoyo.
- **Fase 3:** la discografía.
- Datos nuevos: todo sale de los períodos ya guardados (`membership_period`, migración 0055).

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `artist-lineup-view`: la pestaña Integrantes de un grupo suma la línea de tiempo de la alineación.

## Impact

`src/components/artist/lineup-timeline.ts` (función pura, con tests unitarios y de propiedades) y `LineupTimeline.tsx`;
`ArtistLineup.tsx` (`GroupLineupView` la monta); `members/page.tsx` (años de formación y separación del grupo, ya en
`loadProfile`); mensajes `catalog.artist.lineup` (es/en); `client-messages.json` si cambia; tests de la pestaña;
`docs/05-features/catalog-browsing.md`. Sin API, esquema ni dependencias. Las páginas informativas no cambian.
