## Why

Revisadas en pantalla, las páginas de premios no cumplen su propósito (ver quién ganó y moverse por lo que se premió) y repiten
errores que ya corregimos en Explorar:

- **`/awards` sobra tal como está.** Hoy hay un solo premio y el índice es una grilla de seis tarjetas de año con la edición y la
  fecha. La sección "Premios" de Explorar ya enlaza directo a cada ceremonia y muestra el ganador de Álbum del año con su carátula;
  "Ver todos" lleva a una página con menos información. La ceremonia ya trae la navegación por años, así que el índice añade un clic
  y no añade nada.
- **La ceremonia es una pared:** 33 categorías en 9.036 px en escritorio y 19.370 px en móvil (más de 85 + 51 + 42 filas de
  nominados), sin forma de saltar a una categoría (la navegación por niveles tiene tres enlaces).
- **Sin jerarquía:** "Álbum del año" y "Mejor interpretación de metal" pesan igual; el ganador de lo que más se busca es una
  carátula de ~50 px. Quien solo quiere el resultado tiene que recorrerlo todo.
- **Nominados difíciles de leer:** filas diminutas (carátula de ~28 px), títulos cortados a media palabra ("Something Beautiful —
  Mile…") porque título y artista van en una sola línea.
- **Rótulos que el sistema de diseño no admite y ámbar de sobra:** "ACTUALIDAD", "CEREMONIA" y "PREMIOS GRAMMY · CATEGORÍA" sobre
  los títulos, y los campos ("POP", "DANCE Y ELECTRÓNICA") en ámbar y mayúsculas.
- **Dos filas de chips sin rótulo** (años y niveles), con los años en orden ascendente mientras el índice los lista descendentes, y
  la historia de una categoría con un ancho de página distinto al de la ceremonia.

## What Changes

- **`/awards` con un solo premio redirige a su ceremonia más reciente**; con varios, es un índice por premio (sin rótulo ni
  introducción de relleno). Nueva ruta **`/awards/{premio}`**, que redirige a la ceremonia más reciente de ese premio y es lo que
  enlazan las migas de pan ("Premios Grammy"). "Ver todos" de Explorar sigue apuntando a `/awards`.
- **Ceremonia, cabecera:** migas Inicio / Premios Grammy / 2026, título, edición y fecha, sin rótulo encima, y una fila rotulada
  **Año** (más reciente primero, la actual marcada) con el mismo componente de filas de filtros de la vista de década.
- **Ceremonia, navegación interna:** una fila "En esta página" con el campo general, por álbum y cada campo del nivel por género
  (Pop, Dance y electrónica, Rock y alternativa…), con anclas; los campos pasan a encabezados normales con ancla.
- **Ceremonia, jerarquía:** las cuatro primeras categorías del campo general (en los Grammy, Álbum, Grabación y Canción del año y
  Mejor artista nuevo) son categorías **destacadas**: ganador grande (carátula de ~112 px) y todos los nominados a la vista. El resto
  (Productor y Compositor del año, el nivel por álbum y el nivel por género) pasa a **filas compactas**: nombre, ganador con su carátula
  y los nominados **plegados** ("Nominados (6)", sin JavaScript). La página baja de ~9.000 px a una fracción.
- **Nominados legibles:** con el sujeto resuelto en el catálogo, título y artista en dos líneas (como en las tarjetas de
  Explorar), en lugar de "Título — Artista" cortado; sin resolver se conserva el texto curado y su crédito.
- **Sin rótulos sobre los títulos** (`ceremonyKicker`, `kicker`, `historyKicker`) ni ámbar decorativo: el ámbar queda para la
  insignia de ganador.
- **Historia de una categoría:** mismo ancho de página que la ceremonia y sin rótulo sobre el título.

Fuera de alcance:

- Los datos curados (categorías, nominados, cobertura) y la lógica de carga.
- Un hub de premios con titulares por premio: hoy hay un solo premio; se agregará cuando entre el segundo.
- Una vista "solo ganadores" aparte (las filas compactas ya cumplen ese propósito) o un resumen de más ganadores.
- La tarjeta de ceremonia de Explorar.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `music-awards`: la página de ceremonia cambia de forma (cabecera, filas, navegación interna, categorías destacadas y filas
  compactas, nominados en dos líneas, sin rótulos), el índice se vuelve condicional (redirección con un solo premio) y aparece la
  página de un premio.

## Impact

- `src/app/[locale]/(catalog)/awards/page.tsx` (redirección o índice), nueva `awards/[award]/page.tsx`, `awards/[award]/[year]/page.tsx` y
  `awards/[award]/categories/[key]/page.tsx`.
- `src/components/awards/`: `AwardCategory` (variantes destacada y compacta), `NominationItem` (dos líneas), nuevo `CeremonyNav` si
  hace falta, `award-links.ts` (`awardHref`); `FacetRow` de Explorar gana una opción para no conservar el scroll.
- `src/services/awards/read.ts`: la ceremonia más reciente de un premio (ya está en `listAwards`).
- `messages/{es,en}/awards.json`: textos nuevos y se retiran los rótulos.
- Docs: `docs/05-features/awards.md`. Sin migraciones ni cambios de API.
