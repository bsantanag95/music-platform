## Context

`/me/diary` (`DiaryActivityList.tsx`) ya agrupa siempre por mes calendario en la vista de Cronología
(`redesign-diary-row`, archivado): un `<h3>` por mes, filas debajo, sin conteos ni conmutador de
vistas. Los filtros actuales (`DiaryFiltersState`/`DiaryFiltersParams`) son texto libre, contexto,
reacción y audiencia — todos vocabularios cerrados o texto, ninguno de rango de fecha. `listMyDiary`
(`src/services/diary/diary.ts`) arma sus condiciones como un array de `SQL` independientes
(`conditions.push(...)`), con el propio `<h3>` de mes generado por `groupByMonth` a partir de
`monthKey` (`src/components/feed/feed-row-parts.tsx`).

Precedente estructural para "opciones de un filtro derivadas de los datos reales": `listDecades()`
(`src/services/discovery/discovery.ts:137-148`), que agrupa `release_group.first_release_year` por
década con una expresión aritmética en `groupBy`/`select`. No existe hoy ningún endpoint
`/months`/`/years` en el proyecto — sería la primera vez que un filtro se puebla así en la capa
`api/`. El índice compuesto `idx_listen_entry_user_created` (`user_id`, `created_at`) ya cubre tanto
el `listMyDiary` actual como la nueva consulta de meses distintos.

`src/app/api/me/diary/route.ts` valida filtros a mano (`parseEnumParam`, sin Zod) y traduce
cualquier valor inválido a `ApiError("VALIDATION_ERROR", 400, ...)` — el mismo patrón que debe
seguir el filtro de año/mes. Las respuestas de listado del proyecto usan siempre un objeto con clave
nombrada (`{ months: [...] }`), nunca un array desnudo (`FollowedArtistsResponseSchema`,
`EditorialListsResponseSchema`, `SocialRestrictionsResponseSchema`).

## Goals / Non-Goals

**Goals:**
- Filtro de Año y Mes en la barra de filtros, poblados solo con años/meses donde el usuario tiene
  escuchas; el selector de Mes se acota al Año elegido.
- Nuevo endpoint de meses distintos (`GET /api/me/diary/months`) sin conteos, consistente con la
  regla anti-métricas ya vigente.
- Botón de flecha por mes en la Cronología, para colapsar/expandir ese grupo puntual — todos
  expandidos por defecto, sin control de "colapsar todos".

**Non-Goals:**
- Un selector combinado tipo "Septiembre 2026" (se descartó explícitamente con el usuario a favor de
  dos selectores independientes, Año y Mes).
- Un control de "colapsar todos los meses" (se descartó explícitamente con el usuario).
- Cambios de esquema de base de datos o de índices — el compuesto existente alcanza.
- Cambios en `DiaryList.tsx` (rail de solo lectura de perfiles públicos), en `ListenEntryForm`, en el
  significado de `listen_context`/`reaction`/`audience`.
- Persistir el estado de colapso entre sesiones o pestañas — vive solo en memoria del componente,
  como el resto del estado de UI del diario (filtros, fila expandida).

## Decisions

### 1. Endpoint de meses distintos, sin conteos — sigue el patrón de `listDecades`

Nueva función `listMyDiaryMonths(userId)` en `diary.ts`, misma forma que `listDecades()`: un
`db.select({...}).from(listenEntry).where(eq(listenEntry.userId, userId)).groupBy(...).orderBy(...)`,
con `date_trunc('month', ${listenEntry.createdAt})` como expresión de bucket en vez del
`floor(year / 10) * 10` de las décadas. A diferencia de `listDecades` (que sí expone `count`), acá
**no** se selecciona ningún conteo — la vista de Cronología ya tiene prohibido mostrar conteos por
mes, y exponerlo en la respuesta invitaría a usarlo tarde o temprano. Devuelve
`{ year: number; month: number }[]`, orden descendente (más reciente primero).

Nueva ruta `GET /api/me/diary/months`, nuevo `DiaryMonthsResponseSchema = z.object({ months:
z.array(z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) })) })` — sigue la
convención de objeto con clave nombrada del resto del proyecto, no un array desnudo. Sin paginación:
el conjunto de meses distintos de una persona es acotado por naturaleza (años de uso, no de datos).

**Alternativa considerada:** exponer también el conteo por mes (como `listDecades` hace con
décadas), para uso futuro. Se descarta — el spec ya prohíbe mostrar conteos en la Cronología; agregar
el campo "por si acaso" es la clase de superficie que después hay que recordar no usar.

### 2. Año y Mes como filtros independientes; Mes exige Año

`DiaryFilters` gana `year?: number` y `month?: number` (1-12). En `listMyDiary`, si `year` está
presente se agrega una condición de rango `[year-01-01, (year+1)-01-01)` sobre `createdAt`; si
además `month` está presente, el rango se acota a `[year-month-01, year-(month+1)-01)` (con acarreo
de año si `month` es 12). `month` sin `year` es un error de validación (`VALIDATION_ERROR`) en el
route handler — igual que un valor de contexto fuera de vocabulario — porque "este mes, de cualquier
año" no es un filtro con sentido único (¿qué año?). Combina con el resto de los filtros exactamente
igual que hoy: condiciones independientes en el mismo array, todas con `AND` implícito.

