## Why

Hoy `/me/feed` es exactamente el mismo contenido que el preview `FeedPreview` de Inicio
(misma fuente `listFeed`, misma presentación `FeedActivityList`), solo que sin límite y con
un botón "Cargar más" en vez de scroll interno acotado. Eso no justifica una ruta aparte: a
medida que el feed crece, encontrar una actividad puntual de una persona seguida, o acotar
la vista a un solo tipo de actividad, se vuelve cada vez más costoso sin scroll manual. Es
exactamente el mismo problema que resolvió `add-diary-filters` para `/me/diary` — la
diferencia entre un preview embebido de cero configuración y el panel dedicado, que es
donde tiene sentido invertir en herramientas de búsqueda/filtro sobre los datos que ya
existen (el producto excluye gamificación y agregados estadísticos, así que ese es el único
enriquecimiento correcto para esta pantalla).

## What Changes

- **Filtro por tipo de actividad**: acotar el feed a un solo `kind` (escucha, favorito,
  evento de lista, valoración, o comentario). Hoy los cinco tipos siempre se mezclan.
- **Filtro por persona seguida**: ver solo la actividad de un autor puntual entre los
  seguidos — algo que el preview compacto de Inicio no puede ofrecer razonablemente.
  `<select>` simple con las personas seguidas, orden alfabético (v1; no combobox con
  búsqueda).
- **Búsqueda por texto** sobre el título del objetivo (artista, álbum o canción) de cada
  entrada — mismo alcance que el buscador de `/me/diary` (no busca dentro del cuerpo de
  comentarios/notas).
- Los tres filtros son **combinables** y se aplican **en el servidor**, no solo sobre la
  página ya cargada — el feed pagina de a 20.
- `GET /api/me/feed` gana tres query params opcionales (`kind`, `authorId`, `q`) —
  **aditivo y retrocompatible**: sin params, el comportamiento actual no cambia.
- `FeedList` pasa de paginación manual (`useState` + `handleLoadMore`) a `useInfiniteQuery`
  de TanStack Query, igual que `add-diary-filters` migró `DiaryActivityList` — cambiar un
  filtro dispara una nueva query en vez de mutar estado de página a mano.
- El componente `FilterSelect` (hoy definido solo dentro de `DiaryActivityList.tsx`) se
  extrae a un lugar compartido, ya que ahora lo usan dos pantallas.
- **Cierre de mejoras pendientes de un critique previo sobre `/me/feed`** (P2/P3, sin
  requisito de spec propio): mensaje de cierre al llegar al final del feed, CTA "buscar
  personas" en el estado vacío (el slot `action` de `EmptyState` existe pero nunca se usa
  ahí), y anuncio `aria-live` al cargar más entradas.
- **Tratamiento de la prosa del feed (comentarios y notas de escucha)**: deja de mostrarse
  en una caja con fondo propio (`bg-ink-surface`, borde y esquinas redondeadas) y pasa a
  tratarse como una cita — borde izquierdo, sin caja, misma familia visual que
  `ImpressionQuote` de `/me/diary`. Dentro de esa familia, el tono se distingue por tipo de
  entrada: una nota de escucha se muestra en cursiva y entre comillas (la misma voz
  personal que su equivalente en el diario propio — literalmente el mismo campo visto
  desde otra superficie); un comentario se muestra en redonda y sin comillas, porque un
  comentario del feed suele ser crítica, opinión o humor, no necesariamente una impresión
  sentida. `ImpressionQuote` (diario) y la variante "impression" de este tratamiento
  (feed) quedan como el mismo componente compartido — se elimina la duplicación entre
  ambos. Feedback del usuario tras revisar el resultado visual de este mismo cambio.
- **Plegado de citas largas en el feed ("Ver más")**: un comentario llega a tener hasta
  5000 caracteres y el feed mezcla entradas de varias personas en un solo scroll — sin
  tope, una reseña larga empuja todo lo demás fuera de pantalla. Cuando una cita (nota de
  escucha o comentario) supera 6 líneas de alto real, se pliega con `line-clamp-6` y un
  botón "Ver más"/"Ver menos" la expande. Solo se activa en el feed (`clamp`, opt-in);
  `/me/diary` no lo activa — su tope de 500 caracteres y su naturaleza de página propia
  hacen que no lo necesite. Feedback del usuario tras la primera versión del cambio
  anterior. Al colapsar, se corrige la posición del scroll del viewport (sin animación)
  para que el usuario no quede mirando contenido muy por debajo de la fila que acaba de
  cerrar — bug real encontrado por el usuario al probar la primera versión.
- **Avatar de iniciales del autor, solo en `/me/feed`**: sin foto de perfil real en el
  producto, el feed no daba "sensación de distinción" de quién hizo cada actividad.
  Círculo de iniciales (misma inicial que `displayName` o `username`) junto al nombre en
  la línea de metadato, en una de 4 variantes tomadas de tokens ya existentes (nunca
  ámbar), elegida de forma determinística por el `id` del autor. Alcance v1: solo el
  feed — ni `/me/diary` ni el preview de Inicio.

### Goals

- Que `/me/feed` ofrezca algo que el preview de Inicio no ofrece, en vez de ser el mismo
  contenido con un botón de paginación distinto.
- Reusar el patrón ya validado por `add-diary-filters` (misma UI de filtros, mismo enfoque
  técnico) en vez de inventar un mecanismo nuevo para esta pantalla.
- Mantener el feed de Inicio (`FeedPreview`, `RecentSelfActivity`) sin cambios: siguen
  siendo el preview ambiente de cero configuración: esa diferencia es la que separa a las
  dos pantallas.

### Non-Goals

- Ningún agregado estadístico (conteos, "top del mes", gráfico de actividad) — anti-feature
  explícita del producto (`PRODUCT.md`).
