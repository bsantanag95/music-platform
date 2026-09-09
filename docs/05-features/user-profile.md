# Perfil de usuario

**Fase 5 · cambio `redesign-user-profile` · Estado: 🟡 implementado (revisión visual pendiente)**

El perfil vive en la ruta canónica `/users/{username}` para **todos**, incluido el dueño —
no hay una ruta de perfil separada para uno mismo. Es el centro de la experiencia social:
identidad, retrato de gusto, curaduría y actividad de una persona, más el panel desde el que
el dueño gestiona sus áreas. Dirección de diseño en la sesión `impeccable`/`shape` previa y
en `openspec/changes/redesign-user-profile/`.

## Tres niveles de acceso

La página se compone desde un único árbol, con tres niveles determinados por la relación del
visitante:

| Nivel | Quién | Qué ve |
|---|---|---|
| **No autorizado** | Anónimo, sin relación aceptada, o solicitud pendiente sobre un perfil privado | Identidad extendida + aviso de perfil privado + CTA de seguir. Nada más. |
| **Autorizado** | Cuenta pública, o seguidor aprobado de una privada | Identidad + huella de gusto + álbumes favoritos + destacados + himno + afinidad + estantes (diario / favoritos / listas / colección) + recencia. |
| **Dueño** | La persona | Lo mismo que "autorizado" + editores inline de identidad/enlaces/álbumes favoritos/destacados/himno + panel de gestión + previsualizador "cómo te ven". |

Un perfil **privado** solo expone su huella, álbumes favoritos, destacados y estantes a
seguidores aprobados y al dueño; un visitante no autorizado ve únicamente la identidad
extendida.

## Identidad

Además de nombre visible y username, `app_user` guarda (todo opcional): **bio** (≤200),
**pronombres** (≤40), **ubicación** (≤80), **zona horaria** (≤64) y **avatar_url** (reservado,
sin lectura en UI — la identidad visual es el monograma determinista por username).

Los **enlaces externos** viven en `user_profile_link` (máx. 5, orden explícito): `kind` de un
conjunto cerrado (`website`, `bandcamp`, `lastfm`, `discogs`, `instagram`, `youtube`,
`soundcloud`, `other`) + URL `http(s)` (≤400).

**La vista privada expone bio, enlaces y contadores de seguidores/seguidos** — se consideró
que no es información lo bastante sensible como para ocultarla, y da razones reales para
seguir. Solo las actividades y los listados sociales quedan ocultos.

## Huella de gusto

Retrato de gusto calculado bajo demanda (`src/services/profiles/stats.ts`, envuelto en
`cache()` por request), filtrado por lo que el visitante puede ver:

- **Curva de valoraciones** — distribución por estrellas (0,5–5). Las valoraciones **no
  tienen audiencia propia**, así que —igual que en el feed— solo son visibles para el dueño
  y seguidores aprobados. Un visitante público no ve la curva.
- **Cresta de décadas** — la década de la edición más temprana de cada álbum de la actividad
  visible. Degrada a vacío si no hay fechas.
- **Cresta de géneros** — top de `release_group_tag`. Esta tabla se **siembra** con
  `scripts/seed-release-group-tags.ts` hasta que exista ingesta real de tags desde
  MusicBrainz (cambio posterior); mientras tanto el componente muestra "sin datos de género
  todavía" cuando no hay filas.
- **Reparto** — conteos por tipo: artistas/álbumes/canciones valorados, colección física,
  listas visibles.

La huella expone un equivalente textual (`<table>`/`<ul>` `sr-only`) — su información no
depende del gráfico ni del color. Es la única superficie donde el ámbar se usa con
generosidad (excepción sancionada a la Regla de Rareza de `DESIGN.md`).

## Álbumes favoritos

La cabeza del bloque de identidad cultural, arriba de los destacados mixtos: hasta **6
álbumes** que definen a esta persona, en una rejilla de carátulas + título + artista, con
enlace al álbum. Es una **declaración, no un ranking** — sin números de posición ni
estrellas (cambio `redesign-profile-album-identity`).

- **Fijar un álbum favorito es fijar un `favorite`.** `user_album_pin.favorite_id` tiene FK
  a `favorite` con `ON DELETE CASCADE`: `favorite` sigue siendo la única fuente de verdad y
  quitar el favorito lo desfija en cascada, sin código extra.
- **Se eligen desde los favoritos de álbum del propio dueño** — igual que el editor de
  destacados, no hay buscador de catálogo embebido (memoria `list-detail-scope`). Si el
  dueño no tiene favoritos de álbum, el editor invita a marcarlos primero.
