## Context

Fase 2 del plan de `redesign-explore-phase1` (`openspec/changes/archive/2026-11-21-redesign-explore-phase1/design.md`). Tras la Fase 1, la
portada de `/explore` tiene el contenedor de 88rem, la barra de pasillos fija y títulos de 30–40 px. Su interior sigue así:

- **Colecciones:** `CollectionRail` con `layout="scroll"` (10 colecciones, 6 a la vista, flechas).
- **Popular ahora:** `PopularNow` usa `PopularChart`: el n.º 1 en grande y el resto en lista, para las tres pestañas.
- **Géneros y décadas:** dos `MosaicGrid`, rejilla de tarjetas 4:3 con 4 carátulas, de 2 a 6 columnas, con las secundarias tras una tarjeta
  «Más».

**Datos disponibles, que no cambian:**

- `explore.collections`: hasta 10 colecciones con `family`, `coverThumbs`, `itemCount` y `description`.
- `explore.popular.albums.items`: hasta `RAIL_SIZE` = 12.
- `explore.families`: `key`, `tier` (`main` | `more`), `covers` (hasta 4), en el orden de `GENRE_FAMILIES`; solo las que tienen álbumes.
- `explore.decades`: de la más reciente a la más antigua, cada una con `covers`.

**Decisiones del usuario:**

- Índice sin cifras.
- Géneros: 6 familias en grande y el resto en índice.
- Décadas: línea de tiempo en escritorio e índice en el teléfono.

## Goals / Non-Goals

**Goals:**

- Una forma distinta por sección: mosaico, top, tarjetas más índice, y línea de tiempo.
- Ningún desplegable para ver géneros o décadas.
- Que Géneros y Décadas juntas bajen de ~2.000 px a menos de la mitad en el teléfono.

**Non-Goals:** Fase 3 (lanzamientos, premios, salones, mejor valorados, orden), vistas filtradas, hub de colecciones, consultas y cifras.

## Decisions

### Colecciones: el mosaico de Inicio, compartido
`src/components/home/CollectionMosaic.tsx` pasa a `src/components/discovery/CollectionMosaic.tsx` (con su test) y lo usan Inicio y Explorar.

- **Sello de familia:** gana `familyLabel?: (family) => string`. Con la función, cada tarjeta lleva el sello `FAMILY_STAMP_CLASS` sobre el
  título. Inicio no la pasa y queda igual.
- **Tope:** el mosaico ya corta en `MOSAIC_LIMIT` = 6 (`mosaicTiles`). La consulta sigue trayendo 10: el hub y los tests la usan así, y
  recortar en la vista evita tocar `getExplorePage`.
- **Sección:** la envuelve una `<section id="colecciones">` con `SectionHeading`, con la descripción y el enlace «Ver todas», igual que en
  Inicio.

*Alternativa descartada:* un bento propio de Explorar (el mockup B). Daría dos mosaicos casi iguales que mantener, y el usuario pidió
«la variante de Inicio».

### Popular: `PopularTop` solo para álbumes
Es un componente nuevo de servidor, `PopularTop`: un `<ol role="list">` de discos (`role` porque `list-style: none` borra la semántica en
Safari).

- **Número:** cada `<li>` lleva la posición en `font-display` bold, de 5 a 9 rem según el ancho, con el relleno transparente y el contorno
  de 1,5 px en `paper-muted/50`. El n.º 1 lleva el contorno en ámbar. El número es `aria-hidden`, porque la posición la da el `ol`.
- **Carátula:** se monta encima del número con un margen izquierdo fijo (no depende de cuántas cifras tenga), así que «1» y «12» dejan la
  carátula del mismo tamaño.
- **Medida:** la cifra se mide en unidades del contenedor (`40cqw`, con `container-type: inline-size` en cada `<li>`) y la carátula empieza al 36 % del ancho. Así «10», «11» y «12» se leen enteros a cualquier ancho: con un tamaño fijo, a 1024 px la carátula tapaba la segunda cifra.
- **Debajo:** título, artista y cifra «N personas» desde 5, a todo el ancho de la tarjeta.
- **Distribución:** `md:grid-cols-4 lg:grid-cols-6`, sin desplazamiento. Por debajo de `md`, `flex overflow-x-auto snap-x` con tarjetas al
  ~62 % del ancho.
- **Resto:** Artistas y Canciones siguen con `PopularChart`. Las pestañas no cambian.

*Alternativa descartada:* el riel con flechas del mockup. Doce discos caben en dos filas de seis sin esconder ninguno.

