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
| **2 — Exploración** | ¿Qué más hay para ver? | Minutos | **Empieza por aquí**, valoraciones destacadas, reseñas, en rotación, afinidad, estantes (diario/favoritos/listas/colección) |
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
| **Autorizado** | Cuenta pública, o seguidor aprobado de una privada | Identidad + Tarjeta de Identidad + resumen de huella + Empieza por aquí + valoraciones destacadas + reseñas + en rotación + huella completa (nivel 3) + afinidad + estantes (diario / favoritos / listas / colección) + recencia. |
| **Dueño** | La persona | Lo mismo que "autorizado" + modo edición ("Editar perfil": lápiz por bloque y panel lateral con los editores de identidad/enlaces, de la Tarjeta de Identidad —artista, álbum e himno— y de Empieza por aquí) + acción de destacar valoraciones y entradas de diario + tarjeta de Ajustes + previsualizador "cómo te ven". Ver "Gestión del propio perfil". |

Un perfil **privado** solo expone su huella, Empieza por aquí y estantes a
seguidores aprobados y al dueño; un visitante no autorizado ve únicamente la identidad
extendida.

## Identidad

Además de nombre visible y username, `app_user` guarda (todo opcional): **bio** (≤200),
**pronombres** (≤40), **ubicación** (≤80), **zona horaria** (un identificador IANA de una lista, no
texto libre — ver "Identidad musical") y **avatar_url** (reservado, sin lectura en UI — la identidad
visual es el monograma determinista por username; el avatar irá en una spec de imágenes aparte).

### Enlaces externos

Viven en `user_profile_link` (máx. 5, orden explícito): `kind` de un conjunto cerrado (`bandcamp`,
`lastfm`, `discogs`, `instagram`, `youtube`, `soundcloud`, `x`, `tiktok`, `spotify` y `other`,
mostrado como "Enlace") + URL `http(s)` (≤400). Desde `add-profile-link-validation` el servidor **valida y normaliza
según el tipo** con las reglas de `src/lib/profile-links.ts` (TypeScript puro, las usan el esquema
Zod, el editor y la vista):

- **Tipos por usuario** (todos salvo `other`): la persona escribe su **usuario** (con o
  sin `@`) y el sistema guarda la URL canónica del perfil (`https://www.instagram.com/ana`). Si pega
  el enlace completo **del sitio correcto** se extrae el usuario (con alias como `twitter.com` → X y
  sin parámetros ni fragmento); un enlace de otro sitio, o uno sin usuario (la portada, una
  publicación) se rechaza con un mensaje por fila. Cada sitio tiene sus reglas de usuario y sus
  rutas reservadas. YouTube pide el `@handle` (los enlaces `/channel/…` no lo permiten); Bandcamp es
  un subdominio (`ana.bandcamp.com`); Discogs, Last.fm y Spotify son perfiles de usuario, no páginas
  de artista, sello o playlist.
- **`other` (Enlace)**: la dirección se acepta sin esquema y se guarda con `https://`; se respeta un `http://`
  explícito; se rechazan esquemas no web (`javascript:`, `mailto:`…), valores sin dominio válido y
  con espacios. Un valor `host:puerto` no se confunde con un esquema.
- **Editor** (`OwnerLinksEditor`): campo por tipo con vista previa del enlace resultante y errores
  por fila (con `aria-invalid`/`aria-describedby`); el campo **no es `type="url"`** — la validación
  nativa del navegador rechazaba `www.link.com` sin `https://` con un aviso incomprensible.
- **Enlaces anteriores a la validación** que no coinciden con su tipo (p. ej. un Instagram que
  apuntaba a la portada) **no se migran**: se conservan, el perfil los muestra con el ícono genérico
  y el editor los avisa y bloquea el guardado hasta que se corrijan o se quiten.
- **Vista del perfil**: cada enlace es **el ícono de su sitio, sin texto visible** (`LinkKindIcon`),
  con `aria-label`/`title` "Instagram: @ana" (o el dominio para Enlace) y `rel="noopener
  noreferrer nofollow"`. Los íconos de marca son SVG incrustados de simple-icons (CC0), sin
  dependencia nueva; Enlace es una cadena dibujada a mano.
