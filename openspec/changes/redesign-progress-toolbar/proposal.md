## Why

La Fase 1 (`refine-progress-page-phase1`) corrigió los errores de `/me/progress`. Quedan los problemas de estructura que
encontró la auditoría:

- **No se puede empezar nada desde la página:** Discografías no ofrece "Completar discografía", y "Nueva lista para
  completar" vive dentro del panel de Mis listas como un formulario en línea que empuja el listado.
- **Las pestañas no dicen cuánto hay** y "Mis listas" se llama igual que `/me/lists`, que muestra otra cosa.
- **El estado es un select "Todo"** que esconde cuántas entradas hay en curso, completas o archivadas, y el orden no
  permite ver primero lo más avanzado (Listas que sigo sí lo permite).

## What Changes

- **Cabecera con la acción de la pestaña:** "+ Completar discografía" en Discografías y "+ Nueva lista para completar" en
  Listas para completar abren el diálogo de acciones rápidas del Header ya en esa acción (buscador de artistas o
  formulario). En Listas que sigo, un enlace "Descubrir listas para completar →". El formulario en línea y la línea
  "N listas" de la pestaña desaparecen; los estados vacíos usan la misma acción.
- **Pestañas con totales y nombres nuevos:** Discografías · Listas para completar · Listas que sigo, cada una con su
  total contado en el servidor (las tres, aunque solo se cargue la activa) y actualizado al borrar o dejar de seguir. En
  un teléfono, "Listas para completar" se abrevia "Para completar" para que quepan en una fila, y la acción va en la fila
  del título ("+ Nueva lista" en lugar de "+ Nueva lista para completar").
- **Segmentos de estado con cifras** (Todas · En curso · Completas · Archivadas) en lugar del select; un estado sin
  entradas queda deshabilitado salvo que esté activo.
- **Orden con la etiqueta dentro** y una opción nueva, "Más avanzadas" (proporción escuchada de la selección, de mayor a
  menor); Listas que sigo usa el mismo nombre.
- **Tras crear algo** desde el diálogo, la página se refresca y el listado recibe los datos nuevos sin perder los filtros.

### Goals

- Que cada pestaña tenga su forma de empezar y que el total y el estado se lean sin abrir controles.

### Non-Goals

- "Siguiente: …", "Última escucha", secciones por estado, barra en Gráfico, filas de Listas que sigo con ⋯ (Fase 3).
- Fracciones o conteos de completadas fuera de la gestión (§6.4.1): las cifras de los segmentos cuentan entradas por
  estado en la superficie privada del dueño, no discos escuchados ni comparaciones.

## Capabilities

### Modified Capabilities

- `progress-hub`: cabecera con acción por pestaña, pestañas con totales, nombre "Listas para completar".
- `artist-journey`: segmentos de estado con cifras, orden "Más avanzadas", estado vacío con la acción.
- `camino`: lo mismo en Listas para completar; creación desde el diálogo; orden "Más avanzadas" en Listas que sigo.

## Impact

- `src/components/progress/` (sección, segmentos, orden, filtros), `src/app/[locale]/me/progress/page.tsx`.
- `src/components/artist-journey/ArtistJourneyList.tsx`, `src/components/camino/{MyCaminosList,TrackedCaminosList}.tsx`.
- Nuevo `src/services/progress/progress-counts.ts` (conteo de las tres pestañas, sin cambios de API pública).
- `messages/{es,en}/{camino,artistJourney}.json`, `docs/05-features/caminos.md`.
- Sin cambios de esquema.
