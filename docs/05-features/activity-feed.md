# Feed de actividad — "qué está escuchando" tu círculo

**Fase:** 5 (roadmap). **Estado:** ✅ Feed implementado con escuchas, favoritos, eventos de
listas (cambio `add-favorites-and-lists`), ratings vigentes y comentarios (cambio
`add-ratings-comments-feed`). Presentación de `/me/feed` rediseñada por peso de contenido
en `redesign-feed` — ver "Presentación de `/me/feed`" más abajo. `/me/feed` gana búsqueda
y filtros combinables (tipo, autor, texto) y la prosa pasa de panel a cita en
`add-feed-filters`. `rework-feed-tiers` reemplaza el criterio binario "con texto / sola
presencia" por una **jerarquía de 4 tiers** y suma las **reseñas de álbum** como sexta
fuente (acción expresiva de nivel 1) — ver "Jerarquía de presentación" más abajo.

## Qué es

La función inspirada en el "qué estás escuchando" de MSN (`00-product/vision.md`): ver en
tiempo casi real lo que las personas que seguís están registrando, valorando o
comentando. Es la pieza central de la diferenciación frente a Spotify/Apple Music, cuya
capa social es mínima.

## Feed — seis fuentes (add-diary-social-surfaces + add-favorites-and-lists + add-ratings-comments-feed + rework-feed-tiers)

El feed muestra las actividades de los usuarios seguidos (relación `accepted`) que sean
visibles para el lector, en orden cronológico descendente con paginación. Se implementa como
`GET /api/me/feed` y se visualiza en `/<locale>/me/feed`.

### Tipos de actividad

- **Escucha** (`kind: "listen"`): entrada del diario, con contexto, reacción y audiencia.
- **Favorito** (`kind: "favorite"`): marca de favorito sobre artista/álbum/canción.
- **Evento de lista** (`kind: "list"`): creación (`event: "created"`) o actualización de
  metadatos (`event: "updated"`, con fecha `updated_at`). No se genera un evento por ítem.
- **Rating** (`kind: "rating"`): valoración **vigente** de un usuario sobre un objetivo. Un
  cambio de valoración reemplaza la entrada anterior (no se muestra historial); la fecha
  mostrada es la de `updated_at`.
- **Comentario** (`kind: "comment"`): cada comentario genera su propia entrada — un usuario
  puede tener varias entradas de comentario sobre el mismo objetivo.
- **Reseña** (`kind: "review"`): reseña de álbum (`add-album-review` — una por usuario y
  álbum, editable en el lugar). Espeja a `comment`: sin columna de audiencia (pública en
  catálogo, filtrada por visibilidad de perfil), ordenada por `updated_at` y con esa fecha
  en la entrada. Trae `title` (opcional) además del `body`. Una edición no genera una
  segunda entrada — la misma fila se refecha.

La composición se calcula **bajo demanda** uniendo las seis fuentes (no hay tabla de eventos
materializada), ordenando por `created_at DESC` con desempate por fuente e id. La paginación
consulta una página ampliada por fuente y la fusiona en memoria; materialización y
deduplicación se evalúan con volumen real.

### Reglas de visibilidad

La matriz de visibilidad (`audiencesForProfile`, ahora compartida en
`src/services/social/visibility.ts`) determina qué actividades ve el lector:
- Bloqueo en cualquier dirección → nada.
- Dueño → todas.
- Perfil privado y no seguidor aprobado → nada (ni las públicas).
- Seguidor aprobado → `public` + `followers`.
- Resto → solo `public`.

El feed aplica esta lógica filtrando `user_id IN (seguidos aceptados)` +
`audience IN (followers, public)` + `NOT EXISTS` defensivo sobre `user_block` para cada fuente
que tiene audiencia propia (escucha, favorito, lista).

`rating`, `comment` y `review` **no tienen columna de audiencia** (a diferencia de las otras
tres fuentes): en la vista de catálogo son siempre públicos. Para el feed se tratan como
audiencia `public` implícita, filtrados solo por `user_id IN (seguidos aceptados)` +
bloqueo. Un perfil privado sin relación aceptada no aparece en `authorIds`, así que sus
reseñas nunca entran al feed. Como `audiencesForProfile` siempre incluye `"public"` cuando la relación es
`following` (aceptada), pertenecer a los seguidos ya equivale a tener permiso para ver esa
actividad — no hace falta una audiencia explícita. Ver `design.md` del cambio
`add-ratings-comments-feed`.

