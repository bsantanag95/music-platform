## 1. Rutas

- [x] 1.1 `award-links.ts`: `awardHref(slug)` (`/awards/{premio}`); `awards/page.tsx`: sin premios, mensaje vacío; con uno, redirección a su ceremonia más reciente; con varios, el índice (chips de año por premio, sin rótulo ni introducción); con prueba
- [x] 1.2 Nueva `awards/[award]/page.tsx`: redirige a la ceremonia más reciente del premio; premio inexistente o sin ceremonias → no encontrado; con prueba
- [x] 1.3 Migas de pan de la ceremonia y de la historia con "Inicio / nombre del premio / año o categoría" enlazando el premio a `awardHref`

## 2. Componentes

- [x] 2.1 `NominationItem`: título y artista en dos líneas cuando el sujeto es un álbum o una grabación resuelta, texto curado y crédito en los demás casos; con prueba (resuelto, sin resolver, persona)
- [x] 2.2 `AwardCategory` con `variant` `featured` (ganador a ~112 px, nominados visibles) y `compact` (nombre, enlace a la historia, ganador con carátula y `<details>` "Nominados (N)" cerrado; sin control si solo hay ganador, con la nota de cobertura); retirar el rótulo "NOMINADOS" en mayúsculas; con pruebas
- [x] 2.3 `FacetRow` (`components/discovery`): opción `scroll` (por defecto como hasta ahora) para la fila de años de la ceremonia
- [x] 2.4 Constante `FEATURED_CATEGORIES = 4` y partición del campo general en destacadas y filas; función pura con prueba (menos de cuatro, exactamente cuatro, más de cuatro)

## 3. Ceremonia

- [x] 3.1 `awards/[award]/[year]/page.tsx`: sin rótulo sobre el título; fila rotulada "Año" (`FacetRow`, más reciente primero); navegación "En esta página" (`ExploreJumpNav`) con campo general, por álbum y cada campo del nivel por género; campos como `<h3 id="field-…">` normales, sin ámbar ni mayúsculas
- [x] 3.2 Nivel general: cuatro categorías destacadas y el resto como filas; niveles por álbum y por género como filas compactas en una grilla de 1, 2 y 3 columnas (más ancho, más columnas)
- [x] 3.3 Historia de la categoría: mismo ancho que la ceremonia (`max-w-7xl`), sin rótulo sobre el título, `featured`
- [x] 3.4 Mensajes `awards.json` (es/en): texto del control "Nominados (N)", "Año", "En esta página", mensaje del índice; retirar `kicker`, `ceremonyKicker`, `historyKicker`, `intro` y lo que quede sin uso; ajustar las pruebas

## 4. Verificación y documentación

- [x] 4.1 Verificar en el navegador a 1280 y 375 px: redirección de `/awards`, `/awards/grammy`, cabecera y fila de años, navegación por campo, categorías destacadas y filas, nominados plegados y abiertos, ceremonia con pocos niveles (2021), historia de categoría, sin scroll horizontal; medir la altura de la página antes y después
- [x] 4.2 `docs/05-features/awards.md` (páginas, redirección, categorías destacadas y compactas, navegación); si el índice cambió de contrato, `docs/04-api/contracts.md` no aplica (no hay endpoint)
- [x] 4.3 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`; `openspec validate --specs --strict`
