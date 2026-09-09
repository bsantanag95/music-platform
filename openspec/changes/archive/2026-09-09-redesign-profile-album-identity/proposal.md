## Why

La dirección `redefine-content-hierarchy` (D10) reorganiza el perfil en dos bloques:
**identidad cultural** (álbumes) y **cómo vive la música** (canciones). El primer bloque
arranca con una sección propia y explícita —**"Álbumes favoritos"**— separada de los
cuatro destacados mixtos actuales: los álbumes explican *quién es culturalmente el usuario*
(patrón Letterboxd: tus obras fundamentales), mientras que los destacados mixtos siguen
siendo expresión personal más amplia y flexible.

Es la primera pieza de la **Fase 1** y precondición del onboarding de dos puertas (IQ5:
"elegí 3–5 álbumes que te definen" escribe directo en esta sección).

## What Changes

- **Nueva sección "Álbumes favoritos"** en el perfil: hasta **6** álbumes fijados por el
  dueño, en **orden manual**, rejilla 3×2. Se lee como declaración de identidad, no como
  ranking: **nunca** se ordena por rating, escuchas ni actividad; no requiere reseña; no
  tiene que ser los mejor valorados.
- **Opción B — reutiliza el favorito** (no una señal nueva): la sección fija hasta 6 de los
  **favoritos de álbum que el dueño ya tiene** (`favorite` con `release_group_id`). Poner
  un álbum en la identidad requiere haberlo marcado favorito antes. Tabla nueva
  `user_album_pin (user_id, favorite_id, position)` con FK a `favorite` `ON DELETE
  CASCADE`: quitar el favorito lo saca automáticamente de la sección de identidad.
- **Editor del dueño** montado solo en el propio perfil: elige y reordena entre sus
  favoritos de álbum (sin buscador de catálogo embebido — precedente `list-detail-scope`),
  reemplazo del conjunto ordenado completo en una operación.
- **Endpoint** `PUT /api/me/profile/album-favorites` — recibe un array ordenado de hasta 6
  ids de favorito, reemplaza el conjunto en una transacción; `GET` implícito por el
  read-model del perfil.
- **Colocación**: la sección va **encima de los 4 destacados mixtos** (`PinnedShowcase`),
  como cabeza del bloque de identidad cultural. En el layout público de dos columnas, en la
  columna principal. Se renderiza solo en los niveles autorizado y dueño, igual que la
  huella y los destacados (spec `social-profiles`).
- **Los 4 destacados mixtos y el himno no cambian**: siguen siendo mecanismos distintos
  (D10 acepta tres mecanismos de fijado — álbumes favoritos, destacados, himno).

### Non-Goals

- **"En rotación"** (bloque "cómo vive la música", derivado del diario) — cambio siguiente
  de Fase 1.
- Onboarding de dos puertas — cambio siguiente, consume esta sección.
- Rebalanceo de páginas de detalle (canción mínima, artista discografía-forward).
- Reseñas destacadas en el perfil.
- Reorden completo de todas las secciones del perfil (solo se inserta esta sección donde
  corresponde; el resto del orden no se toca).
- Cambiar los 4 destacados mixtos, el himno, o el modelo de `favorite`.

## Capabilities

### New Capabilities

- `profile-album-identity`: la sección "Álbumes favoritos" del perfil — fijar y ordenar
  hasta 6 favoritos de álbum propios como identidad cultural, su editor de dueño, su
  presentación según nivel de acceso, y la regla de que quitar el favorito lo desfija.

### Modified Capabilities

- `social-profiles`: el requisito "Composición del perfil por nivel de acceso" incorpora la
  sección "Álbumes favoritos" a lo que se renderiza solo en los niveles autorizado y dueño
  (y se oculta en bloqueo / perfil privado sin autorización).

## Impact

- **Migración SQL nueva** (`0019_user_album_pin.sql`): `CREATE TABLE user_album_pin`
  (`id`, `user_id` FK `ON DELETE CASCADE`, `favorite_id` FK a `favorite` `ON DELETE
  CASCADE`, `position` SMALLINT, `created_at`), índices únicos `(user_id, favorite_id)` y
  `(user_id, position)`, `CHECK (position BETWEEN 1 AND 6)`. Espejo en `src/db/schema.ts`.
- **Servicio**: `src/services/profiles/album-favorites.ts` — `getAlbumFavorites(userId)` (o
  ampliar el read-model del perfil) y `replaceAlbumFavorites(userId, favoriteIds[])`
  (transacción, valida que cada id sea un favorito de álbum propio, máx 6). Reutiliza el
  join a `releaseGroup` de `favorites.ts`.
- **API**: `src/app/api/me/profile/album-favorites/route.ts` (`PUT`), schemas Zod en
  `src/lib/api/schemas.ts`.
- **UI**: `src/components/profiles/AlbumFavorites.tsx` (display) + `OwnerAlbumFavoritesEditor.tsx`
  (editor, modelado en `OwnerShowcaseEditor`); integración en
  `src/app/[locale]/users/[username]/sections.tsx` y `page.tsx`; i18n `users`.
- **Docs**: `docs/03-data/sql-model.md` (`user_album_pin`), `docs/04-api/contracts.md`
  (endpoint), `docs/05-features/user-profile.md`.
- **Sin cambios** en `favorite`, `user_pinned_item`, `user_showcase`, la huella de gusto ni
  la afinidad.
