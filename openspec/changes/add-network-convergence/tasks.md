## 1. Servicio de convergencia

- [x] 1.1 `src/services/feed/convergence.ts` — constantes con nombre: `CONVERGENCE_WINDOW_DAYS = 7`, `CONVERGENCE_MIN_PEOPLE = 3`, `CONVERGENCE_MAX_ITEMS = 5`, `CONVERGENCE_NAME_SAMPLE = 3`
- [x] 1.2 Tipo `ConvergenceItem` (`target: { type: "release-group" | "recording"; id; title; artistName; coverThumbUrl }`, `peopleCount`, `peopleSample: { username; displayName }[]`, `lastInteractionAt`)
- [x] 1.3 `getNetworkConvergence = cache(async (viewerId) => { items })` — paso 1: seguidos aceptados del lector menos bloqueados en cualquier dirección → `visibleFolloweeIds`; si vacío, `{ items: [] }` sin más queries
- [x] 1.4 Paso 2: una sentencia `db.execute(sql\`WITH interactions AS (UNION ALL de listen_entry/favorite [audiencia followers|public] + rating/review [updated_at]), converged AS (GROUP BY release_group_id, recording_id HAVING COUNT(DISTINCT user_id) >= N ORDER BY people DESC, last_at DESC LIMIT M) SELECT c.*, título/carátula por LEFT JOIN a release_group/recording, artist_name por subquery escalar sobre credit con nombre de tabla explícito, people_sample por json_agg de DISTINCT ON (user_id) sobre interactions ordenado por fecha desc\`)`
- [x] 1.5 Mapear filas a `ConvergenceItem[]`, acotar `peopleSample` a `CONVERGENCE_NAME_SAMPLE` en JS, `lastInteractionAt` a ISO
- [x] 1.6 Tests (`convergence.test.ts`, mock de `db` estilo `feed.test.ts`): 3 seguidos distintos → obra con `peopleCount` 3; varias interacciones de una persona no cuentan como varias; el lector no está en `visibleFolloweeIds`; sin seguidos → `{ items: [] }` sin query; ordena por personas desc; recorta a `MAX_ITEMS`; `peopleSample` acotada

## 2. Presentación

- [x] 2.1 `src/components/feed/NetworkConvergence.tsx` — Server Component `async function NetworkConvergence({ items }: { items: ConvergenceItem[] })`; si `items.length === 0` devuelve `null`
- [x] 2.2 Encabezado `t("convergence.title")`; por ítem: `CoverThumb` (carátula o disco), título enlazado (`targetHref(target.type, target.id)`) + artista, y línea muted con nombres + `t("convergence.people", { count })`
- [x] 2.3 Helper de nombres: hasta `CONVERGENCE_NAME_SAMPLE` display-names (o `@username`) unidos con coma + `t("convergence.andMore", { count })` cuando `peopleCount` supera la muestra
- [x] 2.4 Sin métricas de gamificación: sin "tendencia", sin fuego, sin insignia de número, sin ranking

## 3. Página

- [x] 3.1 `src/app/[locale]/me/feed/page.tsx` — sumar `getNetworkConvergence(user.id)` al `Promise.all`
- [x] 3.2 Renderizar `<NetworkConvergence items={convergence.items} />` dentro del `<main>`, **encima** de `<FeedList>`

## 4. i18n

- [x] 4.1 `messages/es/feed.json` — bloque `convergence`: `title` ("En tu red esta semana"), `people` (`"{count, plural, one {# persona que seguís} other {# personas que seguís}} esta semana"`), `andMore` (`"y {count} más"`)
- [x] 4.2 `messages/en/feed.json` — mismo bloque en inglés
- [x] 4.3 Verificar paridad y registro de namespace (`messages.namespaces.test.ts` / `messages.keys.test.ts` ya cubren `feed`)

## 5. Docs

- [x] 5.1 `docs/05-features/activity-feed.md` — nueva sección "Convergencia de la red": qué cuenta como interacción, umbral/ventana, visibilidad idéntica al feed, síntesis única, panel en la cabecera, tono cultural, carácter aditivo
- [x] 5.2 Tabla de las cuatro naturalezas de actividad (Personal / Social / Relevante / Automática) y dónde vive cada una

## 6. Cierre

- [x] 6.1 `openspec validate add-network-convergence --strict` pasa
- [x] 6.2 `typecheck`, `lint`, `test` (1178 pasan), `build` en verde
- [x] 6.3 Verificación cubierta por `convergence.test.ts` (7 casos: umbral, personas distintas, bloqueo, lector excluido, orden, muestra) y `NetworkConvergence.test.tsx` (síntesis única, "y N más", canción, panel colapsado). Walk autenticado con datos sembrados no factible en este entorno
- [ ] 6.4 Archivar el cambio y sincronizar specs cuando esté implementado y aprobado
