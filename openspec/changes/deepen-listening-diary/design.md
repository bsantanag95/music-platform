## Context

`redefine-content-hierarchy` D11 — el diario como capa de consumo pura. Estado actual:

- `listen_entry`: objetivo polimórfico, `listen_context` (inferido: primera escucha del
  usuario sobre el objetivo → `first_listen`, si no → `relisten`; corregible), `body`
  (≤500), `reaction` (nullable), `audience` (`private|followers|public`, **default de
  columna `followers`**), `created_at`. Append-only.
- `createListenEntry(target, userId)` (`src/services/diary/diary.ts`) inserta solo
  `{ target, userId, listenContext }` → `audience` cae al default `followers`.
- `updateListenEntry(id, userId, changes)` — modifica `body`/`reaction`/`listenContext`/
  `audience`; el form (`ListenEntryForm`) siempre envía los cuatro (campos controlados).
- `MarkAsListened` (cliente) crea la entrada al instante y despliega `ListenEntryForm`.
  Rotulado con `t("markAsListened")`. Presente en `artist/[id]`, `album/[id]`, `song/[id]`.
- `/me/diary` → `DiaryActivityList` (`useInfiniteQuery`, filtros, edición inline). Rating y
  reseña **no** aparecen en el form del diario (viven en `rating` / `review`).
- La jerarquía del feed (`rework-feed-tiers`) ya trata la escucha con nota como tier 1
  (cita) y sin nota como tier 3 (fila mínima); el feed filtra `audience IN (followers,
  public)`.

## Goals / Non-Goals

**Goals:**

- Registro rápido = privado por defecto; se comparte al ganar intención (nota o reacción),
  salvo elección explícita del usuario.
- Aplicar solo a entradas nuevas; nunca revertir una audiencia elegida a mano.
- Rótulo y encuadre sin lenguaje de completitud.
- Vista de cronología por mes del diario propio, sin volverse un resumen estadístico.
- Cero migración, cero cambios en el feed, en `diary-visibility` ni en el esquema.

**Non-Goals:**

- Campo o selector de "intensidad" — se infiere, no se declara.
- Rating o reseña en el flujo del diario — ya están fuera; no se agregan.
- Importación de escuchas desde servicios de streaming (D11 / Q3b, fuera de alcance).
- Cambiar el default de la columna `listen_entry.audience` (evita tocar cualquier otra
  ruta de inserción; `createListenEntry` es hoy la única).
- Backfill de la audiencia de entradas existentes.
- Tocar `diary-visibility` (la matriz de quién ve qué no cambia; solo cambia qué audiencia
  nace por defecto).

## Decisions

### D1 — `createListenEntry` inserta `audience: "private"`

Un registro rápido no expresa intención de compartir. `createListenEntry` pasa
`audience: "private"` explícito. La columna conserva su default `followers` (no se migra):
así ninguna otra ruta de inserción —hoy inexistente, mañana un import o un seed— hereda por
error el nuevo criterio sin decidirlo.

*Alternativa descartada:* cambiar el default de la columna. Más "correcto" pero acopla el
criterio de producto a la capa de esquema y afecta a cualquier `INSERT` futuro.

### D2 — La audiencia sigue la intención en el formulario, con congelamiento por elección

`ListenEntryForm` gana:

- `initialAudience` (= `initial.audience`).
- `audienceTouched: boolean` — pasa a `true` cuando el usuario selecciona una opción de
  audiencia.
- Un `useEffect` sobre `body` y `reaction`: **si** `initialAudience === "private"` **y**
  `!audienceTouched`, entonces `audience` = `"followers"` cuando `body.trim() !== "" ||
  reaction !== null`, y `"private"` cuando ambos están vacíos. Es una **sugerencia visible**
  —el chip de audiencia se mueve— y **reversible** (el usuario puede fijar otra, lo que
  activa `audienceTouched` y congela la sugerencia).
- Si `initialAudience !== "private"` (entrada vieja con `followers`, o ya elegida), el
  efecto no corre: el form muestra la audiencia tal cual y solo cambia si el usuario la
  toca. Esto respeta "solo entradas nuevas".

En el servidor, `updateListenEntry` no cambia: recibe la audiencia que el form calculó o
que el usuario eligió, y la persiste tal cual.

*Alternativa descartada:* inferir en el servidor a partir de "¿`changes.audience` viene o
no?". El form es un control controlado y siempre lo envía; distinguir "no tocado" exigiría
que el form dejara de enviarlo, perdiendo la retroalimentación visual inmediata.

