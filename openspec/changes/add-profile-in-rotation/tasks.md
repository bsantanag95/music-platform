## 1. Servicio: señales → score → estado

- [ ] 1.1 `src/services/profiles/in-rotation.ts` — constantes nombradas: `ROTATION_WINDOW_DAYS = 30`, `RECENCY_WEIGHTS` (`{ current: 3 (0–7d), recent: 2 (8–21d), residual: 1 (22–30d) }`), `ALBUM_LISTEN_MULTIPLIER = 2`, `ROTATION_SCORE_THRESHOLD = 3`, `ROTATION_MAX_PER_TYPE = 8`. Tipos `InRotationSong`, `InRotationAlbum`, `InRotation { songs, albums }`
- [ ] 1.2 Consulta de **señales**: filas de `listen_entry` del dueño con `created_at >= now() - interval '30 days'` y `audience IN (audiencias visibles)`, sólo objetivos `recording_id` / `release_group_id` (ignorar `artist_id`). Traer `created_at`, target, y kind (`song_listen` | `album_listen`)
- [ ] 1.3 **Score de canciones**: agrupar señales `song_listen` por `recording_id`, `score = Σ pesoRecencia(created_at)`. Resolver título + artista acreditado (`PRIMARY_ARTIST_SQL(null, recordingId)` / join `recording`)
- [ ] 1.4 **Score de álbumes**: (a) señales `album_listen` por `release_group_id` con peso `× ALBUM_LISTEN_MULTIPLIER`; (b) **roll-up** canción→álbum: mapear cada `recording_id` a un release-group vía `track → release → release_group` filtrando `category = 'studio'`, elegir el de `first_release_date` más temprano (nulls last, luego `first_release_year`, luego `id`); cada **canción distinta** aporta su score de canción una vez al álbum (no cada escucha). Sumar (a) + (b) por `release_group_id`. Resolver título + carátula + artista acreditado
- [ ] 1.5 **Estado**: filtrar entidades con `score >= ROTATION_SCORE_THRESHOLD`, ordenar por `score` desc y `created_at` del evento más reciente desc, cortar a `ROTATION_MAX_PER_TYPE` por bloque
- [ ] 1.6 `getProfileInRotation = cache(async (username, viewerId) => …)`: `getProfileByUsername` → `null` si `!accessible`; `audiencesForProfile` → `null` si vacío; devolver `{ songs, albums }` (posible `songs: []` / `albums: []`); si ambos vacíos, devolver `null`
- [ ] 1.7 Verificar que el módulo **no importa** `rating` / `favorite` / `review` (D1); dejar el import-set mínimo

## 2. Tests del servicio

- [ ] 2.1 `src/services/profiles/in-rotation.test.ts` (mock-based, patrón `chainFor()` por tabla): canción reciente supera umbral y aparece; actividad > 30 días no cuenta; favorito+rating sin diario no aparece
- [ ] 2.2 Recencia domina volumen antiguo (1 evento a 3d ≥ 2 eventos a 28d); registro explícito de álbum pesa más que N escuchas de canciones sueltas
- [ ] 2.3 Repetir la misma canción 6× no mete el álbum en rotación; 3 canciones distintas del mismo álbum de estudio sí
- [ ] 2.4 Desambiguación del roll-up: canción en álbum de estudio original + compilado → se atribuye al original
- [ ] 2.5 Filtrado por audiencia: entrada `private` no aparece para un seguidor; `public` vs `followers` según relación; `!accessible` → `null`
- [ ] 2.6 Ambos bloques vacíos → `null`; sólo canciones o sólo álbumes → objeto con un bloque vacío
- [ ] 2.7 Test estructural: el módulo no referencia las tablas de opinión

## 3. Zod y API

- [ ] 3.1 `src/lib/api/schemas.ts`: `InRotationSongSchema` (`{ id, title, artistName: nullable, }`), `InRotationAlbumSchema` (`{ id, title, artistName: nullable, coverThumbUrl: nullable }`), `InRotationSchema` (`{ songs: [...], albums: [...] }`), `InRotationResponseSchema` (`{ inRotation: InRotationSchema.nullable() }`)
- [ ] 3.2 `src/app/api/users/[username]/in-rotation/route.ts`: `GET`, resuelve viewer con `resolveSession` (opcional), `getProfileInRotation(username, viewerId)`; `404` `USER_NOT_FOUND` si el perfil no existe (propagado por `getProfileByUsername`), si no `{ inRotation }` (posible `null`)
- [ ] 3.3 `src/app/api/users/[username]/in-rotation/route.test.ts`: perfil inexistente → `404 USER_NOT_FOUND`; sin acceso → `200 { inRotation: null }`; con datos → forma correcta; mockea el servicio

## 4. UI

- [ ] 4.1 i18n `messages/{es,en}/users.json` — bloque `inRotation`: `heading` ("En rotación" / "In rotation"), `songsHeading` ("Canciones" / "Songs"), `albumsHeading` ("Álbumes" / "Albums"). Actualizar `src/test/messages` si hace falta
- [ ] 4.2 `src/components/profiles/InRotation.tsx` (display, Server Component): recibe `InRotation`; bloque Canciones (lista título + artista, enlace `/song/{id}`) y bloque Álbumes (carátula + título + artista, enlace `/album/{id}`); un bloque vacío no se renderiza; sin score, sin contadores, sin fechas, sin numeración; encabezado `font-display text-xl text-paper`, contenedor `flex w-full max-w-2xl flex-col gap-4`
- [ ] 4.3 `src/app/[locale]/users/[username]/sections.tsx`: `InRotationSection({ username, viewerId })` → `getProfileInRotation` → `<InRotation …/>` o `null`
- [ ] 4.4 `src/app/[locale]/users/[username]/page.tsx`: montar `<Streamed><InRotationSection …/></Streamed>` en la columna principal pública **después de `PinnedSection`, antes de `FingerprintSection`**, y en la vista del dueño **después de `ShowcaseSection`, antes de `FingerprintSection`**. No reordenar el resto
- [ ] 4.5 Verificación en el navegador: perfil con diario reciente (canciones y/o álbumes aparecen, sin métricas), perfil sin diario reciente (sección ausente), vista de seguidor vs público (rotación distinta), consola sin errores

## 5. Composición y regresión

- [ ] 5.1 Ajustar `sections.test.tsx` y `page.test.tsx`: mock de `@/services/profiles/in-rotation`, stub de `InRotation`, casos de `InRotationSection` (pasa datos / `null`) y de montaje en ambos layouts entre destacados y huella
- [ ] 5.2 Confirmar sin regresión: `taste-fingerprint`, `listUserDiary`, feed y recencia intactos; suite afectada en verde

## 6. Docs

- [ ] 6.1 `docs/05-features/user-profile.md`: sección "En rotación" — qué la alimenta (solo diario, 30 d), `señales → score → estado`, heurística experimental de álbum, filtrado por audiencia, tono sin métricas, ubicación entre destacados y huella
- [ ] 6.2 `docs/04-api/contracts.md`: `GET /api/users/[username]/in-rotation`

## 7. Cierre

- [ ] 7.1 `openspec validate add-profile-in-rotation --strict` pasa
- [ ] 7.2 `typecheck`, `lint`, `test`, `build` en verde
- [ ] 7.3 Archivar el cambio y sincronizar specs cuando esté implementado y aprobado
