## Why

"Mis valoraciones" (`/me/ratings`) es hoy una única lista de filas con cinco `<select>` nativos. Las
demás secciones personales (Favoritos, Want to Listen, Colección) ya ofrecen tres modos de
visualización, una barra de filtros homogénea y secciones por tipo. Valoraciones es la excepción, y
es la sección donde más sentido tiene una pared de carátulas: la persona quiere recorrer sus discos
mejor puntuados y ver la nota al pasar el cursor, como en una biblioteca de juegos.

## Goals

- Tres modos de visualización en `/me/ratings` — Detallada, Índice y Gráfico — con la misma
  mecánica que Favoritos y Want to Listen (preferencia guardada en `localStorage`, conmutador
  `radiogroup`).
- Modo Gráfico como pared de carátulas: al pasar el cursor (o enfocar con teclado) se despliega la
  nota — estrellas y puntaje `86/100` — junto con el título, el artista y la acción de editar.
- Agrupar por tipo en secciones **Álbumes** y **Canciones** con contador, o **por artista** (artista
  principal acreditado), distinguiendo siempre álbum de canción.
- Barra de filtros homogénea con el resto de secciones (`FilterSelect` + buscador) en la que cada
  selector muestre su nombre sin tener que abrirlo.

## Non-Goals

- **Valorar artistas.** Un artista no se puede valorar (el panel de artista no tiene estrellas y la
  biblioteca excluye `artist_id`): el selector de tipo se queda en Álbum / Canción y no hay conteo
  ni sección de "artistas valorados". La agrupación por artista solo ordena las valoraciones de
  álbumes y canciones bajo su artista principal acreditado.
- No cambia el modelo de datos: sin migración ni cambio de `schema.ts`.
- No se hace pública la biblioteca ni el puntaje: sigue siendo solo del dueño.
- No se unifican los hooks/switchers de modo de las distintas secciones en uno genérico; se calca el
  patrón existente.
- No se edita la nota con estrellas desde la pared (solo desde el diálogo); la edición inline de
  estrellas sigue en el modo Detallada.

## What Changes

- Modos **Detallada** (la fila actual), **Índice** (filas compactas de texto con la nota a la
  derecha) y **Gráfico** (pared de carátulas con overlay al hover/foco), este último **por
  defecto**: a diferencia de Favoritos y Want to Listen, que abren en Detallada, así la biblioteca
  de valoraciones se distingue de esas secciones.
- En el modo Gráfico la acción "Editar nota" aparece con el overlay (hover/foco); en pantallas sin
  hover (`hover: none`) el chip de nota y la acción quedan siempre visibles. En Detallada e Índice
  los controles siguen visibles siempre.
- Selector **Agrupar**: "Por tipo" (por defecto; secciones Álbumes → Canciones), "Por artista"
  (una sección por artista principal, con Álbumes y Canciones separados dentro de cada una) o "Sin
  agrupar" (lista única, que conserva el ranking mezclado de álbumes y canciones del filtro por año).
- Cada selector de la barra lleva su nombre visible (Tipo, Estrellas, Año, Década, Ordenar, Agrupar)
  sobre el control; ya no hay que abrirlos para saber qué filtra cada "Todos".
- En el modo Gráfico cada carátula lleva una marca fija de tipo (disco para álbum, nota musical para
  canción), también cuando no hay hover.
- Buscador por título o artista principal (con debounce) y filtros existentes (estrellas, tipo, año,
  década, orden) migrados a `FilterSelect`.
- `GET /api/me/ratings` acepta `q` y `group`, y devuelve `counts` por tipo que respetan los filtros.
  Con `group=type` el orden pone primero los álbumes y luego las canciones, y dentro de cada tipo
  aplica el orden elegido.
- Tamaño de página 30 y contenedor más ancho en modo Gráfico.
- Un único `RatingDetailDialog` en el orquestador, abierto desde cualquiera de las tres vistas.

## Capabilities

### New Capabilities

- `my-ratings-view-modes`: modos de visualización (Detallada, Índice, Gráfico), overlay de nota al
  hover/foco, acción de edición por modo, agrupación por tipo con contadores y persistencia de la
  preferencia.

### Modified Capabilities

- `my-ratings-library`: se suma el buscador `q` y el parámetro `group` con su orden por tipo,
  `counts` en la respuesta, y el escenario "Top del año" pasa a valer con "Sin agrupar"; la edición
  en fila y la marca "Sin afinar" se extienden a los tres modos.

## Impact

- **API:** `GET /api/me/ratings` (`q`, `group`, `counts`) — `docs/04-api/contracts.md`, sección
  "Mis valoraciones". Parámetros inválidos siguen respondiendo `400 VALIDATION_ERROR`
  (`errors.md` sin códigos nuevos).
- **Servicio:** `src/services/ratings/my-ratings.ts` (orden por grupo, `q`, `counts`).
- **Esquemas y cliente:** `src/lib/api/schemas.ts`, `src/lib/api/ratings.ts`, `src/lib/query/keys.ts`.
- **UI:** `src/components/ratings/*` (orquestador, toolbar, tres renderers, tile, hook de modo),
  `src/app/[locale]/me/ratings/page.tsx`, `messages/{es,en}/ratings.json`.
- **Docs:** `docs/05-features/ratings-and-reviews.md` y los specs de OpenSpec.
- **Dependencias:** ninguna nueva. **Base de datos:** sin cambios.