### Pendiente para v2+

- Deduplicación de eventos (un usuario que registra escucha + cambia rating en la misma sesión).
  Caso concreto ya identificado (`rework-feed-tiers`, OQ2): cuando existe una reseña y una
  valoración del mismo usuario y álbum, una futura refinación podrá ocultar o suprimir la
  fila de valoración; por ahora se muestran ambos eventos.
- **Tier 4 en el feed** — eventos ambiente (seguir artista/usuario, colección). El tier
  está definido en `feedEntryTier` pero esas fuentes no se consultan todavía; se
  incorporan en un cambio posterior.
- `add-feed-rotation-peak` y `add-network-convergence` — señales derivadas sobre el feed
  (picos de rotación, convergencia de red), fuera de alcance de `rework-feed-tiers`.
- Materializar el feed como tabla de eventos si el volumen lo justifica.
- Keyset pagination en lugar de offset.
- Audiencia por actividad para rating/comment (alineado con el diseño maestro de Fase 5,
  fuera de alcance de `add-ratings-comments-feed` por requerir migración de esquema).

## Presentación de `/me/feed` (`redesign-feed`)

El feed dejó de renderizar sus cinco tipos con la misma tarjeta (`FeedEntryCard`). Las
**listas verticales cronológicas de entradas de feed** —`/me/feed` (`FeedList`), el
preview de feed de seguidos de Inicio (`FeedPreview`) y el rastro reciente del propio
usuario (`RecentSelfActivity`)— usan `FeedActivityList`
(`src/components/feed/FeedActivityList.tsx`).

### Anatomía de fila

De izquierda a derecha: **celda fija ~44px** (carátula del objetivo, o el disco de
vinilo `DiscPlaceholder` si no hay arte — nunca deja hueco) · **línea de metadato mono**
`autor · verbo · audiencia` con la fecha relativa a la derecha · **título del objetivo**
en `font-display` como ancla de la fila (subrayado sutil persistente para leerse como
enlace sin depender del `:hover`) · **artista** debajo del título (álbum y canción) ·
la **sustancia** de la fila.

### Jerarquía de presentación — 4 tiers (`rework-feed-tiers`)

`feedEntryTier(entry): 1 | 2 | 3 | 4` (`src/components/feed/feed-entry-tier.ts`) reemplaza
el criterio binario anterior. El tier depende del **tipo y del objetivo** — el mismo rating
pesa distinto sobre un álbum que sobre una canción:

| Tier | Qué | Tratamiento |
|---|---|---|
| **1 Expresivo** | comentario · reseña · escucha con nota · evento de lista | cita (`ProsePanel`) para las tres con prosa; fila de título para el evento de lista. Nunca se colapsa; corta cualquier corrida. |
| **2 Señal de opinión** | rating de **álbum** · favorito de **álbum** | fila con carátula + marca de opinión; se colapsa en corridas de 3+. |
| **3 Presencia cotidiana** | rating de canción · favorito de canción/artista · escucha sin nota · reacción | fila mínima de baseline; se colapsa en corridas de 3+. |
| **4 Ambiente** | seguir artista/usuario · colección | **reservado — todavía NO llega al feed** (se incorpora en un cambio posterior). |

- La regla de qué se renderiza como cita vive en `isFeedEntryQuote` (mismo módulo): tier 1
  con prosa (comentario, reseña, escucha con nota).
- Dentro de la cita, el **tono** se distingue por tipo, no por caja: una **nota de escucha**
  (`variant="impression"`) va en cursiva y entre comillas — la misma voz personal que su
  equivalente en el diario. Un **comentario** y una **reseña** (`variant="comment"`) van en
  redonda y sin comillas: crítica, opinión o contenido en sí mismo, no una impresión
  sentida. La reseña añade su `title` (cuando existe) en la línea de metadato:
  `Reseñó · «{título}»`.

Alinea con `product_philosophy.md`: el Principio 1 (registrar una escucha no requiere
juicio, bajo contenido) y el Principio 4 (las reseñas son contenido). El tratamiento de
cita se lo gana lo que está **escrito**.

### Rating — medidor tipo VU

Un rating se renderiza con `FeedRatingMeter` (`src/components/feed/FeedRatingMeter.tsx`):
una escalera de 5 marcas crecientes en **ámbar**, encendidas hasta el valor (media marca
por `.5`), **siempre acompañada del número** (`4.5` o `4.5 · 87` con el score detallado).
Es el único uso de ámbar en reposo del feed (Regla de Rareza). `role="img"` +
`aria-label` legible; las marcas son `aria-hidden`.

