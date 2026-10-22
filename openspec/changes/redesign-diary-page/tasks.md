## 1. Fase 1 · Zona horaria y datos

- [x] 1.1 `TimeZoneCookie` (client) en `[locale]/layout.tsx`: escribe la cookie `tz` con la zona del navegador cuando falta o difiere (D1)
- [x] 1.2 `src/i18n/request.ts`: `timeZone` desde la cookie `tz` validada, `"UTC"` por defecto; helper compartido `parseTimeZone` (D1)
- [x] 1.3 `GET /api/me/diary` y `GET /api/me/diary/months`: parámetro `tz` opcional, `400 VALIDATION_ERROR` si no es una zona IANA (D1)
- [x] 1.4 `listMyDiary`: límites de año/mes con `make_timestamptz(..., tz)`; `listMyDiaryMonths`: `extract(...)` sobre `created_at AT TIME ZONE tz` (D1)
- [x] 1.5 `selectEntries`/`serializeEntry`: `coverThumbUrl` con la foto del artista y con `RECORDING_COVER_SQL` para canciones (D2)
- [x] 1.6 `listMyDiary`: `inWantToListen` por entrada (`EXISTS` sobre `want_to_listen_entry`; `false` para canciones); schema `ListenEntry` (D4)
- [x] 1.7 `src/lib/api/diary.ts`: el cliente envía `tz` (`useTimeZone()`) en el listado y en los meses
- [x] 1.8 Tests: rutas (`tz` válido, inválido, ausente), servicio (rangos con zona, meses con zona, carátulas por tipo, `inWantToListen`), `parseTimeZone`
- [x] 1.9 `scripts/smoke-test-diary.ts`: contra Postgres real, escucha de las 22:00 en America/Santiago del último día del mes (filtro y meses con y sin `tz`), carátula de canción y foto de artista, `inWantToListen`, y la página de 20 entradas bajo 50 ms

## 2. Fase 1 · Fila, menú, cabecera y estados

- [x] 2.1 Helper `diaryCover(entry)` → `{ src, shape }` (redonda para artistas) usado por `DiaryActivityList` y `DiaryReadList` (D2)
- [x] 2.2 `DiaryDateBlock`: prop `weekday` opt-in y `timeZone` explícito; `groupByMonth` y `dayKey` con la zona de `useTimeZone()` (D1, D3)
- [x] 2.3 Fila en grilla fija `[fecha · carátula · cuerpo · acciones]` que no envuelve; título con la reacción al lado; línea «Artista · Tipo · Contexto» (D3)
- [x] 2.4 `ReactionGlyph` variante `accent` (ámbar, sin hueco reservado) para el diario propio; `DiaryReadList` sin cambios de presentación (D3)
- [x] 2.5 Audiencia como ícono (candado / personas / globo) con nombre accesible y `title`, al final de la línea secundaria; controles de 44px en móvil y 32px desde `sm` (D3)
- [x] 2.6 `RowMenu`: ítems `whitespace-nowrap` y `RowMenuSeparator`; en el diario, «Eliminar» tras un separador (D4)
- [x] 2.7 Opción de Pendientes según `inWantToListen` («Marcar como pendiente» / «Quitar de Pendientes») y actualización de la caché al alternar (D4)
- [x] 2.8 Cabecera a la izquierda con «Tu registro de escuchas» y «Anotar escucha» (`QuickActionsDialog`) (D5)
- [x] 2.9 Estado vacío con «Anotar escucha» y estado sin resultados con «Limpiar filtros» (D5)
- [x] 2.10 Lista atenuada y `aria-busy` mientras `isPlaceholderData` (D5)
- [x] 2.11 Mensajes `es`/`en` (`diary.json`): subtítulo, tipos, audiencia accesible, «Quitar de Pendientes», «Anotar escucha»
- [x] 2.12 Tests: fila (grilla, tipo, reacción junto al título, audiencia como ícono, días de la semana, carátula por tipo), menú (nowrap, separador, rótulo de Pendientes), cabecera y estados, `aria-busy`; `RowMenu`; `DiaryReadList` con carátulas

## 3. Fase 2 · Filtros, URL y navegación