En el cliente, el selector de Año se llena con los años distintos de `getMyDiaryMonths()` (derivados
en el propio componente, sin pedir un endpoint de años aparte); el de Mes, con los meses de ese año
puntual — antes de elegir un año, el selector de Mes no ofrece ninguna opción real (solo el
placeholder), en vez de deshabilitarse: evita tocar `FilterSelect` (que no tiene prop `disabled`)
por un caso que ya queda inerte sin nada para elegir. Las etiquetas de mes reusan
`Intl.DateTimeFormat(locale, { month: "long" })`, el mismo mecanismo que ya usan los encabezados de
`groupByMonth` — sin agregar 12 claves de traducción nuevas. La fecha sintética que arma cada
etiqueta (`Date.UTC(2000, month - 1, 1)` — el año 2000 es arbitrario, solo hace falta una fecha
válida) SHALL formatearse con `timeZone: "UTC"` explícito: sin eso, medianoche UTC del día 1 cae en
el último día del mes anterior para cualquier usuario al oeste de UTC, y el selector ofrece "agosto"
donde debería decir "septiembre" — se detectó verificando en el navegador, no por los tests
(`jsdom` corre en UTC por defecto, así que el bug no se manifestaba ahí).

**Alternativa considerada:** permitir filtrar por mes sin año (interpretándolo como "ese mes, en
cualquier año"). Se descarta — la UI ya resuelve la ambigüedad deshabilitando Mes hasta elegir Año,
así que el caso ni siquiera es alcanzable desde la interfaz; validarlo en el backend es solo una red
de seguridad para quien golpee la API directamente.

### 3. Colapso por mes: estado de cliente puro, sin conteo en el encabezado

Un `Set<string>` de claves de mes colapsadas (mismo `monthKey` que ya arma `groupByMonth`), estado
local del componente — no persiste, no toca el backend. El `<h3>` de cada grupo suma un botón de
flecha (`aria-expanded`, rota 180° con CSS al colapsar) que alterna la clave en el set; cuando un mes
está colapsado, su `<ul>` de filas no se renderiza (no solo se oculta con CSS, para no montar el
formulario de ampliación de una fila invisible). El encabezado nunca muestra cuántas filas oculta —
ni siquiera un "(3)" — para no reabrir la regla anti-métricas que ya rige esta vista.

Colapsar un mes no es "cambiar de vista": la agrupación por mes con encabezado sigue siendo la única
presentación (el requisito "Sin conmutador de vista" no se toca) — es la misma Cronología, con un
grupo puntual oculto temporalmente, igual que expandir/colapsar una carpeta no es cambiar de
explorador de archivos.

**Alternativa considerada:** un control global "Colapsar todos los meses". Se descartó explícitamente
con el usuario — con la cantidad de meses que un diario típico acumula, no se justificó el costo de
otra pieza de UI para un caso de uso marginal frente al toggle individual por mes.

## Risks / Trade-offs

- **[Un mes sin ninguna escucha nunca aparece en el selector — el usuario no puede "buscar en blanco"]**
  → Intencional: los tres selectores confirmados con el usuario excluyen deliberadamente meses/años
  vacíos, para no ofrecer una combinación que garantiza una lista vacía.
- **[`date_trunc` sin índice funcional dedicado podría no usar el índice compuesto tan eficientemente
  como una comparación directa de rango]** → El filtro de `listMyDiary` en sí usa comparación de
  rango simple (`gte`/`lt` sobre `createdAt`), no `date_trunc` — ese cae de lleno en
  `idx_listen_entry_user_created`. Solo `listMyDiaryMonths` usa `date_trunc`, y corre sobre el mismo
  índice por `user_id` primero (el `GROUP BY` opera después de acotar por usuario); con el volumen
  de escuchas de una sola persona, no hace falta un índice funcional adicional.
- **[Colapsar una fila que tenía su panel de ampliación abierto la desmonta]** → Aceptado: es
  coherente con "no montar formularios ocultos"; si el usuario reabre el mes, la fila vuelve a su
  estado colapsado (no expandida), igual que si nunca la hubiera abierto — no se intenta preservar
  ese estado efímero a través de un colapso.

## Migration Plan

Cambio de frontend + un endpoint de solo lectura nuevo, sin migración de datos ni cambios de
contrato en los endpoints existentes (los filtros nuevos son parámetros de query opcionales). Deploy
directo, sin feature flag. Rollback = revertir el commit.

## Open Questions

Ninguna — las tres decisiones de diseño (dos selectores separados, opciones solo desde datos reales,
flecha individual sin "colapsar todos") fueron confirmadas por el usuario antes de este documento.
