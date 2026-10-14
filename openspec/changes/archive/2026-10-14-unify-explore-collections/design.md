## Context

Las colecciones de Explorar nacieron como contenido editorial curado a mano (ADR 0033), ganaron generación por
plantillas (`add-automate-explore-collections`), una consola (`manage-explore-featured-console`), seis plantillas para
el día 0 (ADR 0035) y, en `split-explore-collections` (ADR 0036), un riel propio para cada origen. Ese último paso es
el que se revierte en su parte visible.

Estado actual:

- Todo es una fila de `user_list`. La diferencia la hacen el dueño (`@exploracion`), `is_official` y la fila de
  `user_list_featured` con `source` `curated` o `template`.
- `/explore` muestra dos riles de 6 (`EDITORIAL_RAIL_LIMIT`, `AUTOMATIC_RAIL_LIMIT`), cada uno con su orden y su
  enlace "Ver todas".
- La familia se deriva en código de `template_key` (`TEMPLATE_FAMILY` en `collections/families.ts`, con respaldo
  `discovery`). Una fila `curated` no tiene familia.
- El reordenamiento es por grupo: `railIdsOf(group)` y `GROUP_SOURCE` acotan la secuencia a un `source`.
- `CollectionRail` es una **rejilla** (`grid sm:grid-cols-2 lg:grid-cols-3`), no un carrusel: con 6 tarjetas ocupa dos
  filas. No hay desplazamiento horizontal en ninguna parte de Explorar.
- `/lists` → "Destacadas" mezcla listas editoriales oficiales con colecciones curadas destacadas, y excluye las
  generadas (ADR 0036).

La restricción de fondo: la base no distingue "colección" de "lista". El cambio no introduce una tabla nueva; redefine
qué eje se muestra.

## Goals / Non-Goals

**Goals:**

- Un solo riel de colecciones en `/explore`, mezclado y ordenado por una secuencia única, con 10 tarjetas y
  desplazamiento horizontal accesible.
- La familia aplica a toda colección, venga de plantilla o de la mano de alguien, y se guarda en la fila.
- `/explore/collections` agrupa por familia todo lo vigente, sin un bloque aparte para lo editorial.
- La consola sigue separando lo manual de lo automático, porque es información que quien edita necesita.
- Una colección deja de aparecer como si fuera una lista de la comunidad en `/lists`.

**Non-Goals:**

- No se crea una familia "La casa recomienda" ni una insignia de "elegido a mano". El eje desaparece de la vista
  pública, no se disfraza.
- No se habilita destacar listas de la comunidad (`featureList` sigue exigiendo `@exploracion`).
- No se tocan los títulos derivados ni las rutas por idioma (ADR 0037): una colección curada conserva su título
  guardado y su ruta de lista; una generada, su título derivado y `/explore/collections/<slug>-<id>`.
- No se cambia el archivo: sigue acotado a las colecciones automáticas vencidas, con su paginación y su filtro. El
  vencimiento es un concepto de plantilla (la rotación por período); una colección manual que deja de estar destacada
  no "vence", conserva su lista y su URL. Incluir las manuales vencidas es una decisión aparte.
- No se unifica el modelo en la base (una tabla `collection` propia): sería un cambio mucho mayor y el modelo
  conceptual se sostiene sin él.

## Decisions

### 1. La familia se guarda en la fila, no se deriva de la plantilla

Columna `family TEXT NOT NULL` en `user_list_featured`, con `CHECK` sobre las cinco familias válidas. La migración la
agrega nullable, la rellena desde el registro actual (`TEMPLATE_FAMILY`) para las filas `template` y con `discovery`
para las `curated` existentes, y después la pone `NOT NULL`.

Por qué, y no seguir derivándola: una colección manual no tiene `template_key` del cual derivarla, y ese es
justamente el hueco que el cambio cierra. Guardarla también vuelve el archivo independiente del registro de
plantillas: hoy una plantilla retirada cae a `discovery` y pierde su familia histórica; con la columna la conserva.

`TEMPLATE_FAMILY` **se conserva** como la familia que cada plantilla declara al generar, y la generación la escribe en
la fila. Deja de ser la fuente de verdad de lectura y pasa a ser la de escritura.

Alternativa descartada: columna en `user_list`. La familia es una propiedad de la colección como pieza de
distribución, no de la lista en sí; vive donde viven el origen, el período y la vigencia.

