## Why

La Fase 1 (`modernize-song-page-phase1`, `main` b5ba22c7) llevó la cabecera de la canción a una tarjeta con «Recorrer el disco», que
solo muestra la pista anterior y la siguiente. Para ver el disco entero —o saltar a otra pista que no sea vecina— hay que volver al
álbum. Debajo de la tarjeta, Composición y Créditos siguen en cajas a todo el ancho con títulos de 18 px, más pequeños que el de los
comentarios (20 px). La propuesta elegida (**D · Mezcla**, cuerpo de **A · Escenario**, `mockups/song-2026-11/d-mezcla.html`) pone
al lado de los créditos la columna «En el disco»: todas las pistas, esta marcada. Esta es la Fase 2 de tres.

## What Changes

- **Columna «En el disco»:** a la derecha de Composición y Créditos, la lista de pistas de la edición representativa del disco
  principal con número, título enlazado y duración; la pista actual marcada (no enlazada) y, al pie, «N pistas · duración total».
  En discos de varios medios, un rótulo por disco. Con más de 20 pistas, una ventana de 5 antes y 5 después de la actual y el
  enlace al disco completo. Sin tira (pista fuera de la edición representativa), la columna no va y los créditos ocupan el ancho.
- **Créditos sin caja:** Composición y Créditos de esta grabación dejan la superficie con borde (la tarjeta ya es la superficie) y
  se leen en filas con filete; Intérpretes y el resto de grupos van en dos columnas solo cuando hay ancho (`xl`).
- **Escala de títulos:** los títulos de sección de la canción (Composición, Créditos, Apariciones y Versiones) pasan a 24 px en
  negrita, la escala de los bloques del mockup; siguen siendo iguales entre sí.
- **Teléfono y tableta:** «En el disco» va debajo de los créditos.

### Goals

- Recorrer el disco entero desde la canción, sin volver al álbum, como en Metal Archives.

### Non-Goals

- **Fase 3:** «Aparece en» como franja de carátulas, versiones con año y duración y comentarios.
- Cambiar la tarjeta, los datos de créditos o el orden de los grupos.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `song-page-layout`: zonas con la columna «En el disco»; créditos sin caja y en dos columnas solo con ancho; escala de títulos.

## Impact

`src/services/catalog/recording-detail.ts` (`TrackStrip` gana la lista completa con duraciones, de la misma consulta que ya hace
`getTrackStrip`); un componente nuevo `src/components/song/SongOnDisc.tsx`; `SongCredits.tsx` (sin caja, columnas en `xl`, títulos); `SongAppearances.tsx` y `SongVersions.tsx` (solo el título);
`page.tsx` (rejilla del cuerpo); mensajes `messages/{es,en}/catalog.json`; tests de `buildTrackStrip`, de la columna y de la página;
`docs/05-features/catalog-browsing.md`. Sin consultas nuevas, API, esquema ni dependencias.
