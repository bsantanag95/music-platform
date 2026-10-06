# Valoraciones y comentarios — el núcleo social base

**Fase:** 4 (roadmap). **Estado:** implementado y validado
(`01-domain/business-rules.md`, `03-data/sql-model.md`).

Este documento describe el comportamiento del feature base tal como quedó definido en la
Fase 0. `listening-diary-and-ratings.md` propone una capa adicional sobre esta base (el
historial de escuchas) — leer ese documento para la evolución del feature, no como
reemplazo de lo que sigue.

## Qué se puede valorar y comentar

Tres niveles, cada uno independiente: **artista**, **álbum** (concepto, no edición), y
**canción** (grabación única, sin importar en cuántos discos aparece). El modelo de datos
(`rating`, `comment`) acepta los tres por igual.

**La presentación ya no es igual en los tres** (cambio `rebalance-catalog-detail-pages`,
Fase 1 de `redefine-content-hierarchy`), porque el álbum es la unidad cultural central:

- **Álbum**: estrellas + reseña primarias (ver también `ratings-and-comments` / reseñas).
- **Canción**: la expresión primaria es la **reacción cualitativa** del diario
  (`liked` / `loved` / `obsessed` / `neutral` / `disliked`); las **estrellas** siguen
  disponibles pero detrás de una divulgación ("más") colapsada por defecto (abierta si el
  usuario ya valoró). La página muestra además una **reacción agregada pública** de la
  comunidad. Sin bloque de reseñas.
- **Artista**: **sin estrellas** ni promedio de estrellas en la página. Solo notas cortas
  de la comunidad ("nota / contexto / empezá por aquí"). Un rating de artista creado antes
  del cambio se conserva en la base, inerte en la UI.

## Estrellas y valoración detallada (refinamiento opcional)

Las **estrellas** (0.5 a 5, pasos de 0.5) son siempre la nota protagonista; la
**valoración detallada** (1 a 100, opcional) es un **refinamiento** de ellas, no una segunda
escala con vida propia. Sirve a quien rankea fino (desempatar, ordenar una discografía),
nunca como requisito para valorar. Cuando existe, cae dentro de la banda de 10 puntos de las
estrellas (0.5★ → 1-10 … 5★ → 91-100), forzado a nivel de base (`CHECK`), no solo de
interfaz.

- **Entrada en cualquier orden** (cambio `define-detailed-score`). Se puede puntuar primero
  con el número: las estrellas se derivan (`⌈puntaje / 10⌉ / 2`, p. ej. 86 → 4,5★). El
  diálogo de puntuación del panel "Tu relación" (álbum y canción) no exige estrellas previas
  y usa un **deslizador** (cambio `refine-detailed-score-dialog`): con estrellas se limita a
  su tramo (4★ → 71–80) y guardar no las cambia (las estrellas se cambian con las
  estrellas); sin estrellas va de 1 a 100 y una fila de estrellas se llena en vivo con las
  que corresponden. Muestra el valor (`86/100`, o `—/100` antes de elegir) con los extremos
  del rango, botones `−`/`+` de a 1, teclado (flechas ±1, Re Pág/Av Pág ±10), y "Guardar" se
  habilita solo al cambiar el valor. Un botón `?` abre una ayuda breve con la tabla de
  tramos y el de las estrellas vigentes resaltado. La API de valoración acepta `{ detailedScore }` solo (compatible hacia atrás
  con `{ stars }` y `{ stars, detailedScore }`); sin ninguno responde `400`.
- **Coherencia.** `{ stars, detailedScore }` incoherente → `400 INVALID_RATING`; el puntaje
  fuera de 1–100 o no entero → `400 VALIDATION_ERROR`. La base y el servidor siguen siendo
  la fuente de verdad; la derivación es su inversa exacta.
- **Sin promedio de comunidad.** El bloque de comunidad del álbum expresa la media y la
  distribución **solo en estrellas**; ninguna superficie muestra una media `/100` de la
  comunidad (el campo `averageDetailedScore` del contrato se conserva, sin uso visible).

