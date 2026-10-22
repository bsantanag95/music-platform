## Context

`/{locale}/me/diary` (`src/app/[locale]/me/diary/page.tsx`) es un server component mínimo: exige sesión, pide la
página 1 sin filtros con `listMyDiary` y monta `DiaryActivityList`, un client component de ~730 líneas que reúne
filtros, cronología por mes, fila, menú, edición en línea (`ListenEntryForm`) y paneles de listas. Los filtros viven en
estado local; Año/Mes salen de `GET /api/me/diary/months`.

Piezas compartidas que el cambio toca con cuidado:

- `DiaryDateBlock`, `TargetTitle` y `ProsePanel` (`feed-row-parts.tsx`) también los usan el feed y `/activity`.
- `ReactionGlyph` lo usa además `DiaryReadList` (diario del perfil).
- `RowMenu` lo usan la tracklist, la discografía y otras filas.
- `ListenEntryForm` se monta también en el registro global, en Recorrido y en las páginas de canción.
- `selectEntries`/`serializeEntry` (`services/diary/diary.ts`) alimentan el diario propio y el del perfil.

Restricciones del spec `listen-diary` que el rediseño respeta: sin rachas, totales ni conteos por mes; la agrupación
por mes es la única vista; sin control para colapsar todos los meses; cada escucha es su propia fila; editar es un
ícono y el resto va detrás de «···».

## Goals / Non-Goals

**Goals:**

- Una fila con la misma forma en todas las entradas y en cualquier ancho, donde el título y la reacción mandan.
- Un mes calendario idéntico en el encabezado, el filtro y la lista de meses.
- Carátulas que digan algo para los tres tipos de objetivo.
- Filtros que no empujen el contenido fuera de la primera pantalla en móvil.

**Non-Goals:**

- Métricas de volumen o resúmenes estadísticos (prohibidos por «registro intencional»).
- Editar la fecha de una escucha, rediseñar el diario del perfil o el feed.
- Migraciones.

## Decisions

### D1. Zona horaria del usuario (cookie `tz` + next-intl + parámetro `tz`)

Hoy hay tres zonas en juego: el navegador agrupa por mes, la API filtra en UTC y `listMyDiaryMonths` extrae año y mes
en la zona de la sesión de Postgres. Además el primer render de servidor agrupa con la zona del proceso Node, así que
una escucha cerca del cambio de mes puede dar un desajuste de hidratación.

- Un client component chico (`TimeZoneCookie`, montado en `[locale]/layout.tsx`) lee
  `Intl.DateTimeFormat().resolvedOptions().timeZone` y, si difiere, escribe la cookie `tz` (un año, `SameSite=Lax`,
  sin `HttpOnly` porque la escribe el cliente; no es un dato sensible).
- `src/i18n/request.ts` lee la cookie, la valida con `Intl.supportedValuesOf("timeZone")` (o un `try` sobre
  `new Intl.DateTimeFormat("en", { timeZone })`) y la pasa como `timeZone` a next-intl; sin cookie válida, `"UTC"`. Así
  servidor y cliente formatean con la misma zona y `useTimeZone()` da la del usuario desde la segunda carga.
- `GET /api/me/diary` y `GET /api/me/diary/months` aceptan `tz` opcional (IANA, validado igual; inválido → `400
  VALIDATION_ERROR`; ausente → `UTC`, el comportamiento actual de los rangos). El cliente envía `useTimeZone()`.
- `listMyDiary` arma los límites con `make_timestamptz(year, month, 1, 0, 0, 0, tz)` y su sucesor, así el filtro sigue
  usando `idx_listen_entry_user_created`. `listMyDiaryMonths` agrupa por
  `extract(year|month from created_at AT TIME ZONE tz)`.
- La agrupación del cliente (`groupByMonth`, `dayKey`, `DiaryDateBlock`) formatea con `timeZone` explícito.
- `page.tsx` siembra la página 1 con la misma zona que leerá el cliente (`getTimeZone()` de next-intl).

*Efecto colateral aceptado:* las fechas relativas y absolutas del resto de la app pasan a la zona del usuario en lugar
de la del servidor. Es la corrección esperada; `docs/02-architecture/i18n.md` lo documenta.

*Alternativas descartadas:* agrupar en UTC en todas partes (consistente pero equivocado para quien anota de noche) o
mandar la zona solo a la API (no arregla el primer render ni el desajuste de hidratación).

