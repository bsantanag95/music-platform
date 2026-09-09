## 1. Detección del pico en `feed-grouping.ts`

- [ ] 1.1 Añadir constantes con nombre junto a `GROUP_MIN`: `ROTATION_PEAK_WINDOW_DAYS = 7`, `ROTATION_PEAK_MIN_SONG = 3`, `ROTATION_PEAK_MIN_ALBUM = 2`
- [ ] 1.2 Definir `FeedRotationPeak` (`kind: "rotation-peak"`, `id`, `target: { type: "recording" | "release-group"; id; title; artistName }`, `count`, `author`, `createdAt`) y ampliar `FeedRow` a `FeedEntry | FeedEntryGroup | FeedRotationPeak`
- [ ] 1.3 `groupFeedRuns(entries, now = new Date())` — nuevo parámetro `now`
- [ ] 1.4 Helper `rotationPeakForRun(run, now): FeedRotationPeak | null` — todas las entradas comparten `target.id`; `target.type` ∈ {`recording`, `release-group`}; contar entradas con `createdAt >= now - ROTATION_PEAK_WINDOW_DAYS`; devolver pico si la cuenta alcanza el umbral por tipo (canción 3, álbum 2), con `count` = cuenta en ventana y `createdAt` = el más reciente de la corrida
- [ ] 1.5 En el bucle de corridas de escuchas: evaluar `rotationPeakForRun` **antes** del corte `run.length >= GROUP_MIN` (para permitir el pico de álbum de 2); si hay pico, emitir la fila `FeedRotationPeak` y avanzar; si no, seguir con la lógica actual (grupo si `>= GROUP_MIN`, si no entradas sueltas)
- [ ] 1.6 Confirmar que las reglas de corte no cambian: tier 1, otro objetivo, otro autor, u otro `kind` siguen cerrando la corrida antes de evaluar el pico

## 2. Presentación en `FeedActivityList.tsx`

- [ ] 2.1 Pasar `useNow()` a `groupFeedRuns(entries, now)` (mismo valor estable que usa `RelativeDate`)
- [ ] 2.2 Rama de render `row.kind === "rotation-peak"` en el `.map`, antes de la rama `"group"`: `<li>` con el mismo padding/indent que la fila de grupo (`pl-14 sm:pl-16` en feed, `pl-4` en self), sin celda
- [ ] 2.3 Componente `RotationPeakRow` — `[autor ·] En rotación · {título enlazado}[ · artista]` + `RelativeDate` a la derecha; `hideAuthor` en variante `self`; título vía `targetHref(target.type, target.id)`
- [ ] 2.4 Sin métricas de gamificación: solo el rótulo, el objetivo y `t("rotationPeak", { title, count })`

## 3. i18n

- [ ] 3.1 `messages/es/feed.json` — `"rotationPeak": "En rotación · {title} · {count, plural, one {# registro} other {# registros}} esta semana"`
- [ ] 3.2 `messages/en/feed.json` — `"rotationPeak": "In rotation · {title} · {count, plural, one {# log} other {# logs}} this week"`

## 4. Tests

- [ ] 4.1 `feed-grouping.test.ts` — pico de canción (3+ del mismo tema en ventana → `kind: "rotation-peak"`, `count` correcto); pico de álbum con corrida de 2; 2 escuchas de canción → sin pico, filas sueltas; corrida del mismo tema con solo 1 en ventana → grupo genérico, no pico; corrida de títulos distintos → grupo genérico; corrida de mismo artista → grupo genérico (nunca pico); tier 1 entre medio corta el pico; `now` inyectado
- [ ] 4.2 `FeedActivityList.test.tsx` — el pico renderiza "En rotación · {título} · N registros esta semana" con el título enlazado, sin celda de carátula, sin emoji/racha; en `variant="self"` sin nombre de autor
- [ ] 4.3 Confirmar sin regresión del grupo genérico y del resto de la jerarquía (`src/components/feed`, `src/components/home`)

## 5. Docs

- [ ] 5.1 `docs/05-features/activity-feed.md` — sección "Agrupación por tier": añadir el pico de rotación (cuándo una corrida del mismo objetivo se sintetiza, umbrales canción/álbum, ventana 7 d, artista excluido, tono cultural)
- [ ] 5.2 Nota de relación: el pico del feed (7 d, en contexto de una corrida visible) vs la sección "En rotación" del perfil (30 d, cálculo fiel) — mismo concepto, distinta escala

## 6. Cierre

- [ ] 6.1 `openspec validate add-feed-rotation-peak --strict` pasa
- [ ] 6.2 `typecheck`, `lint`, `test`, `build` en verde
- [ ] 6.3 Verificación en el navegador: una corrida de la misma canción se muestra como "En rotación", una de títulos distintos como grupo genérico; consola sin errores
- [ ] 6.4 Archivar el cambio y sincronizar specs cuando esté implementado y aprobado
