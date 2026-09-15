## Context

La vista de selección (`ArtistJourneySelectionView`, del cambio todavía sin archivar
`redesign-artist-journey-management-view`) ya muestra cada álbum de la selección con carátula,
título y año. `ArtistJourneyAlbum` no expone si el propietario ya escuchó ese álbum — solo el
agregado `progress.{selectedCount,listenedCount}`. Registrar una escucha ya existe como acción
general del catálogo (`MarkAsListened`, `RegisterListenDialog`, ambas sobre
`createListenEntry` de `@/lib/api/diary`); falta el punto de entrada específico de esta página.

## Goals / Non-Goals

**Goals:**
- Registrar una escucha de un álbum de la selección sin salir de la página de gestión.
- Reflejar de inmediato, tras registrar, el estado "escuchado" del álbum y el progreso agregado
  del recorrido (barra, texto, estado completo/en curso).
- Reutilizar la infraestructura de diario ya existente — sin nuevo endpoint.

**Non-Goals:**
- No agrega la acción al editor de selección (grilla de casilleros): ese control es para elegir
  qué pertenece al recorrido, no para registrar escuchas.
- No cambia la semántica de "completo" (Requirement "Estados derivados del recorrido", ya
  existente): sigue siendo escucha registrada, no una escucha por casillero aparte.
- No ofrece un flujo de relisten desde esta página (D7): registrar una escucha adicional de un
  álbum ya escuchado sigue siendo posible, pero desde el diario o la página del álbum — acá la
  acción es explícitamente un registrar/quitar, no un contador.

## Decisions

**D1 — Nueva capability agregada (ADDED), no MODIFIED de un requirement existente.** El cambio
`redesign-artist-journey-management-view` (que introdujo la vista de selección) todavía no está
archivado — su requirement "Vista de la selección actual con carátulas, orden y enlaces" no existe
todavía en `openspec/specs/artist-journey/spec.md`. Escribir esta capacidad como requirements
nuevos, en vez de un MODIFIED sobre ese requirement pendiente, evita depender del orden de archivo
de dos cambios encadenados sobre la misma spec.

**D2 — `ArtistJourneyAlbum.listened` se calcula sobre toda la discografía, no solo la selección.**
El servicio ya calculaba `listenedCount` con `countListened(ownerId, selectedIds)` (una cuenta, no
un set). Se reemplaza por `listenedReleaseGroupIds(ownerId, discography.map(rg => rg.id))`, que
devuelve el conjunto de ids escuchados sobre toda la discografía — así cada álbum (no solo los
seleccionados) puede exponer `listened`, y `listenedCount` sale de intersecar ese conjunto con
`selectedIds`, mismo resultado que antes.
*Alternativa descartada*: consultar solo los álbumes seleccionados — más barato, pero el editor
(que lista toda la discografía) quedaría sin poder mostrar "escuchado" si en el futuro lo
necesitara; el costo adicional es una discografía completa por artista, ya acotada.

**D3 — Después de registrar, refrescar el recorrido completo (`getArtistJourney`) en vez de
derivar el nuevo estado en el cliente.** `ArtistJourneyManager` ya importa el wrapper
`getArtistJourney` (sin usarlo hasta ahora). Reusarlo evita duplicar en el cliente la lógica de
`deriveJourneyState` y el cálculo de `listenedCount` — la misma fuente de verdad que ya usa
"Guardar". El refresco actualiza `journey` pero **no** toca `selected` (el borrador de selección en
curso): registrar una escucha nunca modifica `user_list_item`, así que la membresía de la
selección no cambia entre el fetch anterior y el nuevo.

