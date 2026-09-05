## Context

`/me/diary` es un Server Component (`page.tsx`) que resuelve la primera página vía
`listMyDiary` y la pasa a `DiaryList` (Client Component, `src/components/diary/DiaryList.tsx`),
que maneja "cargar más" incremental sobre `GET /api/me/diary`, expandir/colapsar una
entrada para editarla con `ListenEntryForm`, y borrarla con confirmación inline. `DiaryList`
también se monta en `users/[username]` en modo `readOnly + showAuthor` para el diario
público de otra persona — ese uso queda fuera de este cambio (ver Non-Goals).

Desde `redesign-feed` (`openspec/changes/archive/2026-09-03-redesign-feed`), el resto del
historial cronológico del producto usa `FeedActivityList`: filas por peso de contenido
(bloque con `ProsePanel` para prosa, línea de baseline para sola presencia), fecha
relativa, título en `font-display` como ancla, `ReactionBadge` inline, y una variante
`self` (sin celda de carátula/disco ni autor, con riel izquierdo `border-l
border-ink-border`) usada por "Tu rastro reciente" de Inicio. Esa variante ya presenta
`ListenEntry` en el layout que este cambio quiere para `/me/diary` — pero es de **solo
lectura**: no tiene affordance de edición ni de borrado, y agrupa 3+ escuchas
consecutivas sin nota en una fila resumen (`groupAmbientRuns`), lo que en una superficie
de gestión le quitaría acceso individual a esas entradas.

`ListenEntry` (`src/lib/api/schemas.ts`) no trae `kind` ni `author` — a diferencia de
`FeedEntry`, que es una unión discriminada de 5 tipos con autor. El diario propio es
siempre "escucha, del usuario que lo consulta", así que `MetaLine`, `TargetTitle` y
`RelativeDate` de `FeedActivityList` (que sí esperan esos campos) no se pueden reusar
como componentes cerrados sin adaptarlos — de ahí la extracción a piezas parametrizadas
por props simples (href, label, iso, etc.) en vez de por el tipo `FeedEntry`.

Restricciones del proyecto: sin `fetch` desde componentes, código y textos en español,
`any` prohibido, typecheck + lint + test + build en verde, sin dependencias nuevas. Sin
cambios de contrato REST en este change.

## Goals / Non-Goals

**Goals:**

- Unificar la presentación de `/me/diary` con el resto del historial cronológico del
  producto (`/me/feed`, previews de Inicio): misma anatomía de fila, misma fecha
  relativa, mismo chrome quieto.
- Mantener el diario **individualmente editable y borrable**: ninguna entrada queda
  oculta detrás de un agrupamiento.
- Reemplazar los botones en bloque por afordancias de texto coherentes con la Regla de
  Rareza y el chrome quieto de `DESIGN.md`.
- Compartir las piezas presentacionales con `FeedActivityList` en vez de duplicar JSX,
  para que ambas superficies no diverjan en el próximo ajuste visual.

**Non-Goals:**

- El diario embebido de solo lectura en `users/[username]` (`DiaryList` con
  `readOnly + showAuthor`) no se toca en este cambio. Sigue con su presentación actual;
  unificarlo es un cambio aparte si se decide después.
- No se agrega agrupamiento de actividad ambiente al diario propio (ver Decisión 2) — es
  una omisión deliberada, no un descuido.
- No se cambia el mecanismo de paginación ("cargar más" con botón, sin scroll infinito
  — eso queda para los widgets de Inicio).
- No se agrega carátula/disco a la fila del diario — la variante `self` tampoco la tiene,
  y agregarla rompería la paridad visual con "Tu rastro reciente".
- Sin cambios en `ListenEntryForm` más allá del radio de esquina; los campos y el flujo
  de guardado no cambian.
- Sin cambios de esquema DB, API ni contrato REST.

## Decisions

### 1. `DiaryActivityList` nuevo, no una variante editable de `FeedActivityList`

Se evaluó agregar `onEdit`/`onDelete` opcionales a `FeedActivityList` para que la
variante `self` sirviera también en `/me/diary`. Se descarta: `FeedActivityList` es
contrato de **solo lectura** en sus tres consumidores actuales (`/me/feed`, preview de
Inicio, "Tu rastro reciente") y ese requirement ya está fijado en la spec
`activity-feed` ("El feed no ofrece acciones sobre las entradas"). Colarle props de
mutación que solo un consumidor usa (y que nunca deben dispararse en los otros) es una
superficie de errores innecesaria y desdibuja esa garantía. `DiaryActivityList` es un
componente propio, dueño de su estado de edición/borrado, que reusa piezas de
presentación pero no el componente entero.

