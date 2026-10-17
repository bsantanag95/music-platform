## Context

`listDecades()` cuenta los `release_group` con año por década y `DecadeHistogram` los dibuja como columnas con la cifra encima
(en la base de scratch: 588 en los 50s, 10.607 en los 90s, 15.117 en los 2010s; 5, 5 y 2 en los 1890s–1910s). Es el mismo artefacto
que tenían las familias de géneros: el número depende de qué artistas se han abierto, no de la música. La vista `?decada=` solo
ofrece cambiar de década, y su orden "Destacados" termina en `first_release_year desc`, de modo que sin valoraciones ni premios la
primera página es entera de 1999 (se vio en la prueba en pantalla). Ya existen las piezas para hacerlo bien: `family-covers.ts`
(carátulas por ventana + caché), `family-genres.ts` (chips por caché), `FamilyGrid` (mosaico), `FilteredAlbumList` (`topics`,
`siblings.collapsed`) y la página de género, que ya filtra por `?decada=`.

## Goals / Non-Goals

**Goals:**
- Que elegir una época sea imagen primero, sin ninguna cifra que cambie sin que la plataforma haya hecho nada.
- Que dentro de una década se pueda ir a un año y a un género.
- Reutilizar los patrones del cambio de familias en lugar de inventar otros.

**Non-Goals:**
- El cruce década × familia/género dentro de Explorar (el contrato sigue siendo un corte a la vez).
- Cambiar el listado sin filtros, el orden "Populares" o las décadas que existen.

## Decisions

1. **Mismo mosaico que las familias, grilla compartida.** `FamilyGrid` ya es genérica (clave, nombre, enlace, carátulas, "más" y
   "menos"); solo tiene ids de sección fijos (`generos`, `explore-genre-families`). Se renombra `MosaicGrid` y recibe `id`,
   `headingId` y `listId`, en lugar de copiar 120 líneas para décadas. Un nombre que dice "familia" en una grilla de décadas
   engañaría a quien lea el código. Alternativa descartada: componente propio de décadas con otro formato (cinta horizontal);
   se evaluó porque el eje es temporal, pero dos grillas distintas una tras otra en la portada compiten entre sí.
2. **De la más reciente a la más antigua, y el corte en 1950.** El histograma iba cronológico ascendente, pero con la tarjeta
   "Décadas anteriores" al final de la grilla las décadas viejas tienen que quedar *después* de las nuevas: orden descendente
   y "anteriores" cierra la grilla. El corte es una constante de producto (`MOSAIC_FIRST_DECADE = 1950`) y no un umbral de
   álbumes o carátulas: una regla por datos movería una década de sitio cuando se ingieren discos y rompería el orden temporal.
   Una década anterior a 1950 sin carátulas sale plana al desplegar. Una década sin álbumes no tiene tarjeta.
3. **Carátulas: una consulta con ventana, sin repartir.** `row_number() over (partition by decena order by albumSignalOrder())
   <= 4` sobre discos `studio` con `cover_thumb_url`, igual que familias. Las décadas son disjuntas (un disco tiene un solo año),
   así que no hace falta `assignCovers` ni candidatos de margen. La señal de calidad es la de las colecciones (valoración, premio,
   calendario y, al final, el id): hoy, para los 90s, casi todo desempata por id, que es estable pero arbitrario; mejora sola cuando
   la comunidad valore. Caché en memoria de 6 h (`createTtlCache`); un error devuelve el mapa vacío (tarjetas planas) y no se cachea.
4. **Año con `?anio=`, como refinamiento de la década.** Es un parámetro más del mismo corte, no un segundo corte: el contrato
   "uno a la vez" no cambia. El servidor lo valida contra la década (un valor inválido o de otra década se ignora, lectura
   tolerante como el resto de parámetros). `listAlbumsFiltered` gana `year` (`first_release_year = year`). La fila de años se
   calcula con un `select distinct first_release_year` de la década (sin caché: es lo que ya cuesta `listDecades()` en cada visita
   a una década); un chip por año con álbumes, sin cifras. Cambiar de década quita el año.
