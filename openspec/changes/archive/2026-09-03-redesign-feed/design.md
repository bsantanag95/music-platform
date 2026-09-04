## Context

`/me/feed` es un Client Component (`FeedList`) con "cargar más" incremental sobre
`GET /api/me/feed`. Renderiza `FeedEntry` (unión de 5 `kind`: `listen`, `favorite`,
`list`, `rating`, `comment`). Tras la primera iteración de este cambio, la presentación
vive en `FeedActivityList` (client), montado también por `FeedPreview` y
`RecentSelfActivity` (Server Components de Inicio). `CommunityActivity` y `PublicLists`
tienen su propia fila densa (`CompactActivityRow` / `CompactListRow`).

`FeedEntry.target` expone hoy `{ type, id, title, coverThumbUrl }` (y `subtitle` solo en
`listen`, siempre `null`). **No hay un campo de artista**: `feed.ts` mapea `title` a
`artistName ?? releaseTitle ?? recordingTitle`, así que para un objetivo de tipo álbum o
canción solo se tiene el título del disco/canción, no "Miles Davis". Este cambio agrega
`artistName` al payload (ver Decisión 8).

Datos por `kind` (de `src/services/feed/feed.ts` y `src/lib/api/schemas.ts`):

| kind | prosa | carátula | otros datos |
|---|---|---|---|
| `comment` | `body` (siempre) | solo si target es álbum | — |
| `listen` | `body` (opcional) | solo si target es álbum | `listenContext`, `reaction?`, `audience` |
| `rating` | — | solo si target es álbum | `stars`, `detailedScore?` |
| `favorite` | — | solo si target es álbum | `targetType`, `audience` |
| `list` | — | nunca | `event` (created/updated), `list.entityType` |

Carátulas: solo los objetivos de tipo `release-group` tienen `coverThumbUrl` fiable.
`artist.photoUrl` existe pero la política cover-only (`03-data/data-licensing.md`) hace
que casi nunca esté poblado; `recording` no tiene columna de carátula. Por eso el
objeto-firma (el disco de círculos concéntricos) es la respuesta a "musical sin artwork".

Restricciones del proyecto: sin `fetch` desde componentes, i18n por catálogos, código y
textos en español, `any` prohibido, typecheck + lint + test + build en verde, sin
dependencias nuevas. No modificar contratos REST sin actualizar la doc (acá el cambio es
aditivo).

Contexto de diseño: brief confirmado en `/impeccable shape` + auditoría en
`.impeccable/critique/2026-09-04T00-20-49Z__src-components-feed-feedactivitylist-tsx.md`.
Mundo visual "The Vinyl Listening Room" (DESIGN.md) sin cambios.

## Goals / Non-Goals

**Goals:**

- Que el ojo caiga primero sobre **qué música** toca el círculo y **quién dijo algo** para
  leer, con o sin portada.
- Diferenciar la presentación por **peso de contenido**: panel iluminado para la prosa,
  una línea para la sola presencia.
- Hacer la pantalla reconociblemente musical sin depender del artwork: celda izquierda
  con portada o disco, título en la tipografía de display, artista visible.
- Que el rating dual **se vea como un rating** (lenguaje VU + número), y que sea el único
  uso de ámbar en reposo del feed.
- Diferenciar "Tu feed" (actividad ajena) de "Tu rastro reciente" (propia) por
  composición, no por decoración.
- Que la actividad ambiente se sienta ambiente: colapso de corridas de sola presencia.

**Non-Goals:**

- Los bloques compactos de Inicio (`CommunityActivity`, `PublicLists`) conservan su
  layout denso; solo cambian la fecha (absoluta → relativa) y pierden la rama muerta de
  `FeedEntryCard`. `FeedEntryBody` se elimina como código muerto.