### D2. Carátula por tipo de objetivo

`selectEntries` suma `artist.photoUrl` y `RECORDING_COVER_SQL(listenEntry.recordingId)` (ya usado por valoraciones y el
himno del perfil; hay índice `idx_track_recording`). `serializeEntry` llena `coverThumbUrl` con la foto para artistas y
con la carátula del álbum para canciones. El cliente usa un helper `diaryCover(entry)` que devuelve
`{ src, shape: "square" | "round" }`: artistas en círculo (foto o disco en círculo), álbumes y canciones en cuadrado.
`DiaryReadList` usa el mismo helper, así que el perfil gana las carátulas sin cambiar su diseño.

### D3. Anatomía de la fila

Una grilla fija por fila, `grid-cols-[2.25rem_3rem_minmax(0,1fr)_auto]` (móvil `[2rem_2.75rem_minmax(0,1fr)_auto]`),
que nunca envuelve:

1. **Fecha**: número de día y, debajo, el día de la semana abreviado («jue»), con la misma deduplicación por día que
   hoy; la fecha completa y la relativa siguen como `aria-label`/`title`. Cambia `DiaryDateBlock` con una prop
   `weekday` opt-in para no tocar al feed.
2. **Carátula** según D2.
3. **Cuerpo**: línea 1, título (`TargetTitle` sin cambios de estilo) y, a su lado, la reacción como ícono de 18px en
   ámbar con nombre accesible y `title`; línea 2 en `text-xs` apagado, «Artista · Tipo · Contexto · (audiencia)» (el artista
   sigue enlazado cuando corresponde; el tipo es «Artista», «Álbum» o «Canción»; la audiencia cierra la línea como ícono
   —candado / dos personas / globo, `role="img"` con el nombre localizado y `title`—). La impresión sigue como cita.
4. **Acciones**, alineadas arriba: lápiz y «···». Áreas de 44px en móvil (`size-11`) y 32px desde `sm` (`sm:size-8`),
   con margen negativo para que el borde visual quede alineado con el contenido.

*Ajuste al implementar:* la audiencia iba en la columna de acciones, pero a 375px tres elementos ahí (ícono más dos
controles de 44px) dejaban ~120px para el título. Como es un dato y no un control, pasó al final de la línea secundaria.
Las filas de paneles (confirmación de borrado, cita, formulario, listas) ocupan las columnas de cuerpo y acciones.

Como las acciones tienen su propia columna, ya no hace falta reservar el hueco de la reacción para que no se muevan: la
reacción vive junto al título y, sin reacción, simplemente no se dibuja. `ReactionGlyph` gana una variante `accent`;
`DiaryReadList` conserva la actual. La audiencia deja de escribirse en texto en cada fila.

### D4. Menú de la fila

- `RowMenu`: los ítems pasan a `whitespace-nowrap` (corrección global: ninguna opción debe partirse) y se agrega
  `RowMenuSeparator`. En el diario, «Eliminar» va tras un separador.
- `listMyDiary` suma `inWantToListen` por entrada (subconsulta `EXISTS` sobre `want_to_listen_entry` del mismo usuario y
  objetivo; siempre `false` para canciones). El menú muestra «Marcar como pendiente» o «Quitar de Pendientes» según el
  valor, y lo actualiza en la caché al alternar. El anuncio accesible del resultado se conserva.

### D5. Cabecera, estados vacíos y carga

- Cabecera alineada a la izquierda: `h1` «Diario», la línea «Tu registro de escuchas» y el botón secundario «Anotar
  escucha», que monta `QuickActionsDialog` (ya abre en Escucha). Al cerrarse, `invalidateOwnData` ya refresca la serie
  `["diary"]`.
- Diario vacío: `EmptyState` con la acción «Anotar escucha». Sin resultados: `EmptyState` con «Limpiar filtros».
- Mientras `isPlaceholderData` es verdadero, la lista queda en `opacity-60` y `aria-busy="true"`.

### D6. Barra de filtros compacta (fase 2)

- Fila única: buscador y botón «Filtros» (`aria-expanded`, con «· N» cuando hay N filtros activos).
- El panel (en el flujo, no flotante) agrupa chips con `aria-pressed`: Reacción (ícono y texto, más «Sin reacción»),
  Contexto, Audiencia, Tipo y Fecha. Fecha es un único `<select>` con `<optgroup>` por año: «Todo 2026», «Octubre»,
  «Septiembre»… a partir de los meses disponibles. Reemplaza Año y Mes.