- Contrato: `PUT /api/me/profile/links` recibe `{ kind, value }` (antes `{ kind, url }`), ver
  `docs/04-api/contracts.md`. La migración `0035` amplía el `CHECK` de `kind` con `x`, `tiktok` y
  `spotify`.
- **"Sitio web" y "Enlace" se unificaron** (eran idénticos salvo la etiqueta y el ícono): la migración
  `0036` pasó las filas `website` a `other` conservando URL y posición; "Enlace" es también el tipo
  por defecto de una fila nueva del editor.
- **No** se comprueba que el usuario exista realmente en el sitio (sin peticiones externas): solo
  que el valor tenga la forma correcta para ese sitio.

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

## Identidad musical (`rework-account-settings`, Fase 2)

Lo que la persona dice de su relación con la música, para dar ganas de visitar un perfil ajeno
sin convertirlo en un panel de métricas. Todo es opcional, vaciable y de **listas cerradas** (claves
estables en `src/lib/music-identity.ts`, nombres en `messages/*/users.json`: agregar un género es
cambiar código, no una migración):

| Campo | Valores | Tope |
|---|---|---|
| **Me defino como** (`self_roles`) | `listener`, `collector`, `musician`, `dj`, `critic`, `radio-host` | 3 |
| **Géneros que me mueven** (`genres`) | 20: `rock`, `punk`, `post-punk`, `indie`, `shoegaze`, `metal`, `hip-hop`, `electronic`, `ambient`, `jazz`, `soul-funk`, `folk`, `blues`, `classical`, `pop`, `latin`, `reggae`, `experimental`, `country`, `bossa-nova` | 5 |
| **Cómo escucho** (`listening_formats`) | `vinyl`, `cd`, `cassette`, `streaming`, `digital` | 5 |
| **Preguntas del perfil** (`user_profile_prompt`) | 8: `first-record`, `sunday-record`, `defended-song`, `guilty-pleasure`, `first-concert`, `desert-island-record`, `sad-day-record`, `road-trip-record` — cada una con su pregunta larga (editor) y una etiqueta corta (Placa) | 3, respuesta de una línea ≤100 |

Los roles describen cómo se relaciona la persona con la música: **no otorgan permisos, insignias
ni métricas**. Las preguntas se guardan como **conjunto completo** (`PUT /api/me/profile/prompts`,
transacción); una pregunta no puede repetirse, la respuesta no admite saltos de línea y la base
impide una cuarta (`position` 0..2 único por usuario).

**Zona horaria y hora local.** La zona pasa de texto libre (que ninguna vista mostraba) a un selector
de zonas IANA (`Intl.supportedValuesOf("timeZone")` + `UTC`, ~420; validación sensible a
mayúsculas en el servidor). Como son tantas, el editor usa **`TimezonePicker`**, un combobox ARIA con
buscador: la lista va **en línea** (no flotante, para que el scroll del panel lateral no la recorte), se
filtra al escribir sin distinguir mayúsculas ni tildes y con `_` y `/` como espacios ("buenos aires"
encuentra `America/Buenos_Aires`; cada palabra debe aparecer, así que "america santiago" acota), pone
primero las zonas cuya ciudad empieza por lo escrito, agrupa por región, anuncia cuántas coinciden y
avisa si no hay ninguna. Flechas/Home/End/Enter/Escape; **Escape cierra solo la lista** —con
`stopImmediatePropagation`: en Next la raíz de React es `document`, el mismo nodo donde escucha el panel,
así que `stopPropagation` no bastaba—. Los nombres son los canónicos del motor (p. ej. Buenos Aires es
`America/Buenos_Aires`, sin `Argentina/`), no los de otras bases de datos. `show_local_time` (por defecto `false`) hace que la Placa
muestre "14:32 hora local" junto a la ubicación; se calcula **al renderizar** en el servidor (una
pista de contexto, no un reloj). Sin zona la opción no significa nada: se apaga sola al vaciar la zona,
el servicio rechaza activarla sin zona y un `CHECK` de la base lo impide. La migración `0040` deja en
`NULL` las zonas previas que no sean una zona real (`pg_timezone_names`).