- **Audiencia:** la sección respeta la audiencia del `favorite` subyacente. Un favorito
  privado fijado solo lo ve el dueño; uno de "seguidores", solo seguidores aprobados y el
  dueño.
- El orden se reescribe completo al guardar (`PUT /api/me/profile/album-favorites`), mismo
  patrón transaccional que los ítems de lista.

## Destacados e himno

- **Cuatro destacados** (`user_pinned_item`, patrón triple-FK como `rating`): hasta 4
  entidades fijadas, tipos mezclados, nota opcional (≤120). Se resuelven al leer, omitiendo
  las que el catálogo ya no tiene.
- **Himno** (`user_showcase.anthem_recording_id`): una canción elegida **manualmente**.
  Nunca se deriva de la última escucha ni de ninguna actividad.

El editor del dueño reordena / quita / anota los destacados y elige el himno **desde sus
favoritos** — no hay buscador de catálogo embebido (mismo criterio que el detalle de lista,
ver la memoria `list-detail-scope`).

## Reseñas

La postura crítica de la persona sobre las obras — el acto más expresivo del producto
(Principio 4 de `product_philosophy.md`). Cierra el clúster de identidad cultural: se ubica
**después de los destacados y antes de "En rotación"** (orden vertical Q7), en los niveles
autorizado y dueño (cambio `add-profile-featured-reviews`,
`src/services/profiles/reviews.ts`).

- **Automática, no curada.** Se muestran las **últimas 4** reseñas de álbum del dueño
  ordenadas por fecha de última edición. No hay editor de "fijar reseñas": sumar un cuarto
  mecanismo de fijado (además de álbumes favoritos, destacados e himno) es el riesgo que
  D10 pide evitar. Si hay más reseñas, "y N más" — sin enlace dedicado.
- **Tarjeta**: carátula + álbum enlazado + artista + el rating que la reseña lleva
  incorporada (`add-album-review`: la reseña siempre lleva rating) + título opcional +
  cuerpo recortado a 4 líneas. El enlace al álbum lleva a la reseña completa y al resto de
  reseñas de esa obra; no hay botón de "ver más" en la tarjeta.
- **Visibilidad por accesibilidad del perfil.** La reseña es contenido público (visible en
  la página del álbum), así que la sección solo se gatea por `profile.accessible` + bloqueo
  — no además por relación de seguimiento como los ratings sueltos. Un perfil privado sin
  relación aceptada no la muestra. Colapsa si el dueño no tiene reseñas.
- Cálculo bajo demanda con `cache()`, sin tabla materializada, sin endpoint (nada cliente
  lo consume). Constantes nombradas (`PROFILE_REVIEWS_MAX`).

## En rotación

La contraparte **viva** de los álbumes favoritos (identidad estable): qué ha estado
escuchando esta persona últimamente. Se ubica entre los destacados y la huella de gusto, en
los niveles autorizado y dueño (cambio `add-profile-in-rotation`,
`src/services/profiles/in-rotation.ts`).

- **Solo desde el diario.** Se deriva exclusivamente de `listen_entry` de los últimos **30
  días**. Nunca de valoraciones, favoritos ni reseñas — una reacción dice "me gusta", no
  "lo estoy escuchando ahora". El módulo no importa esas tablas (test estructural).
- **`señales → score → estado`.** El cálculo es un puntaje sobre eventos crudos de escucha,
  no un umbral hard-codeado: pesos discretos de recencia (`3` a 0–7 d, `2` a 8–21 d, `1` a
  22–30 d), `×2` para un registro explícito de álbum, umbral de aparición `3`, máx `8` por
  bloque. Todos son **constantes nombradas** del servicio, calibrables con datos reales sin
  migración. Cálculo bajo demanda con `cache()`, sin tabla materializada (igual que la
  huella).
- **Canciones = señal primaria; álbumes = agrupación contextual.** Dos bloques; uno vacío
  no se renderiza, ambos vacíos → la sección desaparece.
- **Heurística experimental de álbum en rotación.** El bloque de álbumes se puebla de (a)
  registros explícitos de álbum y (b) un roll-up canción→álbum: cada canción se atribuye a
  su primer release-group de **estudio** (fecha de primer lanzamiento más temprana), y cada
  canción distinta aporta un peso **plano** — repetir una sola pista nunca eleva su álbum.
- **Respeta la audiencia del diario.** Se calcula solo sobre las entradas que el lector
  puede ver; la sección puede quedar distinta para un seguidor y para un visitante público,
  o desaparecer para quien no ve nada.