- Debajo del buscador, los filtros activos como chips con «×» y «Limpiar filtros».
- `type` (`artist` | `release-group` | `recording`) es un filtro nuevo de la API: `IS NOT NULL` sobre la columna del
  objetivo.

### D7. Filtros en la URL (fase 2)

`?q&context&reaction&audience&type&year&month` con `window.history.replaceState` (sin `router.replace`, para no volver a
renderizar el servidor ni sumar historial), igual que `/activity`. `page.tsx` lee `searchParams`, valida y siembra la
página 1 filtrada; un valor inválido en la URL se ignora (no se propaga el 400 a la página). `initialData` solo se usa
cuando los filtros del cliente coinciden con los sembrados.

### D8. Encabezado de mes fijo y carga continua (fase 2)

- El encabezado de mes es `sticky` bajo el header global (`top-[var(--header-h)]` o el valor fijo que use el layout),
  con fondo opaco; el botón de colapso gana un área de 44px en móvil sin agrandar el chevrón.
- Un `IntersectionObserver` sobre un centinela tras la última fila llama a `fetchNextPage` al entrar en vista
  (`rootMargin` de 600px). El botón «Cargar más» se mantiene visible como respaldo y para teclado; un error detiene la
  carga automática hasta que se use el botón.

### D9. Formulario de ampliar (fase 2)

- Contexto pasa de `<select>` a chips de radio, con la misma forma que audiencia.
- Contador «N/500» en vivo (`aria-live="polite"` solo al pasar 450).
- «Cancelar» en lugar de «Cerrar» (la clave nueva `cancel`; `collapse` sigue para otros usos).
- Ctrl/⌘+Enter en el textarea guarda.
- Prop `showTarget` (por defecto `true`); el diario pasa `false` porque la fila ya dice qué es. Registro global,
  Recorrido y canción no cambian.

### D10. Riel de contexto (fase 3)

- Desde `lg`, `main` pasa a `max-w-6xl` con `lg:grid-cols-[minmax(0,1fr)_280px]`; el riel es `sticky`. Por debajo de
  `lg` no hay riel: la navegación por fecha ya está en el filtro Fecha y una lista con carga continua no tiene final
  donde ponerlo.
- **Ir a**: los meses disponibles agrupados por año, como botones que aplican el filtro Fecha (y «Todo el diario» para
  quitarlo). Sin conteos.
- **Para anotar**: `listMyWantToListen(userId, 1, 4)` resuelto en el servidor. Cada ítem con carátula, título y
  «Anotar», que llama a `createListenEntry`, inserta la entrada al principio de la serie actual con su formulario
  abierto y quita el ítem del módulo (la regla de servicio ya lo retira de Pendientes). «Ver Pendientes» enlaza a
  `/me/want-to-listen`. Sin pendientes, el módulo no se muestra.
- **Así lo ven otros**: enlace a `/users/<username>/diary` con una línea que recuerda que cada escucha tiene su
  audiencia.

## Risks / Trade-offs

- **Cookie de zona horaria en la primera visita** → el primer render usa UTC hasta que el cliente escribe la cookie.
  Mitigación: el cliente siempre envía `tz` a la API y agrupa con `useTimeZone()`, que en esa primera carga también es
  UTC, así que nada queda inconsistente; desde la siguiente navegación todo es local.
- **`RECORDING_COVER_SQL` por fila** → 20 subconsultas por página con índice; medir en el smoke (presupuesto: la página
  completa bajo 50 ms en scratch).
- **`whitespace-nowrap` global en `RowMenu`** → un menú con textos largos podría desbordar a la izquierda en móvil.
  Mitigación: el menú ya se alinea a la derecha del trigger; se revisa la tracklist y la discografía en la verificación.
- **Encabezado fijo bajo el header** → depende de la altura del header; si no hay variable, se usa la misma constante que
  el resto de las páginas con elementos `sticky`.

## Migration Plan

Sin migraciones. Todos los cambios de API son aditivos: sin `tz` ni `type`, las respuestas son las de hoy salvo
`coverThumbUrl` (ahora con valor para artistas y canciones) e `inWantToListen` (campo nuevo).

## Open Questions

- Ninguna bloqueante. La edición de la fecha de una escucha queda fuera (requiere esquema).