**Ficha de la Placa (mockup B, "ficha de disco").** `ProfileFicha` (síncrono, recibe `t`) se dibuja
dentro de `Placa`, después de los enlaces y separada por un divisor: un `<dl>` con etiquetas en
tipografía de datos (`Soy`, `Géneros`, `Escucho en` y las etiquetas cortas de las preguntas, con la
pregunta completa de tooltip) y sus valores a la derecha. Cada fila se omite si está vacía y el bloque
—con su divisor— si no hay nada: un perfil sin completar se ve igual que antes.

**Privacidad.** Es identidad de "quién soy", no de "cómo me encuentro": solo la dibuja la Placa de un
perfil **accesible**. `getProfileView` **vacía** roles, géneros, formatos, preguntas y hora local para
quien no tiene acceso a un perfil privado (además de que `PrivateProfileCard` no los dibuja), de modo que
ni siquiera viajan en el HTML de producción — verificado contra un build de producción con un perfil
privado sembrado. (En **desarrollo**, React incluye en el payload información de depuración con filas
crudas de las consultas; es solo de dev y no existe en producción.)

**Edición.** Los editores (`OwnerMusicIdentityEditor` con chips y contador sobre el máximo,
`OwnerPromptsEditor`, y `OwnerIdentityEditor` con el selector de zona y "mostrar mi hora local")
se montan en la pantalla **Perfil** de Ajustes y en el panel lateral de la Placa del modo edición —el
mismo panel que ya alojaba identidad y enlaces—, con el contrato `editor-host` de siempre. Endpoints:
`PUT /api/me/profile/music-identity`, `PUT` y `DELETE /api/me/profile/prompts` y
`PATCH /api/me/profile` (`timezone`, `showLocalTime`); ver `docs/04-api/contracts.md`.

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
- **Editor único de la Tarjeta** (`OwnerIdentityCardEditor`; se abre desde el lápiz de la Tarjeta
  en el modo edición y desde `/me/settings/profile`): los 3 slots juntos, cada uno con su propio
  selector sobre los favoritos del dueño (artista, álbum, canción; ver "Selector de favoritos con
  buscador") y una acción "Quitar". Es el
  **único** lugar donde se eligen: el cambio `simplify-profile-curation` (2026-09-21) retiró los
  marcadores ★/☆ de los editores de Destacados y de Álbumes favoritos, y la sección "Himno" que
  vivía dentro del editor de Destacados — eran atajos sobre el mismo dato y el ítem marcado
  desaparecía del muro, lo que sorprendía. Los tres llaman a los mismos endpoints
  (`PUT/DELETE /api/me/profile/pinned/defining` con `{type, id}` del artista o álbum; el himno usa
  `PUT/DELETE /api/me/profile/anthem`).
- **Una canción nunca puede ser "definitoria"** de esta forma — el slot de canción de la
  Tarjeta de Identidad es, exclusivamente, el **Himno** (`user_showcase.anthem_recording_id`),
  elegido a mano, nunca derivado de actividad.
- **Composición incompleta, nunca con huecos.** Si falta un elemento, ese slot simplemente no
  se renderiza — no hay placeholders vacíos ni "todavía sin definir". Si los tres faltan, la
  Tarjeta de Identidad entera desaparece.
- **No se excluye nada entre secciones.** Fijar un ítem en "Empieza por aquí" y definir la
  identidad son decisiones independientes: si el mismo álbum está en ambos sitios, se muestra en
  ambos (antes `PinnedShowcase` ocultaba lo que coincidía con la Tarjeta).

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

## Empieza por aquí (antes «Destacados»)

Hasta **4 recomendaciones** dirigidas a quien visita el perfil (`user_pinned_item`, patrón
triple-FK como `rating`): entidades de tipos mezclados (artista, álbum o canción), con orden y una
**nota** opcional (≤120). Se resuelven al leer, omitiendo las que el catálogo ya no tiene. Es lo
único que ninguna otra sección ofrece: la voz del dueño sobre algo que quiere que el visitante
conozca. Distinta de Favoritos ("lo que amo") y de la Tarjeta de Identidad ("lo que me define").

- **Presentación (`PinnedShowcase`, variante B de los mockups, cambio `simplify-profile-curation`):**
  un ítem por fila, sin cajas, separados por hairlines; miniatura de 88 px (64 px en móvil), etiqueta
  de tipo (mono, `text-petrol`), título, artista y, si la hay, la **nota completa como cita**
  (`font-body` cursiva con filete ámbar de 2 px, sin recorte). Los artistas usan `ArtistPlate` y las
  canciones el `CoverThumb` de respaldo (disco de vinilo). Todo el ítem enlaza a la entidad. Solo el
  encabezado, sin subtítulo. Sin ítems, la sección colapsa (el dueño la ve enmarcada en modo edición).
- **La nota es opcional.** Hacerla obligatoria invalidaría los destacados que ya existían sin
  nota; un ítem sin nota se dibuja igual, sin línea vacía. El editor (`OwnerShowcaseEditor`) la pone
  en primer plano: campo con la etiqueta "¿Por qué empezar por aquí?", contador `n/120` y los saltos
  de línea aplanados a un espacio.
- El editor del dueño reordena / quita / anota los ítems **desde sus favoritos**, con un buscador
  chico (ver "Selector de favoritos con buscador") — no hay buscador de catálogo embebido (mismo
  criterio que el detalle de lista, ver la memoria `list-detail-scope`). Un único `PUT /api/me/profile/pinned` reemplaza el conjunto. Ya no aloja el himno ni marcadores
  "me define": eso vive solo en el editor de la Tarjeta de Identidad.
- **Sin audiencia propia** (a diferencia de los favoritos): un ítem es visible para cualquiera con
  acceso al perfil, y la API no exige que la entidad sea un favorito.

**Historia (2026-09-21).** La sección se llamaba "Destacados" y convivía con "Álbumes favoritos"
(hasta 6 pines *sobre `favorite`* con orden manual, tabla `user_album_pin`, migración `0019`). Ese
segundo muro repetía las carátulas de la fila de álbumes de Favoritos, así que se **retiró** con
la migración `0038` (`DROP TABLE user_album_pin`): se perdió solo el orden manual, los `favorite` de
álbum y su audiencia no cambiaron. Onboarding, "Aplicar a lo existente" y la pantalla Curaduría
dejaron de mencionarlo.

### Selector de favoritos con buscador

`FavoritePicker` (`src/components/profiles/FavoritePicker.tsx`) es el desplegable "elegir de mis
favoritos" que comparten el editor de la Tarjeta de Identidad (uno por slot, limitado a su tipo) y
el de "Empieza por aquí" (todos los tipos). Sigue siendo una elección **entre favoritos**, no una
búsqueda de catálogo: el buscador solo ayuda a encontrar uno cuando hay muchos.

- **Consulta al abrir, no al montar** (el editor de la Tarjeta tiene tres selectores y no debe traer
  tres listas al cargar). Pide `GET /api/me/favorites?pageSize=50` (más `type` si aplica); si hay más
  de 50, avisa "Mostrando los primeros 50" para invitar a buscar.
- **El filtro lo hace el servidor** (`q`, sin distinguir mayúsculas, sobre el título del favorito —el
  nombre en artistas— **o el nombre del artista principal acreditado** de álbumes y canciones: buscar
  "sabrina" en el slot de álbum trae sus álbumes, y en el de canción sus canciones; cambio
  `improve-favorites-picker`), con debounce de 300 ms; vaciar el buscador
  vuelve a pedir la lista sin `q` al instante. Una respuesta vieja que llega tarde se descarta
  (`runId`).
- No ofrece lo ya elegido (`excludeIds`: el slot actual de la Tarjeta, o los ítems ya fijados).
- **Legibilidad:** el editor de la Tarjeta apila un slot por fila (en tres columnas el panel lateral
  dejaba ~9 rem por slot y los títulos se cortaban a tres letras), con "Quitar" junto al elemento
  elegido y el título en hasta dos líneas; el selector usa texto de lectura (`text-sm`/`text-xs`) y
  miniaturas de 40 px.
- Estados: buscando, sin coincidencias («Ningún favorito coincide con «…»»), sin favoritos elegibles
  (el aviso propio de cada editor) y error localizado.

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
  de fijado más (además de Empieza por aquí, la Tarjeta de Identidad y las valoraciones destacadas) es
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

La contraparte **viva** de la Tarjeta de Identidad y de Empieza por aquí (identidad estable): qué ha estado
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
  panel), Tarjeta de Identidad y Empieza por aquí. Con `editing` muestra un
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
| `profile` | Tarjeta de Identidad, identidad (bio, pronombres, ubicación, zona horaria y hora local), **identidad musical** (roles, géneros, formatos), **preguntas del perfil** y enlaces — los mismos editores que abre el modo edición |
| `curation` | Filas con conteo: Empieza por aquí (abre su editor en el panel lateral; el himno se elige desde la Tarjeta de Identidad, en `profile`); listas fijadas, valoraciones destacadas y diario destacado (solo conteo y enlace/pista a donde se fijan; las valoraciones se destacan desde la valoración de cada álbum o canción). `getCurationSummary` aporta esos tres conteos |
| `privacy` | Visibilidad público/privado y **audiencia por defecto del contenido nuevo**, con la acción aparte "Aplicar a lo existente" |
| `network` | Enlaces a solicitudes (con bandeja), seguidores, seguidos y bloqueadas, desde la superficie `settings` de `user-menu-items.ts` (la superficie `panel` sigue existiendo: la usa el panel móvil del Header) |
| `account` | **Cuenta y seguridad** (ver la sección siguiente): datos de la cuenta (nombre visible, usuario, email), cómo se inicia sesión (contraseña, Google), sesiones por dispositivo e idioma de la interfaz |

