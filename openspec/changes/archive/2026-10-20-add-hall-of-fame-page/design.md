## Context

Las clases de un salón se sirven hoy por las rutas de premios: `awards/[award]` redirige a la ceremonia más reciente y
`awards/[award]/[year]` renderiza `HallOfFameClassView` cuando `page.kind === "hall_of_fame"`. El hub `/awards` suma un bloque de salones
(`HallOfFameTileGrid detailed`, con tarjetas anchas hasta `WIDE_TILES_MAX`) y redirige al premio cuando solo hay una competencia
(`ceremonies.length === 1`). La miga de la clase enlaza a `/awards` y a `awardHref`. `award-links.ts` centraliza las URL; los enlaces de
las tarjetas ya salen de `ceremonyHref`. Tras el cambio `polish-hall-of-fame-tiles` la tarjeta es ancha con pocos salones.

## Goals / Non-Goals

**Goals:** rutas propias, redirecciones, miga y enlaces coherentes, `/awards` sin salones.
**Non-Goals:** modelo, datos, rediseño de tarjeta o clase.

## Decisions

### D1. Rutas separadas, mismo modelo

`/hall-of-fame`, `/hall-of-fame/[hall]` y `/hall-of-fame/[hall]/[year]`. Los nombres de ruta de la app van en inglés (`/awards`, `/explore`,
`/lists`) y sin traducir por locale, así que no se usa `/salon-de-la-fama`. Los datos y los lectores no cambian: `getCeremonyPage` ya
devuelve `kind`; la ruta de clase responde no encontrada si el premio no es un salón (y la de premios, si lo es: redirige).
Alternativas descartadas: mantener todo bajo `/awards` y solo corregir miga y "Ver todos" (deja el redirect de `/awards` que oculta los
salones y la ambigüedad "premio" vs "salón"); mover solo el índice y dejar las clases en `/awards/<salón>/<año>` (URL que no coincide con
la miga).

### D2. Redirección permanente desde las rutas antiguas

`awards/[award]` y `awards/[award]/[year]` consultan el tipo del premio (`getAwardKind(slug)` en `read.ts`, con `cache` como las demás
lecturas) y, si es un salón, hacen `permanentRedirect` a `hallHref` / `hallClassHref`; si el año no existe, no encontrado. Se usa
`permanentRedirect` de `next/navigation` con la ruta ya localizada (el `redirect` de next-intl es temporal y la ruta antigua publicada
hace poco debe dejar de indexarse). El historial de categoría (`/awards/<salón>/categories/<clave>`) no lo ofrece un salón: queda como
hoy, no encontrado.

### D3. El índice repone el riel de la última clase

`/hall-of-fame` = encabezado + tarjetas detalladas (`HallOfFameTileGrid detailed`, que ya decide ancho según cuántos salones hay) + por
salón una sección con el riel de las incorporaciones de su última clase (el que la sección de Explorar tuvo antes de pasar a tarjetas, en
`HallOfFameExploreSection` en el historial de git) y "Ver todas las clases" a su página. Así las incorporaciones tienen un lugar visible sin
volver a Explorar y la página no es solo una repetición de las tarjetas. Si resulta pesada con más salones, el riel se puede quitar sin
tocar rutas. Sin salones: texto de vacío (`hall.emptyIndex`), sin redirigir.

### D4. Un solo lugar para las URL

`award-links.ts` suma `hallOfFameIndexHref()` (`/hall-of-fame`), `hallHref(slug)` y `hallClassHref(slug, year)`; `HallOfFameTile` (enlace
principal y clases anteriores), `HallOfFameExploreSection` ("Ver todos") y `HallOfFameClassView` (miga y fila de años) dejan de usar
`awardsIndexHref`/`ceremonyHref`. Las pruebas existentes que fijaban `/awards/...` para los salones se actualizan.

### D5. `/awards` sin bloque de salones

Se quita el bloque y su ancla; si hay salones se añade bajo el encabezado un enlace discreto "Salones de la fama →" a `/hall-of-fame`. La
regla de cuántos premios hacen un hub no cambia, y `/awards` con solo salones y sin competencias pasa a mostrar el mensaje de vacío (los
salones ya no cuentan allí).

## Risks / Trade-offs

- [Enlaces externos o guardados a `/awards/<salón>`] → redirección permanente; las pruebas cubren ambas rutas.
- [Dos páginas que muestran la última clase (índice y clase)] → el índice solo da una muestra (riel) y la clase tiene el listado completo.
- [`permanentRedirect` con locale] → se arma la ruta con el `locale` del parámetro; una prueba comprueba el destino en es y en.
- [Cache de redirecciones permanentes si luego se cambia la ruta] → se acepta: es la ruta definitiva elegida.

## Migration Plan

Fusionar y desplegar; no hay datos que migrar. Reversión: volver a las rutas anteriores (las redirecciones se quitan con el mismo commit).

## Open Questions

- ¿Conviene que el índice lleve el riel de cada salón (D3) o basta con las tarjetas? Se decide al verlo en el navegador.