- [x] 3.1 API y servicio: filtro `type` (`artist` | `release-group` | `recording`), validado contra su vocabulario (D6)
- [x] 3.2 Barra compacta: buscador y botón «Filtros · N» con panel de chips (Reacción, Contexto, Audiencia, Tipo) y el control único Fecha con `optgroup` por año (D6)
- [x] 3.3 Chips de filtros activos con «×» y «Limpiar filtros» bajo el buscador (D6)
- [x] 3.4 Filtros en la URL con `replaceState`; `page.tsx` lee `searchParams`, ignora valores inválidos y siembra la página 1 filtrada; `initialData` solo si coinciden (D7)
- [x] 3.5 Encabezado de mes `sticky` con fondo opaco y control de colapso de 44px en móvil (D8)
- [x] 3.6 Carga continua con `IntersectionObserver` (`rootMargin` 600px), «Cargar más» como respaldo; un error detiene la carga automática (D8)
- [x] 3.7 Tests: `type` en ruta y servicio, panel y conteo de filtros, chips activos, URL (lectura, escritura sin historial, valor inválido), observador (dispara, se detiene tras error)

## 4. Fase 2 · Formulario de ampliar

- [x] 4.1 Contexto como chips de radio con la misma forma que audiencia (D9)
- [x] 4.2 Contador «N/500» (`aria-live` desde 450) y Ctrl/⌘+Enter para guardar (D9)
- [x] 4.3 «Cancelar» en lugar de «Cerrar» (clave nueva `cancel`) (D9)
- [x] 4.4 Prop `showTarget` (por defecto `true`); el diario pasa `false` (D9)
- [x] 4.5 Tests: `ListenEntryForm` (chips de contexto, contador, atajo, rótulo, `showTarget`), sin regresión en registro global y Recorrido

## 5. Fase 3 · Riel de contexto

- [x] 5.1 `page.tsx`: `max-w-6xl` y `lg:grid-cols-[minmax(0,1fr)_280px]` con el riel `sticky`; sin riel por debajo de `lg` (D10)
- [x] 5.2 Módulo «Ir a»: meses disponibles por año como botones que aplican el filtro Fecha, y «Todo el diario»; sin conteos (D10)
- [x] 5.3 Módulo «Para anotar»: `listMyWantToListen(userId, 1, 4)` en el servidor, «Anotar» crea la escucha, la inserta arriba con el formulario abierto y quita el ítem; «Ver Pendientes»; se omite vacío (D10)
- [x] 5.4 Módulo «Así lo ven otros»: enlace a `/users/<username>/diary` con la nota de audiencias (D10)
- [x] 5.5 Tests: página (riel presente, módulos vacíos omitidos), «Ir a» aplica el filtro, «Anotar» (creación, inserción, ítem retirado, error)

## 6. Documentación

- [ ] 6.1 `docs/04-api/contracts.md`: `GET /api/me/diary` con `year`, `month`, `type`, `tz`, `inWantToListen` y `coverThumbUrl` por tipo; `GET /api/me/diary/months` con `tz`
- [ ] 6.2 `docs/05-features/listening-diary-and-ratings.md`: superficie `/me/diary` (fila, filtros, URL, riel)
- [ ] 6.3 `docs/02-architecture/i18n.md`: zona horaria del usuario (cookie `tz`, next-intl, `UTC` por defecto)
- [ ] 6.4 `docs/01-domain/business-rules.md`: el mes y el día calendario del diario se cuentan en la zona horaria del usuario
- [ ] 6.5 `AGENTS.md`: lo que el smoke del diario verifica ahora

## 7. Verificación

- [ ] 7.1 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [ ] 7.2 `ALLOW_SMOKE_ON_REAL_DB=1` contra la BD de scratch: `smoke-test-diary.ts` y `smoke-test-diary-social.ts`
- [ ] 7.3 Navegador a 375px y 1280px, `es` y `en`: fila sin partirse, carátulas por tipo, menú, filtros y URL, encabezado fijo, carga continua, riel, escucha de fin de mes en el mes correcto
- [ ] 7.4 Regresión: diario del perfil, feed y `/activity` (fechas en la zona del usuario), tracklist y discografía (`RowMenu`), registro global y Recorrido (`ListenEntryForm`)