### Cuenta y seguridad (`/me/settings/account`, cambio `rework-account-settings`, Fase 1)

Nada de esta pantalla se muestra a otras personas. Tarjetas y flujos:

| Tarjeta | Qué hace | Reglas que conviene saber |
|---|---|---|
| **Datos de la cuenta** | Nombre visible (editor existente), **usuario** y **email** con su estado de verificación | Cada acción sensible abre un diálogo (`components/ui/Dialog.tsx`, portal + foco atrapado) con validación en línea |
| **Cómo iniciás sesión** | **Contraseña** (cambiar, o crear si la cuenta es de Google) y **Google** (vincular / desvincular) | Desvincular Google queda deshabilitado, con la explicación, si es el único método de acceso |
| **Sesiones activas** | Un dispositivo por fila (`Chrome · Windows`), "Esta sesión" marcada, "Cerrar" por fila y "Cerrar todas" | Solo se guarda una **etiqueta** del dispositivo (nunca el User-Agent ni la IP); `last_seen_at` se escribe como mucho cada 10 minutos |
| **Preferencias** | Idioma de la interfaz | Se guarda en `app_user.locale`; solo este control lo persiste, el selector del Header no |

**Cambiar el usuario** (`account-username`): entre 3 y 32 caracteres, `[a-zA-Z0-9_]` (las mismas
reglas del registro, `services/auth/account-rules.ts`). Un cambio cada 30 días
(`username_changed_at`). El usuario anterior queda **reservado 30 días** en `username_alias` y
`/users/<anterior>` redirige (307) a la misma subruta con el usuario nuevo
(`redirectIfRenamed`, usado en las 11 páginas bajo `users/[username]/`); `GET /api/users/[username]`
**no** redirige. La disponibilidad compara con `lower()` — `app_user.username` distingue mayúsculas por
historia (existen `Ana` y `ana`) pero un cambio nuevo no puede suplantar a alguien por una mayúscula.
El registro y el alta con Google también respetan la reserva. El monograma cambia de color porque se
calcula desde el usuario.

