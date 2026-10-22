## Why

Una auditoría de `/me/ratings` en escritorio y móvil encontró errores concretos y una base responsive floja
que no dependen de un rediseño: la página parpadea al abrir (pinta Gráfico y salta al modo guardado), la
cabecera dice "Sin valoraciones" cuando solo hay un filtro sin resultados, "Limpiar filtros" aparece dos
veces, el ancho salta entre modos, las estrellas editables miden 12×28 px y un fallo al guardar estrellas
no avisa. Se arreglan ahora, antes de las fases de rediseño visual, para que estas partan de una base sana.

## What Changes

- **Sin parpadeo de modo:** el listado no se pinta hasta conocer el modo guardado (marcador de carga en el
  primer render), en vez de pintar Gráfico y saltar después. El modo por defecto sigue siendo Gráfico.
- **Contadores honestos:** con filtros activos la cabecera cuenta resultados ("3 resultados"), nunca
  "Sin valoraciones"; con 0 resultados no repite "sin álbumes · sin canciones".
- **Un solo "Limpiar filtros":** si el estado vacío ya ofrece el botón, la barra no lo duplica.
- **Ancho único:** las tres vistas comparten un mismo ancho máximo (`max-w-4xl`), y el título se alinea a
  la izquierda con el contenido (hoy está centrado).
- **Áreas táctiles:** con puntero grueso (`pointer: coarse`) las estrellas editables, el conmutador de vista
  y los botones "Sin afinar" llegan a 44 px de alto (las estrellas, 48 px de ancho por estrella); en
  escritorio no cambian de tamaño.
- **Índice en móvil:** el artista pasa a una segunda línea bajo el título en pantallas angostas, en vez de
  truncarse junto al título.
- **Conmutador siempre visible** cuando hay filtros aunque no haya resultados (hoy desaparece).
- **Por artista:** el encabezado lleva contador cuando ya están cargadas todas las valoraciones (entonces es
  exacto) y una línea explica el orden de las secciones.
- **Rendimiento:** las primeras carátulas se cargan con prioridad (aviso LCP de Next).
- **Errores visibles:** si falla guardar estrellas en Detallada se muestra el aviso `saveError` (hoy el
  `catch` es silencioso).

### Goals

- Corregir los errores confirmados en la auditoría sin cambiar el diseño de las tres vistas.
- Dejar una base responsive coherente (ancho, tamaños táctiles, Índice en móvil).

### Non-Goals

- Cabecera con promedio e histograma, nueva barra de herramientas con chips y filtros (Fase 2).
- Rediseño de Gráfico (nota siempre visible), Detallada e Índice como tabla (Fase 3).
- Tocar el overlay de la ficha del modo Gráfico o `FilterSelect` (compartido con otras secciones).
- Cambios de API, de esquema o de datos.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `my-ratings-view-modes`: el primer render ya no pinta el modo por defecto sino un marcador hasta conocer
  el guardado; el contenedor deja de ensancharse en Gráfico (ancho único); el conmutador sigue visible con
  filtros sin resultados; Índice pone el artista en segunda línea en pantallas angostas; "Por artista"
  admite contador cuando todo está cargado y una nota de orden; nuevos requisitos de contadores con
  filtros, un único "Limpiar filtros" y áreas táctiles.
- `my-ratings-library`: un fallo al cambiar las estrellas desde la fila se avisa en vez de ignorarse.

## Impact

- `src/app/[locale]/me/ratings/page.tsx` (ancho y título), `MyRatingsList.tsx`, `RatingsToolbar.tsx`,
  `RatingsModeSwitcher.tsx`, `RatingsIndex.tsx`, `RatingsGraphic.tsx`, `RatingsDetailed.tsx`,
  `MyRatingRow.tsx`, `RatingTile.tsx` (solo prioridad de carátula), `ratings-view.ts`,
  `use-rating-view-mode.ts`.
- `src/components/social/StarRatingInput.tsx` (tamaños con puntero grueso; lo usan otras pantallas, el
  tamaño de escritorio no cambia) y `src/components/catalog/CoverThumb.tsx` (prop `priority` opcional).
- `messages/{es,en}/ratings.json` (claves nuevas), pruebas de `src/components/ratings/*` y
  `StarRatingInput`.
- Sin cambios de API, esquema, dependencias ni contratos; `/docs` solo si menciona el ancho o el primer
  render de esta página (se revisa en las tareas).
