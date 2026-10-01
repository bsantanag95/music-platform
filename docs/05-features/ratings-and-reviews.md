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

## Valoración dual

Dos escalas, siempre coherentes entre sí (forzado a nivel de base, no solo de interfaz):

- **Estrellas** (0.5 a 5, pasos de 0.5) — la acción rápida, el primer paso.
- **Valoración detallada** (1 a 100, opcional) — solo puede moverse dentro del rango de 10
  puntos que corresponde a las estrellas ya elegidas. Cambiar el rango requiere cambiar
  primero las estrellas.

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
  incluye el valor en estrellas (y el puntaje detallado cuando existe); los glifos son
  decorativos.
- **Un solo control de selección.** Elegir o cambiar estrellas (panel "Tu relación",
  compositor de reseñas) usa el mismo control de cinco estrellas con media estrella, con
  navegación por teclado. No se ofrece una fila de botones numéricos como alternativa.
- **Puntaje detallado 1–100.** Su presentación y su coherencia con las estrellas se tratan
  aparte; el texto numérico sigue yendo junto a las estrellas (`4.5` / `4.5 · 87`).

## Reseñas en la página de álbum

Cambio `redesign-album-page` (2026-09):

- La **valoración propia** se edita en el panel "Tu relación" de la cabecera del álbum; la
  media de la comunidad vive en el bloque de comunidad (con umbral mínimo de 5 valoraciones
  para media e histograma). Desde `rework-album-relation-panel` las estrellas se eligen en
  línea (un clic guarda) y el puntaje detallado se afina en un diálogo que solo ofrece el
  tramo coherente con las estrellas; cambiar las estrellas descarta el puntaje detallado y
  lo avisa, en lugar de chocar con el `CHECK` de `rating`.
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

## Fuera de alcance pendiente

- ¿Moderación o reporte de comentarios? Fuera de alcance de este documento — ver
  `04-riesgos.md` si se agrega como riesgo al planificar Fase 4.

## Fuera de alcance de este documento

El diario de escucha (`listening-diary-and-ratings.md`) y el feed de actividad
(`activity-feed.md`) construyen sobre este núcleo pero no lo modifican.
