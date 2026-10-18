## Context

`awards/page.tsx` lista cada premio con una tarjeta por ceremonia (año, edición, fecha) y un encabezado con rótulo "Actualidad". La
ceremonia (`awards/[award]/[year]/page.tsx`) pinta cada categoría con `AwardCategory`: ganador a ~80 px y todos los nominados en una
grilla de tres columnas de ~48 px, sin límite, en tres niveles (6 generales, 10 por álbum, 17 por género con 6 campos en los Grammy
2026): 9.036 px en escritorio y 19.370 en móvil. Los campos van como rótulos ámbar en mayúsculas, hay una fila de años (ascendente)
y otra de niveles, ambas sin rótulo. El nominado es una sola línea "Título — Artista" (el texto curado) que se corta con
`line-clamp-2`. La historia de una categoría usa `max-w-5xl` y la ceremonia `max-w-7xl`. La sección "Premios" de Explorar enlaza a
`/awards` ("Ver todos") y a cada ceremonia.

## Goals / Non-Goals

**Goals:**
- Que la ceremonia se lea en pocas pantallas: el resultado primero, los nominados a un clic.
- Que lo importante (las cuatro categorías grandes) pese más que el resto.
- Poder saltar a cualquier campo.
- Que el índice no sea una página de relleno cuando hay un solo premio.

**Non-Goals:**
- Cambiar datos, carga o lectura (salvo lo mínimo para la ceremonia más reciente).
- Un hub con titulares por premio (hoy hay uno), una vista "solo ganadores" aparte o un resumen de más ganadores.

## Decisions

1. **El índice se vuelve una redirección mientras haya un solo premio.** `/awards` lee `listAwards()`: sin premios, mensaje vacío; con
   uno, `redirect` a su ceremonia más reciente (`ceremonies[0]`, ya ordenadas de la más reciente a la más antigua) en un solo salto;
   con varios, el índice de antes (chips de año por premio, sin rótulo). Se descartó borrar la ruta: otros premios la necesitarán y las
   URL guardadas no se rompen. Se descartó un índice "bonito" para un solo premio: es la misma información que ya muestra la ceremonia.
2. **`/awards/{premio}` como dirección estable del premio.** Redirige a la ceremonia más reciente; las migas enlazan a ella con el
   nombre del premio ("Premios Grammy"), no al índice. Es la dirección que no cambia cuando entra la ceremonia de 2027. En la
   ceremonia más reciente la miga apunta a sí misma, y en las demás lleva a la más reciente: es lo esperable de "el premio".
3. **Dos formas de categoría, no una.** `AwardCategory` gana `variant`: `featured` (ganador grande, todos los nominados a la vista; lo que
   hay hoy, con la imagen a ~112 px) y `compact` (nombre, enlace a la historia, ganador con carátula y un `<details>` "Nominados (N)"
   cerrado). La historia de una categoría sigue usando `featured`, porque ahí el propósito es ver a todos los nominados de cada año. El
   número de nominados es un hecho editorial finito (no una cifra que crezca con la base), por eso aquí sí se muestra.
4. **Qué es "destacada".** Las cuatro primeras categorías del nivel general en el orden curado (`FEATURED_CATEGORIES = 4`; en los Grammy:
   Álbum, Grabación y Canción del año y Mejor artista nuevo, que son las "Big Four"). Productor y Compositor del año quedan como filas. Es
   una regla de presentación, no de datos: se evitó un campo nuevo en los JSON curados porque otros premios con otro campo general se
   resuelven igual (las primeras cuatro del orden curado) y la curación ya ordena lo importante primero.
5. **Nominados plegados con `<details>`, sin JavaScript.** Es lo que ya usamos en Explorar. La búsqueda de la página del navegador abre los
   `<details>` donde encuentra texto. Se descartó una vista "Ganadores | Completa" por parámetro de URL: obliga a elegir, duplica la
   página y deja la mitad de las visitas en la versión larga; con las filas compactas el resultado ya es lo que se ve primero.
6. **Navegación interna.** `ExploreJumpNav` (enlaces `#ancla`, sin JS, sin estado) se reutiliza tal cual, con las secciones visibles: campo
   general, por álbum y un enlace por cada campo del nivel por género (el nivel por género no tiene enlace propio: sus campos son su
   navegación). Los campos pasan a `<h3 id="field-…">` con `scroll-mt-24`. Se omite con menos de 4 destinos, como en Explorar.
7. **Fila de años con `FacetRow`.** Mismo componente de la vista de década (rótulo "Año", chips, anillo en el actual); gana una opción
   `scroll` para no conservar la posición al cambiar de ceremonia (ahí sí se quiere volver arriba). Orden descendente, el mismo del
   índice.
8. **Nominado en dos líneas.** `NominationItem` usa el título y el artista del catálogo cuando el sujeto es un álbum o una grabación
   resuelta (como las tarjetas de Explorar) y el texto curado + crédito cuando no. El texto curado junta "Título — Artista" y no se puede
   partir de forma fiable. El título resuelto puede diferir en mayúsculas del texto curado (la tarjeta de Explorar ya lo muestra así).
9. **Sin rótulos y sin ámbar decorativo.** Se retiran `ceremonyKicker`, `kicker` y `historyKicker`, el rótulo "NOMINADOS" en mayúsculas pasa
   al texto del control, y los campos pasan a un encabezado `font-display`. La insignia de ganador conserva el ámbar: es el uso raro.
10. **Mismo ancho.** La historia de una categoría pasa de `max-w-5xl` a `max-w-7xl`, como la ceremonia.

## Risks / Trade-offs

- **Los nominados quedan a un clic:** quien quería recorrerlos todos abre cada categoría. Se compensa dejando abiertas las cuatro grandes
  y con el número de nominados visible en el control.
- **"Las cuatro primeras del campo general" es una convención:** si otro premio tiene un campo general de otro tamaño, también serán
  cuatro. Es un ajuste de una constante, sin migración.
- **El título resuelto puede diferir del curado:** aceptado; las tarjetas de Explorar ya lo hacen y es el nombre del catálogo al que
  enlaza.
- **La redirección desde `/awards`:** quien llegue desde un enlace guardado a `/awards` aterriza en la ceremonia más reciente. Es lo
  deseado, pero cambia lo que hay en esa dirección; con varios premios vuelve el índice.
- **`FacetRow` vive en `components/discovery`:** se importa desde `components/awards`; si se vuelve habitual, se moverá a `components/ui`
  (cambio mecánico).

## Migration Plan

Sin migraciones ni datos. Las URL de ceremonia y de historia no cambian. Revertir es volver al commit anterior.

## Open Questions

Ninguna bloqueante. Cuando entre el segundo premio, el índice con varios premios podría ganar titulares (los ganadores grandes de cada
uno): se decidirá con ese premio a la vista.
