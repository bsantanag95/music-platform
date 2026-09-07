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
| **Autorizado** | Cuenta pública, o seguidor aprobado de una privada | Identidad + huella de gusto + destacados + himno + afinidad + estantes (diario / favoritos / listas / colección) + recencia. |
| **Dueño** | La persona | Lo mismo que "autorizado" + editores inline de identidad/enlaces/destacados/himno + panel de gestión + previsualizador "cómo te ven". |

Un perfil **privado** solo expone su huella, destacados y estantes a seguidores aprobados y
al dueño; un visitante no autorizado ve únicamente la identidad extendida.

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

## Destacados e himno

- **Cuatro destacados** (`user_pinned_item`, patrón triple-FK como `rating`): hasta 4
  entidades fijadas, tipos mezclados, nota opcional (≤120). Se resuelven al leer, omitiendo
  las que el catálogo ya no tiene.
- **Himno** (`user_showcase.anthem_recording_id`): una canción elegida **manualmente**.
  Nunca se deriva de la última escucha ni de ninguna actividad.

El editor del dueño reordena / quita / anota los destacados y elige el himno **desde sus
favoritos** — no hay buscador de catálogo embebido (mismo criterio que el detalle de lista,
ver la memoria `list-detail-scope`).

## Afinidad

Al ver el perfil de otra persona con sesión iniciada, un bloque de coincidencias
(`src/services/profiles/affinity.ts`): favoritos en común, entidades que ambos puntúan con
4+ estrellas (solo si el visitante puede ver las valoraciones del dueño), y seguidores en
común. Se oculta sin sesión, para el propio dueño, ante bloqueo, o si no hay ninguna
coincidencia. El hint de seguidores en común aparece también en el aviso de perfil privado.

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
como retrato, no como avance hacia una meta.

## Modelo de datos

| Tabla / columna | Qué |
|---|---|
| `app_user.{bio, pronouns, location, timezone, avatar_url}` | Identidad extendida (migración 0014) |
| `user_profile_link` | Enlaces externos ordenados, máx. 5 app-side |
| `user_pinned_item` | Cuatro destacados, triple-FK nullable + CHECK `num_nonnulls = 1` |
| `user_showcase` | Una fila por usuario; `anthem_recording_id` (`ON DELETE SET NULL`) |
| `release_group_tag` | Tags de género por álbum, sembrados |
| `idx_rating_user` | Índice para la curva de valoraciones (migración 0015) |
