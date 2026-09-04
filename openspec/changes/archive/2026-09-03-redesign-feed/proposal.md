## Why

`/me/feed` renderiza sus cinco tipos de actividad (escucha, favorito, evento de lista,
rating, comentario) con la misma `FeedEntryCard`: autor, etiqueta de acción, título
enlazado y fecha, todos con el mismo peso visual. El resultado se lee como una lista de
registros, no como "un diario de lo que escucha tu círculo" — no hay una jerarquía que
guíe el ojo hacia lo que vale la pena leer (comentarios, impresiones escritas) frente a
lo que es solo señal de presencia (un favorito, un rating suelto). Además el feed no
parece que se trate de música: el título del objetivo va en la tipografía mono reservada
para datos, el objeto-firma del producto (el disco de vinilo) no aparece, y el rating
dual —el mecanismo diferenciador— se renderiza como una frase de texto. Esto choca con la
doctrina del producto: el Principio 1 (`product_philosophy.md`) dice que registrar una
escucha no requiere juicio y es de bajo contenido, y el Principio 4 dice que las reseñas
son contenido en sí mismo.

Este cambio rediseña el feed para que la jerarquía guíe el ojo hacia la música y hacia lo
que hay para leer, y para que la pantalla sea reconociblemente musical sin depender de
las portadas (que faltan en ~la mitad de las entradas). El modelo pesada/liviana se
mantiene; se le suma una anatomía de fila nueva, un cambio aditivo en el payload del feed
(el nombre del artista) y el colapso de la actividad ambiente.

## What Changes

- **Componente de presentación `FeedActivityList`** (filas por peso), que reemplaza a
  `FeedEntryCard` en las tres superficies que son **listas verticales cronológicas de
  entradas de feed**: `/me/feed` (`FeedList`), el preview de feed de seguidos de Inicio
  (`FeedPreview`) y el rastro reciente del propio usuario (`RecentSelfActivity`). Los
  bloques de descubrimiento compacto de Inicio (`CommunityActivity`, `PublicLists`)
  conservan su fila densa propia, pero se les quita la rama no usada que montaba
  `FeedEntryCard` full-width (props `withCover`/`compact`); **`FeedEntryBody` se elimina**
  y `targetHref` pasa a un módulo puro `src/components/feed/feed-target.ts`.
- **Dos pesos de entrada** (regla sin cambios):
  - **Pesada** (prosa sobre panel `ink-surface`): `comment` (siempre) y `listen` con nota
    escrita (`body` no vacío).
  - **Liviana** (una fila de baseline apretada): `favorite`, `list` (creó/actualizó),
    `rating` (siempre) y `listen` sin nota (la reacción, si hay, inline).
- **Anatomía de fila nueva:**
  - **Celda izquierda fija (~44px)** en toda fila de `/me/feed` y "Tu feed": portada
    cuadrada cuando el objetivo la tiene, el disco de círculos concéntricos cuando no. Es
    la columna que el ojo sigue y el objeto-firma que hace la pantalla musical.
  - **El título del objetivo es el elemento dominante** — `font-display`, un tamaño
    consistente, en ambos pesos. `autor · verbo · audiencia · fecha` se degrada a una sola
    línea de metadato mono encima.
  - **El nombre del artista** va bajo el título en mono muted, para objetivos de tipo
    álbum y canción.
  - **El peso es espacial:** la prosa de las pesadas se asienta sobre un panel
    `ink-surface` (escalón de temperatura, regla No-Shadow), no solo más `padding`.
- **Rating con lenguaje propio, tipo VU meter:** una fila corta de marcas en ámbar con
  carácter de aguja de VU, **siempre acompañada del valor numérico en mono** (`4,5` — y
  `· 87` cuando hay `detailedScore`). Es la única veta de ámbar en reposo del feed
  (Regla de Rareza). Reemplaza a "Valoró con 4.5 estrellas". Componente display-only
  nuevo (el producto hoy no tiene ningún render de rating fuera del input de `DualRating`).
- **`artistName` en el payload del feed:** se agrega a `FeedTargetInfo` /
  `ListenTargetInfo` y al `SELECT` de `listFeed` (join al artista principal del álbum o
  canción). Cambio **aditivo y retrocompatible** en `GET /api/me/feed`.
- **"Tu rastro reciente" se diferencia por composición:** sin columna de autor (ya sabés
  que sos vos), sin la celda de portada/disco prominente — en su lugar, un **hairline
  izquierdo continuo** que corre por toda la lista, filas indentadas, ritmo más apretado,
  mismo contenido cronológico. "Ver diario" sigue siendo el acceso al historial completo;
  Inicio no se vuelve un panel de métricas.