### Géneros: `GenreFamilies`, tarjetas más índice
Es un componente nuevo de servidor (no necesita estado: no hay desplegable).

- **Datos:** recibe las familias ya ordenadas y en el orden de la taxonomía. `big` son las 6 primeras con `tier === "main"`. `index` es el
  resto de principales seguido de las `more`.
- **Tarjetas grandes:** se reutiliza la tarjeta de `MosaicGrid` (`CoverMosaic`, velo, nombre). El nombre sube a `text-xl` y la rejilla va
  en `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`.
- **Índice:**
  - Es un `<ul>` con columnas CSS (`columns-2 sm:columns-3 lg:columns-4`). Cada enlace mide al menos 44 px de alto, va en `font-display`
    a 17 px, con un filete inferior `ink-border`, y pasa a ámbar al pasar el ratón.
  - Lleva un rótulo «Más familias» (`catalog.explore.genresIndexLabel`) como `aria-label` y como encabezado visible pequeño.
  - Con 6 o menos familias se omite. Si faltan principales, las secundarias completan las seis tarjetas antes que dejar un índice de una o dos entradas (`splitFamilies`).

*Por qué el orden de la taxonomía y no el tamaño:* sin cifras no hay un «más grande» honesto. La taxonomía ya pone primero las familias
amplias, y el orden es estable entre visitas.

### Décadas: `DecadeTimeline`, dos formas según el ancho
Es un componente de servidor que renderiza las dos formas y alterna con `hidden lg:block` y `lg:hidden`. Con `display: none`, la que no se
ve sale del árbol de accesibilidad, así que no hay enlaces duplicados para lectores de pantalla.

- **Línea de tiempo (desde `lg`):**
  - Un `<ol>` con una columna por entrada (`grid-template-columns: repeat(n, minmax(0, 1fr))`) y una línea `border-ink-border` sobre la
    que cada entrada pone una marca redonda, que pasa a ámbar con hover o foco.
  - Cada entrada muestra el año en grande (`1990s`, igual que la cabecera de la vista de década), con `clamp(1.25rem, 2vw, 1.875rem)` para
    que «2000s» quepa a 1024 px en 9 columnas.
  - Debajo va el mosaico 2×2 (`CoverMosaic`) y el nombre localizado («Años 90») como texto del enlace.
- **Índice (por debajo de `lg`):** un `<ul>` en dos columnas con el nombre localizado en `font-display` bold a 28 px y un filete. Sin
  carátulas.
- **Antes de 1950:** las décadas anteriores a `MOSAIC_FIRST_DECADE` forman la última entrada en las dos formas, con el rótulo
  «Antes de 1950» (`catalog.explore.beforeDecade`, `{year}`) y un enlace de texto pequeño por década, visible sin desplegar. Sin décadas
  anteriores, la entrada no aparece.
- **Orden:** de la más reciente a la más antigua, también en la línea de tiempo, como el índice y la especificación actual.

*Alternativa descartada:* la línea de tiempo cronológica del mockup B, de izquierda a derecha. Daría dos órdenes distintos para el mismo
contenido según el ancho. Recorrer hacia atrás desde hoy es además el uso más común.

### Limpieza
`MosaicGrid` queda sin usos y se borra con su bloque en `discovery-sections.test.tsx`. Se retiran los mensajes `moreFamilies`,
`fewerFamilies`, `earlierDecades` y `fewerDecades` si nadie más los usa. `CoverMosaic` se queda, porque lo usan las piezas nuevas y la
cabecera de la vista de década. Se actualiza `genresDescription`, y `decadesDescription` si hace falta.

## Risks / Trade-offs

- **Dos formas de décadas en el DOM: HTML duplicado.**
  - *Riesgo:* son unas 10 entradas, un costo despreciable. Los tests podrían contar enlaces de más.
  - *Mitigación:* las aserciones se acotan a la forma que corresponda.
- **Seis colecciones en lugar de diez visibles.**
  - *Riesgo:* se ven menos colecciones de entrada.
  - *Mitigación:* las cuatro que el riel tenía escondidas quedan a un clic en «Ver todas».
- **Números de contorno de bajo contraste.** Son decorativos: la posición la anuncia el `ol` y el contexto visual (orden, tamaño) basta.
- **Carátulas escasas en la base local.** Las tarjetas y la línea de tiempo tienen una forma plana sin mosaico, y se verifica con los datos
  reales del entorno local.

## Migration Plan

No hay datos ni API que migrar. Revertir el commit restaura el riel y los muros de mosaicos.

## Open Questions

Ninguna bloqueante.