**D4 — El botón no se deshabilita tras marcar; pasa a mostrar una marca "Escuchado" junto a una
acción sobre esa marca.** *(Revisado por D7 — la acción que queda junto a la marca es "Quitar
registro", no "Registrar" de nuevo).* No queda inerte tras el primer registro: hay una acción
disponible, con la semántica de D7.

**D5 — "Ampliar" reutiliza `ListenEntryForm` tal cual, con la misma UX de apertura automática que
`MarkAsListened`.** Registrar una escucha crea de inmediato una entrada mínima (registro rápido,
nace privada); el propietario espera poder completarla ahí mismo con Impresión/Contexto/Reacción/
Audiencia, sin otro viaje al catálogo o al diario — es la misma expectativa que ya resuelve
`MarkAsListened` en el resto del catálogo. Se replica ese mismo patrón: cada `createListenEntry`
exitoso abre automáticamente el panel (`ListenEntryForm`) sobre la entrada recién creada; un
enlace "Ampliar"/"Cerrar" (mismas claves `diary.expand`/`diary.collapse` que ya usa
`MarkAsListened`) permite volver a mostrarlo u ocultarlo después sin crear una entrada nueva. La
página de gestión guarda en memoria, por álbum, la última entrada creada en la sesión de edición
(`listenEntries: Record<albumId, ListenEntry>`) — es el único dato que `journey`/`getArtistJourney`
no traen (solo exponen `listened` agregado), y `ListenEntryForm` lo necesita para
`entryId`/`initial`.
*Alternativa descartada*: un modal aparte (como `RegisterListenDialog`) — se descarta porque ese
modal existe para el caso en que el objetivo todavía no se eligió (búsqueda incluida); acá el
álbum ya es conocido, así que un panel inline en la misma fila/tile es más directo y no tapa el
resto de la página.
*Modo gráfico*: como el panel no cabe dentro de una celda de la grilla, se renderiza una sola vez
debajo de toda la grilla de la categoría, rotulado con el título del álbum expandido — igual criterio
de "un panel a la vez" que ya aplica `listeningId`.

**D6 — Registrar un álbum mientras el panel de otro está abierto NO lo reemplaza; y el panel
recién abierto se desplaza a la vista.** Revisión sobre D5, a partir de un caso señalado
directamente sobre el modo gráfico: ahí el ícono "✓" vive encima de cada carátula, invitando a
registrar varias escuchas seguidas sin pausar en cada una; con la apertura automática incondicional
de D5, el segundo registro (o el tercero) reemplazaba en silencio el panel del primero, descartando
cualquier texto que el propietario hubiera empezado a escribir ahí sin haber tocado "Guardar" —sin
ningún aviso. Ahora `markListened` solo abre el panel si no hay ninguno abierto
(`setExpandedId((current) => current ?? albumId)`); registrar otros álbumes mientras uno está
abierto los marca igual (✓ Escuchado, progreso actualizado), pero no les abre panel — el
propietario puede hacerlo después con "Ampliar", una acción explícita. Además, el panel que sí se
abre automáticamente hace `scrollIntoView` — en el modo gráfico puede aparecer lejos del ícono que
se acaba de tocar (debajo de toda la grilla de la categoría, no junto al tile), y sin desplazarlo
a la vista pasaba desapercibido que se había abierto.
*Alternativa descartada*: advertir con un diálogo de confirmación antes de reemplazar un panel con
cambios sin guardar — se descarta por ser fricción extra sobre una acción pensada como rápida; no
abrir un segundo panel automáticamente ya evita el problema sin pedirle nada al propietario.

**D7 — Registrar/Quitar registro, no "registrar de nuevo" en cada clic.** Revisión sobre D4:
dejar la acción como "Registrar escucha" incluso con el álbum ya marcado invitaba a interpretarla
como un casillero — clicar un "✓" ya marcado se lee como "desmarcar", no como "agregar otra
escucha"; con el diseño anterior, cada clic de más creaba una entrada de diario nueva sin que el
propietario lo esperara, sobre todo en modo gráfico, donde el ícono vive encima de cada carátula y
es fácil tocarlo por error o dos veces seguidas. Ahora la acción es un toggle real, pero acotado a
lo que este componente puede deshacer con seguridad: solo la entrada que **esta misma sesión de
edición creó** (`listenEntries[albumId]`, ver D5). Tres estados por álbum:
- No escuchado → botón "Registrar escucha" (crea la entrada, D5).
- Escuchado, con la entrada rastreada en esta sesión → botón "Quitar registro" (`deleteListenEntry`
  sobre esa entrada; revierte `listened` si no hay otras entradas del álbum).
- Escuchado, sin entrada rastreada (el propietario ya lo había escuchado antes de abrir esta
  página, por el diario o la página del álbum) → sin botón, solo la marca "✓ Escuchado": este
  componente no conoce el id de esa entrada previa, y adivinar cuál borrar entre varias posibles
  escuchas sería una eliminación arriesgada sin que el propietario la pida desde el lugar
  correcto (su diario).
Un error al quitar el registro se comporta igual que uno al crearlo: aviso genérico, sin tocar el
borrador de selección.
*Alternativa descartada*: permitir "quitar" también sobre entradas no rastreadas, resolviendo cuál
borrar con una consulta adicional (p. ej. la más reciente) — se descarta por el riesgo de borrar
una entrada que el propietario no esperaba perder, y por el costo de otra consulta; si quiere
gestionar esas escuchas, el diario ya se lo permite con control total.

**D8 — El ícono de "✓" en modo gráfico pasa a un círculo con relleno sólido cuando está marcado,
en vez de un glifo de texto atenuado sobre fondo translúcido.** El diseño anterior (`✓` de fuente,
`text-petrol` sobre `bg-ink/80`) se perdía contra carátulas oscuras o con textura similar, y no se
distinguía a simple vista del estado sin marcar. El nuevo ícono es un trazo SVG grueso
(`CheckIcon`, `strokeWidth="3.5"`) dentro de un círculo con borde, que cambia de "hueco" (sin
relleno, borde tenue) a "sólido" (relleno `bg-petrol`, alto contraste) — la diferencia de forma, no
solo de color, se percibe aunque el propietario no distinga bien los tonos. El estado "escuchado
sin entrada rastreada" (D7) usa el mismo relleno sólido pero sin interacción (`cursor-default`, sin
cambio en hover) — sigue siendo igual de perceptible que estás escuchado, aunque no se pueda actuar
desde acá.

## Risks / Trade-offs

- [Riesgo] Registrar una escucha ahora dispara una llamada adicional (`getArtistJourney`) además
  de la creación → [Mitigación] mismo patrón que "Guardar" (dos llamadas: `setArtistJourneySelection`
  ya implica una petición mutadora seguida de la respuesta ya inline; acá se separan porque
  `createListenEntry` no devuelve el recorrido). El costo es una lectura adicional por clic, sobre
  una página que ya no es de alta frecuencia de interacción.
- [Riesgo] Refrescar `journey` en medio de una edición de selección sin guardar podría, en teoría,
  pisar el borrador → [Mitigación] D3: el refresco actualiza `journey`, nunca `selected`; el diff
  de "Guardar" sigue comparando contra la selección persistida real.