**Cambiar el email** (`account-credentials`): pide el factor de identidad, manda un correo al email
**nuevo** con un enlace de un solo uso (24 h, `email_change_token`, solo el hash) y **no cambia nada
hasta confirmar** (`/[locale]/auth/change-email?token=`, con botón de confirmar: un GET nunca cambia el
email). Al confirmar se revalida que siga libre, se marca verificado y se avisa al email anterior. Un
pedido nuevo reemplaza al pendiente y la pantalla lo avisa mientras esté vigente.

**Autenticación reciente** (`services/auth/recent-auth.ts`): cambiar email, crear contraseña (y, en la
Fase 3, desactivar y eliminar) exigen un factor fresco. Con contraseña: se envía y se verifica (límite
de 10 intentos por 15 minutos por usuario). Sin contraseña (alta con Google): la sesión debe tener menos
de **10 minutos**; si no, la API responde `REAUTH_REQUIRED` y el diálogo ofrece "Confirmar con Google".
Cambiar la contraseña exige siempre la actual.

**Google desde Ajustes**: el flujo OAuth gana una *intención* cerrada (`login` | `link` | `reauth`).
`link` vincula la identidad **por el id de la cuenta de Google, no por el email** (el email de Google no
tiene que coincidir con el de la cuenta); `reauth` confirma la identidad y rota la sesión. Ambas exigen
sesión, guardan quién inició el flujo, y vuelven siempre a `/<locale>/me/settings/account?google=…` (un
destino **fijo**: sigue sin haber `returnTo` controlado por el cliente). Un error del flujo vuelve con
`?google=error&code=OAUTH_IDENTITY_TAKEN|OAUTH_IDENTITY_MISMATCH`, un conjunto cerrado que la pantalla
localiza.

