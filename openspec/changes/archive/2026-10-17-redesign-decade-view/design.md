## Context

`FilteredAlbumList` pinta, en la vista de década, `years` (chips planos), `topics` (píldoras que enlazan a la página del género),
`siblings` (otras décadas, plegadas) y `ExploreFilterBar` (tipo y orden): cinco filas, sin rótulos, y con dos clases de chip que se
ven parecidas pero se comportan distinto. En pantalla (1280×800): título en y=146, primer disco en y=444. La cabecera es solo el
título. Los chips de género se ordenan por tamaño y en los 1980s abren con ópera, sinfonía y clasicismo musical. En los 2020s hay
un chip "2027" (solo discos por salir) y en los 1910s (2 sencillos) los tipos "De estudio" y "Compilaciones" llevan a un estado vacío.
Ya existen las piezas: `listAlbumsByGenre` pasa `ExploreListOptions` a `listAlbumsFiltered`, que ya filtra por `decade`; el mosaico de
la tarjeta (`MosaicGrid`) y `listDecadeCovers()` (con caché) tienen las carátulas de la época.

## Goals / Non-Goals

**Goals:**
- Que la vista diga qué es y cómo está ordenada, y que el primer disco quede a la vista.
- Que todos los chips de la vista se comporten igual (filtran esta lista) y digan qué filtran.
- Que década × género exista dentro de Explorar, combinable con año, tipo y orden.

**Non-Goals:**
- Década × familia, la vista de familia (sigue con sus chips de género hacia la página del género; se revisará aparte), el orden
  "Destacados", la selección de géneros o las carátulas de la portada.
- Cambiar cómo se nombra la década fuera de Explorar.

## Decisions

1. **`genero` es un refinamiento de la década.** El contrato "un corte a la vez" se mantiene para familia y género sueltos; dentro de
   `decada`, `anio` y `genero` acotan el listado. `listAlbumsByGenre(slug, page, { …options, decade, year })` ya compone
   `albumInGenreTree` con el filtro de década (solo hay que agregar `decade` a `ExploreListOptions`). Una `familia` junto a `decada`
   se ignora (la década tiene prioridad). Reglas de la URL: cada chip conserva los demás parámetros (`anio`, `genero`, `tipo`,
   `orden`), salvo que "Toda la década" quita `anio`, "Todos" quita `genero` y cambiar de década quita `anio` y conserva `genero`
   (comparar una época con otra dentro de un mismo género es lo que más se querrá; si esa década no tiene el género, el estado vacío
   ofrece "Quitar filtros"). Cambiar de página, tipo u orden vuelve a la página 1, como ya hacen.
2. **Una sola clase de chip, con rótulo.** Un componente de fila (`FacetRow`: rótulo + chips + contenido final opcional) reemplaza a
   `years` y a `SliceNav` para la década; los chips son píldoras con anillo ámbar en el actual. El rótulo ("Año", "Género") es
   texto en línea al inicio de la fila, no un eyebrow sobre un encabezado (DESIGN.md). En pantallas angostas cada fila es una línea
   desplazable en horizontal (hoy solo los años lo eran; los géneros ocupaban cuatro filas). `topics` queda para la vista de familia.
3. **"Otras décadas" como menú al final de la fila de años.** Es lo que sobra de navegación temporal y ocupaba una fila entera. Un
   `<details>` (sin JavaScript, como el de familias) cuyo contenido, desde `md`, es un panel flotante bajo el resumen
   (`absolute`, borde y fondo de superficie) y, en angosto, queda en el flujo bajo la fila. Se descartó un menú de cliente con cierre al
   hacer clic fuera: la fila funciona sin JavaScript y el costo es que el panel no se cierra solo al tocar fuera (se cierra con el
   mismo resumen).
4. **Cabecera con contexto y eco de la tarjeta.** Título, una línea y, a la derecha desde `sm`, el mosaico 2×2 de
   `listDecadeCovers().get(decade)` (la misma selección de la portada, ya en caché; cuando se entra por primera vez al sitio ahí, es una
   consulta de ~1 s una vez cada 6 h). Se extrae `CoverMosaic` de `MosaicGrid` (la disposición 4/3/2/1) para no duplicar su lógica. La
   línea es texto estático y honesto ("Premiados y mejor valorados primero; con pocas valoraciones, el orden es estable pero no un
   ranking") y solo con el orden "Destacados". Se descartó una línea que cambie según haya o no señal en la década (una consulta más por
   visita para decidir una frase) y una pieza "lo esencial de la época" con los mejores discos: con la señal actual repetiría los
   cuatro primeros discos de la grilla (se comprobó que la tarjeta y la primera fila coinciden) y afirmaría una calidad que los datos
   aún no respaldan.