### Agrupación por tier

`groupFeedRuns` (`src/components/feed/feed-grouping.ts`) pliega **3+ entradas consecutivas
del mismo tier (2 o 3), del mismo `kind` y del mismo autor** en una fila: `autor · valoró N
discos` (o `registró N escuchas`, `marcó N favoritos`, `valoró N canciones`) + hasta 4
títulos enlazados + "y M más" (→ perfil del autor). El `FeedEntryGroup` lleva `tier: 2 | 3`
para que el render distinga el grupo de señal de opinión (tier 2, verbo de álbumes) del de
presencia cotidiana (tier 3, verbo de canciones). Una racha de ratings de canción (tier 3)
y ratings de álbum (tier 2) **no se fusionan** aunque sean consecutivas. Toda entrada tier 1
(comentario, reseña, nota de escucha, evento de lista) corta la corrida. Corre en el
cliente sobre el array acumulado, así que también colapsa a través de un "Cargar más".

### "Tu rastro reciente" — variante `self`

`FeedActivityList variant="self"` (que usa `RecentSelfActivity`): **sin celda y sin
columna de autor** (ya sabés que sos vos), con un **hairline izquierdo continuo**
(`border-l`) y las filas indentadas — un margen bajando por tu propio diario. Mismo
contenido y misma clasificación de peso que "Tu feed".

### Fechas

Fecha **relativa** ("hace 2 días") en todas las superficies de feed de la misma página
— `FeedActivityList` vía `useFormatter()` + `useNow()`; los bloques compactos de Inicio
(`CommunityActivity`, `PublicLists`) vía `relativeFeedDate` (`feed-dates.ts`, server, con
el `now` global de `getRequestConfig`). La fecha absoluta va siempre en `dateTime`/`title`
del `<time>`.

### Solo lectura

`/me/feed` no ofrece acciones sobre las entradas (reaccionar, responder, editar); los
únicos controles son enlaces al perfil del autor y al objetivo. El fallo de "Cargar más"
muestra un `role="alert"` y el botón pasa a "Reintentar".

### Bloques compactos de Inicio

`CommunityActivity` (ratings + comentarios) y `PublicLists` (eventos de lista) siguen con
su propia fila compacta densa (`CompactActivityRow` / `CompactListRow`, hairline
`divide-y`, carátula 40px decorativa). `redesign-feed` les quitó la rama no usada que
renderizaba `FeedEntryCard` full-width y el prop `withCover`; `FeedEntryBody` se
eliminó. `targetHref` vive ahora en `src/components/feed/feed-target.ts` (módulo puro,
Server + Client); la fecha relativa server-side en `feed-dates.ts`.

Carátulas de canciones y artistas: el feed no las **resuelve** (el objetivo `recording`/
`artist` no trae `coverThumbUrl`); la celda cae al disco. El **nombre del artista** sí
llega ahora — `FeedTargetInfo`/`ListenTargetInfo` ganaron `artistName` (opcional), que
`listFeed` puebla con el artista principal acreditado (`PRIMARY_ARTIST_SQL`, subquery
escalar sobre `credit` con `role='primary'`).

## De dónde sale el contenido del feed

Ver `listening-diary-and-ratings.md`, sección 5, para el detalle completo. Resumen:

- Nueva entrada del diario de escucha (`listen_entry`), con o sin texto/reacción.
- Cambio de valoración vigente (`rating.stars`) respecto al valor anterior.
- Nuevo comentario.
- Nueva reseña de álbum, o edición de una existente (refecha la entrada, no la duplica).

No se materializa una tabla de eventos aparte desde el día uno — se computa como una unión
ordenada por fecha de las fuentes, filtrada por a quién sigue el usuario.

## Descubrimiento social pasivo

También descrito en `listening-diary-and-ratings.md`, sección 7: en vez de un motor de
recomendación algorítmico (explícitamente descartado en `vision.md`), el patrón "gente que
amó X también amó Y" se resuelve como una query de co-valoración sobre `rating`, no como
un modelo de recomendación.

## Grafo social

El grafo social (seguimiento unilateral) ya existe desde el cambio `add-social-profile-follow`.
Las reglas de visibilidad del feed dependen de él (relación `accepted` + ausencia de bloqueo).