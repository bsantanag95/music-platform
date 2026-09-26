## Why

En discos pop muy acreditados (medido en *Eyes Wide Open*: 41 personas) la pestaña Créditos
clasifica mal y se lee con esfuerzo. Como "intérprete" gana a "producción" al elegir el
nivel, los productores que además tocan (Jon Levine, John Gordon, Matt Squire…) quedan en
"Músicos invitados" (28 personas) y "Producción y sonido" muestra casi solo producción
adicional e ingeniería. Además, "pistas 2, 3, 9, 10" obliga a volver a Canciones para saber
qué temas son, y en discos con un productor distinto por canción la lectura natural es por
canción, no por persona.

## What Changes

- **Producir pesa más que tocar**: quien no es integrante y tiene un crédito `producer` va a
  Producción y sonido; sus roles empiezan por la producción.
- **Vista Por canción**: control segmentado Por persona / Por canción (estado en la URL,
  `?view=songs`); por pista, Producción, Intérpretes, Sonido y Otros; créditos de
  edición una vez como "todo el álbum".
- **Números de pista enlazados** a la canción, con el título como ayuda y nombre accesible.
- **Detalles**: "+N" solo con 2 o más roles ocultos; título "Créditos" solo para lectores de
  pantalla; solista como línea compacta (el bloque destacado queda para bandas);
  "instrumentos" sin detalle pasa a "varios instrumentos".

## Goals

- Que cada persona quede en el nivel que el oyente espera.
- Poder responder "¿quién hizo esta canción?" sin cruzar números de pista.

## Non-Goals

- Compositores y letristas (créditos de obra en MusicBrainz): cambio de datos aparte.
- Cambiar la ingesta de créditos o el esquema.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `personnel-credits`: prioridad de producción en la clasificación, orden de roles y
  lectura agrupada por canción.
- `catalog-album`: pestaña Créditos (solista compacto, título solo accesible), filas
  compactas (+N, pistas enlazadas, "varios instrumentos") y vista por canción.

## Impact

- `src/services/catalog/personnel-levels.ts` (+ test): clasificación, orden de roles,
  `recordingId` por pista, agrupación por canción.
- `src/components/album/AlbumCredits.tsx`, `credit-roles.ts` (+ tests).
- `src/app/[locale]/(catalog)/album/[id]/(tabs)/credits/page.tsx`: lee `?view`.
- `messages/{es,en}/catalog.json`; `docs/05-features/catalog-browsing.md`.