### 2. `community` se renombra a `rankings`

El renombre va en la misma migración (`UPDATE` del valor en las filas) porque la columna nace en ella: hacerlo después
exigiría tocar el `CHECK` dos veces. Afecta `COLLECTION_FAMILIES`, `TEMPLATE_FAMILY`, los mensajes
`collectionFamilies.*` en `messages/{es,en}/catalog.json` y el filtro `?familia=` del archivo.

El valor viejo aparece en URLs compartidas del archivo (`?familia=community`). Se acepta la rotura: el filtro es un
parámetro de navegación, y un valor desconocido ya cae a "sin filtro" por `isCollectionFamily`.

### 3. Una secuencia de orden, no dos

`rank` pasa a ser una secuencia única sobre todas las filas vigentes, con `weight` todavía por delante en el criterio
de lectura. El reordenamiento recibe la lista completa de ids vigentes, sin grupo, y `FEATURED_ORDER_CONFLICT` sigue
protegiendo el envío contra un conjunto desactualizado.

Consecuencia que acepto: un administrador que reordena mueve también las automáticas, y la próxima corrida de una
plantilla crea su fila al final de la secuencia. Es el precio de un riel mezclado, y es lo que hace que el orden
público sea el que se ve en la consola.

No hace falta migración de datos: los `rank` actuales ya conviven en la misma columna, solo se interpretaban por
grupo.

### 4. Variante de carrusel en `CollectionRail`, no un componente nuevo

`CollectionRail` gana una propiedad de disposición: rejilla (lo de hoy, que usa la página de colecciones y el archivo)
o carrusel (el riel de `/explore`). La tarjeta es idéntica en ambas, y duplicar el componente duplicaría el enlace por
origen, la carátula apilada y la etiqueta de familia.

El carrusel es un contenedor con desbordamiento horizontal y anclaje de desplazamiento, más dos botones `< >`:

- Los botones desplazan por el ancho visible con `scrollBy`, suave solo cuando el sistema no pide movimiento reducido.
- Se desactivan en cada extremo y se omiten cuando todo cabe sin desplazar.
- Llevan etiqueta accesible y quedan fuera del orden de tabulación de las tarjetas, que son enlaces y ya se recorren
  con el teclado; el navegador desplaza el contenedor al enfocar una tarjeta fuera de vista.
- La página de colecciones no los usa: ahí el contenido se recorre, no se resume.

La tarjeta del riel es **densa**: pila de 3 fundas más chica y sin descripción, para que entren 6 de un vistazo (5
desde `lg`, 6 desde `xl`, las proporciones del riel de álbumes). Con la tarjeta ancha de la rejilla solo se veían 3, y
eso mostraría **menos** que los dos riles de 6 del ADR 0036: un riel horizontal no garantiza que alguien lo desplace,
así que lo que queda a la derecha puede no verse nunca. La descripción completa vive en la página de colecciones y en
el detalle; en las generadas casi siempre está vacía.

Alternativas descartadas: una rejilla de 10 en `/explore` (cuatro filas, empuja el resto de la página, que es justo lo
que el riel evita) y volver a una rejilla de 6 (dos filas de tarjetas altas: se ven las 6, pero cuesta el doble de
alto y deja fuera las otras 4).

### 5. Un tope, no dos

`EDITORIAL_RAIL_LIMIT` y `AUTOMATIC_RAIL_LIMIT` (6 cada uno) se reemplazan por `COLLECTION_RAIL_LIMIT = 10`.
`HUB_EDITORIAL_LIMIT` (48) y `HUB_AUTOMATIC_LIMIT` (100) se unifican en `HUB_COLLECTION_LIMIT = 120`, un techo de
seguridad para la lectura de la página, no un criterio editorial.

El total baja de 12 tarjetas posibles a 10, pero en una sola fila desplazable en vez de cuatro filas de rejilla.

### 6. La consola conserva la distinción en las pestañas, no en dos grupos con órdenes separados

La distinción entre lo manual y lo automático sigue viviendo donde ya vivía y donde importa: las **pestañas** de la
consola, "Destacadas en Explorar" y "Generadas automáticamente" (pausar plantillas, forzar corridas). Esas no se
tocan.