5. **Géneros por familia.** `decade-genres.ts` devuelve también la familia con la que cada género entró (la de mejor posición) y el
   servicio los ordena por la posición de esa familia en `GENRE_FAMILIES` (sin familia, al final), conservando el tamaño como
   desempate (el orden de la consulta). La selección (12, tope de 3 por familia) no cambia: se corrige el orden, no la elección. Un
   género elegido que no está entre los 12 (URL compartida) se agrega al final como chip marcado.
6. **Años publicados.** `listDecadeYears` cuenta un año solo si tiene un disco con `coalesce(first_release_date <= current_date,
   first_release_year <= extract(year from current_date))`. El listado y `?anio=2027` no cambian: solo se quita el chip.
7. **Tipos deshabilitados.** `listCategoriesIn(condition, { decade, year })` (un `select distinct category` sobre el mismo corte,
   incluido el género) y `ExploreFilterBar` recibe `availableCategories`: los demás tipos se pintan como `<span aria-disabled>` sin enlace.
   Solo en la vista de década; la de familia y la de género quedan como están. "Todos" y el tipo elegido siempre activos.
8. **Nombre de la década por idioma.** Función pura `decadeLabel(decade, locale)`: en español "Años 20"…"Años 90" para 1920–1990 y
   cuatro cifras para el resto ("Años 1890", "Años 1900", "Años 1910", "Años 2000", "Años 2020"), porque "Años 00" y "Años 10" se leen como
   los 2000 y los 2010 (las revisamos en pantalla: "Años 10" junto a "Años 2010" confundía) y los 1890s y los 1990s compartirían nombre; en inglés `1980s`. Se usa en las tarjetas de la portada y en toda la
   vista de década (miga, título en minúsculas, chips del menú). Reemplaza al mensaje `decadeChip`. Las colecciones, el perfil y la
   página de género no cambian.
9. **Estado vacío con género.** `FilteredAlbumList` acepta `clearHref`: con un género elegido el estado vacío ofrece "Quitar
   filtros" hacia la década sin refinamientos (hoy ofrecería "Volver a Explorar", que no deshace nada).
10. **Miga de pan con niveles.** `parentCrumb` pasa a `parentCrumbs` (lista): Explorar / década / año / género, con el último sin enlace.

## Risks / Trade-offs

- **El panel de "Otras décadas" no se cierra al tocar fuera:** aceptado a cambio de no usar JavaScript. Si molesta, se pasa a un
  componente de cliente sin tocar el resto.
- **Consulta década × género:** `albumInGenreTree` (CTE recursiva) más `between` sobre el año, sin caché. Se mide en scratch sobre
  Rock de los 1980s; si pasa de ~0,5 s se acota con el mismo patrón de subconsultas no correlacionadas del orden.
- **Cambio de nombre en español:** los textos "1990s" de la portada y la vista de década cambian a "Años 90"; las pruebas que los
  citan se actualizan. Las menciones en colecciones y en la página de género se conservan, así que durante un tiempo conviven dos
  formas en la plataforma.
- **La línea de contexto puede quedar vieja:** cuando haya abundantes valoraciones, "con pocas valoraciones, el orden es estable pero
  no un ranking" deja de ser cierto en las décadas con señal. Se revisa al ver datos reales; la alternativa de decidirlo por consulta
  está descrita arriba.
- **Tres refinamientos combinables** (año, género, tipo) pueden dejar un corte vacío con facilidad; el estado vacío con "Quitar filtros"
  y los tipos deshabilitados lo atenúan, pero un género o un año sin discos siguen siendo posibles (la fila no muestra cifras por diseño).

## Migration Plan

Sin migraciones ni datos. Las URLs de antes siguen valiendo (`?decada=`, `?decada=&anio=`). Revertir es volver al commit anterior.

## Open Questions

Ninguna bloqueante. La vista de familia tiene el mismo defecto de chips que salen de Explorar; queda para un cambio aparte si se
quiere unificarla con esta.
