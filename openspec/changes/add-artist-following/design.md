## Context

`redefine-content-hierarchy` (D8, Fase 2) define **seguir artista** como una relación
unilateral usuario → artista, separada de `user-following`. En esta fase es señal de
afinidad, descubrimiento y organización personal — **no** notificaciones de lanzamiento.

Estado actual:

- `user_follow` (usuario → usuario): tiene `status` (`pending` / `accepted`) porque un
  perfil privado aprueba solicitudes. `PUT` / `DELETE /api/users/[username]/follow` son
  idempotentes.
- `favorite` ya acepta objetivo `artist` — "favorito de artista" existe y es distinto de
  "seguir": favorito es un marcador de gusto, seguir es "quiero ver su obra / hacia acá
  miro".
- La página de artista (tras `rebalance-catalog-detail-pages`) monta discografía →
  acciones (`MarkAsListened` / `FavoriteButton` / `AddToListButton`) → membresías → notas.
- `getProfileAffinity` calcula favoritos en común, valoraciones 4+ en común y seguidores
  en común, bajo demanda, respetando bloqueo y audiencia.
- El perfil se compone en `sections.tsx` + `page.tsx`; el patrón establecido
  (`redesign-profile-album-identity`, `add-profile-in-rotation`) es **insertar** la sección
  nueva sin reordenar el resto.
- `getExplorePage()` no tiene personalización (todo global).

## Goals / Non-Goals

**Goals:**

- Relación `artist_follow` unilateral, sin aprobación, idempotente en ambos sentidos.
- Botón de seguir en la página de artista; superficie `/me/artists`.
- Sección "Exploración" (artistas seguidos) en el perfil, niveles autorizado y dueño.
- Afinidad suma "artistas que ambos siguen".
- El esquema permite agregar notificaciones de lanzamiento después sin migrar datos.
- Mínima superficie: una migración aditiva, dos endpoints, reuso del resto.

**Non-Goals:**

- Evento "seguir artista" en el feed (tier 4) → `rework-feed-tiers`.
- Personalización de `/explore` con novedades de artistas seguidos → cambio aparte.
- Notificaciones de lanzamiento (D8 lo difiere explícitamente).
- "Bloquear artista" u otras semánticas de relación (un artista no es una cuenta).
- Recomendar usuarios a partir de artistas seguidos en común (Fase 2+).
- Un contador "N seguidores" en la página de artista — no aporta en esta fase y agrega
  una consulta a cada render. Se puede sumar después.

## Decisions

### D1 — `artist_follow` sin `status`

`CREATE TABLE artist_follow (id UUID PK, user_id UUID NOT NULL REFERENCES app_user(id) ON
DELETE CASCADE, artist_id UUID NOT NULL REFERENCES artist(id) ON DELETE CASCADE, created_at
TIMESTAMPTZ NOT NULL DEFAULT now())`, con `UNIQUE (user_id, artist_id)` e índice por
`artist_id`.

- **Sin `status`**: un artista no aprueba nada. Seguir = insertar la fila; dejar de seguir
  = borrarla. No hay estado intermedio.
- **`ON DELETE CASCADE`** en ambas FK: borrar el usuario o el artista limpia la relación.
- El **espacio para notificaciones de lanzamiento** más adelante es aditivo — una tabla
  `artist_release_seen` o una columna `notify` en `artist_follow`; nada en este diseño lo
  impide.

*Alternativa descartada:* reusar `favorite` con `artist_id` como "seguir". Confunde dos
señales distintas (gusto declarado vs. intención de seguimiento) y rompería la semántica
de favoritos de artista que ya existe.

### D2 — Servicio y endpoints idempotentes

`src/services/social/artist-following.ts`:

- `followArtist(userId, artistId)`: valida que el artista exista (`ARTIST_NOT_FOUND` /
  `404` si no); `INSERT ... ON CONFLICT (user_id, artist_id) DO NOTHING`. Devuelve
  `{ following: true }`.
- `unfollowArtist(userId, artistId)`: `DELETE`; devuelve `{ following: false }`. Sin error
  si no seguía.
- `isFollowingArtist(userId, artistId): boolean`.
- `listFollowedArtists(userId, page, pageSize)`: artistas seguidos con `name` / `type` /
  `photoUrl`, orden por `created_at` desc.
- `countFollowedArtists(userId): number`.

`PUT` / `DELETE /api/artists/[id]/follow` — `requireUser`, id validado como UUID, delega al
servicio. Mismo patrón que `PUT /api/users/[username]/follow`.

### D3 — Botón en la página de artista

`FollowArtistButton` (client), montado junto a `MarkAsListened` / `FavoriteButton` /
`AddToListButton`. Estado inicial (`isFollowingArtist`) resuelto en el Server Component y
pasado como prop. Sin sesión → enlace a login (mismo patrón que `FavoriteButton`). Toggle
optimista con reversión en error.

`isFollowingArtist` se suma al `Promise.all` de la página de artista (una consulta más,
solo con sesión).

