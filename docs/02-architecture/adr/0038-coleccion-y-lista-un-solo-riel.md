# ADR 0038 — Colección y lista: un solo riel en Explorar

## Estado

Aceptado (cambio `unify-explore-collections`, 2026-10). **Reemplaza** la decisión de presentación del
[ADR 0036](0036-colecciones-editorial-y-automatica.md): los dos riles de `/explore` ("Selección editorial" y
"Descubre") vuelven a ser uno. Conserva del 0036 el resto: la página de colecciones, el archivo y la exclusión de
las generadas en `/lists`. Complementa [ADR 0033](0033-colecciones-destacadas-generadas-por-plantillas.md) y
[ADR 0037](0037-titulos-y-rutas-de-colecciones-por-idioma.md).

## Contexto

El ADR 0036 partió el riel de colecciones por `user_list_featured.source`: `curated` a un lado, `template` al otro.
Eso expone **cómo se mantiene** una colección, no lo que significa. A quien mira no le sirve: las dos son contenido
oficial de la plataforma, firmadas por la cuenta curadora, y la diferencia solo importa a quien edita, porque la
plantilla sobreescribe sus ítems en la próxima corrida y la manual no.

La partición además dejó un hueco. La familia se derivaba en código de `template_key`, así que una colección escrita
a mano quedaba sin familia y no tenía dónde ubicarse en `/explore/collections`, donde solo se agrupaban las
automáticas. Una colección editorial temática ("Discos de culto", "Bandas que antecedieron a otras") no encontraba
lugar en la estructura, y quien la publicaba no entendía por qué aparecía en un riel aparte del resto.

Detrás había una confusión de modelo: en la base todo es una fila de `user_list`, y la plataforma no distinguía
"colección" de "lista" salvo por banderas.

## Decisión

1. **Dos conceptos, separados por de quién es la voz**, que es lo único que el lector percibe:
   - **Colección**: contenido de la plataforma. Se arma a mano o por plantilla, indistinto para quien mira. Vive en
     Explorar y en `/explore/collections`, y se organiza por familia.
   - **Lista**: contenido de una persona. Vive en `/lists` y en el perfil, y se organiza por autor y popularidad.
2. **Un solo riel "Colecciones" en `/explore`**, con los dos orígenes mezclados, por `weight` desc y `rank` asc, con
   tope de 10 tarjetas. La tarjeta no indica si la colección se armó a mano o por plantilla.
3. **Fila desplazable con flechas**, no rejilla: con 10 tarjetas una rejilla ocupaba cuatro filas y empujaba el resto
   de la portada. Reutiliza `RailScroller`, el mismo mecanismo de los otros riles de Explorar.
4. **La tarjeta del riel es densa, para que entren 6 de un vistazo** (5 desde `lg`, 6 desde `xl`, como el riel de
   álbumes): pila de 3 fundas más chica y sin descripción. Con la tarjeta ancha solo se veían 3, menos de las 6 que
   mostraba cada riel del ADR 0036, y un riel horizontal no garantiza que se desplace: lo que queda a la derecha puede
   no verse nunca. La descripción completa vive en la página de colecciones y en el detalle.
5. **La familia es propiedad de la colección**, guardada en `user_list_featured.family` (migración `0071`,
   `NOT NULL` con `CHECK`). La plantilla declara la suya y la generación la escribe; destacar a mano la exige. Deja
   de derivarse de `template_key`, lo que además hace que el archivo conserve la familia histórica de una plantilla
   retirada del registro.
6. **`community` se renombra a `rankings`.** Agrupa rankings calculados de la actividad de la gente
   (`top-rated-quarter`, `most-reviewed-month`) y el nombre chocaba con las listas de la comunidad de `/lists`.
7. **Un solo orden.** `rank` es una secuencia única sobre todas las colecciones vigentes, sin distinguir el origen.
   El reordenamiento recibe la lista completa de ids y `FEATURED_ORDER_CONFLICT` sigue protegiendo el envío contra un
   conjunto desactualizado.
8. **La consola conserva la distinción en sus pestañas**, no en dos grupos con órdenes separados. "Destacadas en
   Explorar" y "Generadas automáticamente" siguen siendo pestañas distintas. Dentro del panel de destacadas se retiran
   los dos grupos: el origen de cada fila queda como rótulo por fila, junto a su familia, que es lo que dice a quien
   edita qué sobreescribirá la próxima corrida.
9. **`/explore/collections` pasa a dos bloques**: las vigentes agrupadas por familia, con las curadas dentro de su
   grupo, y el archivo. El archivo no cambia.
10. **`/lists` → "Destacadas" deja de mostrar colecciones.** Conserva las listas editoriales oficiales publicadas, por
   fecha de publicación, y su encabezado enlaza a `/explore/collections`. Una colección no es una lista.

## Alternativas descartadas

- **Mantener los dos riles y dar familia a las curadas:** no resuelve lo de fondo. El lector seguiría viendo una
  partición que no le dice nada, y "Descubre" seguiría sonando como el cajón genérico de todo el descubrimiento.
- **Una familia "La casa recomienda"** para conservar la señal de "esto lo eligió una persona": se evaluó y se
  descartó en este cambio. La voz queda en el título y la descripción de cada colección. La columna `family` deja la
  puerta abierta a agregarla después sin otra migración.
- **Rejilla de 10 en la portada:** cuatro filas de tarjetas altas, justo lo que el riel evita.
- **Guardar la familia en `user_list`:** es una propiedad de la colección como pieza de distribución, no de la lista
  en sí; vive donde viven el origen, el período y la vigencia.
- **Una tabla `collection` propia**, para que el modelo conceptual tenga su reflejo en la base: un cambio mucho mayor,
  y el modelo se sostiene sin él.
- **Dos grupos en la consola con un orden global:** incoherente. Subir la primera automática tendría que pasarla por
  delante de la última curada, y la fila no se movería de su grupo aunque su `rank` cambiara.
- **Dejar las colecciones curadas en "Destacadas" de `/lists`** como vía de descubrimiento: reintroduce exactamente la
  confusión que el cambio cierra.

## Consecuencias

- Nada en la vista pública obliga a entender la diferencia entre lo manual y lo automático.
- **Un reorden mueve también las automáticas**, y la próxima corrida de una plantilla entra al final de la secuencia.
  Es el precio de un riel mezclado, y es lo que hace que el orden público sea el que se ve en la consola. `weight`
  sigue disponible para subir una colección sin reordenar.
- El total de tarjetas de la portada baja de 12 posibles (dos riles de 6) a 10, en una sola fila, y de un vistazo
  se ven 6 en vez de las 12 repartidas en cuatro filas del ADR 0036.
- `?familia=community` en el archivo deja de resolver y cae a "sin filtro", que es el comportamiento actual ante un
  valor desconocido.
- Agregar una plantilla exige declarar su familia; destacar a mano exige elegirla.
- Los títulos y las rutas por idioma del ADR 0037 no cambian: una colección generada conserva su título derivado y su
  ruta `/explore/collections/<slug>-<id>`; una curada, su título guardado y su ruta de lista.
- El archivo sigue acotado a las colecciones automáticas vencidas. Vencer es un concepto de plantilla (la rotación por
  período); una colección manual que deja de estar destacada conserva su lista y su URL. Incluir las manuales vencidas
  queda como decisión aparte.