- **Agrupación de actividad ambiente:** 3+ entradas consecutivas del **mismo tipo y mismo
  autor** de sola presencia (escuchas, o favoritos) se pliegan en una fila con los
  títulos listados. Comentarios y escuchas con nota **nunca** se colapsan. Aplica a las
  tres superficies. No interactiva (es una fila más). Una corrida partida por un límite de
  paginación no se colapsa en v1.
- **Afordancia:** subrayado sutil persistente en los títulos (no depende del `:hover`);
  tap targets separados; el feed sigue **solo lectura** (sin like, responder, editar).
- **Fecha relativa** ("hace 2 días") vía `useFormatter().relativeTime()` + `useNow()`,
  con la absoluta en `dateTime`/`title`. Se unifica: los bloques compactos de Inicio que
  hoy usan fecha absoluta pasan a relativa para consistencia en la misma página.
- **Anchos:** `/me/feed` a `max-w-2xl`; `FeedPreview` y `RecentSelfActivity` a `max-w-3xl`
  (alinean con los demás bloques de Inicio).
- **Pulido:** los dos tratamientos de enlace de autor se unifican; el plural "1 estrellas"
  se corrige; "Cargar más" gana afordancia de reintento.
- Namespace `feed` (`messages/{es,en}/feed.json`) gana las claves que haga falta.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `activity-feed`:
  - **Requirement "Alcance del feed v1"** (MODIFIED): cada entrada expone el objetivo
    **con su título y, para álbumes y canciones, el nombre del artista principal**. Es una
    ampliación aditiva del payload; la composición, la deduplicación de ratings y las
    reglas de visibilidad **no cambian**.
  - **Requirement de presentación** (ADDED): jerarquía visual y diferenciación por peso de
    contenido, anatomía de fila (celda izquierda con portada o disco, título como ancla,
    metadato mono, artista), rating con render tipo VU, agrupación de actividad ambiente
    (3+), y el tratamiento distinto de "Tu rastro reciente". Aplica a `/me/feed`,
    `FeedPreview` y `RecentSelfActivity`.
  - El capability `home` no cambia (qué bloques se muestran en Inicio y cuándo).

## Impact

- **Código:**
  - `src/services/feed/feed.ts` — join al artista principal (`credit` con `role='primary'`
    para álbum; vía credit del recording para canción) + mapping de `artistName`.
  - `src/lib/api/schemas.ts` — `artistName` en `FeedTargetInfo` / `ListenTargetInfo`
    (opcional / nullable).
  - `src/components/feed/FeedActivityList.tsx` — reescritura de las filas (celda, título
    ancla, metadato, panel de peso, VU, agrupación).
  - `src/components/feed/feed-entry-weight.ts` — sin cambios (la regla se mantiene).
  - `src/components/feed/FeedRatingMeter.tsx` (o similar) — componente VU display-only
    nuevo.
  - `src/components/home/RecentSelfActivity.tsx` — reencuadre (hairline, sin autor).
  - `src/components/home/FeedPreview.tsx`, `src/components/feed/FeedList.tsx` — `FeedList`
    gana la afordancia de reintento; `FeedPreview` ya monta `FeedActivityList`.
  - `src/components/home/CommunityActivity.tsx` / `PublicLists.tsx` — fecha absoluta →
    relativa; se elimina la rama no usada de `FeedEntryCard` y los props
    `withCover`/`compact` (con sus call sites en `AnonymousHome`/`AuthenticatedHome`).
  - `src/components/feed/FeedEntryBody.tsx` — **eliminado** (código muerto tras el
    rediseño). `src/components/feed/feed-target.ts` (nuevo) — `targetHref`.
    `src/components/feed/feed-dates.ts` (nuevo) — `relativeFeedDate` server-side.
- **Componentes reusados:** `CoverThumb`, `DiscPlaceholder`, `ReactionBadge`.
- **Sin cambios de esquema DB** — `artistName` sale de joins sobre tablas existentes
  (`credit`, `artist`).
- **API:** `GET /api/me/feed` gana un campo opcional en el objetivo (aditivo). Actualizar
  `src/app/api/me/feed/route.test.ts` y el contrato en `docs/03-api/` si lo documenta.
- **i18n:** `messages/{es,en}/feed.json` (claves nuevas: rating VU, fila agrupada).
- **Documentación:** `docs/05-features/activity-feed.md` (sección de presentación
  actualizada).
- **Tests:** `src/components/feed/*`, `src/components/home/FeedPreview.test.tsx`,
  `src/services/feed/feed.test.ts` (join de artista), `route.test.ts`.