**Edición:** una nueva valoración de un usuario sobre el mismo objetivo **reemplaza** a la
anterior — no hay historial en `rating` (eso es justamente lo que
`listening-diary-and-ratings.md` propone agregar por separado, sin tocar esta garantía).
También puede **borrarse** (estrellas y puntuación detallada), como si nunca se hubiera
valorado; la reseña, si existe, se conserva porque es un objeto con lifecycle propio.

## Representación de la nota (cambio `unify-rating-representation`)

La nota de un usuario se dibuja **siempre con estrellas**, en todas las superficies
(panel "Tu relación", tracklist, feed de actividad, valoraciones destacadas y reseñas del
perfil, índice y artículo de reseña, comentarios populares, marcas de la discografía y
compositor de reseñas). Ninguna superficie usa otro símbolo (barras, medidores, chips
numéricos) para ese dato.

- **Dos formas.** La **fila** de cinco estrellas dibujadas (llenas, medias o vacías) en las
  superficies donde la nota es protagonista; la **forma compacta** `★ 4,5` (una estrella y
  el número) en las superficies densas donde no cabe una fila (marca sobre la carátula de
  la discografía, fila compacta del feed —incluidas las corridas plegadas—, comentarios
  populares). La media estrella se dibuja como media estrella, no con el carácter `½`. La
  forma compacta SIEMPRE lleva la estrella: nunca un número suelto.
- **Formato del número.** El valor se formatea con la convención del idioma (coma decimal
  en español: `4,5`; punto en inglés: `4.5`), en la fila y en la compacta por igual; no se
  muestra el string crudo de la base.
- **Ámbar.** El relleno de la estrella es el único uso de ámbar de la representación; las
  estrellas vacías son un contorno neutro.
- **Accesibilidad.** Cada nota expone su valor como una sola imagen con una etiqueta que
  incluye el valor en estrellas (y el puntaje detallado en las superficies que lo muestran);
  los glifos son decorativos.
- **Un solo control de selección.** Elegir o cambiar estrellas (panel "Tu relación",
  compositor de reseñas) usa el mismo control de cinco estrellas con media estrella, con
  navegación por teclado. No se ofrece una fila de botones numéricos como alternativa.

### Puntaje detallado: formato y dónde se muestra (cambio `define-detailed-score`)

- **Formato.** Se muestra como `86/100`. Cuando una superficie lo muestra y existe, va junto
  a la fila de estrellas **en lugar** del número de estrellas (`4,5`); sin puntaje (o en una
  superficie que no lo muestra) se muestra `4,5`. Nunca ambos, y nunca el formato viejo
  `4,5 · 87`.
- **Dónde sí.** El panel "Tu relación" (álbum y canción), la reseña propia (para su autor),
  las valoraciones destacadas del perfil, el **feed de actividad** (fila, fila fusionada de
  opinión y, como `★ 86/100`, la corrida plegada; también el rastro propio de Inicio —
  `expand-feed-coverage`, 2026-10-06, revierte D7 para el feed: el /100 gana relevancia social)
  y, sin mostrarse, como desempate del orden "Tú" de la discografía.
- **Dónde no.** Las reseñas del perfil, la tracklist, las carátulas de la discografía y las
  demás filas compactas (`★ 4,5`).
- **Sin color.** La nota no se codifica por color (ni semáforo ni gradiente): el número usa
  un tono neutro con peso tipográfico. El ámbar queda reservado al relleno de las estrellas.

## Reseñas en la página de álbum

Cambio `redesign-album-page` (2026-09):

