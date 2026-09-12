## Context

`DiaryActivityList.tsx` renderiza cada entrada como un `<li>` sin columnas dedicadas:
`RelativeDate` (`feed-row-parts.tsx`) muestra fecha relativa, la reacción va como texto pegado al
contexto vía `ReactionBadge`, y "Editar"/"Eliminar" son `<button>` de texto subrayado. El cambio
`redesign-diary` (archivado) fijó esa anatomía deliberadamente — texto en vez de `Button` sólido
para respetar la Regla de Rareza, y descartó explícitamente un menú "···" "por ahora", por no
existir ningún componente de menú en el sistema y no haber una acción real que lo justificara.
`deepen-listening-diary` (archivado) agregó después la vista de Cronología (agrupa por mes con
encabezado) y el comportamiento de audiencia por intención.

Dos patrones ya resuelven, en otras superficies, dos de las acciones nuevas que este cambio quiere
traer a la fila del diario:
- `MarkAsListened.tsx` (páginas de artista/álbum/canción): crea la escucha al instante sobre un
  objetivo conocido y despliega `ListenEntryForm` inline para ampliarla.
- `AddToListButton.tsx` (páginas de catálogo): carga `getMyLists`, filtra por `entityType` igual al
  del objetivo, ofrece agregar a una lista existente o crear una nueva con `ListForm`, todo en un
  panel inline (sin portal).

Sistema de diseño vigente (`DESIGN.md`): flat warm-dark sin sombras, un solo acento ámbar usado con
moderación (Regla de Rareza), chrome interactivo "quieto" (furniture, no decoration), IBM Plex Mono
para datos/etiquetas, Space Grotesk para display, radios 4–10px.

## Goals / Non-Goals

**Goals:**
- Vista de Cronología (agrupada por mes) como única presentación del diario propio — se retira la
  vista de Lista plana y el conmutador entre ambas.
- Número de día deduplicado por fila consecutiva dentro de cada grupo de mes (el mes en sí nunca se
  repite por fila — lo dice el encabezado del grupo).
- Reacción como ícono junto al título del objetivo, separada de la línea de metadato, sin ocupar una
  columna fija que se desalinee cuando falta.
- Acciones de fila como íconos: lápiz (editar) siempre visible + menú "···" nuevo, con texto del
  mismo tamaño que el resto de la fila.
- El menú "···" agrega Eliminar (ya existente, reubicado), Registrar otra escucha, Agregar a lista.
- `max-w-3xl` en `/me/diary`.

**Non-Goals:**
- Función de "listas/comunidades que contienen este objetivo" — cambio de seguimiento aparte.
- Cualquier cambio a `DiaryList.tsx` (rail de solo lectura en perfiles públicos).
- Cambios de esquema DB, contrato REST, o campos/validación de `ListenEntryForm`.
- Cambios en el significado o vocabulario de `listen_context` o `reaction`.
- Nuevas dependencias — el menú "···" se construye con React + Tailwind, sin librería de UI.

## Decisions

### 1. Cronología como única vista; día deduplicado, nunca el mes por fila

**Revisado tras el primer pase** (feedback directo del usuario sobre la vista ya implementada — ver
Risks/Trade-offs): el primer pase mantenía List/Timeline como dos vistas conmutables, y el bloque de
fecha por fila mostraba mes+día en la vista de Lista. Eso resultó redundante e innecesario — la
vista de Cronología (`deepen-listening-diary`) ya agrupa por mes con encabezado, así que una segunda
vista plana no aporta nada distinto, y mostrar el mes otra vez por fila dentro de un grupo que ya
lo dice en su encabezado es ruido puro. Se retira la vista de Lista y su conmutador (`view` state,
botones "Lista"/"Cronología" en la barra de filtros): la Cronología pasa a ser la única presentación.

Dentro de cada grupo de mes, `DiaryDateBlock` (en `feed-row-parts.tsx`, hermano de `RelativeDate`,
no reemplazo) ya no acepta `showMonth` sino `showDay: boolean`: solo renderiza el número de día
cuando difiere del de la fila anterior *dentro del mismo grupo* (clave `dayKey`: `${año}-${mes}-
${día}`, hermana de `monthKey`, ambas en `feed-row-parts.tsx`); si coincide, el `<time>` sigue
ocupando su ancho fijo (para no correr el resto de la fila) pero queda visualmente vacío. El mes ya
no se renderiza nunca por fila — es exclusivo del `<h3>` de encabezado de `groupByMonth`. La fecha
relativa y la absoluta completa siguen disponibles como `aria-label`/`title` en cada fila, aunque el
día no se muestre — un lector de pantalla nunca pierde el dato, solo el texto visible se deduplica.