- Sincronizar los filtros con la URL — mismo Non-Goal que fijó `add-diary-filters`; se
  puede reabrir si en algún momento se pide compartir un feed filtrado.
- Combobox con búsqueda para el filtro de persona seguida — v1 usa `<select>` simple;
  válido para el volumen de seguidos típico de hoy.
- Tocar `FeedPreview` o `RecentSelfActivity` de Inicio, o su fuente de datos.
- Cualquier acción sobre las entradas del feed (reaccionar, responder, editar) — sigue
  siendo una superficie de solo lectura.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `activity-feed`:
  - **Requirement "Feed de actividad de usuarios seguidos"** (MODIFIED): además de listar
    el feed de seguidos en orden cronológico paginado, el usuario SHALL poder acotar el
    listado por tipo de actividad, por autor (entre los seguidos), y por texto libre sobre
    el título del objetivo, de forma combinable.
  - **Requirement "Jerarquía de presentación del feed"** (MODIFIED): una entrada con texto
    SHALL mostrarse como cita (borde izquierdo, sin caja ni escalón de temperatura) en vez
    de sobre un panel con fondo propio; el tono SHALL distinguirse por tipo de entrada
    (nota de escucha en cursiva y entre comillas, comentario en redonda y sin comillas).
    Cuando la cita supera 6 líneas de alto real, SHALL plegarse con un control "Ver
    más"/"Ver menos" que la expande y colapsa. En `/me/feed` (no en `/me/diary` ni en el
    preview de Inicio), cada fila SHALL mostrar un indicador visual del autor (avatar)
    junto a su nombre, además del enlace de texto ya existente.

## Impact

- **Código:**
  - `src/services/feed/feed.ts` — `listFeed` gana un parámetro de filtros opcional
    (`kind`, `authorId`, `q`). Cuando `kind` está presente, se consulta solo la fuente
    correspondiente (mejora de rendimiento además de filtro). `q` agrega `ilike` sobre los
    mismos joins de `artist`/`releaseGroup`/`recording` que ya existen por fuente.
    `authorId` restringe `followedIds` a `[authorId]` (validando que sea un seguido
    aceptado).
  - `src/app/api/me/feed/route.ts` — el `GET` parsea y valida los tres query params nuevos
    (`kind` contra el enum cerrado existente; `VALIDATION_ERROR` si no pertenece al enum).
  - `src/lib/api/diary.ts` (o un `src/lib/api/feed.ts` nuevo, a definir en design) —
    función cliente que arma el query string de filtros para el feed.
  - `src/components/feed/FeedList.tsx` — barra de filtros (buscador + 2 selects) y
    migración de la paginación a `useInfiniteQuery`.
  - `src/components/ui/FilterSelect.tsx` (nuevo) — extraído de `DiaryActivityList.tsx`,
    reutilizado por diario y feed.
  - `src/components/feed/FeedList.tsx` / `EmptyState` — CTA en el vacío, cierre al final,
    `aria-live` en la carga.
  - `src/app/[locale]/me/feed/page.tsx` — sin cambios de contrato (sigue resolviendo la
    primera página en el servidor); pasa a ser el `initialData` de la query.
  - `src/components/feed/feed-row-parts.tsx` — `ProsePanel` deja de ser una caja
    (`bg-ink-surface`, borde, esquinas redondeadas) y pasa a un borde izquierdo sin caja,
    con una prop `variant: "impression" | "comment"` que decide cursiva+comillas vs.
    redonda sin comillas.
  - `src/components/feed/FeedActivityList.tsx` — pasa `variant` a `ProsePanel` según
    `row.kind` (`"listen"` → `"impression"`, `"comment"` → `"comment"`).
  - `src/components/diary/DiaryActivityList.tsx` — `ImpressionQuote` (definición local) se
    elimina; pasa a usar el `ProsePanel` compartido con `variant="impression"`, idéntico
    visualmente a como se veía antes.
  - `src/components/feed/feed-row-parts.tsx` — `ProsePanel` gana `clamp?: boolean`: mide
    la altura natural del párrafo contra `lineHeight × 6` y, si desborda, pliega con
    `line-clamp-6` más un botón "Ver más"/"Ver menos". Al colapsar, corrige la posición
    del scroll (`scrollIntoView`) antes de pintar. `FeedActivityList` gana su propia
    prop `clamp` (default `false`) que reenvía a `ProsePanel`; solo `FeedList.tsx`
    (`/me/feed`) la activa — `ScrollablePreviewList.tsx` (preview de Inicio) no.
  - `src/test/setup.ts` — stub no-op global de `scrollIntoView` (jsdom no lo implementa).
  - `src/components/feed/FeedActivityList.tsx` — nuevos `AuthorAvatar` (círculo de
    iniciales, `aria-hidden`) y `AuthorIdentity` (avatar + `AuthorLink`), usados en
    `MetaLine` y `GroupRow`. Solo esta pantalla — no `feed-row-parts.tsx` compartido con
    diario.
- **Sin cambios de esquema DB** — todos los filtros son sobre columnas ya existentes.
- **API:** `GET /api/me/feed` gana 3 query params opcionales. Aditivo — actualizar
  `route.test.ts` y el contrato documentado en `docs/04-api/` si existe.
- **i18n:** `messages/{es,en}/feed.json` — claves nuevas para la barra de filtros; reusar
  nombres de clave ya existentes en `diary.json` donde el concepto coincide.
- **Tests:** `src/services/feed/feed.test.ts` (filtros combinados, casos límite),
  `route.test.ts` (validación de query params), `FeedList.test.tsx` /
  `FeedActivityList.test.tsx` (UI de filtros, refetch, estado vacío "sin resultados"
  distinto de "sin actividad").
