# ADR 0040 — Página de colecciones: destacada, filtro único y resúmenes

## Estado

Aceptado (cambio `redesign-collections-hub`, 2026-10). **Reemplaza** de la página `/explore/collections` la composición del
[ADR 0038](0038-coleccion-y-lista-un-solo-riel.md) (vigentes agrupadas en una sección por familia) y usa los
presentadores del [ADR 0039](0039-presentadores-de-coleccion.md) fuera del detalle. El resto del 0038 (familia como
propiedad de la fila, tarjeta vertical, riel único de `/explore`) sigue vigente.

## Contexto

La página agrupaba las vigentes por familia, una sección por familia con la misma tarjeta de cuatro columnas. Con el
contenido real quedaban una o dos tarjetas por sección: más aire que contenido, sin punto de entrada y con la primera
pantalla ocupada solo por el título. La tarjeta decía título y conteo aunque cada presentador ya sabe decir por qué esa
colección está ahí, aparecían colecciones con 0 álbumes, la pila de seis fundas (296 px) no cabía en su marco (264 px) y el
archivo mostraba filtros aunque estuviera vacío.

## Decisión

1. **Una colección destacada, sin campo nuevo.** La primera de las vigentes en el orden editorial (`weight` desc, `rank`
   asc, el mismo del riel de `/explore`) abre la página en tamaño grande. Lo que el equipo pone primero en la consola es lo
   que abre la página; no hay migración ni un segundo orden que mantener. Con un filtro activo no hay destacada.
2. **El tipo es un filtro, no la estructura.** Una sola rejilla con el resto de las vigentes; la familia la dice el sello de
   cada tarjeta. `?familia=` filtra vigentes **y** archivo a la vez, y la barra ofrece solo las familias con contenido
   (`listCollectionFamilies()`); con una sola familia no se pinta.
3. **Frase de contexto por tarjeta.** El resumen del presentador de la plantilla (`listCollectionSummaries`) sustituye a la
   descripción en la tarjeta. Se leen los álbumes de todas las colecciones en un lote y se corre un presentador por
   colección, en paralelo, con un tope (`HUB_SUMMARY_LIMIT`, 24). Solo corren los presentadores propios de una plantilla: los
   de familia no producen resumen. Una curada, una plantilla sin presentador o un fallo dejan esa tarjeta sin línea.
4. **Una colección sin álbumes no se lista**, en ninguna superficie. La condición ("al menos un álbum") vive en la condición
   común del riel y se aplica también al archivo, en la consulta y no después, para que el tope siga lleno. La consola
   editorial muestra el estado `empty` ("Fuera del riel: sin álbumes") en vez de "Fuera del tope". El detalle por enlace
   directo no cambia.
5. **La pila de la tarjeta cabe en su escenario.** Cinco fundas de 80 px con paso de 36 px (224 px; 256 px con el abanico
   abierto), dentro de los 264 px del marco más angosto, y el escenario recorta por si acaso.
6. **El archivo es compacto**: tarjetas densas (las del riel de `/explore`), omitido si está vacío.
7. **Etiqueta corta de la familia de rankings** ("Más valorados" / "Top rated"): la larga no cabe en el sello de 0,65 rem en
   mayúsculas ni en un chip.
8. **`/lists` → Destacadas excluye toda lista con fila en `user_list_featured`.** El ADR 0038 lo decía, pero la consulta solo
   lo cumplía por accidente (las curadas de prueba estaban vacías y la sección oculta las listas sin ítems): ahora lo exige la
   condición.

## Consecuencias

- La página tiene un punto de entrada y deja de crecer con una sección por familia; añadir una familia no cambia su forma.
- Una página pública hace más lecturas (un lote de álbumes y uno a tres consultas por colección con presentador). Si el
  presupuesto se excede, el resumen puede cachearse por período sin cambiar el contrato.
- Una colección curada recién creada y sin álbumes no aparece en el riel hasta tener uno.
- Quedan fuera: filtros por varias familias a la vez, ordenar el hub y destacar sin reordenar el riel.
