## 1. Audiencia por defecto según intención

- [x] 1.1 `src/services/diary/diary.ts` — `createListenEntry` inserta `audience: "private"` explícito (no depende del default `followers` de la columna)
- [x] 1.2 Tests de `diary.test.ts`: una entrada creada al instante queda `private`; el resto del comportamiento de creación intacto
- [x] 1.3 `src/components/diary/ListenEntryForm.tsx` — `initialAudience` (= `initial.audience`); flag `audienceTouched` (true al seleccionar una opción)
- [x] 1.4 `useEffect` sobre `body` + `reaction`: si `initialAudience === "private"` y `!audienceTouched` → `audience` = `"followers"` cuando hay nota o reacción, `"private"` cuando ambas están vacías. Si `initialAudience !== "private"`, el efecto no corre
- [x] 1.5 Tests de `ListenEntryForm.test.tsx`: entrada `private` + escribir nota → chip pasa a `followers`; borrar nota y reacción → vuelve a `private`; elegir audiencia a mano congela (tocar `public`, luego escribir nota → sigue `public`); entrada que arranca `followers` → no se toca sola

## 2. Vocabulario y encuadre

- [x] 2.1 `messages/{es,en}/diary.json` — `registerListen` ("Registrar escucha" / "Log a listen"), `logInDiary` ("Anotar en el diario" / "Add to diary"); revisar `marked` → "Registrada", `listening` → "Registrando…", `signInToListen`, y cualquier texto de encuadre de completitud
- [x] 2.2 `src/components/diary/MarkAsListened.tsx` — usar `t("registerListen")` como rótulo; ajustar textos de estado
- [x] 2.3 Auditar `artist/[id]`, `album/[id]`, `song/[id]` y cualquier otro copy ("marcá lo que escuchaste", "escuchado" como estado) → encuadre de registro intencional
- [x] 2.4 Confirmar que `ListenEntryForm` no importa `@/lib/api/ratings` ni `@/lib/api/reviews` (test estructural, mismo criterio que la independencia diario/rating)
- [x] 2.5 Ajustar `MarkAsListened.test.tsx` y cualquier test que asserte el rótulo viejo

## 3. Vista de cronología

- [x] 3.1 `src/components/diary/DiaryActivityList.tsx` — conmutador `Lista | Cronología` (dos botones o `FilterSelect`) sobre la barra de filtros; modo en `useState`, arranca en Lista
- [x] 3.2 Modo Cronología: agrupar `entries` por mes calendario de `createdAt` (locale del usuario), encabezado por mes (`Intl.DateTimeFormat` `{ month: "long", year: "numeric" }`), filas iguales a la lista en orden desc dentro de cada mes
- [x] 3.3 Sin conteos por mes, sin totales, sin racha; edición y borrado disponibles igual que en la lista; agrupa a través de "Cargar más"
- [x] 3.4 Tests de `DiaryActivityList.test.tsx`: el conmutador cambia de vista; en Cronología aparecen encabezados de mes y las filas agrupadas; sin métricas; edición sigue funcionando

## 4. i18n y docs

- [x] 4.1 `messages/{es,en}/diary.json` — `viewList` / `viewTimeline`, `timelineMonthHeading` si hace falta una plantilla; paridad y registro de namespace (`messages.*` tests)
- [x] 4.2 `docs/05-features/listening-diary-and-ratings.md` — audiencia por intención (privado por defecto, sube a `followers` con nota/reacción salvo elección explícita, solo entradas nuevas); vocabulario "Registrar escucha" / "Anotar en el diario" y el encuadre anti-completitud; la vista de cronología por mes; nota de que la intensidad se infiere y no se declara

## 5. Cierre

- [x] 5.1 `openspec validate deepen-listening-diary --strict` pasa
- [x] 5.2 `typecheck`, `lint`, `test` (1195 pasan), `build` en verde (una corrida de `next build` falló de forma transitoria en `collect page data` de `/search`, sin relación con el cambio; la re-corrida pasa limpia)
- [x] 5.3 Verificación cubierta por `diary.test.ts`, `ListenEntryForm.test.tsx` (audiencia sigue la intención, congelamiento, entrada vieja intacta) y `DiaryActivityList.test.tsx` (conmutador, agrupado por mes sin métricas, edición). Walk autenticado en navegador no factible en este entorno
- [ ] 5.4 Archivar el cambio y sincronizar specs cuando esté implementado y aprobado
