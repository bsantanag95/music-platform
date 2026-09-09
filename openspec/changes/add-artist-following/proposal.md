## Why

Hoy el artista es una **página de contexto**: se puede marcar como favorito y comentar,
pero no hay forma de decir "quiero seguir a este artista". La dirección
`redefine-content-hierarchy` (D8, Fase 2) define **seguir artista** como la pieza que
convierte al artista en una **unidad de descubrimiento** real. En esta fase funciona
**solo como señal de afinidad, descubrimiento y organización personal** — no hay
notificaciones de lanzamientos.

## What Changes

- **Nueva relación unilateral usuario → artista** (`artist_follow`), separada del
  seguimiento usuario → usuario. **Sin aprobación** (un artista no es una cuenta que pueda
  aceptar): seguir es inmediato e idempotente; dejar de seguir también.
- **Botón "Seguir" / "Siguiendo"** en la página de artista, junto a las acciones de
  catálogo existentes.
- **Superficie de gestión `/me/artists`**: la lista de artistas que seguís, con acción de
  dejar de seguir. Enlace nuevo en el panel del dueño.
- **Sección "Exploración" en el perfil** (niveles autorizado y dueño): los artistas que
  esta persona sigue, como contexto de "hacia dónde mira". Se ubica después de la huella de
  gusto (orden vertical Q7). No se renderiza si está vacía.
- **Afinidad**: el bloque de coincidencias del perfil suma **"artistas que ambos siguen"**
  a favoritos, valoraciones altas y seguidores en común.
- El modelo de datos SHALL permitir agregar **notificaciones de lanzamiento** después
  (columna/estructura que no lo impida), pero **no** se implementan acá.

## Capabilities

### New Capabilities

- `artist-following`: la relación unilateral usuario → artista — seguir/dejar de seguir
  (inmediato, idempotente, sin aprobación), el estado de seguimiento en la página de
  artista, la superficie de gestión `/me/artists`, la sección "Exploración" del perfil, y
  el alcance de Fase 2 (señal de afinidad/descubrimiento/organización; **sin**
  notificaciones de lanzamiento).

### Modified Capabilities

- `profile-affinity`: el bloque de coincidencias entre visitante y dueño incluye ahora
  **los artistas que ambos siguen**.
- `social-profiles`: la composición del perfil por nivel de acceso incluye la sección
  "Exploración" (artistas seguidos) en los niveles autorizado y dueño.

## Impact

- **Migración** `drizzle/0021_artist_follow.sql`: `CREATE TABLE artist_follow (id, user_id
  → app_user CASCADE, artist_id → artist CASCADE, created_at)`, `UNIQUE (user_id,
  artist_id)`, índice por `artist_id`. Sin `status` (no hay aprobación). Espejo en
  `src/db/schema.ts`.
- **Nuevo servicio** `src/services/social/artist-following.ts` — `followArtist`,
  `unfollowArtist` (idempotentes), `isFollowingArtist`, `listFollowedArtists`,
  `countFollowedArtists`.
- **Nuevos endpoints** `PUT` / `DELETE /api/artists/[id]/follow` (idempotentes, mismo
  patrón que `PUT /api/users/[username]/follow`).
- **Nuevo componente** `src/components/catalog/FollowArtistButton.tsx` (client), montado en
  la página de artista.
- **Nueva ruta** `src/app/[locale]/me/artists/page.tsx` + enlace en `OwnerHubPanel`.
- **Nuevo componente** `src/components/profiles/ExploreSection.tsx` (display) + nueva
  `ExplorationSection` en `sections.tsx`, montada en `page.tsx` después de la huella.
- **Modificado** `src/services/profiles/affinity.ts` — suma `sharedFollowedArtists`.
- **Zod** `ArtistFollowResponseSchema`, `FollowedArtistsResponseSchema`.
- **i18n** `messages/{es,en}/` (`catalog.artist` para el botón, `users` para la sección y
  `/me/artists`).
- **Docs** `docs/03-data/sql-model.md`, `docs/04-api/contracts.md`,
  `docs/05-features/user-profile.md`.
- **Fuera de alcance (Fase 2+):** el evento "seguir artista" en el feed (tier 4) — llega
  con `rework-feed-tiers`; la personalización de `/explore` con novedades de artistas
  seguidos; las notificaciones de lanzamiento.
- Sin cambios en `user_follow`, el feed actual, ni el modelo de `favorite` / `rating`.