- **Tono cultural.** Sin score, sin número de escuchas, sin fechas relativas, sin rachas,
  sin numeración. `GET /api/users/[username]/in-rotation` para hidratación diferida y el
  previsualizador "cómo te ven".

## Exploración

Los **artistas que el dueño sigue** (`artist_follow`, cambio `add-artist-following`),
rejilla de foto/monograma + nombre con enlace a cada artista. Se ubica **después de la
huella de gusto y antes de los estantes** (orden vertical Q7). Se muestra en los niveles
autorizado y dueño; no aparece si el dueño no sigue a ningún artista.

- **Seguir artista ≠ favorito de artista.** Seguir es intención de seguimiento (contexto de
  perfil, afinidad, descubrimiento futuro); el favorito de artista es gusto declarado
  (aparece en la huella y en "favoritos en común"). El modelo los mantiene separados.
- **Sin control de audiencia:** `artist_follow` no tiene audiencia — es información de bajo
  riesgo, del mismo tenor que la lista de seguidos de usuario.
- El dueño gestiona sus artistas seguidos en `/me/artists` (enlace en el panel del dueño).
- En Fase 2 la sección muestra hasta 12 artistas sin "ver todos" para visitantes. El evento
  "seguir artista" en el feed llega con `rework-feed-tiers`.

## Afinidad

Al ver el perfil de otra persona con sesión iniciada, un bloque de coincidencias
(`src/services/profiles/affinity.ts`): favoritos en común, entidades que ambos puntúan con
4+ estrellas (solo si el visitante puede ver las valoraciones del dueño), **artistas que
ambos siguen**, y seguidores en común. Se oculta sin sesión, para el propio dueño, ante
bloqueo, o si no hay ninguna coincidencia. El hint de seguidores en común aparece también
en el aviso de perfil privado.

## Estantes y recencia

Diario, favoritos, listas y colección se muestran con los componentes de lectura existentes
(`readOnly`), bajo un encabezado uniforme (`ProfileRail`: título + conteo). **Un estante sin
contenido visible no se renderiza** para un visitante; el dueño ve el estante vacío para
poder agregar. Una línea "última señal hace…" resume la actividad visible más reciente.

Cada sección de contenido carga bajo su propio `<Suspense>`, así que nada bloquea la Placa
(la cabecera de identidad).

## Panel del dueño y "cómo te ven"

- **`OwnerHubPanel`** — enlaza las nueve superficies `/me/*` (diario, favoritos, listas,
  colección, seguidores, seguidos, solicitudes, bloqueos, ajustes). "Solicitudes" muestra un
  badge con el conteo de solicitudes pendientes recibidas cuando es > 0 (bandeja de entrada,
  no métrica de logro).
- **`?preview=1`** — el dueño recompone su perfil tal como lo ve un visitante anónimo
  (`getProfileView(username, null)`), con los editores y el panel ocultos y un banner para
  volver. Es navegación por query param, sin estado cliente.

## Sin gamificación

Ninguna vista incluye rachas, elementos pendientes de valorar, medallas de completitud ni
porcentajes de progreso. El reparto de la huella y los conteos de los estantes se presentan
como retrato, no como avance hacia una meta. "En rotación" tampoco muestra su score ni
cuántas veces se escuchó algo — es "qué está sonando", no una métrica.

## Modelo de datos

| Tabla / columna | Qué |
|---|---|
| `app_user.{bio, pronouns, location, timezone, avatar_url}` | Identidad extendida (migración 0014) |
| `user_profile_link` | Enlaces externos ordenados, máx. 5 app-side |
| `listen_entry` (lectura) | Fuente única de "En rotación" — escuchas de canción/álbum de los últimos 30 días, filtradas por audiencia. Sin tabla ni columna nueva |
| `review` + `rating` (lectura) | Sección "Reseñas" — hasta 4 reseñas de álbum del dueño con su rating asociado, orden por `updated_at`. Sin tabla ni columna nueva |
| `artist_follow` | Sección "Exploración" — artistas que el dueño sigue; también alimenta la afinidad (migración 0021, sin `status`) |
| `user_pinned_item` | Cuatro destacados, triple-FK nullable + CHECK `num_nonnulls = 1` |
| `user_showcase` | Una fila por usuario; `anthem_recording_id` (`ON DELETE SET NULL`) |
| `user_album_pin` | Hasta 6 álbumes favoritos; FK a `favorite` (`ON DELETE CASCADE`), `position` 1–6 única por usuario (migración 0019) |
| `release_group_tag` | Tags de género por álbum, sembrados |
| `idx_rating_user` | Índice para la curva de valoraciones (migración 0015) |
