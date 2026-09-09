## 1. Servicio: señales → score → estado

- [x] 1.1 `src/services/profiles/in-rotation.ts` — constantes nombradas: `ROTATION_WINDOW_DAYS = 30`, `RECENCY_WEIGHTS` (`{ current: 3 (0–7d), recent: 2 (8–21d), residual: 1 (22–30d) }`), `ALBUM_LISTEN_MULTIPLIER = 2`, `ROLLUP_SONG_WEIGHT = 1`, `ROTATION_SCORE_THRESHOLD = 3`, `ROTATION_MAX_PER_TYPE = 8`. Tipos `InRotationSong`, `InRotationAlbum`, `InRotation { songs, albums }`
- [x] 1.2 Consulta de **señales**: filas de `listen_entry` del dueño (`createdAt`, `recordingId`, `releaseGroupId`) con `created_at >= now - 30 d`, `audience IN (audiencias visibles)`, `recording_id` o `release_group_id` no nulo (se ignora `artist_id`). Metadata (título/carátula/artista) se resuelve aparte tras rankear
- [x] 1.3 **Score de canciones**: acumular en TS por `recordingId`, `score += pesoRecencia(createdAt)` (todas las escuchas), `latestAt = max`
- [x] 1.4 **Score de álbumes**: (a) señales `releaseGroupId` directas: `pesoRecencia × ALBUM_LISTEN_MULTIPLIER`; (b) **roll-up**: 2ª consulta `track → release → release_group` (`category = 'studio'`) para el set de `recordingId` distintos; se elige en TS el release-group de primer lanzamiento más temprano (`first_release_date`, luego `first_release_year`, luego `id`); cada canción distinta mapeada aporta `ROLLUP_SONG_WEIGHT` **plano** (no su score, no por escucha)
- [x] 1.5 **Estado**: `rank()` filtra `score >= ROTATION_SCORE_THRESHOLD`, ordena por `score` desc, `latestAt` desc, `id`, corta a `ROTATION_MAX_PER_TYPE`; metadata resuelta con `RECORDING_ARTIST` / `RELEASE_GROUP_ARTIST`
- [x] 1.6 `getProfileInRotation = cache(async (username, viewerId) => …)`: `getProfileByUsername` → `null` si `!accessible`; `audiencesForProfile` → `null` si vacío; devolver `{ songs, albums }` (posible `songs: []` / `albums: []`); si ambos vacíos, devolver `null`
- [x] 1.7 Verificar que el módulo **no importa** `rating` / `favorite` / `review` (D1); dejar el import-set mínimo

## 2. Tests del servicio

- [x] 2.1 `src/services/profiles/in-rotation.test.ts` (mock-based, patrón `chainFor()` por tabla): canción reciente supera umbral y aparece; actividad > 30 días no cuenta; favorito+rating sin diario no aparece
- [x] 2.2 Recencia domina volumen antiguo (1 evento a 3d ⇒ score 3 ≥ 2 eventos a 28d ⇒ score 2); 2 `album_listen` explícitos pesan más que 3 canciones distintas por roll-up
- [x] 2.3 Repetir la misma canción 6× ⇒ score de álbum por roll-up = `ROLLUP_SONG_WEIGHT` (1) < umbral, el álbum no entra; 3 canciones distintas del mismo álbum de estudio ⇒ 3 ≥ umbral, sí entra
- [x] 2.4 Desambiguación del roll-up: canción en álbum de estudio original + compilado → se atribuye al original
- [x] 2.5 Filtrado por audiencia: entrada `private` no aparece para un seguidor; `public` vs `followers` según relación; `!accessible` → `null`
- [x] 2.6 Ambos bloques vacíos → `null`; sólo canciones o sólo álbumes → objeto con un bloque vacío
- [x] 2.7 Test estructural: el módulo no referencia las tablas de opinión

## 3. Zod y API

- [x] 3.1 `src/lib/api/schemas.ts`: `InRotationSongSchema` (`{ id, title, artistName: nullable, }`), `InRotationAlbumSchema` (`{ id, title, artistName: nullable, coverThumbUrl: nullable }`), `InRotationSchema` (`{ songs: [...], albums: [...] }`), `InRotationResponseSchema` (`{ inRotation: InRotationSchema.nullable() }`)
- [x] 3.2 `src/app/api/users/[username]/in-rotation/route.ts`: `GET`, resuelve viewer con `resolveSession` (opcional), `getProfileInRotation(username, viewerId)`; `404` `USER_NOT_FOUND` si el perfil no existe (propagado por `getProfileByUsername`), si no `{ inRotation }` (posible `null`)
- [x] 3.3 `src/app/api/users/[username]/in-rotation/route.test.ts`: perfil inexistente → `404 USER_NOT_FOUND`; sin acceso → `200 { inRotation: null }`; con datos → forma correcta; mockea el servicio

## 4. UI

- [x] 4.1 i18n `messages/{es,en}/users.json` — bloque `inRotation`: `heading` ("En rotación" / "In rotation"), `songsHeading` ("Canciones" / "Songs"), `albumsHeading` ("Álbumes" / "Albums"). Actualizar `src/test/messages` si hace falta
- [x] 4.2 `src/components/profiles/InRotation.tsx` (display, Server Component): recibe `InRotation`; bloque Canciones (lista título + artista, enlace `/song/{id}`) y bloque Álbumes (carátula + título + artista, enlace `/album/{id}`); un bloque vacío no se renderiza; sin score, sin contadores, sin fechas, sin numeración; encabezado `font-display text-xl text-paper`, contenedor `flex w-full max-w-2xl flex-col gap-4`
- [x] 4.3 `src/app/[locale]/users/[username]/sections.tsx`: `InRotationSection({ username, viewerId })` → `getProfileInRotation` → `<InRotation …/>` o `null`
- [x] 4.4 `src/app/[locale]/users/[username]/page.tsx`: montar `<Streamed><InRotationSection …/></Streamed>` en la columna principal pública **después de `PinnedSection`, antes de `FingerprintSection`**, y en la vista del dueño **después de `ShowcaseSection`, antes de `FingerprintSection`**. No reordenar el resto
- [x] 4.5 Verificación en el navegador: perfil con diario reciente → bloques Canciones + Álbumes, sin métricas, entre destacados y huella; diario vacío → sección ausente (`{ inRotation: null }`); usuario inexistente → 404; regla anti-repetición confirmada (canción 5× aparece como canción, no infla su álbum)

## 5. Composición y regresión

- [x] 5.1 Ajustar `sections.test.tsx` y `page.test.tsx`: mock de `@/services/profiles/in-rotation`, stub de `InRotation`, casos de `InRotationSection` (pasa datos / `null`) y de montaje en ambos layouts entre destacados y huella
- [x] 5.2 Confirmar sin regresión: `taste-fingerprint`, `listUserDiary`, feed y recencia intactos; suite afectada en verde

## 6. Docs

- [x] 6.1 `docs/05-features/user-profile.md`: sección "En rotación" — qué la alimenta (solo diario, 30 d), `señales → score → estado`, heurística experimental de álbum, filtrado por audiencia, tono sin métricas, ubicación entre destacados y huella
- [x] 6.2 `docs/04-api/contracts.md`: `GET /api/users/[username]/in-rotation`

## 7. Cierre

- [x] 7.1 `openspec validate add-profile-in-rotation --strict` pasa
- [x] 7.2 `typecheck`, `lint`, `test`, `build` en verde
- [ ] 7.3 Archivar el cambio y sincronizar specs cuando esté implementado y aprobado
