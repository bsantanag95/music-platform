## Context

`/me/ratings` (`MyRatingsList` y los tres renderers) se rediseñó por última vez en `add-ratings-view-modes`.
Una auditoría visual del 2026-10-22 dejó dos grupos de hallazgos: errores de comportamiento (parpadeo del
modo, cabecera engañosa con filtros, botón duplicado, `catch` silencioso, aviso LCP) y base responsive
(ancho que salta entre modos, áreas táctiles de 12×28 px, Índice que trunca el artista en móvil). Esta fase
corrige ambos sin tocar el diseño de las vistas, que se rehace en las fases 2 y 3.

Restricciones: sin API ni esquema nuevos; `StarRatingInput` y `CoverThumb` los usan otras pantallas; el
modo de vista sigue siendo preferencia de dispositivo en `localStorage`, no en la URL.

## Goals / Non-Goals

**Goals:**
- Que abrir la página no muestre un modo equivocado ni salte de layout.
- Que cada texto de estado diga la verdad (resultados vs. biblioteca vacía) y no haya controles duplicados.
- Que la base responsive sea coherente: un ancho, objetivos táctiles de 44 px con puntero grueso, Índice legible en móvil.

**Non-Goals:**
- Histograma, chips de filtro, nueva barra de herramientas, nota siempre visible en Gráfico, Índice como
  tabla (Fases 2 y 3).
- Tamaños táctiles de `FilterSelect` y del overlay de `RatingTile` (compartido / se rehace en Fase 3).

## Decisions

**D1. Marcador de carga hasta conocer el modo, en vez de cookie o script en línea.**
`useRatingViewMode` devuelve además `ready` (verdadero tras leer `localStorage` en el efecto de montaje).
Mientras no está listo, `MyRatingsList` pinta un marcador de listado (`aria-hidden`, pulso solo con
`motion-safe`) en lugar de los renderers; cabecera, barra de herramientas y conmutador no esperan.
Alternativas: (a) cookie para leer el modo en el servidor — cambia la regla "solo `localStorage`", exige
tocar `page.tsx` y sincronizar dos almacenes; (b) script en línea que marque `<html>` antes de pintar —
frágil con CSP y con el árbol de React; (c) `useSyncExternalStore` — el HTML del servidor igual se pinta
con el defecto y el salto sigue. El marcador cuesta un frame neutro y conserva la arquitectura. La firma
`[mode, setMode]` se mantiene (tercer elemento nuevo), por lo que las pruebas del hook no cambian.

**D2. Dos predicados de filtros, no uno.** `ratingFiltersActive` (incluye orden y agrupación) sigue
gobernando "Limpiar filtros", que restablece todo. Se agrega `ratingScopeNarrowed` (solo `q`, `stars`,
`type`, `year`, `decade`) para lo que de verdad reduce el conjunto: la etiqueta de la cabecera y la
visibilidad del conmutador. Cambiar solo el orden ya no convierte "34 valoraciones" en "34 resultados".
Con alcance reducido la cabecera dice "N resultado(s)" o "Ningún resultado"; el desglose por tipo se omite
con 0. No hay API nueva: `total` y `counts` ya respetan los filtros. No se muestra "N de M" porque el total
sin filtrar no se conoce cuando la URL llega filtrada.

**D3. Un solo "Limpiar filtros".** La barra recibe `hideClear` cuando el estado vacío filtrado ya muestra su
propio botón (`items.length === 0 && isFiltered`). Se prefiere dejar el botón del estado vacío (acción
principal en contexto) y ocultar el de la barra, y no al revés, para que el botón de la barra no desaparezca
y reaparezca en la misma posición mientras se filtra.