**Idioma**: con preferencia guardada, iniciar sesión (contraseña o Google) lleva a ese idioma.

### Desactivar, exportar y eliminar la cuenta (Fase 3)

Dos tarjetas al final de Cuenta y seguridad: **Pausar o salir** (desactivar y descargar tus datos) y,
aparte y en zona de peligro, **Eliminar cuenta**. La foto de perfil queda para una spec de imágenes
aparte.

| Acción | Efecto | Reversible |
|---|---|---|
| **Desactivar** | Oculta a la persona y **conserva todo lo que hizo**. Cierra todas sus sesiones. | Sí: iniciar sesión (contraseña o Google) la reactiva |
| **Eliminar** | Borra la cuenta y **todo lo que creó** (`DELETE FROM app_user` en cascada). | No |
| **Descargar mis datos** | Un JSON con lo propio. No cambia nada. | — |

**Desactivar** (`app_user.deactivated_at`, migración `0041`). Exige el factor de identidad (mismo
mecanismo de la autenticación reciente). Una cuenta desactivada **no existe para los demás**: su perfil
y sus 9 subpáginas responden como un usuario inexistente, no aparece en búsqueda, seguidores/seguidos/
mutuos ni en sus contadores, ni en solicitudes de seguimiento, vista rápida, afinidad, feed, feed
ambiente, actividad de la comunidad, Home, ni en listas descubiertas, guardadas o de la comunidad; y no
se la puede seguir ni bloquear. Todo eso sale de **un único criterio**
(`activeUserCondition()` en `services/auth/account-status.ts`), así que una superficie nueva lo hereda
en una línea.

Lo que **se conserva**: valoraciones (siguen contando en los promedios), reseñas, comentarios, listas,
favoritos, diario y seguimientos. Las reseñas y comentarios se siguen mostrando pero con la autoría
**«Cuenta desactivada»**, sin enlace ni vista rápida (`maskAuthor()`: la API nunca entrega el usuario ni
el nombre reales de la autora; solo `user.deactivated: true`). Sobre ese contenido se puede **reportar**,
pero no bloquear a la autora ni, desde moderación, suspenderla (las consultas de moderación conservan la
identidad real).

**Reactivar** no tiene botón: iniciar sesión (`POST /api/auth/login` o el callback de Google) limpia
`deactivated_at` antes de crear la sesión. Restablecer la contraseña de una cuenta desactivada también
funciona (la encuentra) y el siguiente inicio de sesión la reactiva. Todo vuelve como estaba.

