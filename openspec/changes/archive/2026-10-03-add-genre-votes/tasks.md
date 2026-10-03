## 1. Datos

- [x] 1.1 Migración `drizzle/0057_genre_votes.sql`: tabla `release_group_genre_vote` (UNIQUE usuario/álbum/género, `CHECK value IN (-1,1)`, FK a `genre` con RESTRICT, cascada a usuario y álbum, índice `(release_group_id, genre_id)`, trigger de `updated_at`)
- [x] 1.2 Misma migración: vista `release_group_genre_score` (semilla + votos de cuentas no desactivadas, solo estilos visibles, rango por puntaje) y `release_group_effective_genre` redefinida con las columnas actuales más `score`, heredando solo si no hay géneros con puntaje > 0
- [x] 1.3 Espejo en `src/db/schema.ts` (`releaseGroupGenreVote` y tipo `ReleaseGroupGenreVoteRow`) y `docs/03-data/sql-model.md`
- [x] 1.4 Aplicar la migración a la BD de scratch y verificar que, sin votos, la vista devuelve lo mismo que antes (comparar conteos por género)

## 2. Servicios

- [x] 2.1 `src/services/genres/votes.ts`: `castGenreVote`, `removeGenreVote` (valida género `style` visible, tope de 8 en transacción, interacción con el álbum, cuenta activa y `requireSocialActivityAllowed`) con errores `GENRE_VOTE_NO_INTERACTION` y `SOCIAL_SUSPENSION_ACTIVE`
- [x] 2.2 `getAlbumGenreVotes(releaseGroupId, viewerId?)`: géneros con puntaje, principal/secundario, cifras solo con ≥ 5 votantes, `mine` y `canVote` con razón
- [x] 2.3 `display.ts`: `getAlbumGenres` devuelve `score` y marca principal/secundarios por umbral (mitad del principal, mínimo 1); las firmas de `getArtistGenres` y `getSongGenres` no cambian
- [x] 2.4 Pruebas de `votes.ts` y de la regla de principal/secundarios (incluido tope, interacción, restricción, cuenta desactivada)

## 3. API

- [x] 3.1 `GET /api/catalog/release-group/[id]/genre-votes` (público) con `withErrorHandling` y esquema Zod en `src/lib/api/schemas.ts`
- [x] 3.2 `PUT` y `DELETE /api/me/release-groups/[id]/genre-votes/[slug]` (`value` ∈ {−1, 1}; 401/403/400/404)
- [x] 3.3 Cliente en `src/lib/api/genres.ts` y `queryKeys.genreVotes`; pruebas de las rutas

## 4. Interfaz

- [x] 4.1 `GenreVotePanel` (botón "Votar géneros", ▲/▼ conmutables, cifras con ≥ 5 votantes, buscador para proponer reutilizando `GenreMultiSelect`/`GET /api/genres/search`, controles desactivados con motivo, invitación a iniciar sesión)
- [x] 4.2 `GenreChips`: orden por puntaje, principal destacado, secundarios y "+N"; heredados atenuados sin principal
- [x] 4.3 Integrar el panel en la cabecera del álbum (`album/[id]/(tabs)/layout.tsx`) con mutaciones de TanStack Query e invalidación de los chips
- [x] 4.4 Mensajes es/en (`catalog.genres.votes.*`) y pruebas de componentes

## 5. Verificación

- [x] 5.1 Extender `scripts/smoke-test-genres.ts`: votar, proponer, cambiar, retirar, tope, sin interacción, restricción, cuenta desactivada, umbral de 5 votantes, herencia que cede ante una propuesta, y que Explorar y la huella usan el puntaje (limpiar usuarios `smoke_gen_*`)
- [x] 5.2 Verificar en el navegador (álbum con semillas y votos; persona con y sin acceso; móvil)
- [x] 5.3 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build` en verde

## 6. Documentación

- [x] 6.1 ADR 0025 (votos de la comunidad como fuente de géneros del álbum; puntaje, umbral de cifras y supervivencia del voto)
- [x] 6.2 Actualizar `business-rules.md`, `domain-model.md`, `04-api/contracts.md` y `errors.md`, `05-features/genres.md`, `data-licensing.md` (los votos de la comunidad son propios; los de MusicBrainz siguen fuera) y `AGENTS.md` (limpieza del smoke)