**Alternativa considerada (la del primer pase):** dos vistas conmutables, con el bloque de fecha
deduplicando por mes en la vista de Lista. Se descarta — el conmutador no resolvía ningún caso de uso
que la Cronología por sí sola no cubra ya, y duplicaba la lógica de agrupación (una por mes para el
encabezado, otra por mes para el bloque de fecha) sin beneficio.

### 2. Reacción en el cluster de acciones, con su espacio SIEMPRE reservado — excepción de texto visible se mantiene

**Revisado dos veces tras ver la UI real con datos reales.** Primer pase: columna angosta fija al
borde izquierdo de la fila (antes de la carátula). Problema: esa columna retornaba `null` sin
reacción en vez de reservar su ancho, así que su presencia/ausencia corría horizontalmente la
carátula y el resto de columnas de una fila a otra. Segundo pase: se movió el ícono junto al título
del objetivo (mismo renglón que `TargetTitle`), asumiendo que un elemento de ancho ya variable
(el título) toleraría uno más sin problema — pero el usuario señaló, otra vez sobre la UI real, que
seguía sin "encajar": con artistas/álbumes de distinta longitud de nombre, el ícono aparecía en una
posición horizontal distinta en cada fila, disperso y difícil de escanear en una columna vertical.

**La causa real nunca fue "columna vs. en línea" — fue no reservar el espacio del ícono cuando falta
la reacción.** La corrección definitiva: `ReactionGlyph` se muda al cluster de acciones de la derecha
de la fila (junto a audiencia, antes del lápiz de editar y el menú "···"), y el componente **siempre**
renderiza su `<span>` contenedor de ancho fijo (`w-5 shrink-0`), tenga o no reacción la entrada —ya no
retorna `null`, retorna el mismo `<span>` vacío y `aria-hidden` cuando no hay reacción. Como ese
cluster ya vive anclado al borde derecho de la fila (`justify-between` en el contenedor padre), y el
lápiz y el menú son sus elementos más a la derecha, reservar el espacio de la reacción entre audiencia
y lápiz deja a **lápiz y menú en la posición exacta en todas las filas**, con o sin reacción — se
verificó con `getBoundingClientRect().left` en el navegador, coinciden al píxel. Este acomodo también
imita el orden de columnas de Letterboxd (LIKE antes de EDIT, después de las columnas de contenido),
no solo su idea de columna dedicada.

Reutiliza `REACTION_ICONS` sin agregar formas nuevas, en un tamaño ligeramente mayor al de
`ReactionBadge` (18–20px, hoy 14px, porque pasa de refuerzo visual a señal principal). Con reacción:
`role="img"` + `aria-label` con el nombre localizado, y `title` para el hover con mouse. Sin
reacción: sin `role`, `aria-hidden="true"`, contenido vacío — decorativo, invisible para tecnología
de asistencia, pero ocupando el mismo espacio — preserva la distinción existente entre ausencia de
reacción y reacción `neutral` explícita.

La excepción puntual al requisito "Representación de las reacciones" (texto localizado *siempre
visible*) se mantiene, solo cambia dónde vive físicamente el ícono — el spec ya la acotaba a "una
columna dedicada y compacta"; ahora se acota a "la línea de metadato de la fila del diario
propio", con las mismas dos condiciones de antes: el panel de ampliación (`ReactionPicker`) sigue
mostrando siempre el texto completo de cada opción, y ningún otro consumidor de `ReactionBadge` (el
feed) pierde su texto visible.

