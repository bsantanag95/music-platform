# Feed de actividad — "qué está escuchando" tu círculo

**Fase:** 5 (roadmap). **Estado:** ✅ Feed implementado con escuchas, favoritos, eventos de
listas (cambio `add-favorites-and-lists`), ratings vigentes y comentarios (cambio
`add-ratings-comments-feed`). Presentación de `/me/feed` rediseñada por peso de contenido
en `redesign-feed` — ver "Presentación de `/me/feed`" más abajo. `/me/feed` gana búsqueda
y filtros combinables (tipo, autor, texto) y la prosa pasa de panel a cita en
`add-feed-filters`. `rework-feed-tiers` reemplaza el criterio binario "con texto / sola
presencia" por una **jerarquía de 4 tiers** y suma las **reseñas de álbum** como sexta
fuente (acción expresiva de nivel 1) — ver "Jerarquía de presentación" más abajo.
`add-feed-kind-differentiation` suma un glifo por tipo, un tratamiento propio para la
reseña, activa "seguir a un usuario" (tier 4) como séptima fuente —retirándolo de la franja
de eventos ambiente— y hace que agregar un ítem a una lista existente cuente como
actualización de esa lista. `add-artist-follow-feed-entry` hace lo mismo con "seguir a un
artista" (octava fuente), que también deja de ser exclusiva de la franja de eventos
ambiente. `add-feed-artist-link` enlaza el nombre del artista acreditado de un álbum o
canción a su página. `add-feed-album-sweep` (rediseñado en `widen-feed-album-grouping`)
extiende la agrupación por tipo a un tramo de escuchas/favoritos/valoraciones del mismo
álbum con `kind` alternado, aunque no sean consecutivas del mismo tipo en la lista cruda.

## Qué es

La función inspirada en el "qué estás escuchando" de MSN (`00-product/vision.md`): ver en
tiempo casi real lo que las personas que seguís están registrando, valorando o
comentando. Es la pieza central de la diferenciación frente a Spotify/Apple Music, cuya
capa social es mínima.

## Feed — ocho fuentes (add-diary-social-surfaces + add-favorites-and-lists + add-ratings-comments-feed + rework-feed-tiers + add-feed-kind-differentiation + add-artist-follow-feed-entry)

El feed muestra las actividades de los usuarios seguidos (relación `accepted`) que sean
visibles para el lector, en orden cronológico descendente con paginación. Se implementa como
`GET /api/me/feed` y se visualiza en `/<locale>/me/feed`.

### Tipos de actividad

- **Escucha** (`kind: "listen"`): entrada del diario, con contexto, reacción y audiencia.
- **Favorito** (`kind: "favorite"`): marca de favorito sobre artista/álbum/canción.
- **Evento de lista** (`kind: "list"`): creación (`event: "created"`) o actualización —de
  metadatos (título, descripción, audiencia) **o de agregar un ítem** a una lista existente
  (`add-feed-kind-differentiation`; `addItemToList` toca `updated_at` cuando insertó de
  verdad)— (`event: "updated"`, con fecha `updated_at`). Nunca un evento por ítem: agregar
  varios seguidos sigue refrescando la misma entrada vigente. Quitar un ítem no genera
  evento.
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
- **Seguir a un usuario** (`kind: "follow"`, `add-feed-kind-differentiation`): **tier 4**,
  activo en la línea de tiempo principal — antes solo existía como resumen agrupado en la
  franja de eventos ambiente (ver más abajo), de donde se retiró para no mostrar el mismo
  hecho dos veces en `/me/feed`. Sin objetivo de catálogo: el payload trae `followedUser`
  (la persona seguida) en vez de `target`. Visible solo si esa persona tiene perfil público
  o el lector ya la sigue con relación aceptada; nunca si el objetivo es el propio lector;
  sujeto a bloqueo en cualquier dirección entre lector↔autor y lector↔objetivo. Fecha =
  `updated_at` de la relación (momento de aceptación, no de la solicitud). Sin concepto de
  edición: si la relación deja de existir, la entrada desaparece.
- **Seguir a un artista** (`kind: "follow-artist"`, `add-artist-follow-feed-entry`): **tier
  4**, mismo tratamiento inline que "seguir a un usuario" — antes solo existía como resumen
  agrupado en la franja de eventos ambiente, de donde se retiró. Sin objetivo de catálogo:
  el payload trae `artist` (`id`/`name`) en vez de `target`. A diferencia de "seguir a un
  usuario", **no hay regla de visibilidad adicional** — un artista no tiene perfil privado,
  así que solo se excluye por bloqueo lector↔autor. Fecha = `created_at` del seguimiento (no
  hay estado `pending`/`accepted` para un follow de artista). Sin concepto de edición: si el
  seguimiento deja de existir, la entrada desaparece.