Lo que **sí** se retira son los dos grupos *dentro* del panel de destacadas. Existían solo porque había dos riles, y
su propio texto de ayuda lo decía: "Reordenar aquí no mueve las automáticas". Con una secuencia de orden única, dos
grupos con flechas propias son incoherentes: subir la primera automática tendría que pasarla por delante de la última
curada, y la fila no se movería de su grupo aunque su `rank` cambiara.

El panel pasa entonces a una sola lista en el orden del riel, y el origen de cada fila se conserva como rótulo por
fila (ya existía: "Curada" / "Automática"), junto a su familia. Eso es lo que dice a quien edita qué sobreescribirá la
próxima corrida, que era la única razón de agrupar. El estado "dentro del tope" se evalúa contra el tope único.
Destacar a mano exige elegir familia, con un selector de las cinco.

Se descubrió al implementar; la capacidad `explore-featured-management` se corrigió en este mismo cambio.

### 7. `/lists` enlaza, no muestra tarjetas

"Destacadas" conserva las listas editoriales oficiales publicadas y pierde las colecciones curadas destacadas. En su
lugar, la sección lleva un enlace a `/explore/collections`.

Por qué no dejar las tarjetas: es exactamente la confusión que el cambio cierra. Una colección en una página de listas
de la comunidad invita a leerla como la lista de alguien.

Queda un caso raro y aceptado: una lista editorial oficial que además está destacada aparece en "Destacadas" por ser
oficial, no por estar destacada. El orden deja de depender de `rank` y pasa a ser el de publicación.

## Risks / Trade-offs

- **Un reorden mueve las automáticas y el administrador no lo espera** → El panel dice en su descripción que el orden
  es uno solo para todo el riel, y el control de orden vive sobre la secuencia completa, no dentro de un grupo.
- **La próxima corrida de una plantilla cae al final del riel** → Es el comportamiento de hoy dentro de su grupo, solo
  que ahora el grupo es el riel entero. El `weight` sigue disponible para subir una colección sin reordenar.
- **El carrusel es contenido que se puede perder de vista** → Los botones se omiten cuando todo cabe, el
  desbordamiento nativo deja el gesto táctil intacto y "Ver todas" sigue llevando a la página donde está todo.
- **`?familia=community` deja de resolver** → Cae a "sin filtro", que es el comportamiento actual ante un valor
  desconocido. No se rompe la página.
- **La migración pone `NOT NULL` sobre filas existentes** → El relleno corre en la misma transacción, antes de la
  restricción, y cubre los dos orígenes; ninguna fila queda sin familia.
- **Perder el rótulo "Selección editorial" quita una señal de voz** → Decisión explícita del cambio: la voz queda en
  el título y la descripción de cada colección. Si más adelante se quiere recuperar, la columna `family` ya deja
  abierta la puerta a una familia propia sin otra migración.

## Migration Plan

1. Migración `0071_collection_family.sql`: agrega `family` nullable, rellena desde el registro para `template` y con
   `discovery` para `curated`, renombra `community` a `rankings`, agrega el `CHECK` y pone `NOT NULL`. Espejo en
   `src/db/schema.ts` y en `docs/03-data/sql-model.md`.
2. Lecturas y escrituras: la familia sale de la fila; la generación la escribe; el reorden pierde el grupo.
3. UI: variante de carrusel, riel único en `/explore`, dos bloques en la página de colecciones, selector de familia en
   la consola, enlace en `/lists`.
4. Verificación: unitarias de las zonas tocadas y smoke test contra una base de scratch, que ya cubre el riel, el
   orden, el archivo y la consola.

Reversión: la migración es aditiva salvo el renombre del valor. Volver atrás exige un `UPDATE` inverso de `rankings` a
`community`; la columna puede quedarse sin uso.

## Open Questions

- ¿El riel único conserva "Ver todas" una sola vez, o también un acceso por familia? Propongo uno solo: la página de
  colecciones ya ofrece el filtro por familia.
- ¿El archivo debería recibir también las colecciones manuales con vigencia vencida? Hoy no llegan y este cambio no lo
  toca; si se programan vigencias a mano con frecuencia, conviene revisarlo.
- ¿`weight` sigue siendo útil con una secuencia única, o el orden explícito lo vuelve redundante? Se conserva en este
  cambio; retirarlo sería otra decisión.