**Alternativas consideradas (los dos pases anteriores):** (a) columna angosta fija al borde izquierdo
de la fila, y (b) junto al título del objetivo. Ambas se descartan por el mismo motivo de fondo,
solo con síntomas distintos: (a) reservaba un ancho fijo pero lo "apagaba" con `return null` sin
reacción, corriendo la carátula; (b) no reservaba ningún ancho porque vivía pegada a un elemento ya
de ancho variable (el título), así que el ícono terminaba en una posición horizontal distinta en cada
fila. La lección: una columna de ancho fijo que a veces está vacía (`return null`) es, en la
práctica, una columna de ancho variable disfrazada — la solución no era relocar el ícono, era dejar
de omitirlo.

### 3. Acciones de fila: lápiz siempre visible + menú "···" nuevo

- **Lápiz:** botón solo-ícono con el mismo comportamiento de hoy (alterna `expandedId`), mismo
  tratamiento de color en hover (`text-paper-muted` → `text-paper`), `aria-label` con el texto que
  hoy es visible ("Editar"/"Edit"). No cambia qué hace, solo cómo se lee.
- **Menú "···" (`RowMenu`, nuevo, en `src/components/ui/`):** primer menú desplegable del sistema —
  se coloca ahí y no dentro de `diary/` porque es un primitivo genérico que otras superficies
  querrán después, aunque hoy solo lo consuma el diario. Un botón `aria-haspopup="menu"
  aria-expanded` que alterna un `<ul role="menu">` posicionado `absolute` bajo el trigger (sin
  portal — a diferencia de `RegisterListenDialog`, que sí necesita portal por ser un modal de
  pantalla completa; una fila del diario no tiene ese problema de recorte). Cada opción es un
  `<button role="menuitem">`. Cierra con `Escape`, al elegir una opción, o con un click fuera
  (listener de `mousedown` mientras está abierto, se remueve al cerrar/desmontar). Sin dependencia
  nueva.
- **Eliminar:** misma lógica de hoy (`pendingDeleteId`, `handleDelete`), ahora disparada desde
  dentro del menú. Al elegirla, el menú se cierra y aparece el mismo bloque de confirmación inline
  que ya existe debajo de la fila — sin cambios en ese flujo.
- **Registrar otra escucha:** crea una entrada nueva sobre el mismo objetivo de la fila con el mismo
  patrón de `MarkAsListened` (creación instantánea), agregada de forma optimista al principio de la
  caché de TanStack Query (nuevo helper simétrico a `updateCachedEntry`/`removeCachedEntry`:
  `addCachedEntry`). La fila nueva nace con `expandedId` apuntando a ella, para que el panel de
  ampliación (`ListenEntryForm`) aparezca ya abierto, igual que en la página de catálogo.
- **Tipografía del menú (revisado tras el primer pase):** `RowMenu` nació con `font-data text-sm`,
  un escalón más grande que el resto de los datos de la fila (`font-data text-xs` en contexto,
  audiencia, fecha). El usuario lo notó como "letras más grandes, no encajan con el resto de la
  página" al verlo en la UI real. Se corrige a `text-xs`, igual que el resto de la línea de
  metadato — `RowMenu` es un primitivo genérico y no impone tamaño por sí solo más allá de este
  valor por defecto, así que un futuro consumidor con otra escala tipográfica puede sobrescribirlo.
- **Agregar a lista:** abre un popover dentro del menú que reutiliza la lógica de
  `AddToListButton` (`getMyLists` filtrado por `entityType`, `addItemToList`), extraída a un
  subcomponente interno (`AddToListPanel`) para que tanto el botón de catálogo como esta entrada de
  menú compartan una sola fuente de la lógica de datos sin duplicar la llamada a la API.

**Alternativa considerada:** anidar `AddToListButton` tal cual dentro de la opción de menú. Se
descarta — trae su propio estado de apertura y el chrome fijo de `Button variant="secondary"`, que
no encaja dentro de un `role="menuitem"` compacto; extraer el panel interno mantiene una sola fuente
de la lógica sin forzar su presentación visual a coincidir.

### 4. Ancho de página

`/me/diary` pasa de `max-w-2xl` a `max-w-3xl`, sin más cambios de grilla interna que el espacio
nuevo que libera para las columnas de fecha y reacción.

### 5. Enlace de artista en álbumes/canciones del diario — extiende `add-feed-artist-link`

