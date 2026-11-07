## Why

La Fase 1 dejó la discografía Por disco. Lo que hace única a la gráfica de SeriesGraph es la vista Por canción, pista por pista, y la mayoría de quienes valoran
canciones lo hacen con un disco a la vez (`docs/05-features/sharing.md` §4.1). Esta es la segunda de tres fases.

## Goals

- Mostrar la discografía pista por pista para quien valoró canciones, sin castigar a quien no.
- Que la persona decida qué secciones y qué vista comparte, y que página e imagen digan lo mismo.

## Non-Goals

- "Valora lo que falta" y "Arma la tuya" en esta página (Fase 3).
- Mover las notas de canciones a otro lugar o darles audiencia propia.
- Otras secciones (Sencillos, Otros, Apariciones).
- Fijar D9 con datos reales: el umbral queda en una constante para ajustarla cuando los haya.

## What Changes

- **Vista Por canción:** columnas = discos, filas = número de pista y celda = tu nota de esa canción. Una pista sin valorar es una celda vacía con borde, nunca un 0. Arriba, la nota del disco. Se usa la tracklist de la edición representativa.
- **Umbral D9:** desde 10 canciones valoradas en al menos 2 discos. Con menos, solo la vista Por disco.
- **Preferencias del dueño por artista:** secciones En vivo y Recopilatorios (los EP ya están) y la vista por defecto, en la tabla nueva `discography_preference` (migración `0085`). La imagen compartida muestra lo que eligió el dueño; un visitante puede cambiar de vista en la página.
- **Discos que entran:** los de las secciones elegidas con alguna valoración, del disco o de sus pistas. La vista Por disco sigue exigiendo la nota del disco.
- **Lámina de álbum:** `/users/<u>/artist/<id>?disco=<album>`, las pistas como barras con su nota, desde 3 canciones valoradas. La abre la misma marca del artista, con su imagen.
- **Imagen:** Por canción hasta 20 discos y 20 pistas, con "+n"; álbum hasta 25 pistas. Las carátulas siguen en 10 como máximo (ADR 0053).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `discography-laminas`: vista Por canción, preferencias del dueño, discos con notas de canciones y Lámina de álbum.
- `share-images`: la imagen de una discografía sigue la vista del dueño y suma la del álbum.
- `share-events`: la referencia de una Lámina de álbum.

## Impact

- **Base de datos:** migración `0085` (`discography_preference`).
- **Servicios:** `src/services/laminas/discography.ts` (pistas, notas de canciones, preferencias) y el objetivo de imagen.
- **API:** `PUT /api/me/discography/<artistId>` para las preferencias.
- **Interfaz:** página de discografía con selector de vista, ajustes del dueño, grilla, Lámina de álbum y sus marcos de imagen.
- **Documentación:** `docs/05-features/sharing.md` (D9), `business-rules.md`, `sql-model.md`, `domain-model.md`, `contracts.md`, `AGENTS.md`.