- La **valoración propia** se edita en el panel "Tu relación" de la cabecera del álbum; la
  media de la comunidad vive en el bloque de comunidad (con umbral mínimo de 5 valoraciones
  para media e histograma). Desde `rework-album-relation-panel` las estrellas se eligen en
  línea (un clic guarda). Desde `define-detailed-score` el puntaje detallado se afina en un
  diálogo con deslizador, con o sin estrellas previas (ver "Entrada en cualquier orden");
  cambiar las estrellas descarta
  el puntaje detallado y lo avisa, en lugar de chocar con el `CHECK` de `rating`.
- La pestaña **Reseñas** (`/album/{id}/reviews`) muestra un **índice** compacto: título (o,
  sin título, un extracto del inicio del cuerpo), estrellas vigentes del autor, autor y
  fecha, ordenable por más recientes, mejor nota y peor nota (`?sort=recent|best|worst`).
  Debajo, el editor de la reseña propia.
- Cada reseña tiene **página propia** en `/review/{id}`. Desde el índice del álbum, esa URL
  se abre como **modal** (ruta interceptada) con anterior / siguiente en el orden activo;
  abrir, recargar o compartir la URL muestra la página completa.
- **Reseñas y comentarios no se mezclan**: las reseñas viven en su pestaña, los comentarios
  al pie de la página, fuera de las pestañas.

### La reseña y la valoración (cambio `fix-review-rating-sync`)

- **La reseña no guarda estrellas.** Muestra la valoración **vigente** de su autor: si la
  cambia, la reseña muestra la nueva sin tocar el texto; si la borra, la reseña se conserva
  sin estrellas. Una copia en la reseña crearía dos fuentes de verdad (3★ en la reseña, 5★ en
  el feed y el perfil).
- **El rating es requisito para crear una reseña, no para editarla.** Un autor que borró su
  valoración puede seguir editando el título y el cuerpo; para crear una reseña nueva sin
  valoración hace falta elegir estrellas (`REVIEW_REQUIRES_RATING` si no llegan).
- **Compositor y panel escriben el mismo rating.** El compositor solo envía `stars` mientras
  muestra el selector (no hay reseña ni valoración vigente); si el usuario valora en el panel
  "Tu relación" después de elegir estrellas en el compositor, publicar la reseña no pisa esa
  valoración ni su puntaje detallado. A su vez, el panel adopta la valoración que llega del
  servidor cuando cambia por una acción ajena (publicar una reseña con estrellas), salvo que
  haya una valoración propia guardándose.

## Comentarios

Texto libre, con un máximo implementado de 5000 caracteres y sin mínimo. A diferencia de la
valoración, un mismo usuario puede dejar **más de un** comentario sobre el mismo objetivo — no hay
reemplazo ni límite de cantidad.

Los comentarios publicados pueden editarse o borrarse únicamente por su autor. El borrado es
físico e irreversible, y las mutaciones requieren una sesión válida.

## Mis valoraciones (cambio `add-my-ratings-library`)

Página propia `/me/ratings` con las valoraciones de álbumes y canciones del usuario en sesión.
Solo el dueño ve su biblioteca; no existe ruta pública equivalente.

- **Orden** por mejor nota (default), peor nota, más reciente o título. En ambos sentidos de
  nota, dentro de las mismas estrellas, las valoraciones sin puntaje detallado van **después**
  de las que lo tienen, sin imputarles ningún valor; el desempate final es por fecha de
  actualización descendente.
- **Filtros** combinables por estrellas (½–5), tipo (álbum o canción), año de salida, década y
  una búsqueda de texto (título o artista principal).
  El año de una canción es el menor `first_release_year` de los álbumes donde aparece; una
  canción sin año queda fuera de los filtros de año y década. El selector de año ofrece solo
  los años con valoraciones (facetas). Filtrar por año con orden "mejor nota" da el ranking
  de ese año (con "Sin agrupar").
- **Modos de visualización** (cambio `add-ratings-view-modes`). Tres modos, calcados de
  Favoritos y Want to Listen: **Detallada** (la fila completa), **Índice** (filas
  compactas de texto con la nota a la derecha) y **Gráfico** (pared de carátulas). La preferencia
  vive en `localStorage` (`music-platform:rating-view-mode`), no en la URL.