### D4 — Sección "Exploración" del perfil

Nueva `ExplorationSection` en `sections.tsx` que llama un servicio de perfiles
(`listProfileFollowedArtists(username, viewerId)` — resuelve el perfil, chequea acceso,
devuelve los artistas seguidos del dueño). Componente `ExploreSection` (display, Server
Component): rejilla de artistas (monograma/foto + nombre, enlace a `/artist/{id}`). No
renderiza si está vacía.

- **Visibilidad**: `artist_follow` no tiene audiencia. La sección se muestra en los niveles
  **autorizado y dueño** (igual que huella / álbumes favoritos): un visitante no autorizado
  de un perfil privado no la ve; un visitante autorizado sí. Un `artist_follow` no filtra
  por audiencia porque no hay ninguna — seguir un artista es información de perfil de bajo
  riesgo, del mismo tenor que "a quién sigue" (que ya es visible en `/me/following` de
  cada uno). Consistente con `social-profiles`.
- **Ubicación**: después de la huella de gusto, antes de los estantes (orden vertical Q7,
  item 9 "Exploración"). Se **inserta**, no se reordena el resto (patrón D4 de
  `redesign-profile-album-identity`).
- **Tope de presentación**: hasta 12 artistas en el perfil; "ver todos" enlaza a
  `/me/artists` cuando es el dueño (para otros no hay superficie de "sus artistas" — se
  muestran los primeros 12 sin enlace, o se difiere una ruta pública). Fase 2: solo los
  primeros 12, sin "ver todos" para visitantes.

### D5 — `/me/artists`

Ruta de gestión, mismo molde que `/me/following`: `requirePageUser`, `listFollowedArtists`,
lista con acción de dejar de seguir por fila. Enlace nuevo en `OwnerHubPanel` (`/me/artists`,
label "Artistas").

### D6 — Afinidad: artistas que ambos siguen

`getProfileAffinity` suma un cuarto término `sharedFollowedArtists`: artistas que **tanto
el visitante como el dueño** siguen (`artist_follow` ∩), resueltos a `{ type: "artist", id,
title: name }`. Se muestra en el bloque `ProfileAffinity` como una lista más. El bloque
sigue ocultándose solo si **los cuatro** términos están vacíos.

### D7 — Sin evento de feed en esta fase

El evento "seguir artista" es tier 4 (D9) y el sistema de tiers todavía no existe. Meterlo
ahora en el feed actual lo haría aparecer como una fila plana igual que un rating, lo cual
contradice su naturaleza "ambiente". Se difiere a `rework-feed-tiers`, que ya tiene que
tocar el modelo de eventos del feed. `artist_follow.created_at` queda disponible para
cuando esa capa lo consuma.

## Risks / Trade-offs

- **[Dos señales sobre artista: favorito y seguir]** → Son distintas a propósito (D1): el
  favorito es gusto declarado (aparece en la huella, en "favoritos en común"), seguir es
  intención de seguimiento. El copy del botón y su ubicación las separan. Documentado.
- **[La sección "Exploración" expone a quién sigue sin control de audiencia]** → `artist_follow`
  no tiene audiencia por diseño (D4): es información de bajo riesgo, del mismo tenor que la
  lista de seguidos de usuario, ya visible. Si más adelante se quiere ocultar, se agrega
  una preferencia — aditivo.
- **[Sin evento de feed, "seguir" se siente invisible]** → Aceptado para esta fase: el
  valor inmediato es la organización personal (`/me/artists`), el contexto de perfil y la
  afinidad. El feed llega en el cambio siguiente.
- **[La página de artista gana otra consulta con sesión]** → `isFollowingArtist` es un
  lookup por índice único; va en el `Promise.all` existente. Insignificante.
- **[Artistas stub (`type='unknown'`) seguibles]** → Se permite: un stub se enriquece al
  visitar su página; seguirlo es válido y la relación sobrevive al enriquecimiento (mismo
  `artist.id`).

## Migration Plan

1. `drizzle/0021_artist_follow.sql` (`CREATE TABLE` + índices). Espejo en `schema.ts`.
2. Correr la migración. No hay backfill: nadie sigue a ningún artista todavía.
3. Desplegar el resto (aditivo). Si un endpoint o la sección fallara, degrada a "no
   renderiza esa sección" / error contenido; la página no se rompe.

Rollback: revertir el commit; la tabla queda inerte sin el código.

## Open Questions

- **OQ1 — "ver todos" en la sección "Exploración" del perfil ajeno → RESUELTA: no en Fase
  2.** Se muestran hasta 12 artistas seguidos, sin "ver todos" para visitantes; el dueño
  tiene el enlace a `/me/artists`. Una ruta pública "artistas de @usuario" se puede agregar
  después si hace falta.
- **OQ2 — conteo de seguidores en el botón de la página de artista → RESUELTA: no en esta
  fase.** Evita una consulta por render y no aporta hasta que haya masa. Se puede sumar
  después.