La composición se calcula **bajo demanda** uniendo las ocho fuentes (no hay tabla de eventos
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
- Notificaciones "Ana te empezó a seguir" — la fuente "seguir a un usuario" del feed
  principal omite a propósito los eventos cuyo objetivo es el propio lector (a diferencia
  de "seguir a un artista", que no tiene ese caso posible); ese caso es materia de una
  superficie de notificación, todavía inexistente.
- Suprimir o colapsar en el listado cronológico las entradas individuales que ya alimentan
  una convergencia de la red (`add-network-convergence`, OQ2 — hoy el panel es aditivo).
- Ponderar los tipos de interacción de la convergencia entre sí (reseña > registro) —
  `add-network-convergence` los cuenta por igual en Fase 1 (D9: "pendiente de afinar").
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
enlace sin depender del `:hover`) · **artista** debajo del título (álbum y canción),
**enlazado a su página** (`add-feed-artist-link`; un objetivo de tipo artista no duplica
el enlace, el título ya apunta ahí) · la **sustancia** de la fila.

### Jerarquía de presentación — 4 tiers (`rework-feed-tiers`)

`feedEntryTier(entry): 1 | 2 | 3 | 4` (`src/components/feed/feed-entry-tier.ts`) reemplaza
el criterio binario anterior. El tier depende del **tipo y del objetivo** — el mismo rating
pesa distinto sobre un álbum que sobre una canción:

| Tier | Qué | Tratamiento |
|---|---|---|
| **1 Expresivo** | comentario · reseña · escucha con nota · evento de lista | cita (`ProsePanel`) para las tres con prosa; fila de título para el evento de lista. Nunca se colapsa; corta cualquier corrida. |
| **2 Señal de opinión** | rating de **álbum** · favorito de **álbum** | fila con carátula + marca de opinión; se colapsa en corridas de 3+. |
| **3 Presencia cotidiana** | rating de canción · favorito de canción/artista · escucha sin nota · reacción | fila mínima de baseline; se colapsa en corridas de 3+. |
| **4 Ambiente** | **seguir usuario** · **seguir artista** (ambos activos) · colección (reservada) | seguir usuario/seguir artista: fila mínima sin celda ni objetivo de catálogo, se colapsan en corridas de 3+ igual que tier 2/3 (sin mezclarse entre sí). Colección sigue **sin fila propia en el feed principal** — vive en la franja de eventos ambiente. |

- La regla de qué se renderiza como cita vive en `isFeedEntryQuote` (mismo módulo): tier 1
  con prosa (comentario, reseña, escucha con nota).
- Dentro de la cita, el **tono** se distingue por tipo, no por caja: una **nota de escucha**
  (`variant="impression"`) va en cursiva y entre comillas — la misma voz personal que su
  equivalente en el diario. Un **comentario** y una **reseña** (`variant="comment"`) van en
  redonda y sin comillas: crítica, opinión o contenido en sí mismo, no una impresión
  sentida.
- **Glifo por tipo** (`add-feed-kind-differentiation`): cada `kind` muestra un ícono mono de
  14px junto al verbo de la línea de metadato (`FeedKindIcons.tsx`, misma familia visual que
  los íconos de reacción de escucha) — siempre acompañado del texto, nunca la única señal.
  El rating queda exento: su medidor VU ya cumple ese rol. "Seguir a un usuario" y "seguir a
  un artista" comparten el mismo glifo (`add-artist-follow-feed-entry`): es la misma acción,
  distinta solo en el objetivo y el verbo.