**Alternativa considerada:** un único componente parametrizado por `variant: "feed" |
"self" | "diary"` con toda la lógica de mutación condicionada. Se descarta por el mismo
motivo — mezclar una superficie de solo lectura con una de gestión en un solo archivo
aumenta el acoplamiento sin beneficio, cuando la pieza que sí vale la pena compartir es
puramente visual (Decisión 3).

### 2. El diario propio nunca agrupa entradas

`groupAmbientRuns` pliega 3+ escuchas consecutivas sin nota del mismo autor en una fila
resumen. Tiene sentido en un recap de solo lectura (escanear qué pasó), pero en
`/me/diary` — la superficie para corregir o borrar una escucha puntual — colapsar
entradas les quitaría el enlace de edición/borrado individual. La resolución: `/me/diary`
**no aplica `groupAmbientRuns`**; toda escucha es siempre su propia fila, con sus propias
acciones. La regla de peso (prosa vs. sola presencia) sí se mantiene, porque no oculta
nada — solo cambia cuánto aire ocupa la fila.

**Alternativa considerada:** agrupar y permitir expandir el grupo a filas individuales
con un click. Se descarta por alcance: agrega estado e interacción nueva a una fila que
hoy no la tiene, para un beneficio marginal (el diario ya pagina de a 20 y no suele tener
corridas largas de escuchas idénticas sin nota en la vista de gestión). Si en el futuro
se ve necesario, es un cambio incremental sobre este mismo componente.

### 3. Extracción de piezas presentacionales a un módulo compartido

`MetaLine`, `TargetTitle`, `RelativeDate` y `ProsePanel` de `FeedActivityList.tsx` se
mueven a `src/components/feed/feed-row-parts.tsx` (o nombre equivalente), reescritas para
recibir props simples en vez del tipo `FeedEntry`:

- `RelativeDate({ iso })` — sin cambios de firma, ya es genérico.
- `TargetTitle({ href, label, artist, layout })` — sin cambios de firma, ya es genérico.
- `ProsePanel({ body })` — sin cambios de firma, ya es genérico.
- `MetaLine` se dividide conceptualmente: la variante de feed sigue componiendo
  `[autor ·] verbo · audiencia` + fecha vía `FeedActivityList`; `DiaryActivityList` arma
  su propia línea de metadato (`contexto · reacción · audiencia` + fecha + acciones) con
  las mismas clases (`font-data text-xs text-paper-muted`, `RelativeDate` compartido) en
  vez de forzar `MetaLine` a aceptar un formato de verbo que no tiene (el diario no tiene
  "verbo de actividad" ajeno — el contexto de escucha ocupa ese lugar).

`ReactionBadge` ya vive en `src/components/diary/` y ya es compartido por ambas
superficies; no se mueve.

**Alternativa considerada:** duplicar el JSX de `MetaLine`/`TargetTitle`/`ProsePanel`
dentro de `DiaryActivityList`. Se descarta — es exactamente el problema que motivó este
cambio (dos superficies del mismo dato visual divergiendo con el tiempo); la extracción
cuesta un archivo nuevo y evita esa deriva.

### 4. Anatomía de fila del diario

Cada entrada en `DiaryActivityList`:

- **Título** (`TargetTitle`, `layout="inline"`): el objetivo de la escucha, ancla
  tipográfica de la fila, con el mismo tratamiento de subrayado/hover a ámbar que el feed.
- **Línea de metadato** (mono, `text-paper-muted`, `text-xs`): `contexto · reacción`
  (`ReactionBadge`) a la izquierda; fecha relativa (`RelativeDate`) y las acciones
  "Editar"/"Eliminar" a la derecha, separadas por `·`.
- **Nota** (`body`), si existe: sobre `ProsePanel`, igual que una escucha con nota en el
  feed.
- **Riel izquierdo:** `border-l border-ink-border` en el `<ul>`, filas `pl-4` — mismo
  tratamiento que la variante `self`, para que "Tu rastro reciente" y `/me/diary` (su
  "ver más") se lean como la misma superficie en dos densidades.
