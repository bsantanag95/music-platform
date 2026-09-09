## 1. Servicio de eventos ambiente

- [ ] 1.1 `src/services/feed/ambient.ts` — constantes: `AMBIENT_WINDOW_DAYS = 14`, `AMBIENT_SAMPLE = 3`, `AMBIENT_MAX_GROUPS = 8`
- [ ] 1.2 Tipos `AmbientItem` (`label`, `href: string | null`) y `AmbientGroup` (`kind: "follow-artist" | "follow-user" | "collection"`, `author: { username; displayName }`, `count`, `sample: AmbientItem[]`, `lastAt: string`)
- [ ] 1.3 `getFeedAmbientEvents = cache(async (viewerId) => { groups })` — paso 1: seguidos aceptados menos bloqueados en cualquier dirección → `followeeIds`; si vacío, `{ groups: [] }`
- [ ] 1.4 Consulta `artist_follow` — `userId IN followeeIds`, `createdAt >= cutoff`, join `artist`; filas `{ authorId, authorUsername, authorDisplayName, artistId, artistName, at }`
- [ ] 1.5 Consulta `user_follow` — `followerId IN followeeIds`, `status = 'accepted'`, `updatedAt >= cutoff`, join `app_user` (followed); filtro: `followed.profileVisibility = 'public'` OR el lector sigue a `followed` (accepted); `followed.id <> viewerId`; sin bloqueo lector↔followed. Filas `{ authorId, …, followedUsername, followedDisplayName, at }`
- [ ] 1.6 Consulta `collection_entry` — `userId IN followeeIds`, `audience IN ('followers','public')`, `createdAt >= cutoff`, join `release_group`; filas `{ authorId, …, releaseGroupId, releaseTitle, at }`
- [ ] 1.7 Agrupar cada fuente por `authorId` → `AmbientGroup` (sample ordenada por `at` desc, cortada a `AMBIENT_SAMPLE`; `count` = total; `lastAt` = máximo); unir todos los grupos, ordenar por `lastAt` desc, cortar a `AMBIENT_MAX_GROUPS`
- [ ] 1.8 Tests (`ambient.test.ts`, mock de `db`): una persona con 4 follows de artista → un grupo `count` 4, sample 3; colección `private` excluida, `followers`/`public` incluida; follow a perfil público visible, a privado no seguido omitido; follow al propio lector omitido; actividad del lector excluida (no está en `followeeIds`); bloqueo excluye; sin seguidos → `{ groups: [] }`; orden por `lastAt` desc y corte a `MAX_GROUPS`

## 2. Presentación

- [ ] 2.1 `src/components/feed/FeedAmbientStrip.tsx` — Server Component `async function FeedAmbientStrip({ groups }: { groups: AmbientGroup[] })`; si `groups.length === 0` devuelve `null`
- [ ] 2.2 Encabezado `t("ambient.title")` (menor, muted); por grupo una línea `font-data text-xs`: autor enlazado (`/users/{username}`) + verbo por `kind` + muestra de ítems enlazados
- [ ] 2.3 Helper de muestra: hasta `AMBIENT_SAMPLE` labels enlazados (`href` cuando no es null) unidos con coma + `t("ambient.andMore", { count })` cuando `count` supera la muestra
- [ ] 2.4 Verbos i18n por tipo: `ambient.followedArtists`, `ambient.followedUsers`, `ambient.addedToCollection` (cada uno recibe `{ names }`/`{ titles }` ya formateado y opcionalmente `{ count }`)
- [ ] 2.5 Sin carátula, sin contador destacado, sin insignia; marcador de tiempo relativo opcional (`lastAt`) por línea
- [ ] 2.6 Tests (`FeedAmbientStrip.test.tsx`): colapsa vacío; una línea por grupo con autor + verbo + ítems enlazados; "y N más" cuando corresponde; los tres verbos

## 3. Página

- [ ] 3.1 `src/app/[locale]/me/feed/page.tsx` — sumar `getFeedAmbientEvents(user.id)` al `Promise.all`
- [ ] 3.2 Renderizar `<FeedAmbientStrip groups={ambient.groups} />` **debajo** de `<FeedList>`

## 4. i18n

- [ ] 4.1 `messages/es/feed.json` — bloque `ambient`: `title` ("También en tu red"), `followedArtists` ("siguió a {names}"), `followedUsers` ("empezó a seguir a {names}"), `addedToCollection` ("sumó {titles} a su colección"), `andMore` ("y {count} más")
- [ ] 4.2 `messages/en/feed.json` — mismo bloque en inglés
- [ ] 4.3 Verificar paridad y registro de namespace (`messages.*` tests ya cubren `feed`)

## 5. Docs

- [ ] 5.1 `docs/05-features/activity-feed.md` — la fila "Automática" de la tabla de las cuatro naturalezas: de "todavía no llega al feed" a "franja al pie de `/me/feed`"
- [ ] 5.2 Nueva sección "Franja de eventos ambiente": las tres fuentes, visibilidad por fuente (incluida la regla de `user_follow`), ventana, agrupación por autor, posición de coda, tono de-enfatizado, e independencia total del listado cronológico

## 6. Cierre

- [ ] 6.1 `openspec validate add-feed-ambient-events --strict` pasa
- [ ] 6.2 `typecheck`, `lint`, `test`, `build` en verde; verificar contra la BD de desarrollo que las tres consultas ejecutan sin error
- [ ] 6.3 Verificación en el navegador: con datos, la franja aparece al pie con líneas agrupadas; sin datos no se renderiza; el listado cronológico intacto; consola sin errores
- [ ] 6.4 Archivar el cambio y sincronizar specs cuando esté implementado y aprobado