### D3 — Vocabulario: "Registrar escucha" / "Anotar en el diario"

- El rótulo de la acción de catálogo (`MarkAsListened`) pasa de `t("markAsListened")` a
  `t("registerListen")` ("Registrar escucha"). Un segundo texto `t("logInDiary")`
  ("Anotar en el diario") queda disponible para superficies donde encaje mejor.
- Se auditan y ajustan los textos de estado (`marked` → "Registrada", `listening` →
  "Registrando…", `signInToListen`) y cualquier copy que insinúe completitud ("marcá lo
  que escuchaste", "escuchado") hacia el encuadre de **registro intencional**.
- El nombre interno del requirement de spec ("Acción 'Marcar como escuchado'") se conserva
  como identificador histórico; su cuerpo y escenarios pasan a describir el rótulo nuevo.

### D4 — Vista de cronología por mes en `DiaryActivityList`

Un conmutador `Lista | Cronología` (dos botones o un `FilterSelect`) sobre la barra de
filtros. En modo **Cronología**:

- Las `entries` ya cargadas se agrupan por **mes calendario** de `createdAt` (en la zona
  del usuario / locale), con un encabezado por mes (`t` + `Intl.DateTimeFormat` `month` +
  `year`).
- Dentro de cada mes, las mismas filas que la lista, en el mismo orden cronológico
  descendente. Edición y borrado siguen disponibles.
- El agrupado corre en el cliente sobre el array acumulado (mismo patrón que
  `groupFeedRuns`), así que también agrupa a través de "Cargar más".
- **No** se muestran conteos por mes, ni totales, ni "racha": es la misma información,
  reordenada para que se lea como historial y no como log plano.

El modo elegido se guarda en `useState` (no en la URL ni en localStorage en Fase 1;
ajustable).

### D5 — Sin opinión, sin intensidad: confirmación

- `ListenEntryForm` **no** gana campos de rating/reseña. Un test estructural verifica que
  el módulo del form no importa `@/lib/api/ratings` ni `@/lib/api/reviews`.
- No se agrega selector de intensidad. La spec registra que la intensidad se **infiere**
  de (tipo de objetivo) × (hay nota/reacción) × (contexto) y que el producto no la pide.

## Risks / Trade-offs

- **[Un registro rápido "desaparece" del feed por ser privado]** → Es el objetivo: el feed
  es para intención, no para "escuché algo". El usuario que quiera compartir agrega una
  nota/reacción (y la audiencia lo sigue) o fija `followers` a mano. El copy del form deja
  ver la audiencia siempre.
- **[La sugerencia de audiencia puede sorprender]** → El chip se mueve a la vista; es
  reversible y una sola vez (se congela al tocarlo). Mismo patrón mental que el contexto
  inferido, que el usuario también puede corregir.
- **[Entradas viejas con `followers` no se benefician]** → Deliberado ("solo entradas
  nuevas", D11). Sin backfill: cambiar retroactivamente la visibilidad de escuchas ya
  compartidas sería peor que no hacerlo.
- **[Otra vista más en el diario]** → La cronología reusa las mismas filas y el mismo
  fetcher; el conmutador es un `useState`. No es una segunda implementación.
- **[Anacronismo en el nombre del requirement de spec]** → Se acepta el identificador
  histórico "Acción 'Marcar como escuchado'" para no arriesgar el archivado con un
  RENAMED; el cuerpo describe el rótulo actual.

## Migration Plan

Sin migración de base de datos. `createListenEntry` cambia un valor por defecto en
aplicación; el resto es UI e i18n. Rollback = revertir el commit; las entradas creadas
mientras tanto quedan `private` (el usuario puede recompartirlas).

## Open Questions

- **OQ1 — ¿El registro rápido nace `private`, o `followers` y solo baja a `private` si el
  usuario cierra el form sin agregar nada?** Propuesta: **nace `private`** (D1). Más
  simple, más conservador con la privacidad, y no depende de detectar "cerró sin
  completar".
- **OQ2 — ¿El modo Cronología se recuerda entre visitas (localStorage) o arranca siempre
  en Lista?** Propuesta: **siempre Lista** en Fase 1 (`useState`), sin persistir. Ajustable
  si se pide.
- **OQ3 — ¿"Registrar escucha" o "Anotar en el diario" como rótulo principal de la acción
  de catálogo?** Propuesta: **"Registrar escucha"** como principal (más directo junto a los
  otros controles de catálogo); "Anotar en el diario" disponible para el onboarding y
  superficies narrativas.