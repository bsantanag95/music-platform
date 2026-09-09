## 1. Migración y schema

- [ ] 1.1 `drizzle/0021_artist_follow.sql`: `CREATE TABLE artist_follow (id UUID PK DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE, artist_id UUID NOT NULL REFERENCES artist(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`; `CREATE UNIQUE INDEX uq_artist_follow_pair ON artist_follow (user_id, artist_id)`; `CREATE INDEX idx_artist_follow_artist ON artist_follow (artist_id)`
- [ ] 1.2 Espejo en `src/db/schema.ts` (`artistFollow` pgTable + `ArtistFollowRow`) con comentario de sincronización; correr la migración y verificar `\d artist_follow`

## 2. Servicio

- [ ] 2.1 `src/services/social/artist-following.ts` — `followArtist(userId, artistId)`: valida que el artista exista (`ARTIST_NOT_FOUND` / 404); `insert ... onConflictDoNothing`; devuelve `{ following: true }`
- [ ] 2.2 `unfollowArtist(userId, artistId)`: `delete`, devuelve `{ following: false }` (sin error si no seguía); `isFollowingArtist(userId, artistId): boolean`
- [ ] 2.3 `listFollowedArtists(userId, page, pageSize)`: artistas seguidos (`id`, `name`, `type`, `photoUrl`), orden `created_at` desc, paginado; `countFollowedArtists(userId)`
- [ ] 2.4 `src/services/profiles/` — `listProfileFollowedArtists(username, viewerId, limit = 12)`: resuelve el perfil (`getProfileByUsername`), devuelve `[]` si no accesible, si no los artistas seguidos del dueño (tope 12 para la sección de perfil)
- [ ] 2.5 Tests: seguir es idempotente (2× no duplica); dejar de seguir sin seguir no rompe; artista inexistente → 404; `listFollowedArtists` orden y paginado; `listProfileFollowedArtists` respeta acceso

## 3. Zod y API

- [ ] 3.1 `src/lib/api/schemas.ts`: `ArtistFollowResponseSchema` (`{ following: boolean }`), `FollowedArtistSchema` / `FollowedArtistsResponseSchema` (`{ id, name, type, photoUrl }`)
- [ ] 3.2 `src/app/api/artists/[id]/follow/route.ts`: `PUT` (requireUser, id UUID → `followArtist`) y `DELETE` (→ `unfollowArtist`); mismo patrón que `users/[username]/follow`
- [ ] 3.3 `src/app/api/artists/[id]/follow/route.test.ts`: sin sesión → `AUTH_REQUIRED`; id no UUID → 400/404; `PUT` sigue; `PUT` repetido idempotente; `DELETE` deja de seguir
- [ ] 3.4 Fetcher `src/lib/api/artists.ts` (`followArtist(id)` / `unfollowArtist(id)`)

## 4. UI — página de artista y /me/artists

- [ ] 4.1 `src/components/catalog/FollowArtistButton.tsx` (client): estado inicial por prop; toggle optimista con reversión en error; sin sesión → enlace a login (patrón `FavoriteButton`). Sin conteo de seguidores (OQ2)
- [ ] 4.2 `src/app/[locale]/(catalog)/artist/[id]/page.tsx`: sumar `isFollowingArtist(session?.user.id, artist.id)` al `Promise.all` (solo con sesión); montar `FollowArtistButton` junto a `MarkAsListened` / `FavoriteButton` / `AddToListButton`
- [ ] 4.3 `src/app/[locale]/me/artists/page.tsx`: `requirePageUser`, `listFollowedArtists(user.id, 1, 50)`, lista con "dejar de seguir" por fila (client component `FollowedArtistList` o reuso de patrón `UserList`); estado vacío
- [ ] 4.4 `src/components/profiles/OwnerHubPanel.tsx`: enlace nuevo `{ href: "/me/artists", label: t("artistsFollowedTitle") }`
- [ ] 4.5 i18n `catalog.artist` (`follow`, `following`, `signInToFollow`) y `users` (`artistsFollowedTitle`, `artistsFollowedEmpty`, `explorationHeading`, `unfollowArtist`)

## 5. UI — sección "Exploración" del perfil

- [ ] 5.1 `src/components/profiles/ExploreSection.tsx` (display, Server Component): rejilla de artistas seguidos (monograma/foto + nombre, enlace `/artist/{id}`); no renderiza si vacío; hasta 12 (OQ1: sin "ver todos" para visitantes)
- [ ] 5.2 `src/app/[locale]/users/[username]/sections.tsx`: nueva `ExplorationSection({ username, viewerId })` → `listProfileFollowedArtists` → `<ExploreSection artists={…} />` o `null`
- [ ] 5.3 `src/app/[locale]/users/[username]/page.tsx`: montar `<Streamed><ExplorationSection …/></Streamed>` **después de `FingerprintSection`, antes de los estantes** (`DiaryRail`), en la columna principal pública y en la vista del dueño. No reordenar el resto

## 6. Afinidad

- [ ] 6.1 `src/services/profiles/affinity.ts` — `getProfileAffinity` suma `sharedFollowedArtists`: artistas que tanto el visitante como el dueño siguen (`artist_follow` ∩), resueltos a `{ type: "artist", id, title: name }`. El bloque se oculta solo si los 4 términos están vacíos
- [ ] 6.2 `src/components/profiles/ProfileAffinity.tsx` + `src/lib/api/schemas.ts` (`ProfileAffinitySchema`): renderizar `sharedFollowedArtists`; i18n `users.affinity.sharedFollowedArtists`
- [ ] 6.3 Tests: afinidad con solo artistas seguidos en común se muestra; sin ninguno de los 4 términos → oculta

## 7. Composición y regresión

- [ ] 7.1 Ajustar `sections.test.tsx` / `page.test.tsx` para `ExplorationSection` y su gating por nivel de acceso
- [ ] 7.2 Confirmar sin regresión: `user_follow` / feed / favoritos de artista intactos; la página de artista sigue montando discografía-forward; `affinity.test` en verde
- [ ] 7.3 Verificación en el navegador: seguir/dejar de seguir en la página de artista; `/me/artists` lista y quita; sección "Exploración" aparece en un perfil con artistas seguidos y no en uno sin; afinidad con artistas en común; consola sin errores

## 8. Docs

- [ ] 8.1 `docs/03-data/sql-model.md`: `artist_follow` (unilateral, sin `status`, espacio para notificaciones después)
- [ ] 8.2 `docs/04-api/contracts.md`: `PUT` / `DELETE /api/artists/[id]/follow`
- [ ] 8.3 `docs/05-features/user-profile.md`: sección "Exploración"; nota sobre favorito de artista vs. seguir artista

## 9. Cierre

- [ ] 9.1 `openspec validate add-artist-following --strict` pasa
- [ ] 9.2 `typecheck`, `lint`, `test`, `build` en verde
- [ ] 9.3 Archivar el cambio y sincronizar specs cuando esté implementado y aprobado