**D4. Ancho único `max-w-4xl`, definido en `page.tsx`.** El `main` pasa a ser una columna `mx-auto w-full
max-w-4xl` con el `h1` a la izquierda; `MyRatingsList` deja de fijar su propio ancho. Se elige 4xl (896 px)
y no 5xl porque en 5xl las filas de Detallada e Índice dejan un hueco de ~500 px entre título y nota hasta
que la Fase 3 las rediseñe; 4xl sigue dando seis columnas de carátulas en `lg`. Alternativa descartada:
acotar solo la lista a 3xl y dejar la barra a 5xl — deja un vacío a la derecha y desalinea bordes.

**D5. Áreas táctiles con `@media (pointer: coarse)`, no con ancho de pantalla.** Un teléfono y una tableta
táctil necesitan el área grande; un portátil estrecho con ratón, no. Se usa la variante arbitraria
`[@media(pointer:coarse)]:` ya empleada en el proyecto (`[@media(hover:none)]` en `RatingTile`).
`StarRatingInput` pasa en `sm` de 28×24 a 44×48 px por estrella (cada mitad queda de 24 px de ancho, el
mínimo de WCAG 2.5.8) y el glifo de `size-5` a `size-7`; el contenedor de `MyRatingRow` admite `flex-wrap`
para que el puntaje baje cuando 5×48 px ya no deja espacio. Conmutador y botones "Sin afinar" ganan
`min-h-11`. En escritorio nada cambia de tamaño. 44 px de ancho por mitad no es viable sin ocho columnas de
estrellas; se documenta en vez de prometerlo.

**D6. Índice: artista en segunda línea bajo `sm`.** El `Link` solo trunca desde `sm`; debajo, título y
artista son bloques que se truncan por separado. Mismo enlace, misma etiqueta accesible; sin cambios en
escritorio.

**D7. Por artista: contador solo cuando es exacto.** El servidor no devuelve totales por artista y una
sección puede quedar cortada entre páginas, por eso el spec original lo prohibía. Con `!hasNextPage` todas
las valoraciones están cargadas y la suma por artista es exacta, así que se muestra; con más páginas
sigue sin contador. Una línea fija ("Ordenado por artista, de la A a la Z; el orden elegido rige dentro de
cada uno") explica el orden en lugar de dejarlo implícito.

**D8. Prioridad de carátula por ids.** `CoverThumb` gana `priority?: boolean` (se pasa a `AppImage`, que ya
reenvía props a `next/image`). `MyRatingsList` calcula un `Set` con los ids de las primeras seis valoraciones
(una fila de la pared) y los renderers lo reciben en `RatingsRendererProps.priorityIds`. Un solo `priority`
por sección habría precargado una carátula por artista al agrupar por artista.

**D9. Error de estrellas visible.** `MyRatingRow` guarda `saveFailed`; el `catch` lo activa y se muestra
`ratings.saveError` (clave ya existente) con `role="alert"` bajo la fila. Se limpia al reintentar. El
patrón es el de `AlbumRelationPanel`.

## Risks / Trade-offs

- [El marcador aparece un instante en cada carga, también para quien usa Gráfico] → Es un frame neutro, sin
  salto de ancho (D4); es mejor que el salto actual de modo. Se verifica en el navegador.
- [`StarRatingInput` lo usan otras pantallas] → Los tamaños nuevos solo aplican con `pointer: coarse`; los de
  escritorio no cambian y se cubren con la prueba del componente.
- [4xl hace las carátulas de Gráfico algo más chicas que en 5xl] → Seis columnas siguen cabiendo (~140 px); la
  Fase 3 rediseña la ficha con la nota visible.
- [`pointer: coarse` no se puede emular del todo en pruebas jsdom] → Se prueban las clases presentes y se
  verifica a mano en el navegador con la emulación móvil.
- [Cambiar "NO SHALL llevar contador" a "solo cuando todo está cargado"] → La paginación continua puede mostrar
  un número que luego cambia al cargar más; por eso se oculta apenas hay otra página y se vuelve a mostrar al
  terminar.

## Migration Plan

Solo front-end; sin migraciones. Revertir es revertir el commit. La preferencia guardada en `localStorage`
no cambia de formato.
