## Why

El diario propio (`/me/diary`) ya se agrupa siempre por mes en la vista de Cronología (openspec:
`redesign-diary-row`), pero no hay forma de saltar directo a un mes o año concreto — solo se puede
recorrer paginando "Cargar más" hasta llegar ahí. Tampoco hay forma de ocultar un mes ya revisado
para concentrarse en otro sin perderlo de la pantalla. Con varios meses de historial, ambas
carencias hacen que el diario se vuelva progresivamente más incómodo de navegar.

## What Changes

- Se agregan dos filtros nuevos a la barra de filtros existente (junto a contexto, reacción y
  audiencia): **Año** y **Mes**. Ninguno ofrece un rango genérico — ambos se completan únicamente
  con los años/meses donde el usuario realmente tiene escuchas registradas. El selector de Mes se
  acota al Año elegido (sus opciones son los meses con registros dentro de ese año).
- Nuevo endpoint `GET /api/me/diary/months` y servicio `listMyDiaryMonths` que devuelven los pares
  año/mes distintos con al menos una escucha del usuario, del más reciente al más antiguo — sin
  conteos, siguiendo la misma regla anti-métricas que ya rige la vista de Cronología.
- `DiaryFilters`/`listMyDiary` ganan condiciones de rango de fecha por año y, opcionalmente, mes;
  igual que el resto de los filtros, se combinan de forma independiente y simultánea con texto
  libre, contexto, reacción y audiencia. Un mes sin año es un error de validación (no hay "este mes
  de cualquier año").
- Cada encabezado de mes en la vista de Cronología suma un botón de flecha (colapsar/expandir) que
  oculta o vuelve a mostrar las filas de ese mes puntual — todos los meses arrancan expandidos, como
  hoy. Es un control por mes, no un "colapsar todos"; el encabezado nunca muestra un conteo de
  cuántas entradas oculta, para no reabrir la regla anti-métricas ya establecida.
- Sin cambios de esquema de base de datos — el índice compuesto existente `idx_listen_entry_user_created`
  (`user_id`, `created_at`) ya cubre la nueva consulta de meses distintos.

## Capabilities

### New Capabilities

(ninguna — extiende la capacidad existente `listen-diary`)

### Modified Capabilities

- `listen-diary`: el requisito "Diario propio" gana año y mes como filtros combinables adicionales
  (con su propio endpoint de meses disponibles); el requisito "Vista de cronología del diario
  propio" gana el colapso/expansión por mes, dejando explícito que no reintroduce el conmutador de
  vistas que este mismo diario retiró en `redesign-diary-row`.

## Impact

- `src/services/diary/diary.ts` — `DiaryFilters` gana `year`/`month`; `listMyDiary` suma condiciones
  de rango de fecha; nueva función `listMyDiaryMonths`.
- `src/app/api/me/diary/route.ts` — parseo/validación de `year`/`month` en el `GET` existente.
- Nuevo: `src/app/api/me/diary/months/route.ts` — endpoint de meses disponibles.
- `src/lib/api/schemas.ts` — nuevo `DiaryMonthsResponseSchema` (`{ months: [{ year, month }] }`).
- `src/lib/api/diary.ts` — nuevo `getMyDiaryMonths()`; `DiaryFiltersParams` gana `year`/`month`.
- `src/components/diary/DiaryActivityList.tsx` — dos `FilterSelect` nuevos (Año/Mes), estado de
  colapso por mes, botón de flecha en cada encabezado de grupo.
- Sin impacto en `src/components/diary/DiaryList.tsx`, en `ListenEntryForm`, ni en el esquema de DB.
