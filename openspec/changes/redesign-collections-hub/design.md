## Context

`/explore/collections` (ADR 0036/0038) agrupa las vigentes por familia, una sección por familia con la misma tarjeta
vertical de 4 columnas. Con el contenido real hay una o dos colecciones por familia, así que la página es una columna larga
con huecos; no tiene punto de entrada (la primera pantalla es título y una frase), la tarjeta solo dice título y conteo
aunque los presentadores (ADR 0039) ya saben decir por qué está cada colección, y la consulta común de colecciones no exige
álbumes, de modo que aparecen colecciones con 0 álbumes. Medido a 1280 px, la pila de 6 fundas (96 px, paso de 40 px) mide 296
px y su marco 264 px, y con el mouse encima el paso sube a 52 px (304 px): se sale del escenario.

## Goals / Non-Goals

**Goals:**
- Un punto de entrada claro: una colección destacada arriba y una rejilla única debajo.
- Que la tarjeta diga por qué esa colección importa ahora (la frase del presentador).
- Que el tipo sea un filtro, no la estructura de la página, y que solo ofrezca lo que tiene contenido.
- Que no se liste nunca una colección vacía y que la pila de carátulas quepa.

**Non-Goals:**
- Cambiar la generación, el orden o el contrato `CollectionContext`.
- Cambiar el detalle de una colección o el riel de `/explore` más allá de no listar vacías y del sello más corto.
- Un modelo de "destacada" propio (campo en la base): se usa el orden editorial que ya existe.

## Decisions

1. **La destacada es la primera vigente del orden editorial.** El orden (`weight` desc, `rank` asc) ya lo gobierna la consola
   y es el del riel de `/explore`: lo que el equipo pone primero allí es lo que abre la página. Sin campo nuevo ni migración;
   si más adelante hiciera falta destacar sin reordenar el riel, se añade entonces. Con filtro activo no hay destacada (la
   persona ya eligió qué mirar y una colección repetida arriba solo empuja el contenido) y con una sola vigente la rejilla se
   omite.
2. **Filtro único para vigentes y archivo.** Las secciones por familia desaparecen; el tipo vive en el sello de cada tarjeta
   y en un filtro `?familia=` que ya existía para el archivo. Compartirlo evita dos filtros con el mismo parámetro y deja la
   URL como una vista: lo vigente y lo anterior de un tipo. Los chips salen de las familias con contenido (vigente o
   archivado), consultadas en `listCollectionFamilies()`: una consulta barata (`select distinct family` sobre vigentes y
   archivo con las mismas condiciones). Con una sola familia la barra no se pinta.
3. **Frase de contexto por tarjeta con los presentadores existentes.** El hub trae los álbumes de todas las colecciones
   listadas en un solo lote (`user_list_item` ordenado por posición) y ejecuta `presentCollection` por colección en paralelo,
   usando solo el `summary`. Cada presentador ya hace consultas por lote (no por disco), así que el costo es de uno a tres
   consultas por colección, acotado por un tope de resúmenes (`HUB_SUMMARY_LIMIT`, 24): fuera del tope la tarjeta no lleva
   línea. Un presentador que falla o se abstiene ya cae a la familia o a vacío (`resolveContext`); aquí además se aísla el
   fallo de una colección del resto. Solo las listas de álbumes tienen presentador (igual que el detalle). Se descarta
   guardar el resumen en la fila al generar: congelaría un texto que hoy es dato localizable (ADR 0039) y no cubre las
   curadas.
4. **Una colección sin álbumes no se lista.** La condición `featuredRailCondition()` ya es la compartida por el riel, la
   Inicio anónima y el hub; se le añade `exists (select 1 from user_list_item where list_id = user_list.id)` y la misma
   condición va en el archivo. Hacerlo en la consulta (no filtrando después de `enrichFeatured`) mantiene el tope del riel
   lleno. El detalle por enlace directo no cambia.
5. **La tarjeta de la página: 5 fundas, sin crecer con el ancho.** `card` baja de 6 a 5 fundas y deja de agrandarse en `lg`
   (`size-20`, paso de 36 px): 224 px en reposo y 256 px con el abanico abierto (paso de 44 px), dentro de los 264 px del
   marco más pequeño. El escenario añade `overflow-hidden` como red de seguridad. La destacada usa el tamaño `hero` que ya
   existe para el detalle.
6. **Destacada: la misma familia visual que el detalle.** Marco con la pila `hero` a la izquierda, a la derecha el título en
   `font-display`, la frase de contexto, el conteo y el enlace; bajo `lg` se apila. El sello de familia va sobre la carátula,
   como en las tarjetas; no hay rótulo ("Destacada") sobre el título (DESIGN.md: sin eyebrow sobre el encabezado).
7. **Archivo en tarjetas densas.** Reutiliza la tarjeta `dense` del riel (seis por fila, sin descripción) con la fecha de
   salida como nota; no se introduce una fila horizontal, que es el patrón de las listas. Se omite sin contenido, salvo con
   filtro activo, donde el vacío trae el camino de vuelta a "Todas".
8. **Etiqueta corta de rankings.** "Lo que más valora la gente" no cabe en el sello de 0,65 rem en mayúsculas ni en un chip:
   pasa a "Más valorados" / "Top rated". El resumen largo vive en la descripción de la familia y en el presentador.
9. **Cabecera que explica.** La frase "Selecciones de la plataforma con un criterio detrás: …" distingue colección de lista (voz
   de la plataforma frente a voz de personas, ADR 0038) y enlaza a Listas.

## Risks / Trade-offs

- **Costo de los resúmenes en una página pública.** Hasta 24 presentadores en paralelo por petición. Mitigación: lote único
  de álbumes, tope, y que cada presentador ya consulta por lote. Si el presupuesto de la página (smoke) no se cumple, el
  resumen puede cachearse por período con `unstable_cache`, sin cambiar el contrato.
- **Destacada = orden del riel.** Una colección destacada por peso puede no ser la más atractiva visualmente; se acepta
  porque la consola ya es el lugar donde se decide. Cambiar eso es otro cambio.
- **Filtrar vacías en la condición común** altera el riel de `/explore` y la Inicio anónima: es lo deseado (una colección
  vacía nunca debe verse), pero una colección curada recién creada sin álbumes desaparece del riel hasta tenerlos.
- **Acortar la etiqueta de rankings** cambia un texto visible en todas las tarjetas y en el filtro del archivo.
