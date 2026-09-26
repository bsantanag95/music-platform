## Why

La pestaña Créditos obliga a abrir niveles para enterarse de cosas que podría decir de un
vistazo. En *Dr. Feelgood*, cuatro de los cinco autores son integrantes, pero Composición
dice "5 · Nikki Sixx, Mick Mars, Tommy Lee y 2 más", que no distingue a la banda de los
autores externos, y la fila de cada integrante no dice que además compuso. Producción y
sonido con 3 personas ya las nombra a todas en el resumen, así que abrirlo solo aporta los
roles. Y "Créditos según MusicBrainz." no enlaza a la fuente, aunque la licencia
(CC BY-NC-SA) pide atribuir.

## What Changes

- **Autoría en la fila del integrante**: cada integrante (o artista principal) que también
  firmó obras del disco muestra una línea secundaria con sus roles de autoría y las pistas
  ("música, letra · todas").
- **Resumen de Composición con integrantes**: si hay integrantes entre los autores, el
  resumen los cuenta aparte y nombra a los autores externos ("5 · 4 integrantes + Donna
  McDaniel"). La sección desplegada sigue listando a todos.
- **Roles en el resumen de niveles cortos**: cuando un nivel contraído tiene 3 personas o
  menos (el resumen ya las nombra a todas), cada nombre va con su rol principal ("Bob Rock
  (producción) · Chris Taylor (asistencia de ingeniería) · Randy Staub (ingeniería)").
  Los niveles siguen contraídos.
- **Atribución enlazada**: "Créditos según MusicBrainz" enlaza a la página de la edición
  representativa en musicbrainz.org (se abre en otra pestaña).

## Goals / Non-Goals

**Goals**
- Que el primer nivel diga quién de la banda compuso, sin abrir Composición.
- Que el resumen de Composición distinga integrantes de autores externos.
- Que un nivel corto se entienda sin abrirlo.
- Atribuir la fuente con un enlace a la edición concreta.

**Non-Goals**
- No cambia qué personas aparecen ni en qué nivel, ni la regla "todo contraído salvo el
  primer nivel".
- No se quita a los integrantes de la sección Composición desplegada: sigue siendo la lista
  completa de autores.
- No cambia la vista Por canción.
- Sin cambios de datos, ingesta ni API.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `catalog-album`: autoría en las filas del primer nivel, resumen de Composición con
  integrantes, roles en el resumen de niveles cortos y atribución enlazada en la pestaña
  Créditos.

## Impact

- `src/services/catalog/personnel-levels.ts`: `AlbumPersonnel` suma el MBID de la edición
  representativa.
- `src/components/album/AlbumCredits.tsx` y sus pruebas.
- `src/app/[locale]/(catalog)/album/[id]/(tabs)/credits/page.tsx`: pasa el MBID.
- `messages/es/catalog.json`, `messages/en/catalog.json`: textos nuevos de resumen y
  atribución.
- `docs/05-features/catalog-browsing.md`.
