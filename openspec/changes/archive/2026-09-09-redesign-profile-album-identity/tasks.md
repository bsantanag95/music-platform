## 1. Migración y schema

- [x] 1.1 `drizzle/0019_user_album_pin.sql`: `CREATE TABLE user_album_pin (id UUID PK DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE, favorite_id UUID NOT NULL REFERENCES favorite(id) ON DELETE CASCADE, position SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 6), created_at TIMESTAMPTZ NOT NULL DEFAULT now())`
- [x] 1.2 Índices: `CREATE UNIQUE INDEX uq_user_album_pin_favorite ON user_album_pin (user_id, favorite_id)`; `CREATE UNIQUE INDEX uq_user_album_pin_position ON user_album_pin (user_id, position)`
- [x] 1.3 Espejo en `src/db/schema.ts` (`userAlbumPin` pgTable + `UserAlbumPinRow`) con comentario de sincronización; correr la migración y verificar `\d user_album_pin`

## 2. Servicio

- [x] 2.1 `src/services/profiles/album-favorites.ts` — `getAlbumFavorites(ownerId, viewerAudiences)`: `user_album_pin JOIN favorite JOIN release_group`, filtra por audiencia del favorito según el visitante, ordena por `position`, resuelve título + artista acreditado (reutiliza el join / `PRIMARY_ARTIST_SQL` de `favorites.ts` / `showcase.ts`)
- [x] 2.2 `replaceAlbumFavorites(ownerId, favoriteIds: string[])`: valida ≤6, valida que cada id sea un `favorite` propio con `release_group_id` no nulo (si no → `VALIDATION_ERROR`); transacción: borra las filas del usuario, inserta con `position = index + 1`
- [x] 2.3 Integrar en el read-model del perfil — un único punto de lectura por request en cada layout (`AlbumFavoritesSection` en `page.tsx`, `getAlbumFavorites` en `OwnerEditors`), sin consultas duplicadas que ameriten `cache()`
- [x] 2.4 Tests: fijar y reordenar, exceder 6, fijar un favorito ajeno / de artista / de canción → `VALIDATION_ERROR`, quitar el favorito desfija (cascade), filtrado por audiencia (private/followers/public × relación del visitante)

## 3. Zod y API

- [x] 3.1 `src/lib/api/schemas.ts`: `AlbumFavoritesRequestSchema` (`favoriteIds: z.array(z.uuid()).max(6)`), `AlbumFavoriteSchema` / `AlbumFavoritesResponseSchema` (id, target: {id, title, artistName, coverThumbUrl}, position)
- [x] 3.2 `src/app/api/me/profile/album-favorites/route.ts`: `PUT` (requireUser, reemplazo), devuelve el conjunto resuelto
- [x] 3.3 Tests de ruta (`route.test.ts`: reemplazo ordenado, array de 7 → `VALIDATION_ERROR` antes del servicio, id no UUID, propagación de `VALIDATION_ERROR` del servicio, `DELETE` vacía). El editor llama `apiFetch` directo igual que `OwnerShowcaseEditor` — sin fetcher dedicado, consistente con las mutaciones de perfil existentes

## 4. UI

- [x] 4.1 i18n `users` (es/en): encabezado "Álbumes favoritos", labels del editor, invitación cuando no hay favoritos de álbum, confirmaciones
- [x] 4.2 `src/components/profiles/AlbumFavorites.tsx` (display, server): rejilla 3×2 de carátulas + título + artista, enlace al álbum, sin posiciones ni estrellas; no renderiza si el conjunto visible está vacío
- [x] 4.3 `src/components/profiles/OwnerAlbumFavoritesEditor.tsx` (client, modelado en `OwnerShowcaseEditor`): lista favoritos de álbum del dueño (`getMyFavorites` filtrado a `release-group`), marcar hasta 6 + reordenar, guardar con `PUT`; estado "marcá álbumes favoritos primero" si no hay
- [x] 4.4 Integrar en `src/app/[locale]/users/[username]/sections.tsx`: nueva `AlbumFavoritesSection` (autorizado + dueño) y su montaje en el editor del dueño (`OwnerEditors` o sección propia)
- [x] 4.5 Integrar en `page.tsx`: en el layout público de dos columnas, en la columna principal **antes de `PinnedSection`**; en la vista del dueño, antes de `ShowcaseSection`. No reordenar el resto
- [x] 4.6 Verificación en el navegador: perfil público sin álbumes favoritos → la sección colapsa (sin error del Server Component nuevo); con 3 fijados → rejilla de carátulas + título + artista, cada uno enlaza a `/es/album/{id}`, arriba de los estantes; consola sin errores. Editor del dueño y mezcla de audiencias cubiertos por los tests de servicio/composición (la vista del dueño requiere sesión)

## 5. Spec y regresión

- [x] 5.1 Ajustar los tests de composición del perfil (`sections.test.tsx`, `page.test.tsx`) para la sección nueva y su gating por nivel de acceso
- [x] 5.2 Confirmar sin regresión: `PinnedShowcase` (4 destacados) y `AnthemStrip` (himno) siguen igual; `/me/favorites` no cambia — sin cambios en esos módulos, suite afectada en verde (63 tests)

## 6. Docs

- [x] 6.1 `docs/03-data/sql-model.md`: `user_album_pin` (FK a `favorite`, cascade = desfijar, posición 1–6 única)
- [x] 6.2 `docs/04-api/contracts.md`: `PUT /api/me/profile/album-favorites`
- [x] 6.3 `docs/05-features/user-profile.md`: la sección de identidad cultural y su relación con los destacados mixtos

## 7. Cierre

- [x] 7.1 `openspec validate redesign-profile-album-identity --strict` pasa
- [x] 7.2 `typecheck`, `lint`, `test` (1074), `build` en verde
- [x] 7.3 Archivar el cambio y sincronizar specs cuando esté implementado y aprobado
