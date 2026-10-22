## Why

Una auditoría de `/me/want-to-listen` (Pendientes) en escritorio y a 375 px encontró errores visibles que no dependen
de un rediseño: en móvil, en Detallada, el nombre de un artista se reduce a "D." porque la acción "Agregar a la
discografía" (173 px, sin encogerse) se come la fila; en Gráfico esa acción no cabe en la tarjeta y se superpone con
la de la tarjeta vecina; la página pinta Detallada y salta al modo guardado; el conteo de cada sección cuenta solo lo
cargado ("Álbumes (12)" con 35 álbumes); la acción de discografía aparece tarde y desplaza la fila; los controles
miden 16–24 px de alto en pantallas táctiles; el estado vacío no ofrece salida y la acción se llama distinto que en
la página del artista. Son los mismos defectos que `/me/ratings` y `/me/favorites` ya corrigieron en su Fase 1; se
arreglan ahora para que el rediseño parta de una base sana.

## What Changes

- **Sin parpadeo de modo:** hasta leer el modo guardado el listado es un marcador neutro y el conmutador queda oculto
  sin perder su espacio. El modo por defecto sigue siendo Detallada.
- **Ancho único y título alineado:** la página pasa a `max-w-4xl` con el título a la izquierda, como Calificaciones,
  Favoritos y Diario; el listado llena su contenedor.
- **Título protegido en Detallada:** bajo `sm` las acciones bajan a una línea propia, debajo del título y el artista;
  el título conserva todo el ancho.
- **Gráfico sin superposición:** las acciones se apilan bajo el pie de foto y su texto se parte en líneas dentro de
  la tarjeta en vez de desbordarla.
- **Índice legible:** las acciones dejan de atenuarse al 40 % y, bajo `sm`, el artista va en una segunda línea.
- **Acción de discografía estable y con el mismo nombre:** mientras se consulta el estado, la fila reserva el espacio
  de la acción; "Agregar a la discografía" pasa a "Completar discografía", como en la página del artista.
- **Conteos honestos:** el conteo de cada sección solo aparece cuando la lista está completa; con más páginas por
  cargar el encabezado no muestra cifra.
- **Áreas táctiles** con puntero grueso (`pointer: coarse`): "Quitar", la acción de discografía y el conmutador de
  vista llegan a 44 px de alto. Con ratón no cambian.
- **Avisos:** quitar una entrada se anuncia a lectores de pantalla; si falla, el error aparece junto a esa entrada y
  no al final de la página (el error de "Cargar más" sigue junto al botón).
- **Estado vacío con salida:** enlace "Buscar en el catálogo" (la clave `emptyCta` ya existía sin uso).
- **Rendimiento:** las primeras carátulas se cargan con prioridad.

### Goals

- Corregir los errores confirmados sin cambiar el diseño de las tres vistas.
- Dejar una base responsive y accesible coherente con `/me/ratings` y `/me/favorites`.

### Non-Goals

- Filtro por tipo con conteos del servidor, orden y "Anotar algo" (Fase 2).
- "Ya lo escuché", menú `⋯`, deshacer al quitar, foto de artista, año / tipo / "anotado hace", Índice como tabla
  (Fase 3).
- Cambios de API, esquema o dependencias.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `want-to-listen`: el requisito de secciones y modos cambia el conteo (solo con la lista completa) y agrega el modo
  sin parpadeo; requisitos nuevos de la página (ancho único, acciones que no tapan el título ni se superponen, acción
  de discografía estable, áreas táctiles, avisos al quitar y estado vacío con salida).

## Impact

- `src/app/[locale]/me/want-to-listen/page.tsx`, `src/components/want-to-listen/` (`WantToListenList`,
  `WantToListenSection`, `EntriesDetailed`, `EntriesIndex`, `EntriesGraphic`, `RemoveEntryButton`,
  `WantToListenArtistJourneyAction`, `WantToListenModeSwitcher`, `want-to-listen-items-view.ts`,
  `use-want-to-listen-view-mode.ts`) y sus pruebas.
- `messages/{es,en}/wantToListen.json`.
- `docs/05-features/listening-diary-and-ratings.md` (sección nueva sobre la página de Pendientes).