- No se **resuelve** una portada para canciones/artistas (join a "qué release representa a
  una canción" — decisión de catálogo). El disco cubre ese caso.
- No se agregan acciones sobre las entradas (like, responder, editar). Solo lectura.
- No se cambia el mecanismo de paginación ("cargar más" incremental).
- No hay migración de esquema DB — `artistName` sale de joins sobre tablas existentes.
- "Tu rastro reciente" **no** se convierte en un resumen estadístico / dashboard de
  métricas. Sigue siendo una lista cronológica compacta.

## Decisions

### 1. `FeedActivityList` en las listas verticales; fila densa propia en los bloques compactos

`FeedActivityList` (filas por peso) reemplaza a `FeedEntryCard` en `/me/feed`,
`FeedPreview` y `RecentSelfActivity`. `CommunityActivity` (grilla
`lg:grid-cols-[1.5fr_1fr]` en `AuthenticatedHome`/`AnonymousHome`) y `PublicLists` tienen
su propia fila densa (`CompactActivityRow` / `CompactListRow`) y **siempre** la usan — la
rama `compact ? … : <FeedEntryCard>` y los props `withCover`/`compact` eran código muerto
(los 4 call sites pasaban `compact`) y se eliminan junto con `FeedEntryBody`. `targetHref`
pasa a `src/components/feed/feed-target.ts` (módulo puro, importable desde Server y
Client — no puede vivir junto a `relativeFeedDate` de `feed-dates.ts`, que importa
`next-intl/server`).

### 2. Regla de peso: "pesada ⟺ hay prosa para leer" (sin cambios)

```
esPesada(entry) =
     entry.kind === "comment"
  || (entry.kind === "listen" && entry.body != null && entry.body.trim() !== "")
```

`rating` (aunque tenga `detailedScore`), `listen` con reacción pero sin nota, `favorite`
y `list` son livianas. Ya implementado en `feed-entry-weight.ts`; no cambia.

### 3. Celda izquierda fija (~44px) en toda fila — reemplaza "carátula solo en pesadas"

**Anula la decisión de la primera iteración** ("las livianas nunca muestran carátula; las
pesadas sin carátula arrancan directo con el título").

- Toda fila de `/me/feed` y `FeedPreview` abre con una celda cuadrada de ~40–48px:
  - `CoverThumb` con la portada cuando el objetivo la tiene (`release-group` con
    `coverThumbUrl`).
  - `DiscPlaceholder` (disco de círculos concéntricos) al mismo tamaño cuando no.
- La celda es una **columna rígida**, no decoración flotante — eso neutraliza el miedo a
  "ensuciar el layout" que motivó quitarla.
- **Sin glifo por tipo de actividad.** El tipo se lee por: el verbo del metadato, el
  render VU (rating), el panel iluminado (prosa) y el colapso (ambiente). Un iconito por
  fila sería ruido y contradice la aversión a iconos de DESIGN.md.
- `RecentSelfActivity` **no** usa esta celda — usa el hairline izquierdo (Decisión 10).

**Por qué:** ~la mitad de las entradas (artista/canción/lista) no tienen portada;
tratarla como columna opcional que cae al disco hace que su ausencia no rompa nada, y
devuelve el objeto-firma a la superficie social más visitada.

### 4. El título es el ancla de la fila

- Título del objetivo en `font-display`, un tamaño consistente (`text-base`+), enlazado,
  con subrayado sutil **persistente** (afordancia de clic sin depender del `:hover`).
- `autor · verbo · audiencia · fecha relativa` en una sola línea de metadato mono
  (`font-data text-xs text-paper-muted`) encima del título.
- Artista bajo el título en mono muted, solo para objetivos álbum y canción.
- Cumple la "División Tipográfica del Trabajo" de DESIGN.md (los títulos no son datos).

### 5. Fecha relativa con `next-intl` (sin cambios) + unificación

`useFormatter().relativeTime(new Date(iso), useNow())`; `<time dateTime={iso}
title={absoluta}>`. `now: new Date()` en `getRequestConfig` ya está.

**Nuevo:** los bloques compactos de Inicio (`CommunityActivity`, `PublicLists`) que hoy
usan `formatFeedDate` (absoluta) pasan a la fecha relativa vía `relativeFeedDate`
(`feed-dates.ts`, server, con el `now` global), para que la misma página no mezcle dos
sistemas. `formatFeedDate` se elimina con `FeedEntryBody`.

### 6. El peso es espacial — panel `ink-surface` bajo la prosa

Amplía la decisión "las pesadas tienen más padding".

- Fila **liviana**: una línea de baseline, ritmo apretado, sin superficie.
- Fila **pesada**: la prosa (comentario / nota) se asienta sobre un bloque `ink-surface`
  (un escalón de temperatura más claro que `ink`, hairline `ink-border`), en Source
  Serif. **No es una tarjeta** que envuelva toda la fila — solo el texto recibe la
  superficie iluminada; el metadato y el título quedan sobre el `ink` de fondo.
- Profundidad por temperatura, nunca por sombra (regla No-Shadow).
- Separación entre filas: `divide-y divide-ink-border` (sin borde por fila).

### 7. Afordancia y solo-lectura

- Títulos con subrayado persistente (Decisión 4). Enlaces de autor y de objetivo con tap
  target ≥44px y separación entre ellos (hoy van inline pegados).
- Cero controles de acción sobre las entradas. `<li>` con estructura semántica (no un
  `<p>` con enlaces sueltos y `·` de texto), el verbo ligado al ítem.

### 8. `artistName` en el payload del feed

- **Schema:** `FeedTargetInfo` y `ListenTargetInfo` ganan `artistName: string | null`
  (nullable — un objetivo artista o lista no lo tiene).
- **Servicio (`feed.ts`):**
  - Objetivo `release-group`: join `credit` con `role='primary'` → `artist.name`. `feed.ts`
    ya hace `leftJoin(credit, and(eq(credit.releaseGroupId, ...), eq(credit.role,
    'primary')))` en `listHomeReleases` de `home.ts` — mismo patrón.
  - Objetivo `recording`: join vía el `credit` del recording (mismo `role='primary'`).
  - Objetivo `artist`: `artistName = null` (el título ya es el artista).
  - Objetivo `list`: `artistName = null`.
- **Costo:** dos `leftJoin` más por fuente en un hot path. Aceptable — son joins por PK
  sobre tablas ya en el query; sin materialización hasta que el volumen lo justifique
  (mismo criterio que el resto del feed, `phase-5-design.md` §9).
- **API:** campo opcional nuevo en el objetivo de `GET /api/me/feed`. Aditivo y
  retrocompatible; actualizar `route.test.ts` y el contrato documentado.

### 9. Componente de rating tipo VU meter (display-only)

El producto hoy no tiene ningún render de rating fuera del input de chips de `DualRating`.
Se crea `FeedRatingMeter` (o nombre equivalente), display-only:

- Una fila horizontal de marcas cortas verticales en ámbar, con carácter de escala de
  aguja de VU meter, llenas hasta el valor (media marca para el `.5`).
- **Siempre** acompañada del valor numérico en mono (`4,5`), y del `detailedScore` cuando
  existe (`4,5 · 87`). El número es lo que hace el lenguaje entendible sin precedente
  cultural como el de las estrellas.
- Altura acotada (~1em); vive en la línea de sustancia de la fila liviana del rating.
- Único uso de `text-amber` en reposo en todo el feed (Regla de Rareza — los ratings son
  minoría de filas).
- Respeta `prefers-reduced-motion` por defecto (sin animación).

Forma exacta (cantidad de marcas: 5 divisibles vs 10 medias) → se resuelve en
`/impeccable colorize`/`layout` con referencia visual.

### 10. "Tu rastro reciente" — diferenciación por composición

`RecentSelfActivity` NO usa la celda de portada/disco ni la columna de autor.

- **Hairline izquierdo continuo** que corre por toda la lista (`border-l border-ink-border`
  sobre el `<ul>` o el contenedor), filas indentadas desde él (`pl-4`). Es "el borde de
  tu propia página".
- Sin `AuthorLink` en las filas (ya sabés que sos vos).
- Ritmo vertical más apretado que "Tu feed".
- Mismo contenido cronológico, misma clasificación de peso, mismo render de prosa y de
  rating. La agrupación (Decisión 11) también aplica.
- Gramática que queda: **"Tu feed" = objetos con gente pegada** (celda + autor por fila);
  **"Tu rastro" = una regla al margen bajando por tu diario**.
- Header y link "Ver diario" sin cambios.

### 11. Agrupación de actividad ambiente (3+)

- Al componer la lista, corridas de **3 o más entradas consecutivas** del **mismo `kind`
  de sola presencia** y el **mismo autor** (escuchas sin nota, o favoritos) se pliegan en
  **una** fila: `AUTOR · registró N escuchas` + los títulos listados (enlazados) + un solo
  timestamp (el más reciente de la corrida).
- **Nunca** se colapsan comentarios ni escuchas con nota.
- Aplica a las tres superficies.
- **No interactiva** en v1 (es una fila más, no expande/colapsa).
- El agrupado corre en el cliente sobre el array acumulado, así que una corrida partida
  por un "cargar más" **sí** se colapsa cuando llega la página siguiente (mejora sobre la
  cota conservadora que preveía este design). Puede haber un salto visual chico en ese
  momento (2 filas sueltas → 1 grupo) — aceptable y poco frecuente.
- Se implementa en `groupAmbientRuns` (`feed-grouping.ts`), helper puro
  `FeedEntry[]` → `(FeedEntry | FeedEntryGroup)[]`, testeable de forma aislada.
- La fila agrupada lista hasta 4 títulos enlazados; el resto se resume en "y N más" que
  enlaza al perfil del autor.

### 12. Amber's one job + Regla de Rareza

El único `text-amber` en reposo del feed es el `FeedRatingMeter`. Todo lo demás queda en
`text-paper` / `text-paper-muted` sobre `ink`. El hover de los enlaces puede seguir
usando `hover:text-amber`, pero la afordancia en reposo la da el subrayado persistente
del título (Decisión 4), no el color.

## Risks / Trade-offs

- **[El join de artista pega en el hot path del feed]** → Joins por PK sobre tablas ya en
  el query; `perSource = pageSize + 1`. Medir con el seed. Si escala mal, se cachea el
  artista principal por `release_group` (denormalización) en un cambio aparte.
- **[El lenguaje VU no se entiende sin precedente cultural]** → Mitigado: el valor
  numérico va **siempre** al lado. La marca es refuerzo, no la única señal.
- **[La agrupación esconde actividad que alguien quería ver]** → Solo colapsa sola
  presencia (bajo contenido por definición, Principio 1); los títulos siguen listados y
  enlazados; comentarios y notas nunca se tocan.
- **[Corrida partida por paginación no colapsa]** → Cosmético; dos filas sueltas en el
  borde de página. Aceptable en v1.
- **[La celda en toda fila sube el alto de las livianas]** → Es la decisión explícita del
  brief (columna para el ojo + objeto-firma). El colapso 3+ compensa la densidad perdida.
- **[Dos anchos entre `/me/feed` (2xl) y los previews de Inicio (3xl)]** → Contextos
  distintos (lectura dedicada vs bloque en una página con otros). Se acepta; si se ve
  raro en review, se unifica a 2xl.

## Migration Plan

Frontend + servicio de lectura + un campo aditivo en el schema/API. **Sin migración de
DB.** El cambio en `GET /api/me/feed` es aditivo y retrocompatible (campo opcional nuevo
en el objetivo). Deploy directo, sin feature flag. Rollback = revertir el commit; el
campo nuevo del payload no deja estado persistido.

## Open Questions

- Forma exacta del `FeedRatingMeter`: ¿5 marcas divisibles en medios, o 10 marcas de
  medio paso? ¿Marcas verticales tipo escala de consola, o segmentos horizontales tipo
  barra de VU? Se decide en `/impeccable colorize` con referencia visual.
- Tamaño exacto de la celda izquierda (40 / 44 / 48) y del indent del hairline de
  "Tu rastro" — se afina en `/impeccable layout`.
- ¿La fila agrupada lista **todos** los títulos o hasta N con un "y M más"? Propuesta:
  hasta ~4 títulos, luego "y M más" enlazando al perfil del autor.
- ¿La unificación de fecha (absoluta → relativa en los bloques compactos) entra en este
  cambio o se separa? Propuesta: entra, es una línea por componente y evita la
  inconsistencia en la misma página.