- **La reseña gana identidad propia**: ya no lleva su `title` como sufijo del verbo
  (`Reseñó · «título»`); en cambio muestra un rótulo "Reseña" en **petróleo** (segundo
  acento del sistema, antes sin usar en el feed), su `title` (cuando existe) como titular
  en `font-display`, y un borde izquierdo en petróleo en vez del hairline neutro de una cita
  común — mismo trato editorial que ya recibía una lista oficial en `/lists`. Es el primer
  uso reservado de petróleo en el feed; no se suma a otros tipos sin una decisión explícita.

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
del mismo tier (2, 3 o 4), del mismo `kind` y del mismo autor** en una fila: `autor · valoró N
discos` (o `registró N escuchas`, `marcó N favoritos`, `valoró N canciones`, `siguió a N
personas` desde `add-feed-kind-differentiation`, o `empezó a seguir a N artistas` desde
`add-artist-follow-feed-entry`) + hasta 4 títulos, personas o artistas enlazados + "y M más"
(→ perfil del autor). El `FeedEntryGroup` lleva `tier: 2 | 3 | 4` para que el render
distinga el grupo de señal de opinión (tier 2, verbo de álbumes) del de presencia cotidiana
(tier 3, verbo de canciones) del de ambiente (tier 4, seguir usuario/seguir artista). Una
racha de ratings de canción (tier 3) y ratings de álbum (tier 2) **no se fusionan** aunque
sean consecutivas — ni una racha de "seguir usuario" con una de "seguir artista" (mismo
tier 4, distinto `kind`). Toda entrada tier 1 (comentario, reseña, nota de escucha, evento
de lista) corta la corrida. Corre en el cliente sobre el array acumulado, así que también
colapsa a través de un "Cargar más".

### Pico de rotación (`add-feed-rotation-peak`)

Cuando una corrida colapsada de **escuchas sin nota es toda del mismo objetivo**, y ese
objetivo acumula suficientes registros en los **últimos 7 días**, la fila plegada se
presenta como un **pico de rotación** —`autor · En rotación · N registros esta semana`, con
el título enlazado debajo— en vez de la fila genérica "registró N escuchas" con la lista de
títulos (todos iguales). `groupFeedRuns` recibe un `now` (el `useNow()` estable del
componente) y, tras aislar la corrida, emite un `FeedRotationPeak` si:

- el objetivo común es una **canción** con **≥ 3** registros en ventana, o
- el objetivo común es un **álbum** con **≥ 2** registros en ventana — un pico de álbum
  puede formarse a partir de una corrida de solo 2 entradas, por debajo del mínimo de
  plegado genérico (repetir un disco completo dos veces en una semana ya es la señal).

Un objetivo **artista** nunca produce pico (demasiado grueso para "en rotación", igual
criterio que `profile-in-rotation`). El pico respeta las mismas reglas de corte que una
corrida (tier 1, otro objetivo u otro autor la cortan) y solo lee entradas consecutivas de
la página cargada — puede *subestimar* la rotación real. Tono cultural: sin fuego, sin
"racha", sin "¡N veces!"; la única métrica es la cuenta de la semana.

Es el hermano a **7 días** de la sección **"En rotación" del perfil** (`profile-in-rotation`,
30 días): la del perfil es el cálculo fiel de ventana sobre todo el diario; la del feed es
la lectura en contexto de una racha evidente en el flujo de actividad. Mismo vocabulario,
distinta escala.

### Barrido de álbum: agrupación por tipo no contigua (`add-feed-album-sweep`, rediseñado en `widen-feed-album-grouping`)

Valorar (o escuchar y valorar) varias canciones del mismo álbum en poco tiempo generaba
hasta una fila por canción — y si el flujo alternaba escucha/valoración canción por canción,
la agrupación por tipo ni siquiera podía colapsarlas (exige el mismo `kind` en toda la
corrida). Una primera versión (`add-feed-album-sweep`) probó sintetizar todo el tramo en una
única fila "Álbum completo · N canciones", con un umbral combinado entre valoración y
favorito — verificado en uso real, resultó frágil (el umbral cruzado casi nunca se alcanzaba)
y menos informativo que las filas de grupo por tipo que el feed ya usa en todos lados.
`widen-feed-album-grouping` lo reemplazó: en vez de una fila nueva, **extiende la agrupación
por tipo ya existente** (`FeedEntryGroup`/`GroupRow`) para que tolere entradas no contiguas
dentro de un mismo álbum.

`groupFeedRuns` acota primero el **tramo de álbum**: la corrida más larga de escuchas,
favoritos y/o valoraciones consecutivas del mismo autor sobre canciones del **mismo álbum**,
con el `kind` alternando libremente. `albumWindowRows` reparte ese tramo en **hasta un grupo
por tipo** (rating/favorite/listen), y cada bucket que alcanza `GROUP_MIN` (3) se pliega con
la misma fila de grupo genérica que ya existe: "valoró N canciones", "marcó N favoritos",
"registró N escuchas" — sin mención al álbum ni enlace a su página, la agrupación genérica
nunca lo tuvo. Los buckets son independientes: una canción favoriteada Y valorada participa
en ambos grupos por separado, sin un umbral cruzado entre tipos. Un bucket de escuchas que
resulte ser todo del mismo tema sigue evaluándose primero como pico de rotación, mismo
criterio de precedencia que fuera de un tramo de álbum. Un favorito de paso (agregado y
quitado) queda como su propia entrada suelta sin quitarle al grupo de valoraciones la chance
de alcanzar su umbral — el problema concreto que motivó el rediseño.