**Pedido de último momento, antes de comitear:** el diario propio debía comportarse como el feed
también en esto — el artista acreditado de un álbum o canción tiene que enlazar a su página.
`add-feed-artist-link` (archivado) ya construyó todo lo necesario para el feed y excluyó al diario
explícitamente como Non-Goal ("`artistId` queda opcional y sin poblar ahí ... mismo criterio que ya
usa `artistName` — solo lo puebla el feed"), no por una razón técnica sino porque no se había pedido
todavía. Este cambio revisita esa exclusión puntual, sin reabrir ni contradecir el resto de esa
decisión archivada.

`services/feed/feed.ts` ya expone dos subqueries escalares hermanas, pensadas para ser reutilizadas:
`PRIMARY_ARTIST_SQL` (nombre del artista acreditado como `primary`, vía la tabla `credit`) —que el
diario **ya** usaba para poblar `subtitle`— y `PRIMARY_ARTIST_ID_SQL` (el `id` del mismo artista),
que el diario no usaba. Como ambas son la misma expresión SQL, `subtitle` y el futuro `artistId`
siempre están en sincronía por construcción — no hace falta una segunda fuente de verdad.

Se agrega `PRIMARY_ARTIST_ID_SQL(listenEntry.releaseGroupId, listenEntry.recordingId)` a
`selectEntries()` en `services/diary/diary.ts` (junto al `PRIMARY_ARTIST_SQL` que ya estaba),
`DiaryTargetInfo` gana el campo `artistId: string | null`, y `serializeEntry` lo mapea igual que ya
mapea `subtitle` (`null` para el propio artista, el id acreditado o `null` para álbum/canción). En
el cliente, `DiaryActivityList` pasa `artistHref={entry.target.artistId ? targetHref("artist",
entry.target.artistId) : null}` a `TargetTitle` — el mismo prop que ya usa `FeedActivityList`, sin
cambios en `TargetTitle` (ya lo soportaba desde `add-feed-artist-link`). `ListenTargetInfoSchema`
tampoco cambia: `artistId` ya era opcional/nulo ahí, declarado exactamente para este caso ("solo lo
puebla el feed" pasa a "el feed y el diario propio").

**Alternativa considerada:** duplicar la subquery de id dentro de `diary.ts` en vez de importarla de
`feed.ts`. Se descarta — es la misma expresión SQL letra por letra; importarla evita que las dos
copias diverjan si el criterio de "artista acreditado principal" cambia en el futuro.

## Risks / Trade-offs

- **[Ícono-solo para reacción reduce la redundancia texto+ícono frente al requisito general]** →
  Mitigado con `aria-label` + `title`, y acotado explícitamente como excepción de una sola columna
  en el spec — no se toca la política general de `ReactionBadge` en el resto del sistema.
- **[Primer menú del sistema, sin precedente de manejo de foco/teclado]** → Se sigue el mismo
  criterio ya usado en `RegisterListenDialog` (Escape cierra, foco gestionado al abrir/cerrar), sin
  dependencia nueva; se cubre con tests de teclado (Tab, Escape, click fuera).
- **["Registrar otra escucha" crea una entrada sin la vista completa del objetivo que tiene
  `MarkAsListened` en su página de catálogo]** → La fila ya muestra carátula y título del objetivo;
  el formulario de ampliación se auto-expande de inmediato, igual que en catálogo.
- **[Extraer `AddToListPanel` de `AddToListButton` puede romper su test existente]** →
  `AddToListButton` conserva la misma firma de props (`target`, `authenticated`) vista desde afuera;
  solo cambia su composición interna.
- **[El primer pase de este mismo cambio ya tenía dos defectos de layout reales: columna de reacción
  de ancho fijo que se desaparecía y desalineaba filas vecinas, y vista de Lista redundante con la
  Cronología]** → Corregidos en una segunda iteración sobre el mismo cambio (aún sin archivar) tras
  verlos en la UI real — ver Decisiones 1 y 2 revisadas. Ambos se detectaron por inspección visual
  directa, no por los tests unitarios (que no aseveraban alineación entre filas ni la ausencia de un
  conmutador) — los tests se actualizaron para cubrir ambos casos de ahora en más.

## Migration Plan

Cambio de frontend puro (presentación + un primitivo de UI nuevo), sin migración de datos ni de
contrato REST. Deploy directo, sin feature flag. Rollback = revertir el commit.

## Open Questions

Ninguna — el brief de diseño fue confirmado por el usuario antes de este documento.
