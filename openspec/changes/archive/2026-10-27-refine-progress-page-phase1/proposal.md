## Why

Una auditoría de `/me/progress` (Discografías, Mis listas y Listas que sigo, en las tres vistas) a 1280 y 375 px con
datos reales encontró errores que no dependen del rediseño:

- **Salto de modo:** con Índice o Gráfico guardado se pinta Detallada y luego salta. `useArtistJourneyViewMode` y
  `useCaminoViewMode` no avisan cuándo leyeron la preferencia.
- **Borrar** una discografía o una lista para completar se confirma en la fila con "¿Eliminar? Confirmar eliminación
  Cancelar": no nombra el artista ni la lista, ni dice que las escuchas siguen en el diario.
- **Dejar de seguir** una lista es un botón que dice "Siguiendo mi progreso" (el estado, no la acción); un toque la quita
  sin confirmar y sin deshacer.
- **El ⋮ mide 24 px**, también con puntero grueso, y es la única entrada a Archivar y Eliminar.
- **La barra de progreso** es un `div` sin rol ni texto: un lector de pantalla no la anuncia.
- **Búsqueda, orden y estado no viven en la URL:** se pierden al recargar o al volver desde un detalle.
- **Base:** cabecera centrada en `max-w-2xl` (Pendientes, Favoritos, Colección y Listas usan `max-w-4xl` con la cabecera a
  la izquierda), "Buscar por artista" se corta en escritorio, cada pestaña ordena su barra distinto, en móvil las
  pestañas ocupan dos filas y la barra cuatro, las fotos no tienen fondo mientras cargan y los estados vacíos de
  Discografías y Listas que sigo no ofrecen por dónde empezar.

## What Changes

- **Sin parpadeo de modo:** los dos hooks devuelven `ready`; hasta entonces el listado pinta filas neutras y el
  conmutador queda `invisible`.
- **Eliminar con diálogo** en Discografías y Mis listas: nombra el artista o la lista, dice qué se pierde (la selección o
  los álbumes) y que las escuchas siguen en el diario. Reemplaza la confirmación en línea en los tres modos.
- **Dejar de seguir** con nombre propio ("Dejar de seguir «X»"), 32/44 px, y un aviso con Deshacer que vuelve a activar
  el seguimiento en su lugar.
- **⋮ de 32 px** (44 px con puntero grueso) en los menús de Discografías y Mis listas.
- **Barra accesible:** `role="img"` con una etiqueta discreta ("Avance: a la mitad"), sin números, en Detallada y en
  Listas que sigo.
- **Filtros en la URL** (`?q=&sort=&state=`, con `replaceState`, solo lo que difiere del defecto, conservando `tab`); la
  página los valida y abre con ellos. Cambiar de pestaña los reinicia.
- **Base:** `max-w-4xl` con cabecera a la izquierda; la misma barra en las tres pestañas (búsqueda flexible, selects y
  conmutador al final); pestañas en una fila en móvil; fondo en las fotos mientras cargan; estados vacíos con un enlace
  (la búsqueda de artistas en Discografías, "Descubrir listas para completar" en Listas que sigo) y título "Todavía no sigues ninguna
  lista".

### Goals

- Corregir los errores confirmados sin cambiar la información de cada fila ni las vistas.

### Non-Goals

- Acción principal en la cabecera, pestañas con totales, renombrar pestañas, segmentos de estado, orden "Más avanzadas"
  (Fase 2).
- "Siguiente: …", "Última escucha", secciones por estado, barra en Gráfico, filas de Listas que sigo con ⋯ (Fase 3).
- Fracciones o conteos de completadas fuera de la gestión (filosofía de producto §6.4.1).

## Capabilities

### Modified Capabilities

- `artist-journey`: filtros del listado en la URL; eliminar desde el listado con un diálogo que nombra el artista; barra
  discreta accesible.
- `camino`: los mismos cambios en Mis listas; dejar de seguir con nombre y deshacer en Listas que sigo; estados vacíos
  con enlace.
- `progress-hub`: base visual del panel (cabecera, ancho, modo sin parpadeo, áreas táctiles).

## Impact

- `src/app/[locale]/me/progress/page.tsx`, `src/components/progress/`.
- `src/components/artist-journey/` (listado, renderers, menú, hook de modo); se borra `ArtistJourneyDeleteConfirm`.
- `src/components/camino/` (`MyCaminosList`, renderers, menú, hook de modo, `TrackedCaminosList`); se borra
  `CaminoDeleteConfirm`.
- `messages/{es,en}/{artistJourney,camino}.json`.
- `docs/05-features/caminos.md`.
- Sin cambios de API ni de esquema.