El álbum de una canción se resuelve vía su edición ingerida (`track` → `release` →
`release_group`, `RECORDING_ALBUM_ID_SQL`/`RECORDING_ALBUM_TITLE_SQL` en `feed.ts`, mismo
patrón que `PRIMARY_ARTIST_SQL`) — lo pueblan las fuentes `listen`, `rating` y `favorite` de
`listFeed`; comentarios y reseñas no alimentan el tramo.

## Convergencia de la red (`add-network-convergence`)

Un **panel "En tu red esta semana"** en la cabecera de `/me/feed`, encima del listado
cronológico (`NetworkConvergence.tsx`, Server Component, colapsa si vacío): hasta 5 obras
con las que **≥ 3 personas distintas de la red del lector** se relacionaron en los últimos
**7 días**. Es la capa **"relevante"** —en qué coincide la red— distinta de la capa
**"social"** (el listado cronológico) y del **pico de rotación** (el propio comportamiento
del lector).

- **Interacción** = entrada de diario, valoración, reseña o favorito de un seguido con
  relación aceptada, sobre un `release-group` **o** un `recording` (nunca artista, sin
  roll-up canción→álbum). Los cuatro tipos cuentan **por igual** en Fase 1 (ponderar
  reseña > registro se difiere, D9). El umbral cuenta **personas distintas**, no
  interacciones: 5 escuchas de una persona no mueven nada.
- **Visibilidad** idéntica al feed: audiencia `followers`/`public` para escucha/favorito,
  rating y reseña públicos implícitos, bloqueo en cualquier dirección excluye a la persona.
  La actividad del **propio lector no cuenta**.
- **Síntesis única**: una fila por obra —carátula, título enlazado, artista, hasta 3
  nombres + "y N más", y la cifra "{N} personas que seguís"—. Nunca una fila por persona ni
  un desglose de quién escuchó / valoró / reseñó. Tono cultural: sin "tendencia", sin
  fuego, sin insignia de número, sin ranking global.
- **Aditivo**: las entradas individuales que alimentan una convergencia siguen apareciendo
  en el listado cronológico de abajo con su presentación por tier. Suprimirlas o colapsarlas
  es una refinación posterior (`add-network-convergence`, OQ2).
- **Cálculo**: `getNetworkConvergence(viewerId)` (`src/services/feed/convergence.ts`),
  `cache()` por request, sin tabla materializada, sin endpoint ni fetcher (mismo criterio
  que `taste-fingerprint` / `profile-in-rotation`). Una sentencia SQL: `UNION ALL` de las
  cuatro fuentes filtradas por seguidos visibles + ventana → `GROUP BY release_group_id,
  recording_id HAVING COUNT(DISTINCT user_id) >= 3` → catálogo + `json_agg` de la muestra
  de nombres. Umbrales y ventana como constantes con nombre.

### Las cuatro naturalezas de actividad

| Naturaleza | Pregunta | Dónde vive |
|---|---|---|
| **Personal** | ¿Qué hice yo? | diario (`/me/diary`), rastro reciente y "En rotación" del perfil — sin filtro de audiencia para uno mismo |
| **Social** | ¿Qué hizo cada persona que sigo, en orden? | listado cronológico de `/me/feed` y su preview de Inicio |
| **Relevante** | ¿En qué coincide mi red ahora? | panel de convergencia en la cabecera de `/me/feed` |
| **Automática** | Derivada sin acción explícita | franja "También en tu red" al pie de `/me/feed` (tier 4: colección) — "seguir usuario" y "seguir artista" pasaron a la capa **Social** (`add-feed-kind-differentiation`, `add-artist-follow-feed-entry`) |

## Franja de eventos ambiente (`add-feed-ambient-events`; ajustada en `add-feed-kind-differentiation` y `add-artist-follow-feed-entry`)

El tratamiento "minimizado" del **tier 4** para las fuentes que no tienen fila propia en el
feed principal: una franja compacta **"También en tu red"** al **pie de `/me/feed`**, debajo
del listado cronológico (`FeedAmbientStrip.tsx`, Server Component, colapsa si vacío).
Posición de coda —encabezado chico, texto `font-data` muted, sin carátula—: la actividad
ambiente se alcanza tras el feed, no compite por la atención.

