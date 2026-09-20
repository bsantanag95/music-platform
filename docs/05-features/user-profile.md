# Perfil de usuario

**Fase 5 · cambio `rework-user-profile` · Estado: 🟢 implementado**

El perfil vive en la ruta canónica `/users/{username}` para **todos**, incluido el dueño —
no hay una ruta de perfil separada para uno mismo. Es el centro de la experiencia social:
identidad, retrato de gusto, curaduría y actividad de una persona, más el panel desde el que
el dueño gestiona sus áreas. Reorganizado en `openspec/changes/rework-user-profile/` alrededor
de una jerarquía de profundidad; la dirección visual original sigue en
`openspec/changes/redesign-user-profile/`.

## Tres niveles de profundidad

Pregunta guía del rediseño: *si alguien descubre el perfil de una persona que no conoce,
¿puede entender rápidamente quién es musicalmente y, a la vez, sentir curiosidad por seguir
explorando?* Este es un eje distinto (y ortogonal) del de acceso de abajo: todo visitante con
acceso al perfil recorre los mismos tres niveles de profundidad, cada uno con menos gente
llegando que el anterior.

| Nivel | Responde | Tiempo | Contenido |
|---|---|---|---|
| **1 — Identidad** | ¿Quién es, musicalmente? | Segundos | Placa + **Tarjeta de Identidad** (artista, álbum y canción definitorios) + resumen cualitativo de la huella de gusto |
| **2 — Exploración** | ¿Qué más hay para ver? | Minutos | Álbumes favoritos, destacados generales, valoraciones destacadas, reseñas, en rotación, afinidad, estantes (diario/favoritos/listas/colección) |
| **3 — Inmersión** | Quiero el detalle completo | Bajo demanda | Huella de gusto completa (`/users/{username}/fingerprint`), cada estante en su propia vista |

Los niveles 1 y 2 son la misma página (`page.tsx`), compuesta de arriba hacia abajo en ese
orden, con el mismo árbol para dueño y visitante (solo cambian los editores inline). El nivel
3 son enlaces explícitos al final (`ProfileLevel3Links`), sin duplicar contenido — anclas a
los estantes ya visibles más el enlace real a la huella completa.

## Tres niveles de acceso

La página se compone desde un único árbol, con tres niveles determinados por la relación del
visitante:

| Nivel | Quién | Qué ve |
|---|---|---|
| **No autorizado** | Anónimo, sin relación aceptada, o solicitud pendiente sobre un perfil privado | Una sola tarjeta (`PrivateProfileCard`): identidad extendida + estado exacto del visitante + una acción. Nada más. Ver "Perfil privado". |
| **Autorizado** | Cuenta pública, o seguidor aprobado de una privada | Identidad + Tarjeta de Identidad + resumen de huella + álbumes favoritos + destacados + valoraciones destacadas + reseñas + en rotación + huella completa (nivel 3) + afinidad + estantes (diario / favoritos / listas / colección) + recencia. |
| **Dueño** | La persona | Lo mismo que "autorizado" + modo edición ("Editar perfil": lápiz por bloque y panel lateral con los editores de identidad/enlaces/álbumes favoritos/destacados/marcador "me define"/himno) + acción de destacar valoraciones y entradas de diario + tarjeta de Ajustes + previsualizador "cómo te ven". Ver "Gestión del propio perfil". |

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

## Diseño de la Placa