- **Panel de edición:** `ListenEntryForm` se despliega debajo de la fila al activar
  "Editar", igual que hoy (sin cambios de campos).

### 5. Acciones como texto, no como `Button`

"Editar" y "Eliminar" dejan de ser `<Button variant="ghost">`/`<Button variant="primary">`
en una columna aparte y pasan a enlaces de texto (`<button>` con clases de texto, no el
componente `Button`) dentro de la línea de metadato: `font-data text-xs text-paper-muted
hover:text-paper transition-colors` para "Editar", y `hover:text-danger` para "Eliminar"
— sin fondo ni borde, coherente con el resto de acciones de solo-texto del sistema
(enlaces de autor, "Ver diario"). La confirmación de borrado (hoy un `Button variant="primary"`
+ texto de aviso) pasa a texto inline: el aviso en `text-danger` seguido de "Confirmar" /
"Cancelar" como el mismo tipo de enlace, sin caja.

**Por qué:** DESIGN.md es explícito — "la interactive chrome... es furniture, not
decoration" y reserva los botones sólidos (`Button variant="primary"/"secondary"`) para
acciones de una sola vez por pantalla (guardar el formulario, cargar más), no para un par
de acciones repetidas en cada fila de una lista larga. Dos botones por fila, en una
página con 20 entradas por página, es el ruido que la Regla de Rareza prohíbe para el
ámbar y que el principio de chrome quieto prohíbe en general para los bordes/fondos.

**Alternativa considerada:** un menú "···" que despliegue Editar/Eliminar. Se descarta
por ahora — agrega un componente de menú nuevo (no existe ninguno en el sistema hoy) para
resolver un problema que dos enlaces de texto ya resuelven sin dependencia nueva ni
estado adicional.

### 6. Ancho de columna a `max-w-2xl`

`/me/diary` pasa de un `<main>` sin ancho máximo explícito (heredaba el de `DiaryList`,
`max-w-3xl`) a `max-w-2xl`, igual que `/me/feed`. Ambas son páginas de lectura dedicada de
una sola columna de actividad — no bloques dentro de una página con más contenido al
lado (que es el caso de `max-w-3xl` en los previews de Inicio). Consistencia con la
Decisión de anchos de `redesign-feed`.

## Risks / Trade-offs

- **[Reglas de peso/agrupamiento divergen entre `/me/diary` y "Tu rastro reciente"]** →
  Intencional (Decisión 2): la gestión necesita acceso individual, el recap no. Se
  documenta explícitamente en la spec para que no se lea como una inconsistencia
  accidental.
- **[Extraer piezas de `FeedActivityList` puede romper sus tests existentes]** →
  `feed-row-parts.tsx` mantiene las mismas firmas de props que hoy tienen `TargetTitle`,
  `RelativeDate` y `ProsePanel` (ya eran genéricas); `FeedActivityList.test.tsx` no debería
  necesitar cambios de aserciones, solo de import si se mueven símbolos internos no
  exportados hoy.
- **[Dos componentes de lista de diario (`DiaryList` y `DiaryActivityList`) conviven]** →
  Aceptado como alcance explícito (Non-Goal): el perfil público sigue con `DiaryList`.
  Riesgo de duplicación de lógica de paginación/edición entre ambos, mitigado porque
  `DiaryList` en modo `readOnly` no tiene lógica de edición/borrado que duplicar — la
  única superposición real es el "cargar más", que ya es una función corta.

## Migration Plan

Cambio de frontend puro (presentación), sin migración de datos ni de API. Deploy directo,
sin feature flag. Rollback = revertir el commit; no hay estado persistido nuevo.

## Open Questions

- ~~Copy exacto de "Editar"/"Eliminar" como enlaces de texto~~ — **resuelto**: se agregó
  una clave nueva `edit` ("Editar"/"Edit") en vez de reescribir `expand` ("Ampliar"), que
  `DiaryList.tsx` sigue usando sin cambios en su propio test (`DiaryList.test.tsx`
  verifica el texto "Ampliar" — sobrescribir esa clave lo hubiera roto). `delete` se
  reusa tal cual, ya que su texto ("Eliminar"/"Delete") no cambia de significado al
  pasar de botón a enlace de texto.
- Nombre final del módulo compartido (`feed-row-parts.tsx` vs. otro) — resuelto:
  `src/components/feed/feed-row-parts.tsx`.