**Eliminar** pide, además del factor de identidad, **escribir el usuario exacto** (solo se ignoran los
espacios de los bordes). El diálogo lista lo que se borra, avisa que no se deshace y ofrece
"Desactivá la cuenta" como alternativa. Una cuenta con historial de moderación o editorial (las filas de
auditoría referencian a la persona con `RESTRICT`) **no se puede eliminar**: la base rechaza el borrado
(`23001`, o `23503` con `NO ACTION`), la API responde `ACCOUNT_DELETION_BLOCKED` sin cambiar nada y el
diálogo sugiere desactivar. Tras borrar, la página recarga hacia el inicio.

**Descargar mis datos** (`GET /api/me/export`, una por minuto): archivo JSON
`music-platform-<usuario>-<fecha>.json` con la cuenta (sin hash de contraseña), el perfil (enlaces,
fijados, vitrina, preguntas), la biblioteca (diario con las notas privadas, favoritos, para escuchar,
colección, buscados, artistas seguidos), la actividad (valoraciones, reseñas, comentarios), las listas
(propias con sus ítems, guardadas y fijadas), los destacados y la red (seguidores, seguidos y bloqueados
**solo por usuario público**, nunca su email ni sus datos privados). Los ítems del catálogo van como id y
un mapa de nombres. Es síncrono, sin trabajos en segundo plano ni almacenamiento; nunca incluye tokens,
sesiones ni columnas de moderación.

**Política de privacidad (`/privacy`).** Todo lo anterior está descrito para las personas usuarias en
`messages/{es,en}/legal.json` (`privacy.sections.*`, renderizado por `LegalPageView`), junto con una
sección final **«Por definir antes de la apertura al público»** que es el registro de lo que quedó
abierto: período de recuperación de 14–30 días tras eliminar, plazo de las copias de seguridad y
registros técnicos, cuánto se conserva una cuenta desactivada sin actividad (hoy sin límite),
anonimizar a la persona en los registros de moderación (hoy bloquean la eliminación), datos a conservar
por obligación legal, plazos del derecho de supresión según jurisdicción y la reactivación sin
confirmar ni avisar. **Si cambia el comportamiento de desactivar, reactivar, eliminar o exportar, hay
que actualizar ese texto** (la página sigue siendo un borrador `noindex`, no una política vigente).

### Audiencia por defecto del contenido nuevo

`app_user.default_audience` (nullable, migración 0034). Es un **valor por defecto**, no una regla
global: cada favorito, entrada de diario, lista o copia de colección sigue siendo editable por
separado y **nada existente cambia**. `NULL` = "según el tipo", porque los defaults por tipo no son
uniformes (favoritos `public`, listas y colección `followers`, diario `private`); un default único
degradaría favoritos o el diario. Precedencia al crear (`resolveNewContentAudience`): valor
explícito de la petición > preferencia > default del tipo. Se resuelve en el servidor y solo cuando
la petición no trae audiencia.

**Aplicar a lo existente** (cambio `apply-default-audience`). Elegir la preferencia sigue sin tocar
nada; para llevarla a lo ya creado hay una acción aparte, el botón "Aplicar a lo existente" bajo el
control (`DefaultAudienceSettings`). Solo está activo con una audiencia elegida — con "Según el tipo"
no hay un valor único que aplicar. Al pulsarlo pide una vista previa
(`GET /api/me/default-audience/apply`) y abre una confirmación con cuántos elementos cambian por tipo
(favoritos, diario, listas, colección) y cuántos están fijados o destacados; si nada cambiaría lo
dice y no pide confirmar. Tras confirmar (`POST`) muestra el resultado y refresca la página.

- **Alcance:** favoritos, entradas de diario, listas estándar propias y copias de colección. No cubre
  reseñas ni comentarios, ni la wishlist (siempre privada), ni los recorridos de artista (no tienen
  control de audiencia).
- **Fijados y destacados se incluyen**, y la confirmación avisa. Una lista
  fijada que pase a una audiencia más cerrada deja de verse para quien quede fuera; las entradas de
  diario destacadas siguen visibles para cualquiera (`diary-visibility`).
- **Atómica e idempotente:** una transacción, solo actualiza las filas que difieren. Solo escribe la
  columna `audience`; no toca pines, destacados ni la preferencia guardada. No se puede deshacer
  (no se guarda el estado anterior), pero se puede volver a aplicar otra audiencia.