`Placa.tsx` es la identidad de un perfil **accesible** (público, seguidor aprobado o dueño),
siempre en la barra lateral: una card con borde (`border-ink-border` / `bg-ink-surface`,
`rounded-lg`), no un bloque suelto — la identidad (`ProfileIdentity`: monograma **circular**,
mismo lenguaje que la Tarjeta de Identidad y el hover card, contadores de seguidores/seguidos
como **pills** con borde redondeado, alta, bio y enlaces) y, separado por un divisor, el clúster
de acciones (botón Seguir + bloqueo/moderación). Elegido entre 4 mockups estáticos ("Opción B:
Tarjeta contenida") comparados con un refresco mínimo sin card, una versión centrada tipo carta
de identidad, y contadores como bloques de estadística en vez de pills. Antes tenía además una
variante `full` para la vista de perfil privado; esa vista ahora tiene su propia tarjeta y la
variante se eliminó.

## Perfil privado

Lo que ve quien no tiene acceso. Antes eran dos tarjetas apiladas (la Placa + el aviso "Este
perfil es privado") sobre una pantalla vacía, con el botón de seguir repetido. Elegido entre 3
mockups ("Opción A: una sola tarjeta"; se descartaron una página de dos columnas con estantes
fantasma y una carta centrada mínima):

- **`PrivateProfileCard`**: una sola tarjeta. Arriba la identidad extendida
  (`ProfileIdentity`, compartida con la Placa) con un chip de candado "Privado"; debajo de un
  divisor, el estado del visitante, "Se abre al seguir" (los 4 estantes como huecos con candado,
  **sin cifras de contenido** — mostrarían actividad de una cuenta privada) y **una** acción.
  Mantiene el disco de vinilo como marca de agua. La identidad extendida sigue siendo visible
  por decisión de producto (bio, enlaces, contadores: dan razones reales para seguir).
- **Los contadores no son enlaces** en esta vista: los listados de conexiones de un perfil
  privado solo mostraban "es privado" (callejón sin salida).
- **Estados** (`privateState`): anónimo (Iniciar sesión para seguir + Crear cuenta), sin relación
  (**"Solicitar seguir"** — `FollowButton requestApproval` — con aviso de que hay que esperar la
  aprobación), solicitud enviada (Cancelar solicitud), te envió una solicitud (mensaje propio +
  Aprobar/Rechazar, sin vitrina de estantes), bloqueaste a la cuenta (**Desbloquear** como acción
  principal, ya no dice "Seguí a…"), te bloqueó y "cómo te ven" (dueño; acción inerte).
- **Te bloqueó**: solo nombre y usuario — sin pronombres, contadores, bio, enlaces ni acciones
  (`minimal`). Antes se mostraba la identidad completa a quien había sido bloqueado. Es una
  decisión de presentación: `GET /api/users/[username]` no devuelve esos campos de todas
  formas (solo la relación).
- **"Cómo te ven" con perfil privado** (bug corregido): la rama privada no montaba `ViewAsBanner`,
  así que un dueño con perfil privado que probaba "Ver cómo te ven" quedaba sin botón para
  volver a su vista. Ahora el banner se monta cuando `previewing`.
- **También la ven los bloqueados de un perfil público**: `getProfileByUsername` marca
  `accessible: false` para la relación `blocked`, así que quien bloqueó (o fue bloqueado por) una
  cuenta pública cae en esta misma tarjeta, con los estados "bloqueaste"/"te bloqueó" (por eso
  el mensaje de "bloqueaste" no habla solo de "pedir seguir").
- **Refresco**: `FollowButton refreshOnAnyChange` y `BlockButton refreshOnChange` refrescan la
  página tras cualquier cambio de relación/bloqueo, porque el mensaje del servidor depende del
  estado exacto y sin refresco quedaba desactualizado junto al botón nuevo. Se conservan Bloquear
  y las acciones de moderación en una fila discreta al pie de la tarjeta.

## Seguidores en común y listados de conexiones

Dos capacidades agregadas sobre la Placa (no formaban parte del rediseño original,
decisión de producto posterior — ver memoria `profile-redesign`, actualización
2026-09-17 "seguidores en común y listados de conexiones"):

**Seguidores en común** (`MutualFollowersRow.tsx`, debajo de la bio en la Placa): "Fulano
y otros N siguen a este usuario", con el monograma del primer seguidor en común. Mismo
criterio que ya usaba el aviso de perfil privado (`mutualFollowersHint`): cuentas que el
**visitante** sigue y que **también siguen al dueño** del perfil — no "personas que
siguen a ambos" (ese es un conjunto distinto, ver más abajo). Solo se muestra con sesión
iniciada, en perfil ajeno accesible, y si el total es mayor a 0 — `getMutualFollowersPreview`
(`src/services/profiles/affinity.ts`) resuelve el primer usuario + el total server-side,
sin round-trip extra. El número es clickeable y abre un modal (`role="dialog"`, portal,
Escape, bloqueo de scroll — mismo patrón que `ConfirmDialog`) con el listado completo,
cargado bajo demanda vía `GET /api/users/[username]/mutual-followers`.

**Listados de conexiones** (`/users/{username}/connections/{following|followers|mutual}`,
estilo Letterboxd): los contadores "Seguidores"/"Siguiendo" de la Placa ahora son enlaces.
Antes de esto **no existía ninguna página que mostrara el listado de seguidores/seguidos de
un perfil ajeno** — solo `/me/followers`/`/me/following` (autogestión, `UserList.tsx`, con
acciones de mutar la propia relación). Decisión de acceso (consultada con el usuario, sin
precedente en los specs): el listado se rige por **la misma regla que el resto del
perfil** — visible si `profile.accessible` (público, o privado con seguidor aprobado/dueño),
oculto si no (mismo criterio en las 3 pestañas). Reutiliza `listFollowers`/`listFollowing`
(ya existían, genéricos por `userId`, sin cambios) — la novedad es exponerlos a un visitante
en vez de solo al propio dueño. Cada fila usa `UserCard` (búsqueda de usuarios) con la
relación del **visitante** hacia esa persona listada (`relationsFor`), no la relación hacia
el dueño del perfil — permite seguir directamente desde el listado.

La tercera pestaña, "Seguidos en común", muestra **dos listados separados** (decisión
explícita del usuario: "ambas" ante la pregunta de cuál de las dos nociones de "en común"
debía llevar) porque son conjuntos distintos:
- `listMutualFollowing(viewerId, ownerId)`: cuentas que **ambos** siguen (intersección
  simétrica de los dos "seguidos").
- `listMutualFollowers(viewerId, ownerId)`: el mismo cálculo que la fila de la Placa
  (cuentas que el visitante sigue, que también siguen al dueño), con paginación.

Sin sesión, o viendo el propio perfil, la pestaña no aparece en la navegación
(`ProfileConnectionsHeader`) y la página muestra un aviso en vez de listar nada — no hay
concepto de "en común" sin dos personas distintas y un visitante identificado.

Solo se pagina hasta 50 resultados (página 1), sin controles de paginación en la UI —
mismo límite que ya tenían `/me/followers`/`/me/following`; no se construyó "cargar más"
para esta primera versión.

**Unificado con la autogestión** (2026-09-17, segunda iteración): `/me/followers` y
`/me/following` se eliminaron — el menú de usuario (`user-menu-items.ts`, ambas superficies,
header, panel móvil y pantalla Red de ajustes) apunta directo a `/users/:username/connections/{followers,following}`.
Cuando el visitante es el propio dueño, `ConnectionsUserList` suma la acción "Quitar
seguidor" (solo en la pestaña Seguidores) junto al `FollowButton` normal — "dejar de
seguir" en Seguidos no necesita caso especial: la relación del dueño hacia cada persona de
su propia lista de seguidos ya es "following" por definición, así que el `FollowButton`
existente la resuelve sola. `UserList.tsx` (con sus acciones de mutación) se redujo a
"requests"/"blocks", únicas variantes sin equivalente de solo-lectura.

## Tarjeta de Identidad

Primer bloque del Nivel 1, justo bajo la Placa (`IdentityCard.tsx`): hasta **3 elementos
definitorios** — un artista, un álbum y una canción (el himno). Reemplaza al antiguo bloque
único de "Himno": tres decisiones conscientes en vez de una sola.

- **Diseño circular (revisión 2026-09-17, "Opción A" de los mockups comparados con el
  usuario)**: carátula/foto circular por elemento (mismo tratamiento que los avatares de
  "Exploración"), etiqueta de rol corta arriba (Artista/Álbum/Himno,
  `identityCard.artistLabel`/`albumLabel`/`showcase.anthemHeading` — distintas de las
  etiquetas largas del editor, "Artista que me define" etc., pensadas para un campo de
  formulario, no para repetirse bajo un círculo chico) y título centrado debajo, sin
  contenedor propio (sin borde ni tira con hairlines, a diferencia del diseño anterior) para
  no competir visualmente con el resto del perfil. Circular vía `CoverThumb`/`DiscPlaceholder`
  + `rounded-full` en el `className` del caller — el "rounded" propio de esos componentes
  queda sobrescrito por el orden de utilidades de Tailwind, mismo patrón ya probado en
  `ExploreSection`.

- **Artista y álbum definitorios son referencias directas en `user_showcase`**
  (`defining_artist_id`, `defining_release_group_id`), mismo criterio que ya usaba
  `anthem_recording_id`: cualquier entidad válida del catálogo, sin requerir que sea además
  un destacado o un álbum favorito. Exclusividad por tipo trivial (una sola columna nullable
  por usuario) — marcar uno nuevo desmarca automáticamente el anterior del mismo tipo.
  **Revisión de diseño**: la primera versión guardaba esto como un booleano sobre los
  Destacados (`user_pinned_item.is_defining`), lo que dejaba "Álbumes favoritos" sin ninguna
  vía para marcar un álbum definitorio salvo duplicándolo como destacado aparte — el gap que
  motivó moverlo a una referencia directa (migración 0030).
- **Editor unificado de la Tarjeta** (`OwnerIdentityCardEditor`; hoy se abre desde el lápiz de la
  Tarjeta en el modo edición y desde `/me/settings/profile`, antes vivía arriba de la card de
  editores apilados): los 3
  slots juntos, cada uno con su propio selector sobre los favoritos del dueño (artista, álbum,
  canción) y una acción "Quitar". **Revisión de diseño (2026-09-17)**: antes de este editor,
  el artista y la canción se marcaban desde "Destacados"/"Himno" y el álbum solo desde
  "Álbumes favoritos" — una sección aparte, sin relación visual con las otras dos — lo que
  hacía que completar el álbum de la Tarjeta de Identidad no fuera descubrible. Los
  marcadores ★/☆ de `OwnerShowcaseEditor` (Destacados, solo artista/álbum) y
  `OwnerAlbumFavoritesEditor` (Álbumes favoritos) siguen funcionando igual — son atajos
  adicionales sobre la misma entidad ya visible en esas listas, no reemplazados por el editor
  unificado. Los tres llaman al mismo endpoint (`PUT/DELETE /api/me/profile/pinned/defining`
  con `{type, id}` del artista o álbum, no de una fila de destacado; el himno usa
  `PUT/DELETE /api/me/profile/anthem`). Un destacado o álbum favorito recién agregado en el
  borrador (sin guardar todavía) ya puede marcarse: el marcador no depende de que la entidad
  tenga una fila propia guardada en el servidor.
- **Una canción nunca puede ser "definitoria"** de esta forma — el slot de canción de la
  Tarjeta de Identidad es, exclusivamente, el **Himno** (`user_showcase.anthem_recording_id`),
  elegido a mano, nunca derivado de actividad.
- **Composición incompleta, nunca con huecos.** Si falta un elemento, ese slot simplemente no
  se renderiza — no hay placeholders vacíos ni "todavía sin definir". Si los tres faltan, la
  Tarjeta de Identidad entera desaparece.
- Un destacado o álbum favorito marcado como definitorio **desaparece de su muro general**
  (`PinnedShowcase` excluye por coincidencia de tipo+id con la Tarjeta de Identidad, no por un
  campo propio de la fila) para no mostrar la misma entidad dos veces en la página.

### Vista rápida al pasar el cursor (hover card)

Añadido 2026-09-17: pasar el cursor (o enfocar por teclado) un username en cualquier lugar
que enlace a un perfil muestra un popover — mockeado en 2 rondas con el usuario antes de
escribir código (misma dinámica que la Tarjeta de Identidad: HTML estático servido con
`python -m http.server`, `SendUserFile`, el usuario elige).

**Contenido — "Nivel 2" de 3 opciones comparadas** (estilo Twitter, pero acotado): monograma +
nombre/@username + botón Seguir (`FollowButton` real, misma lógica que `Placa`) + una línea de
bio, línea divisoria, y la Tarjeta de Identidad compacta (círculos, "Opción A") debajo. Se
descartaron los contadores de seguidores/seguidos y "miembro desde" (Nivel 3 de los mockups)
por competir visualmente con la Tarjeta de Identidad, que es el contenido protagonista del
popover.

- **Endpoint público**: `GET /api/users/[username]/identity-card-preview`
  (`getIdentityCardPreview`, `src/services/profiles/identity-preview.ts`) — devuelve `id`,
  `username`, `displayName`, `bio`, `relation` (`FollowRelation`) y `viewerAuthenticated`
  siempre (identidad extendida, pública incluso en un perfil privado — mismo criterio que
  `Placa`), más `identityCard` solo si `accessible` es `true` (misma regla que la página de
  perfil, vía `getProfileByUsername().accessible`).
- **La bio se recorta a 2 líneas** (`line-clamp-2`) — el campo admite hasta 200 caracteres
  (spec `social-profiles`) y sin el recorte una bio larga infla el popover.
- **Fetch perezoso con demora de apertura** (300ms) para no disparar una petición por cada
  username que el cursor solo atraviesa de paso; 150ms de gracia al salir para poder mover el
  mouse hacia el popover sin que se cierre. Cache en memoria por username a nivel de módulo
  (vive mientras dure la pestaña) — varios comentarios de la misma persona en una página no
  repiten el fetch. Sin mockear el timing en sí — es una sensación táctil, no algo que se
  compare en una imagen estática.
- Sin librería de posicionamiento: mismo patrón `relative` + `absolute` sin portal que
  `RowMenu.tsx` — suficiente porque el trigger (un username en una lista) no vive cerca de un
  borde con overflow recortado. En mobile/touch no hay hover: el username sigue siendo un
  link normal a `/users/{username}`.
- **Dónde está envuelto** (`<UserHoverCard username={...}>` alrededor del `Link` existente):
  Comentarios (`Comments.tsx`), Reseñas (`Reviews.tsx`) — sus usernames eran texto plano antes
  de este cambio, sin enlace al perfil —, feed de actividad (`CompactActivityRow.tsx`,
  `FeedActivityList.tsx` vía `AuthorLink`, `FeedAmbientStrip.tsx`), autoría de listas
  (`CommunityListCard.tsx`, `DiscoverListsTab.tsx`, `SavedListsTab.tsx`,
  `ListDetailHeader.tsx`, `PublicLists.tsx` en Inicio) (el diario del perfil ya no usa `DiaryList.tsx` — ver "Diario" — ese componente se eliminó al quedar sin uso).
  **Deliberadamente afuera**: `UserCard.tsx` y `UserList.tsx` (búsqueda de usuarios,
  seguidores/seguidos/bloqueados) — esas filas ya muestran monograma + nombre + acción social
  en línea, sin nada oculto que un hover revele, y agregar el botón Seguir del popover
  encima del botón contextual de la fila (dejar de seguir, aprobar, etc.) sería redundante;
  paneles de admin/moderación (`ModerationConsole.tsx`, `EditorialConsole.tsx`) — herramienta
  interna, no vista social. También quedó afuera el link "+N más" de una fila agrupada de
  feed (`FeedActivityList.tsx`, `targetLink` para `kind: "follow"`) y los nombres de
  `NetworkConvergence.tsx`: ambos viven dentro de un `<p>` sin refactorizar y el primero
  además no muestra el username como texto visible (dice "y 3 más").
- **Gotcha real encontrado en producción**: el popover renderiza un `<div role="tooltip">` —
  envolverlo dentro de un `<p>` existente (el byline de Comentarios/Reseñas, o `meta` de
  `ListCard.tsx`) rompe el HTML ("`<div>` cannot be a descendant of `<p>`", hydration
  warning; el navegador autocierra el `<p>`). `ListCard.tsx`, `Comments.tsx` y `Reviews.tsx`
  pasaron ese contenedor de `<p>` a `<div>` — mismas clases, sin cambio visual. Si se agrega
  el hover card a un lugar nuevo, revisar que el ancestro inmediato no sea un `<p>`.
- **Segundo gotcha real, mismo componente**: la fila de 3 slots (`flex gap-3`, cada slot
  `flex-1`) con títulos largos ("Still Got the Blues") se desbordaba del popover, y después
  de un primer fix seguía "chocando" con las columnas vecinas. Dos bugs de flexbox
  encadenados, mismo síntoma: (1) el `<Link>` de cada slot necesita `min-w-0` él mismo (no
  alcanza con ponerlo en un descendiente) para poder encogerse por debajo del ancho de su
  texto `truncate`; (2) como ese `<Link>` es `flex-col items-center` (alineación por
  contenido, no `stretch`), el `<span>` que envuelve el título necesita además `w-full`
  explícito — si no, se dimensiona por su propio contenido sin importar cuánto se haya
  encogido el `<Link>` padre, y `truncate` no tiene ancho real contra el cual recortar.
  Verificado con `getBoundingClientRect()` vía `javascript_tool` (los screenshots del Browser
  pane no siempre renderizan en esta sesión) — las 3 columnas quedan en 77px exactas, sin
  overlap. Al armar cualquier fila de columnas de ancho igual con texto truncado, revisar
  ambos: `min-w-0` en el flex item + `w-full` en el descendiente con `truncate` si el
  contenedor no usa `items-stretch`.

## Favoritos (muro general)

El **muro de favoritos** (`favorite`, todos los tipos: artista/álbum/canción, la señal
"marqué esto como favorito" de todo el catálogo — no confundir con "Álbumes favoritos" de
abajo, que es una selección curada aparte con FK a `favorite`) tiene, desde 2026-09-18,
tope en el Nivel 2 y una vista completa aparte (mismo procedimiento de mockups que el resto
de las piezas del perfil — ver memoria `profile-redesign`; antes no había tope: el muro
completo, con sus 3 modos de vista y "cargar más" infinito, vivía embebido sin límite en el
flujo del perfil — se veía bien con pocos favoritos, pero con 100 habría sido scroll
interminable antes de llegar al resto de la página).

- **Previsualización (`FavoritesPreview.tsx`)**: hasta **5 favoritos recientes de cada
  tipo** (Artistas/Álbumes/Canciones), cada sección con su conteo real. Mismo criterio
  visual que ya usan "En rotación" y "Álbumes favoritos" en esta misma página — elegido
  explícitamente por el usuario entre 3 mockups: álbumes en grilla de carátulas, **canciones
  como lista de filas** (no grilla — un disco genérico repetido 5 veces no distingue nada
  entre canciones distintas), artistas en grilla de placas tipográficas.
  `getFavoritesPreview` (`src/services/favorites/favorites.ts`) hace **3 consultas en
  paralelo, una por tipo** — no una sola consulta con `limit` sobre la lista mezclada: el
  orden de esa lista es artista → álbum → canción (`TYPE_RANK_EXPR`), así que un tipo con
  pocos favoritos quedaría sin representación si otro tipo anterior ya agotó el límite antes
  de llegar a él.
- **Vista completa (`/users/[username]/favorites`)**: el muro de siempre
  (`FavoritesWall` en modo `readOnly`), que antes vivía embebido en el perfil — ahora en su
  propia ruta, con sus 3 modos de vista intactos (Detallada/Índice/Gráfico). Distinta de
  `/me/favorites`: esa sigue siendo la vista de **gestión** del propio dueño (selección
  múltiple, cambiar audiencia en lote) — no se puede reusar tal cual para ver los favoritos
  de un tercero sin exponerle controles que no le corresponden.
  `ProfileLevel3Links`'s "Todos los favoritos" pasó de ser un ancla en la misma página
  (`#favoritos`) a un link real a esta ruta nueva.
- **El encabezado de conteos y el buscador/filtros SÍ se muestran en modo lectura**
  (pedido explícito del usuario tras ver la vista completa: "exactamente lo mismo que
  `/me/favorites`") — a diferencia del modo selección/cambio de audiencia en lote, que sigue
  oculto (es una acción de mutación, no tiene sentido sobre los favoritos de otra persona).
  `listUserFavorites` ganó soporte de filtros (`q`/`type`/`audience`/`sort`), igual que
  `listMyFavorites`, con una diferencia deliberada: si se pide un `audience` al que el
  visitante no tiene acceso (p. ej. "privado" en el perfil de otra persona), el resultado es
  vacío — el filtro nunca puede ampliar lo que `audiencesForProfile` ya permite, se
  intersecta con lo permitido en vez de reemplazarlo. `GET /api/users/[username]/favorites`
  ahora parsea y reenvía esos mismos filtros (antes solo aceptaba `page`/`pageSize`).
- El conteo del encabezado (`ProfileRail count`) ahora es el **total real** entre los 3
  tipos (`counts.artist + counts["release-group"] + counts.recording`) — antes mostraba
  `initial.favorites.length`, la cantidad de la primera página fetcheada (tope 20), no el
  total real.

## Álbumes favoritos

Hasta **6 álbumes** que definen a esta persona, en una rejilla de carátulas + título +
artista, con enlace al álbum. Es una **declaración, no un ranking** — sin números de posición
ni estrellas (cambio `redesign-profile-album-identity`).

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
- **Puede marcarse "me define" desde acá mismo** (openspec: rework-user-profile,
  `OwnerAlbumFavoritesEditor`), sin duplicar el álbum como destacado — ver "Tarjeta de
  Identidad". El álbum marcado desaparece de esta rejilla mientras sea el definitorio
  (`AlbumFavorites` excluye por id contra `identityCard.album`), igual criterio que los
  Destacados.

## Destacados

**Cuatro destacados** (`user_pinned_item`, patrón triple-FK como `rating`): hasta 4 entidades
fijadas, tipos mezclados, nota opcional (≤120). Se resuelven al leer, omitiendo las que el
catálogo ya no tiene.

- **Excluyen lo que ya vive en la Tarjeta de Identidad.** Un destacado cuya entidad coincide
  con el artista o álbum definitorio desaparece de esta lista general — la Tarjeta de
  Identidad es su única superficie, para no mostrar la misma entidad dos veces en la misma
  página (`PinnedShowcase` filtra por coincidencia de tipo+id contra `identityCard`, no por
  un campo propio del destacado — el marcador ya no vive ahí, ver "Tarjeta de Identidad").
- El editor del dueño reordena / quita / anota los destacados **desde sus favoritos** — no
  hay buscador de catálogo embebido (mismo criterio que el detalle de lista, ver la memoria
  `list-detail-scope`).

## Valoraciones destacadas

Excepción curada y explícita a una regla de privacidad por lo demás estricta. La tabla
`rating` **no tiene columna de audiencia propia**: una valoración es visible solo para el
dueño y sus seguidores aprobados, nunca para un desconocido (ver "Huella de gusto"). El dueño
puede, sin embargo, **destacar hasta 6 valoraciones propias** (`rating_highlight`,
spec `rating-highlights`) para que se vuelvan visibles a **cualquier** visitante con acceso al
perfil, sin importar la relación de seguimiento.

- **Curaduría consciente, no un cambio de la regla general.** Solo lo que el dueño elige
  explícitamente cruza la barrera de privacidad; el resto de sus valoraciones sigue
  invisible para quien no lo sigue.
- **Se activa desde la propia valoración**, en la página de artista/álbum/canción
  (`DualRating.tsx`), no desde el perfil — un botón junto a "Borrar" que alterna
  "Destacar en el perfil" / "Quitar de destacadas".
- `getProfileRatingHighlights` **no filtra por audiencia**: estar en `rating_highlight` ya es
  la señal de "quiero que esto se vea". Sí sigue gateado por accesibilidad del perfil
  (bloqueo, perfil privado sin relación) — un perfil inaccesible no expone nada, ni siquiera
  esto.
- Tarjeta: carátula + título + artista + el mismo medidor visual de valoración que usa el
  feed (`FeedRatingMeter`). Tope de 6, paridad con Álbumes favoritos (sin relación funcional
  entre ambos).

## Reseñas

La postura crítica de la persona sobre las obras — el acto más expresivo del producto
(Principio 4 de `product_philosophy.md`). Se muestra en los niveles autorizado y dueño
(cambio `add-profile-featured-reviews`, `src/services/profiles/reviews.ts`).

- **Automática, no curada.** Se muestran las **últimas 4** reseñas de álbum del dueño
  ordenadas por fecha de última edición. No hay editor de "fijar reseñas": sumar un mecanismo
  de fijado más (además de álbumes favoritos, destacados, himno y valoraciones destacadas) es
  el riesgo que D10 pide evitar. Si hay más reseñas, "y N más" — sin enlace dedicado.
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
escuchando esta persona últimamente. Se muestra en los niveles autorizado y dueño (cambio
`add-profile-in-rotation`, `src/services/profiles/in-rotation.ts`).

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

## Huella de gusto

Retrato de gusto calculado bajo demanda (`src/services/profiles/stats.ts`, envuelto en
`cache()` por request), filtrado por lo que el visitante puede ver. Se expone en dos
profundidades distintas:

- **Niveles 1–2 (esta página): resumen cualitativo.** Hasta **3 frases** derivadas de los
  mismos datos ya calculados — década dominante, género dominante, patrón de calificación —
  sin gráficos ni cifras (`FingerprintSummary.tsx`). **Nunca expone el promedio numérico de
  estrellas**, solo una lectura cualitativa ("es un calificador exigente", no "3.2★ de
  promedio"). Queda vacío, sin renderizarse, si no hay datos suficientes.
- **Nivel 3 (`/users/{username}/fingerprint`): el detalle completo.**
  - **Curva de valoraciones** — distribución por estrellas (0,5–5). Las valoraciones **no
    tienen audiencia propia**, así que solo son visibles para el dueño y seguidores
    aprobados; un visitante público no ve la curva (ver "Valoraciones destacadas" para la
    única excepción, puntual y curada).
  - **Cresta de décadas** — la década de la edición más temprana de cada álbum de la
    actividad visible. Degrada a vacío si no hay fechas.
  - **Cresta de géneros** — top de `release_group_tag`. Esta tabla se **siembra** con
    `scripts/seed-release-group-tags.ts` hasta que exista ingesta real de tags desde
    MusicBrainz (cambio posterior); mientras tanto el componente muestra "sin datos de
    género todavía" cuando no hay filas.
  - **Reparto** — conteos por tipo: artistas/álbumes/canciones valorados, colección física,
    listas visibles.
  - La huella expone un equivalente textual (`<table>`/`<ul>` `sr-only`) — su información no
    depende del gráfico ni del color. Es la única superficie donde el ámbar se usa con
    generosidad (excepción sancionada a la Regla de Rareza de `DESIGN.md`).

## Exploración

Los **artistas que el dueño sigue** (`artist_follow`, cambio `add-artist-following`),
rejilla de foto/monograma + nombre con enlace a cada artista. Se muestra en los niveles
autorizado y dueño; no aparece si el dueño no sigue a ningún artista.

- **Seguir artista ≠ favorito de artista.** Seguir es intención de seguimiento (contexto de
  perfil, afinidad, descubrimiento futuro); el favorito de artista es gusto declarado
  (aparece en la huella y en "favoritos en común"). El modelo los mantiene separados.
- **Sin control de audiencia:** `artist_follow` no tiene audiencia — es información de bajo
  riesgo, del mismo tenor que la lista de seguidos de usuario.
- **Insignia "tú también"** — con sesión iniciada, un artista que también sigue el visitante
  lleva una insignia puntual (sin conteo agregado ni "3 en común"), alimentada por
  `getProfileAffinity`. Ausente para el propio dueño o sin sesión.
- El dueño gestiona sus artistas seguidos en `/me/artists` (buscador + orden + modo de
  vista, `FollowedArtistList`) — autogestión, no sirve para ver la lista de un tercero.
- **Tope de 8 celdas (2×4), con "+N" como link a la lista completa** (2026-09-17, elegida
  entre 4 mockups — antes no había tope visual: se pedían hasta 12 y se mostraban todos sin
  aviso de que hubiera más). Si el dueño sigue más de 8 artistas, la 8ª celda deja de ser un
  artista y pasa a ser el link "+N" (7 artistas + 1 celda de link, nunca 9 celdas) hacia
  `/users/{username}/artists` — vista de solo lectura nueva, paginada a 50 sin controles
  (mismo límite que el resto de listados de este estilo), distinta de `/me/artists`.
  `listProfileFollowedArtists` (`src/services/profiles/exploration.ts`) pasó a devolver
  `{ artists, totalCount, page, pageSize, hasNext }` en vez de un array simple, para poder
  calcular el "+N" exacto. La celda de artista (avatar + punto de recorrido + insignia "tú
  también") se extrajo a `ArtistTile.tsx`, reutilizada por ambas vistas.
  El evento "seguir artista" en el feed llega con `rework-feed-tiers`.

## Afinidad

Al ver el perfil de otra persona con sesión iniciada, un bloque de coincidencias
(`src/services/profiles/affinity.ts`, envuelto en `cache()` por request): favoritos en común,
entidades que ambos puntúan con 4+ estrellas (solo si el visitante puede ver las valoraciones
del dueño), **artistas que ambos siguen**, y seguidores en común. Se oculta sin sesión, para
el propio dueño, ante bloqueo, o si no hay ninguna coincidencia. El hint de seguidores en
común aparece también en el aviso de perfil privado, y los artistas en común alimentan además
la insignia "tú también" de Exploración.

## Diario

Igual que Exploración y Favoritos, el diario del perfil dejó de mostrar todo sin tope (antes
`DiaryRail` embebía el listado completo, con un "Cargar más" ilimitado, directo en el flujo
del Nivel 2). Elegido entre mockups (dos rondas — ver memoria `profile-redesign`):

- **Estante con caja de scroll interno** (`DiaryReadList.tsx`, `scrollable`): altura fija
  (`max-h-[21rem]`), scroll adentro de la caja, "Cargar más" al final de la caja. Región
  enfocable por teclado (`role="region"` + `tabindex=0`, para poder scrollearla sin mouse).
- **Filas compactas al estilo de `/me/diary`** en vez de las cards con borde de antes: sin
  caja por entrada (solo una línea fina entre filas), carátula chica, título · artista en
  una línea, nota como cita con borde izquierdo (`ProsePanel`, con `clamp`). Sin las acciones
  de gestión (lápiz, menú "···", audiencia). Fecha corta a la derecha junto al ícono de
  reacción, en lista plana — se descartaron el bloque de día + encabezados de mes de
  `/me/diary` (el scroll interno ya da orientación con la fecha en cada fila) y la variante
  de una sola línea sin carátula (dejaba de parecerse a `/me/diary`).
- **"Ver diario completo"** → `/users/[username]/diary`: mismas filas, fluyendo con la página
  (sin caja), de solo lectura, con el mismo criterio de acceso que el resto del perfil.
  Distinta de `/me/diary` (gestión del propio dueño: buscador, filtros, edición, borrado).
  Sin filtros por ahora — es una lista cronológica con "Cargar más". El enlace de Nivel 3
  "Diario completo" también apunta acá (antes era un ancla `#diario`).
- **Bug real corregido de paso**: el "Cargar más" anterior no le pasaba `loadMore` a
  `DiaryList`, que por defecto usaba `getMyDiary` — en el perfil de OTRA persona habría
  traído las entradas del visitante (o un 401 sin sesión), no las del dueño del perfil.
  `DiaryReadList` pide siempre `getUserDiary(username, …)`.
- El conteo del encabezado (`ProfileRail count`) es ahora el **total real** visible
  (`listUserDiary` devuelve `totalCount`, una consulta `count(*)` con el mismo filtro de
  audiencia/destacados), no `entries.length` de la primera página fetcheada.

## Listas

Igual que Exploración, Favoritos y Diario, el estante de listas dejó de apilar todas las
tarjetas hacia abajo (antes `ListsList` mostraba la grilla completa con un "Cargar más"
ilimitado en el flujo del Nivel 2). Elegido entre mockups (opción A de tres, con "fijadas
primero"):

- **Riel horizontal** (`ListsCarousel.tsx` sobre `HorizontalRail.tsx`): las **tarjetas de
  lista de siempre** (mosaico + tipo · conteo + descripción + Guardar/Seguir), sin
  rediseñarlas, ahora deslizándose. Flechas ‹ › montadas sobre los bordes, degradado de
  desvanecido y scroll suave — la misma mecánica que "Lanzamientos recientes y próximos" del
  Inicio (`ReleaseRail`), extraída sin su línea de tiempo. Las flechas aparecen solo si hay
  overflow; la lista es enfocable por teclado; con `prefers-reduced-motion` el desplazamiento
  es un salto.
- **Tope de 10** (`LISTS_PREVIEW_LIMIT`). Si hay más, el riel cierra con una **tarjeta-puerta
  "+N · Ver las N listas"** (borde punteado, como el "+N" de Exploración) hacia la página
  dedicada. Con 10 o menos no hay puerta.
- **Fijadas primero**: las listas que el dueño fijó (`user_list_pin`, hasta ahora solo visible
  para él en `/me/lists`) van al frente con la marca "Fijada", el resto por fecha de
  creación. Es la vitrina del dueño: con el tope, sin esto sus mejores listas podían quedar
  fuera del riel. Solo cuentan las listas que el visitante puede ver (la audiencia sigue
  filtrando); una lista fijada pero privada nunca aparece.
- **`/users/[username]/lists`** (nueva, de solo lectura): conteo, buscador + tipo + orden
  (los mismos de `/me/lists`, vía `ListsToolbar`/`useListFilters` compartidos), grilla de dos
  columnas con las mismas tarjetas y "Cargar más". Sin "Nueva lista", Fijar, Editar,
  Eliminar ni audiencia. Distinta de `/me/lists` (gestión del propio dueño). Mismo criterio
  de acceso que el resto del perfil (`profile.accessible` + matriz de audiencia). El enlace
  de Nivel 3 "Listas" apunta acá (antes era el ancla `#listas`).
- **`listUserLists` devuelve `totalCount`** (`count(*)` en paralelo, mismo filtro de
  audiencia/tipo/búsqueda) y acepta `{ q, entityType, sort }`; la ruta
  `/api/users/[username]/lists` los parsea con `parseListFilters` (`src/lib/api/list-filters.ts`,
  compartido con `/api/me/lists`). El conteo del encabezado del estante es el total real, no
  `lists.length` (que se topaba en el tamaño de página).

## Colección

La colección del perfil (copias físicas: vinilo, CD, cassette, otro) siguió agrupada por
artista con sus tres modos de visualización (Estantería / Lista detallada / Índice) — el
diseño se mantuvo tal cual, solo se acotó lo que muestra el Nivel 2. Antes `CollectionRail`
embebía `CollectionShelf` con un "Cargar más" ilimitado, y el agrupado por artista se hacía en
el cliente sobre una página plana de 20 copias (un tope por artista no se puede aplicar ahí).
Elegido entre mockups (tres criterios de qué artistas mostrar):

- **Tope de 5 artistas × 4 copias por artista** (`COLLECTION_PREVIEW_ARTISTS` /
  `COLLECTION_PREVIEW_PER_ARTIST`, `services/collection/types.ts`): 4 es una fila completa de
  la grilla de 4 columnas de la Estantería, así que máximo 20 copias en el perfil.
- **Los artistas de los que más copias tiene** (opción B): ranking por cantidad de copias,
  desempata por actividad más reciente y luego por nombre (corte estable). Se descartaron
  "más recientes primero" y "alfabético" (el orden anterior: con el corte mostraría siempre a
  los de la "A"). Dentro de cada artista, lo último agregado primero.
- **`getCollectionPreview(username, viewerId)`** devuelve `{ artists: [{ name, total, entries }],
  totalEntries, totalArtists }`, con los totales reales. Una consulta de ranking sobre una
  tabla derivada (`artist_name` por copia) + una consulta de copias por artista + un lote para
  resolver los artistas. Mismo filtro de audiencia que `listProfileCollection`. El artista es
  el principal acreditado (mismo criterio que el buscador y el orden); las copias de álbumes
  sin artista forman el grupo "Sin artista".
- **`CollectionPreview`** (client): renderiza los grupos con los mismos `ShelfGrid` /
  `EntriesDetailed` / `EntriesIndex` (solo lectura). Cada artista muestra su **total real** y,
  si hay más copias de las que se ven, **"Ver los N"** en el encabezado
  (`CollectionGroupHeading`, compartido por los tres modos) hacia
  `/users/[username]/collection?q=<artista>`. Al pie, **"Ver toda la colección (N)"**. Sin
  enlace ni botón cuando se ve todo. El conteo del encabezado del estante es el total real de
  copias (antes `entries.length` de la primera página).
- **`/users/[username]/collection`** (nueva, de solo lectura): `CollectionShelf` en modo
  `readOnly`, que ahora muestra los mismos conteos por formato, buscador y filtros (formato,
  atributo, agrupar, ordenar) que `/me/collection` y el conmutador de modo, sin
  edición/selección/audiencia. Los filtros viajan en la URL (`parseCollectionFilters`; un valor
  inválido se ignora en vez de romper una página enlazada desde afuera), que es lo que usa el
  "Ver los N" de cada artista. Distinta de `/me/collection` (gestión del dueño + lista de
  deseados). El enlace de Nivel 3 "Colección completa" apunta acá (antes ancla `#coleccion`).
  Nota: `q` busca por texto parcial, así que "Queen" también trae "Queens of the Stone Age".
- **Latentes de `readOnly` corregidos** en `CollectionShelf` (mismo patrón que `FavoritesWall`):
  la carga inicial se daba siempre por sembrada, la query key no llevaba los filtros y el vacío
  ignoraba si había filtros activos.

## Estantes y recencia

Diario, favoritos, listas y colección se muestran con los componentes de lectura existentes
(`readOnly`), bajo un encabezado uniforme (`ProfileRail`: título + conteo, con ancla propia
para los enlaces de Nivel 3). **Un estante sin contenido visible no se renderiza** para un
visitante; el dueño ve el estante vacío para poder agregar. Una línea "última señal hace…"
resume la actividad visible más reciente.

- **Una entrada de diario puede destacarse** (`listen_entry_highlight`, spec `listen-diary`
  "Destacar una entrada del diario"), tope de 6 por usuario, acción disponible desde el menú
  "···" de `/me/diary`. Una entrada destacada **anula la matriz de visibilidad** para esa
  fila puntual: se vuelve visible más allá de su audiencia normal, sin modificar la entrada
  en sí. El bloqueo entre usuarios sigue ocultando todo igual — el destacado nunca lo
  atraviesa.
- Cada sección de contenido carga bajo su propio `<Suspense>`, así que nada bloquea la Placa
  (la cabecera de identidad).

## Gestión del propio perfil (modo edición y ajustes)

Dos vías complementarias sobre **los mismos editores** (`Owner*Editor`), decididas en
`rework-owner-management`. Hacer clic en el propio username lleva al perfil, no a una pantalla de
gestión; el dueño ve el mismo perfil que un visitante hasta que activa el modo edición.

### Edición rápida sobre el perfil (modo edición)

- **`OwnerProfileBar`** — barra superior del perfil, solo para el dueño real (`isOwn` y no
  previsualización): chip de estado "Perfil público/privado · Ajustes →" (enlaza a
  `/me/settings/privacy`, no cambia nada por sí mismo), el acceso a "Ver cómo te ven" y el
  interruptor **"Editar perfil"** (`role="switch"`). El estado es local (`useState`) y no persiste
  al navegar.
- **`OwnerEditProvider`** (cliente) guarda `editing` y renderiza **una sola vez** el panel lateral.
  **`EditableBlock`** envuelve cada bloque con editor: Placa (identidad + enlaces en un mismo
  panel), Tarjeta de Identidad, Destacados/Himno y Álbumes favoritos. Con `editing` muestra un
  lápiz ("Editar {bloque}") que abre el editor en el panel. Los bloques sin editor propio (listas
  fijadas, valoraciones y diario destacados, el resto de estantes) no llevan lápiz: se fijan donde
  viven. Un bloque **vacío** (que hoy colapsa) muestra un marco solo en modo edición, para poder
  añadir el primer elemento; sin modo edición el perfil sigue idéntico al de un visitante.
- **`EditorPanel`** — diálogo modal (portal, `role="dialog"`, foco atrapado y devuelto al lápiz,
  `Escape`, clic en el fondo, bloqueo de scroll); panel lateral desde `md`, hoja inferior por
  debajo. **No añade su propio "Guardar"**: cada editor ya tiene el suyo o aplica al instante. Al
  cerrar tras haber guardado algo hace `router.refresh()`; con cambios sin guardar pide confirmar el
  descarte (`ConfirmDialog`).
- **Contrato editor ↔ anfitrión** (`editor-host.ts`): los editores llegan como elementos ya
  construidos por el servidor, así que no se les inyectan props; reportan al anfitrión por
  **contexto** (`EditorHostContext`). El estado "sucio" se identifica **por editor** (la Placa aloja
  dos) y cada editor conserva una **línea base** que se actualiza al guardar (antes `dirty` se
  comparaba contra `initial` y un editor ya guardado seguía "sucio"). Las props opcionales
  `onSaved`/`onDirtyChange` siguen disponibles para un anfitrión directo.
- **`OwnerSettingsCard`** — en la barra lateral, un único enlace a `/me/settings` con la bandeja de
  solicitudes pendientes (bandeja de entrada, no métrica). Sustituye al panel de 11 atajos
  (`OwnerHubPanel`, retirado): la biblioteca (diario, favoritos, listas, colección, artistas,
  recorridos, feed) queda solo en el menú de usuario.
- **`?preview=1`** — el dueño recompone su perfil tal como lo ve un visitante anónimo
  (`getProfileView(username, null)`), sin proveedor de edición, barra ni tarjeta de Ajustes, y con
  `ViewAsBanner` para volver. Es navegación por query param, sin estado cliente.

### Área de ajustes (`/me/settings`)

Layout compartido (`layout.tsx`) con menú lateral (pestañas horizontales bajo `md`) y el aviso de
email sin verificar en **todas** las pantallas (así `email-verification` no cambia); `/me/settings`
redirige a `/me/settings/profile`. Cada pantalla vuelve a exigir sesión.

| Pantalla | Contenido |
|---|---|
| `profile` | Tarjeta de Identidad, identidad (bio, pronombres, ubicación, zona horaria) y enlaces — los mismos editores que abre el modo edición |
| `curation` | Filas con conteo: Destacados, Himno y Álbumes favoritos (abren su editor en el panel lateral); listas fijadas, valoraciones destacadas y diario destacado (solo conteo y enlace/pista a donde se fijan; las valoraciones se destacan desde la valoración de cada álbum o canción). `getCurationSummary` aporta esos tres conteos |
| `privacy` | Visibilidad público/privado y **audiencia por defecto del contenido nuevo** |
| `network` | Enlaces a solicitudes (con bandeja), seguidores, seguidos y bloqueadas, desde la superficie `settings` de `user-menu-items.ts` (la superficie `panel` sigue existiendo: la usa el panel móvil del Header) |
| `account` | Nombre visible (`displayName`, ≤50, vacío = se muestra el username), método de acceso en solo lectura (contraseña / proveedores, nunca el hash) y "Cerrar todas las sesiones" (`DELETE /api/auth/revoke-all`, con confirmación y redirección a login) |

Cuenta y seguridad no ofrece controles de funciones inexistentes (cambiar email, usuario o
contraseña con sesión, foto de perfil, eliminar cuenta).

### Audiencia por defecto del contenido nuevo

`app_user.default_audience` (nullable, migración 0034). Es un **valor por defecto**, no una regla
global: cada favorito, entrada de diario, lista o copia de colección sigue siendo editable por
separado y **nada existente cambia**. `NULL` = "según el tipo", porque los defaults por tipo no son
uniformes (favoritos `public`, listas y colección `followers`, diario `private`); un default único
degradaría favoritos o el diario. Precedencia al crear (`resolveNewContentAudience`): valor
explícito de la petición > preferencia > default del tipo. Se resuelve en el servidor y solo cuando
la petición no trae audiencia.

Alcance: **no** cubre las reseñas ni los comentarios — no tienen audiencia propia y son públicos en
la página del álbum o la canción, por lo que la sección "Reseñas" del perfil se muestra igual con
cualquier preferencia (el control lo aclara). Tampoco se aplica a lo que crea el sistema
(recorridos de artista `private`, borradores editoriales, favoritos sembrados por el onboarding).

## Sin gamificación

Ninguna vista incluye rachas, elementos pendientes de valorar, medallas de completitud ni
porcentajes de progreso. El reparto de la huella y los conteos de los estantes se presentan
como retrato, no como avance hacia una meta. "En rotación" tampoco muestra su score ni
cuántas veces se escuchó algo — es "qué está sonando", no una métrica.

## Modelo de datos

| Tabla / columna | Qué |
|---|---|
| `app_user.{bio, pronouns, location, timezone, avatar_url}` | Identidad extendida (migración 0014) |
| `app_user.display_name` | Nombre visible; editable desde `/me/settings/account` (≤50, vacío = `NULL`, el sitio muestra el username) |
| `app_user.default_audience` | Audiencia por defecto del contenido nuevo (nullable, `CHECK`, migración 0034). `NULL` = "según el tipo". Nunca reescribe contenido existente |
| `user_profile_link` | Enlaces externos ordenados, máx. 5 app-side |
| `listen_entry` (lectura) | Fuente única de "En rotación" — escuchas de canción/álbum de los últimos 30 días, filtradas por audiencia. Sin tabla ni columna nueva |
| `listen_entry_highlight` | Hasta 6 entradas de diario destacadas por usuario; anulan la matriz de visibilidad solo para esa entrada (migración 0029) |
| `review` + `rating` (lectura) | Sección "Reseñas" — hasta 4 reseñas de álbum del dueño con su rating asociado, orden por `updated_at`. Sin tabla ni columna nueva |
| `rating_highlight` | Hasta 6 valoraciones destacadas por usuario, visibles sin filtro de audiencia (migración 0029) |
| `artist_follow` | Sección "Exploración" — artistas que el dueño sigue; también alimenta la afinidad y la insignia "tú también" (migración 0021, sin `status`) |
| `user_pinned_item` | Cuatro destacados, triple-FK nullable + CHECK `num_nonnulls = 1` |
| `user_showcase` | Una fila por usuario; `anthem_recording_id` (`ON DELETE SET NULL`, la canción de la Tarjeta de Identidad); `defining_artist_id`/`defining_release_group_id` (`ON DELETE SET NULL`, el artista/álbum definitorios — migración 0030, revisa el `is_defining` sobre `user_pinned_item` de 0029) |
| `user_album_pin` | Hasta 6 álbumes favoritos; FK a `favorite` (`ON DELETE CASCADE`), `position` 1–6 única por usuario (migración 0019) |
| `favorite.audience` (default) | `public` para favoritos nuevos (antes `followers`); cambio a nivel de aplicación, no de columna — no retroactivo sobre filas existentes |
| `release_group_tag` | Tags de género por álbum, sembrados |
| `idx_rating_user` | Índice para la curva de valoraciones (migración 0015) |
