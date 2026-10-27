## Why

Las Fases 1 y 2 (`refine-progress-page-phase1`, `redesign-progress-toolbar`) arreglaron la base y la barra de
`/me/progress`. La auditoría dejó pendiente lo que dice cada fila:

- **"Actualizado hace 1 mes" no dice nada del avance:** es el `updated_at` de la lista, y el progreso sale del diario, así
  que escuchar un disco no lo cambia.
- **Nada indica qué escuchar después,** que es la pregunta con la que se abre esta página.
- **Las archivadas se mezclan con las que están en curso**, y la etiqueta "En curso" se repite en casi todas las filas.
- **Gráfico no muestra el avance,** y Listas que sigo tiene un botón de texto suelto en lugar del menú ⋯ de las otras
  pestañas.

## What Changes

- **"Siguiente: Hysteria (1987)"** en cada fila en curso, con enlace al álbum: el primer disco de la selección sin
  escuchar. En una discografía, el más antiguo por fecha de publicación; en una lista, el primero según el orden de su
  dueño. Nunca dice cuántos faltan.
- **"Última escucha hace 3 días"** (o "Sin escuchas todavía") en lugar de "Actualizado".
- Los listados de `/me/progress` y `GET /api/me/caminos` agregan `nextUp` y `lastListenedAt`, calculados por lote.
- **Secciones por estado** con el segmento "Todas": En curso, Completas y Archivadas, esta última plegada. El orden
  "Por estado" desaparece porque las secciones lo reemplazan. La etiqueta de estado solo aparece si no está en curso.
- **Gráfico con la barra discreta** bajo la foto o la carátula.
- **Listas que sigo:** la misma línea de detalle y un menú ⋯ con "Ver lista" y "Dejar de seguir" (con Deshacer), en lugar
  del botón de texto. Una lista seguida completa lleva su etiqueta.

### Goals

- Que cada fila responda qué escuchar después y cuándo se avanzó por última vez.

### Non-Goals

- Fracciones, "te faltan N" o conteos de completadas (§6.4.1).
- Cambios en las páginas de gestión de una discografía o de una lista.

## Capabilities

### Modified Capabilities

- `artist-journey`: detalle de Detallada con siguiente disco y última escucha; secciones por estado; sin orden "Por
  estado"; barra en Gráfico.
- `camino`: lo mismo en Listas para completar; Listas que sigo con menú ⋯ y la misma línea de detalle.

## Impact

- `src/services/journeys/progress.ts` (`progressDetailsByListId`), los tres listados de servicio y sus esquemas Zod
  (`NextUpAlbumSchema`).
- `src/components/progress/` (`ProgressRowMeta`, `ProgressSections`), los renderers y listados de `artist-journey` y
  `camino`.
- `messages/{es,en}/{camino,artistJourney}.json`, `docs/04-api/contracts.md`, `docs/05-features/caminos.md`.
- Sin cambios de esquema de base de datos.