- **Una única fuente**, dentro de una ventana de **14 días** (es escasa): `collection_entry`.
  **Ni "seguir a un usuario" ni "seguir a un artista" son fuente de este cálculo** — desde
  `add-feed-kind-differentiation` y `add-artist-follow-feed-entry` respectivamente, ambas
  tienen su propia fila tier 4 inline en la línea de tiempo principal (ver "Feed — ocho
  fuentes" más arriba), retiradas de acá para no mostrar el mismo hecho dos veces en la
  misma página.
- **Agrupación por autor**: una persona que agregó 5 discos a su colección produce **una**
  línea ("Ana sumó a su colección: Rumours, Tusk y 3 más"), no 5. Cada grupo lleva hasta 3
  ítems enlazados + "y N más", ordenados por fecha desc. Máximo 8 grupos, ordenados por el
  ítem más reciente.
- **Visibilidad**: `collection_entry` con audiencia propia (`followers`/`public`), seguido
  con relación aceptada + sin bloqueo con el autor; la actividad del **propio lector nunca
  aparece**.
- **Cálculo**: `getFeedAmbientEvents(viewerId)` (`src/services/feed/ambient.ts`), `cache()`
  por request, una consulta con el query builder (no SQL crudo), agrupada en memoria. Sin
  tabla materializada, sin endpoint, sin fetcher. Constantes con nombre
  (`AMBIENT_WINDOW_DAYS`, `AMBIENT_SAMPLE`, `AMBIENT_MAX_GROUPS`).
- **Independiente del listado cronológico**: la composición, paginación y filtros de
  `/api/me/feed` no cambian por esta franja — sigue siendo una superficie aparte, ahora
  acotada a la única fuente que de verdad no tiene fila propia en el feed principal.

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

## Superficie pública `/activity` (`add-community-activity-surface`)

Vitrina pública de actividad de la comunidad, enlazada desde la barra general del Header
junto a Buscador · Explorar · Listas · Registrar. Accesible con y sin sesión.

Sin sesión, la página muestra una única sección sin pestañas:

- **Recientes** — ratings vigentes, comentarios y **reseñas de álbum** de cualquier usuario
  con perfil `public`, sin requerir seguimiento, en orden cronológico paginado. Sin
  recomendación ni señal de popularidad fabricada.

Con sesión, se suman dos fuentes más y las tres pasan a mostrarse como pestañas
(`ActivityTabs`) en vez de apiladas verticalmente — con las tres secciones completas una
debajo de otra, la página se volvía demasiado vertical para llegar a la última:

- **De la gente que seguís** — es **el mismo `listFeed`** que alimenta `/me/feed` (las ocho
  fuentes, misma presentación con `FeedActivityList`, `variant="feed"`), sin filtros propios.
- **Tu actividad** — es **el mismo `listMyRecentActivity`** que alimenta "Tu rastro
  reciente" de Inicio (`FeedActivityList` con `variant="self"`).

Cada pestaña es una `CommunityActivitySection` independiente con su propia paginación
(`useInfiniteQuery`); solo se monta la pestaña activa, y el caché de React Query evita
volver a pedir la página 1 al regresar a una pestaña ya visitada. Si una pestaña no tiene
contenido (p. ej. un usuario que no sigue a nadie todavía) muestra un mensaje corto en vez de
desaparecer — a diferencia de la versión sin pestañas, acá ocultar la pestaña sería más
disruptivo que un panel vacío. La página entera solo cae al `EmptyState` global cuando
ninguna de las fuentes disponibles tiene contenido.

El servicio que alimenta "Recientes" —`listCommunityActivity` (antes en
`src/services/home/home.ts`, solo ratings + comentarios, sin paginar)— se generalizó a
`src/services/activity/community-activity.ts`: suma reseñas y pagina de verdad
(`page`/`pageSize`/`hasNext`) con el mismo criterio de "fusión en memoria por fuente" que ya
usa `listFeed` (`pageSize + 1` por fuente, sin offset propio, merge + sort + slice — se
degrada en páginas profundas con volumen alto, aceptado igual que en `listFeed`). El bloque
compacto de Inicio (`CommunityActivity`, `AnonymousHome`/`AuthenticatedHome`) pasa a
consumir esta versión pidiendo una sola página chica; su composición visual no cambia, salvo
que ahora también puede mostrar una reseña reciente.

`GET /api/activity/recent` (público) alimenta la sección "Recientes"; "De la gente que
seguís" reusa `GET /api/me/feed` y "Tu actividad" reusa `GET /api/me/recent-activity`, ambos
sin cambios en su contrato.

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