5. **Géneros de la década = chips a la página del género, con la década puesta.** `listDecadeGenres(decade)`: los 12 géneros de
   estilo con más álbumes de la década (género efectivo con herencia), con como mucho 3 por familia
   (`DECADE_GENRES_PER_FAMILY`), misma forma y caché por clave que `family-genres.ts` (6 h). El número solo ordena. El tope salió
   de medirlo: en la base de prueba, los 12 más grandes de los 1990s incluían cinco de Clásica (ópera, sinfonía, barroco…) y
   ninguno de hip hop; con tope 3 la fila queda con clásica ×3, blues, pop, rock, r&b, jazz, hard rock, soul y heavy metal. Es
   una consulta con ventana (`row_number() over (partition by familia)`); un género de varias familias cuenta en la que mejor lo
   posiciona y uno sin familia cuenta aparte. El enlace es `genreHref(slug)?tab=albums&decada=<año>`: la página de género ya filtra por década,
   así que la mitad del cruce "Rock de los 90" existe sin tocar el contrato de Explorar (ver Non-Goals). Alternativa descartada:
   chips a `?genero=` dentro de Explorar, que perderían la década (un corte a la vez) y llevarían a un listado más pobre que la
   página del género.
6. **Desempate sin año dentro de una década.** `bestOrder` es una constante con `first_release_year desc` antes del id. Se
   convierte en una función de orden (`bestOrderFor({ yearTiebreak })`) y `listAlbumsFiltered` la llama con
   `yearTiebreak: false` cuando hay `decade`. Entre los que empatan en señal, tipo y carátula, el id (un uuid) los mezcla de
   forma estable. Efecto colateral aceptado y deseado: la pestaña de álbumes de la página de género con `decada` también deja
   de apilar el último año. Los listados sin período (familia, género) conservan el año como desempate: ahí sirve para que lo
   reciente salga antes.
7. **Navegación dentro de la vista** (`FilteredAlbumList`): `years` (nueva fila de chips con `SliceNav`, siempre visible: son
   como mucho once), `topics` (ya existe) para los géneros y `siblings.collapsed` (ya existe) para las otras décadas. Con año
   elegido la miga de pan lleva un nivel más (Explorar / 1990s / 1994), por lo que `FilteredAlbumList` acepta un `parentCrumb`
   opcional. Orden: años, géneros, otras décadas, filtros: tres filas de navegación como máximo antes de la grilla, y la plegada
   no ocupa altura.
8. **Sección más arriba.** Va justo después de Géneros (los dos ejes del catálogo) y antes de Novedades, Próximos y Premios, que
   son feeds con fecha. La navegación rápida sigue el orden de la página.
9. **Accesibilidad.** Las carátulas son decorativas (`alt=""`) y el enlace se nombra con la década. Los chips de año marcan
   `aria-current="page"`. Sin JavaScript todo sigue siendo enlace; solo "Décadas anteriores" necesita el cliente, igual que "Más
   familias".

## Risks / Trade-offs

- **Carátulas de décadas viejas por id:** sin señal, los mosaicos de los 60s–90s son estables pero no necesariamente
  representativos. Aceptado: es lo mismo que pasó con las familias y mejora con valoraciones; la señal es la de las colecciones, no
  una inventada aquí.
- **Géneros repetitivos:** los 12 más grandes de una década pueden ser casi todos variantes de una familia. Se midió al
  implementar (clásica ocupaba 5 de 12) y se resolvió con el tope de 3 por familia. El resto de la distorsión (la base tiene más
  discos de lo que se ha abierto) sigue ahí: el orden por número de discos es una aproximación, no una verdad de la época.
- **Cifras ocultas:** quien quería ver cuántos discos hay pierde esa información. Es intencional (misma decisión que en géneros).
- **Cambio del orden en la página de género:** con `decada` el año deja de desempatar. Es coherente con el objetivo y se cubre
  con prueba; no hay cambio de contrato.
- **Consulta de géneros por década:** une `release_group` con el género efectivo y agrupa; sobre los 90s son ~10 mil discos.
  Se mide en scratch y queda detrás de la caché de 6 h.

## Migration Plan

Sin migraciones ni datos. Se despliega con el código; las cachés se calientan con la primera visita. Revertir es volver al
commit anterior.

## Open Questions

Ninguna bloqueante. El cruce década × familia dentro de Explorar queda como cambio aparte si se pide.
