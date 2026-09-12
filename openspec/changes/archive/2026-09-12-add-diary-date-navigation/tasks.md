## 1. Endpoint de meses disponibles

- [x] 1.1 En `src/services/diary/diary.ts`: nueva función `listMyDiaryMonths(userId)` — `db.select`
      con `date_trunc('month', listenEntry.createdAt)` como expresión de bucket (mismo patrón que
      `listDecades` en `src/services/discovery/discovery.ts`), `groupBy`/`orderBy` sobre esa misma
      expresión, filtrado por `eq(listenEntry.userId, userId)`. Devuelve `{ year, month }[]`
      descendente, sin ningún campo de conteo.
- [x] 1.2 En `src/lib/api/schemas.ts`: nuevo `DiaryMonthSchema` (`{ year: number; month: 1-12 }`) y
      `DiaryMonthsResponseSchema` (`{ months: DiaryMonthSchema[] }`), siguiendo la convención de
      objeto con clave nombrada del resto de los list-response schemas del proyecto.
- [x] 1.3 Nueva ruta `src/app/api/me/diary/months/route.ts`: `GET` autenticado que llama
      `listMyDiaryMonths` y responde `{ months }`.
- [x] 1.4 En `src/lib/api/diary.ts`: nueva función de cliente `getMyDiaryMonths()`.
- [x] 1.5 Test de servicio: `listMyDiaryMonths` agrupa por mes calendario, orden descendente, sin
      campo de conteo en la fila devuelta.
- [x] 1.6 Test de ruta/integración razonable para `GET /api/me/diary/months` (sesión requerida,
      forma de la respuesta).

## 2. Filtro de año y mes en `listMyDiary`

- [x] 2.1 En `src/services/diary/diary.ts`: `DiaryFilters` gana `year?: number` y `month?: number`;
      en `listMyDiary`, agregar condición de rango `[year-01-01, (year+1)-01-01)` sobre `createdAt`
      cuando hay `year`, acotada a `[year-month-01, year-(month+1)-01)` (con acarreo de año en
      diciembre) cuando también hay `month`.
- [x] 2.2 En `src/app/api/me/diary/route.ts`: parsear `year`/`month` de la query string (números);
      si `month` está presente sin `year`, `ApiError("VALIDATION_ERROR", 400, ...)` antes de tocar
      el servicio — mismo criterio que el resto de los filtros de vocabulario cerrado.
- [x] 2.3 En `src/lib/api/diary.ts`: `DiaryFiltersParams` gana `year`/`month`; `getMyDiary` los suma
      a la query string cuando están presentes.
- [x] 2.4 Test de servicio: filtra por año solo; filtra por año + mes; combina con contexto/reacción/
      audiencia/búsqueda existentes; un mes sin año no filtra (o lanza, según cómo se valide) y no
      rompe el resto de los filtros.
- [x] 2.5 Test de ruta: mes sin año responde `VALIDATION_ERROR` sin tocar el listado.

## 3. Filtros de Año y Mes en la UI

- [x] 3.1 En `DiaryActivityList.tsx`: cargar `getMyDiaryMonths()` una vez (TanStack Query) al montar
      el componente.
- [x] 3.2 Derivar del resultado: lista de años distintos (para el `FilterSelect` de Año) y, dado el
      año elegido en `DiaryFiltersState`, la lista de meses de ese año (para el `FilterSelect` de
      Mes) — el selector de Mes está deshabilitado o vacío hasta que se elige un Año.
- [x] 3.3 Extender `DiaryFiltersState`/`toApiFilters` con `year`/`month`; al cambiar de Año, limpiar
      el Mes elegido si ya no pertenece a las opciones del nuevo año.
- [x] 3.4 Etiquetas de mes vía `Intl.DateTimeFormat(locale, { month: "long" })` (mismo mecanismo que
      ya usan los encabezados de `groupByMonth`) — sin agregar claves de traducción por mes.
- [x] 3.5 Claves i18n nuevas en `messages/{es,en}/diary.json`: etiquetas de los filtros Año/Mes
      (`yearLabel`/`monthLabel`, `filterAllYear`/`filterAllMonth`).
- [x] 3.6 Test de componente: elegir un año filtra; elegir año + mes filtra ambos; cambiar de año
      resetea un mes que ya no aplica; combinado con los filtros existentes sigue funcionando.

## 4. Colapsar/expandir por mes en la Cronología

- [x] 4.1 En `DiaryActivityList.tsx`: estado `collapsedMonths: Set<string>` (claves = `monthKey`, el
      mismo criterio que ya usa `groupByMonth`); botón de flecha en cada `<h3>` de grupo con
      `aria-expanded` y `aria-label` localizado, que alterna la clave del mes en el set.
- [x] 4.2 Cuando un mes está colapsado, no renderizar su `<ul>` de filas (evita montar paneles de
      ampliación ocultos) — el encabezado se mantiene visible, sin ningún conteo de filas ocultas.
- [x] 4.3 Sin control de "colapsar todos": solo el botón individual por encabezado.
- [x] 4.4 Claves i18n nuevas: `collapseMonth`/`expandMonth` (aria-label del botón de flecha).
- [x] 4.5 Test de componente: todos los meses arrancan expandidos; colapsar uno oculta solo sus
      filas; expandirlo las vuelve a mostrar en el mismo orden; no hay ningún control de colapsar/
      expandir todos; el encabezado nunca muestra un conteo.

## 5. Validación

- [x] 5.1 `typecheck`, `lint`, `test` (suite completa), `build` en verde.
- [x] 5.2 `openspec validate add-diary-date-navigation --strict`.
- [x] 5.3 Verificar en el navegador con datos reales: filtrar por año, por año+mes, y colapsar/
      expandir un mes puntual. Encontró y corrigió un bug real: las opciones del selector de Mes
      mostraban el nombre de mes equivocado (formateaba una fecha UTC sin fijar `timeZone: "UTC"`).