- **Sin ruido en el feed:** el trigger de `updated_at` de `user_list` y `collection_entry` respeta el
  indicador `app.preserve_updated_at` (migración `0037`), así que no se generan eventos de "lista
  actualizada" ni se mueve la última actividad del perfil.

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
| `app_user.{self_roles, genres, listening_formats}` | Identidad musical: `TEXT[] NOT NULL DEFAULT '{}'`, claves de listas cerradas validadas en la aplicación; la base solo limita la cardinalidad (≤3, ≤5, ≤5) — migración 0040 |
| `app_user.show_local_time` | Mostrar la hora local en la Placa (`BOOLEAN`, por defecto `false`); `CHECK (NOT show_local_time OR timezone IS NOT NULL)` — migración 0040 |
| `user_profile_prompt` | Hasta 3 preguntas por usuario: `prompt_key` de lista cerrada (app), `answer` 1..100 sin saltos de línea, `position` 0..2; `UNIQUE (user_id, prompt_key)` y `UNIQUE (user_id, position)`; `ON DELETE CASCADE` — migración 0040 |
| `app_user.username_changed_at` / `app_user.locale` | Fecha del último cambio de usuario (nulo = nunca; base del enfriamiento de 30 días) e idioma preferido (`es`/`en`, nullable) — migración 0039 |
| `username_alias` | Usuario anterior reservado 30 días tras un cambio: `UNIQUE (lower(username))`, `expires_at`; los vencidos no se consultan y se borran al renombrar (migración 0039) |
| `email_change_token` | Cambio de email pendiente: `user_id` único, `new_email`, solo el hash del token, 24 h (migración 0039) |
| `session.device_label` / `session.last_seen_at` | Etiqueta legible del dispositivo (≤80) y última actividad; nulos en las sesiones previas (migración 0039) |
| `app_user.default_audience` | Audiencia por defecto del contenido nuevo (nullable, `CHECK`, migración 0034). `NULL` = "según el tipo". Nunca reescribe contenido existente |
| `user_profile_link` | Enlaces externos ordenados, máx. 5 app-side; `kind` con `CHECK` de 10 tipos (`x`, `tiktok` y `spotify` en la migración 0035; `website` unificado en `other` en la 0036); `url` canónica ≤400, sin columna `handle` |
| `listen_entry` (lectura) | Fuente única de "En rotación" — escuchas de canción/álbum de los últimos 30 días, filtradas por audiencia. Sin tabla ni columna nueva |
| `listen_entry_highlight` | Hasta 6 entradas de diario destacadas por usuario; anulan la matriz de visibilidad solo para esa entrada (migración 0029) |
| `review` + `rating` (lectura) | Sección "Reseñas" — hasta 4 reseñas de álbum del dueño con su rating asociado, orden por `updated_at`. Sin tabla ni columna nueva |
| `rating_highlight` | Hasta 6 valoraciones destacadas por usuario, visibles sin filtro de audiencia (migración 0029) |
| `artist_follow` | Sección "Exploración" — artistas que el dueño sigue; también alimenta la afinidad y la insignia "tú también" (migración 0021, sin `status`) |
| `user_pinned_item` | Los 4 ítems de "Empieza por aquí" (antes Destacados), triple-FK nullable + CHECK `num_nonnulls = 1` |
| `user_showcase` | Una fila por usuario; `anthem_recording_id` (`ON DELETE SET NULL`, la canción de la Tarjeta de Identidad); `defining_artist_id`/`defining_release_group_id` (`ON DELETE SET NULL`, el artista/álbum definitorios — migración 0030, revisa el `is_defining` sobre `user_pinned_item` de 0029) |
| ~~`user_album_pin`~~ | Retirada en la migración `0038` (ver "Empieza por aquí", historia) |
| `favorite.audience` (default) | `public` para favoritos nuevos (antes `followers`); cambio a nivel de aplicación, no de columna — no retroactivo sobre filas existentes |
| `release_group_tag` | Tags de género por álbum, sembrados |
| `idx_rating_user` | Índice para la curva de valoraciones (migración 0015) |