- **Pared con la nota al pasar el cursor.** En el modo Gráfico cada carátula, sin título debajo,
  despliega al pasar el cursor o enfocarla un overlay con las estrellas y el puntaje `86/100` (o
  "Sin afinar"), el título, el artista y la acción "Editar nota". El overlay no captura el
  cursor salvo en sus botones, así un clic en la carátula navega a la ficha. En pantallas sin
  hover (`hover: none`) el overlay se reduce al chip de nota y la acción, siempre visibles y sin
  tapar la carátula; la etiqueta accesible del enlace lleva título, artista, estrellas y puntaje. El contenedor se ensancha en este modo.
- **Agrupación.** El selector "Agrupar" ofrece "Por tipo" (default; secciones Álbumes → Canciones
  con contador, tomado de `counts`), "Por artista" y "Sin agrupar" (lista única). "Por artista"
  hace una sección por artista principal acreditado (encabezado enlazado a su página, sin contador
  porque una sección puede quedar cortada entre páginas) y la subdivide en Álbumes y Canciones para
  distinguirlos; lo que no tiene artista va al final en "Sin artista". Los artistas no se valoran,
  así que el selector de tipo sigue siendo solo álbum/canción y no hay conteo de artistas.
- **Sin datos repetidos.** Bajo "Por artista" las entradas no repiten el artista ni el tipo (ya los
  dicen el encabezado y el subencabezado); bajo "Por tipo" omiten el tipo; con "Sin agrupar"
  muestran ambos. El año siempre se muestra y la etiqueta accesible de la carátula no cambia.
- **Fila Detallada compacta.** En pantallas anchas el título y la nota comparten línea (≈ 60 px por
  fila); en angostas la nota baja bajo el título.
- **Selectores con nombre visible.** Cada selector de la barra (Tipo, Estrellas, Año, Década,
  Ordenar, Agrupar) muestra su nombre sobre el control (`FilterSelect` con `label`, opcional y
  aditivo), para que un "Todos" no dependa de abrir el menú.
- **Marca de tipo en la pared.** Cada carátula lleva una marca fija — disco para álbum, nota
  musical para canción — visible también sin hover; el overlay añade "Álbum · 1987" y la etiqueta
  accesible incluye el tipo.
- **Edición.** El diálogo de puntaje (`RatingDetailDialog`) es único, elevado a la lista, y se abre
  desde cualquiera de las tres vistas para afinar, destacar o borrar. En el modo Detallada la
  fila además permite cambiar las estrellas inline. Cambiar estrellas conserva el puntaje
  solo si sigue coherente; si no, se guarda sin puntaje y se avisa. Tras editar, la entrada se
  actualiza en el lugar sin reordenarse hasta cambiar el orden o filtros; borrar baja el total
  y el contador de su tipo.
- **Marca "Sin afinar".** Las entradas sin puntaje muestran "Sin afinar" en lugar de `86/100`
  (en las filas, el índice y el overlay de la pared); es la marca y a la vez la acción para abrir
  el diálogo.
- **Privacidad.** El puntaje sigue siendo del dueño y de las destacadas; los seguidores
  aprobados ven estrellas solo donde ya se ven.
- **Excepción del tooltip de la discografía.** En la columna "Tú" de la discografía, el
  tooltip y el texto accesible de la nota propia incluyen el puntaje (`Tu nota: 4,5 · 86/100`)
  cuando existe; lo visible sigue siendo `★ 4,5`.

## Fuera de alcance pendiente

- ¿Moderación o reporte de comentarios? Fuera de alcance de este documento — ver
  `04-riesgos.md` si se agrega como riesgo al planificar Fase 4.

## Fuera de alcance de este documento

El diario de escucha (`listening-diary-and-ratings.md`) y el feed de actividad
(`activity-feed.md`) construyen sobre este núcleo pero no lo modifican.
