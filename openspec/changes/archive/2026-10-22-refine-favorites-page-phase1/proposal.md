## Why

Una auditoría de `/me/favorites` en escritorio y móvil encontró errores concretos y una base responsive floja
que no dependen de un rediseño: los selectores de la barra cortan su texto ("Todos los tip…"), la cabecera dice
"sin artistas · sin álbumes · sin canciones" cuando un filtro no deja resultados y el conmutador de vista
desaparece, la página parpadea al abrir, el tipo se repite bajo cada encabezado ("Álbum" doce veces bajo
"Álbumes"), los controles de las fichas usan texto de 10,4 px y, en Índice, quedan al 40 % de opacidad, "Quitar
favorito" mide 16 px de alto y quitar un favorito no se anuncia a los lectores de pantalla. Son los mismos
defectos que `/me/ratings` ya corrigió en su Fase 1; se arreglan ahora, antes del rediseño visual, para que las
fases siguientes partan de una base sana.

## What Changes

- **Sin parpadeo de modo:** el listado no se pinta hasta conocer el modo guardado (marcador de carga). El modo por
  defecto sigue siendo Detallada.
- **Contadores honestos:** con búsqueda o filtros la cabecera cuenta resultados ("3 resultados", "Ningún
  resultado"), sin "sin artistas · sin álbumes · sin canciones"; con la biblioteca vacía no hay cabecera, porque el
  estado vacío ya lo dice. Solo ordenar no cambia la etiqueta. El conmutador de vista sigue visible con filtros aunque no haya resultados.
- **Barra legible:** los selectores muestran su texto completo y un nombre visible sobre el control (Tipo,
  Audiencia, Ordenar).
- **Ancho único y título alineado** en `/me/favorites` (`max-w-4xl`, título a la izquierda).
- **Sin tipo repetido:** bajo el encabezado de sección ("Artistas", "Álbumes", "Canciones") las fichas, filas y la
  tabla del Índice omiten el tipo; el año/fecha se conserva.
- **Controles legibles:** texto de al menos 11 px en los controles de las fichas del Gráfico y audiencia/"Quitar
  favorito" del Índice a contraste normal (hoy al 40 %).
- **Áreas táctiles** con puntero grueso (`pointer: coarse`): conmutador de vista, selector de audiencia, "Quitar
  favorito", "Seleccionar", los botones de la barra de selección y "Listo" llegan a 44 px de alto; las casillas de
  selección a 24 px. Con ratón no cambian de tamaño.
- **Avisos:** quitar un favorito se anuncia a lectores de pantalla ("Favorito quitado"); el error de guardar o
  quitar una ficha aparece junto a esa ficha y no solo al final de la página.
- **Rendimiento:** las primeras carátulas se cargan con prioridad.

### Goals

- Corregir los errores confirmados sin cambiar el diseño de las tres vistas.
- Dejar una base responsive y accesible coherente con `/me/ratings`.

### Non-Goals

- Insignias de audiencia, menú `⋯`, "Deshacer" al quitar, Gráfico con portadas limpias, Índice como tabla (Fase 3).
- Segmentos de tipo con cantidad y filtro de audiencia con facetas (Fase 2).
- Cambios de API, esquema o del perfil público más allá de que el muro compartido conserva su modo lectura.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `favorites`: nuevos requisitos de la página `/me/favorites` (modo de vista sin parpadeo, ancho único, contadores
  honestos, barra legible, sin tipo repetido, controles legibles, áreas táctiles, avisos de quitar y de error).

## Impact

- `src/app/[locale]/me/favorites/page.tsx` (ancho y título), `FavoritesWall.tsx`, `FavoritesToolbar.tsx`,
  `FavoritesModeSwitcher.tsx`, `FavoriteTile.tsx`, `FavoritesDetailed.tsx`, `FavoritesIndex.tsx`,
  `FavoritesGraphic.tsx`, `favorites-items-view.ts`, `use-favorite-view-mode.ts` y sus pruebas.
- `messages/{es,en}/favorites.json` (claves nuevas).
- `docs/05-features/` de favoritos si describe estos comportamientos. Sin cambios de API, esquema ni dependencias.
