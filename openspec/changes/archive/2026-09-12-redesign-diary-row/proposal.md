## Why

El diario propio (`/me/diary`) muestra hoy la fecha de cada escucha solo como texto relativo
("hace 2 días"), la reacción como texto pegado al contexto, y "Editar"/"Eliminar" como enlaces de
texto sueltos. Ese formato tenía sentido para un listado breve, pero no aprovecha que cada escucha
ya trae un ícono distintivo de reacción, ni deja ver de un vistazo *cuándo* pasó algo dentro del
propio historial — la fecha exacta es un dato relevante en un diario, no solo en un feed social.
Tampoco hay forma de registrar otra escucha del mismo objetivo o agregarlo a una lista sin salir de
la fila, aunque ambas acciones ya existen en otras superficies (`MarkAsListened`,
`AddToListButton`). El cambio `redesign-diary` había descartado explícitamente un menú "···" "por
ahora, para resolver un problema que dos enlaces de texto ya resuelven" — este cambio es lo que
justifica revisitar esa decisión, con funcionalidad real detrás.

## What Changes

- Ensancha `/me/diary` de `max-w-2xl` a `max-w-3xl` (como los demás feeds de una sola columna, con
  más aire para las columnas nuevas). Sin `<table>` literal — la fila sigue siendo un grid/flex que
  colapsa a bloque apilado en mobile.
- Se retira la vista de Lista plana y el conmutador Lista/Cronología: el diario propio se presenta
  **siempre** agrupado por mes calendario (la vista de Cronología que ya existía), con un
  encabezado por mes. Dentro de cada mes, cada fila muestra su número de día solo cuando difiere
  del de la fila anterior — el mes nunca se repite por fila, ya lo dice el encabezado del grupo. La
  fecha relativa pasa a estar disponible como valor accesible (tooltip), invirtiendo el rol actual.
- La reacción deja de mostrarse como texto pegado al contexto y pasa a un ícono solo, junto a
  audiencia en el cluster de acciones de la derecha (antes del lápiz y el menú "···"), con el nombre
  localizado como valor accesible en vez de texto siempre visible ahí. Ese ícono **siempre** reserva
  su espacio, tenga o no reacción la entrada — dos ubicaciones anteriores (columna fija al inicio de
  la fila; junto al título) se descartaron tras verlas con datos reales: ambas desalineaban o
  desperdigaban el ícono entre filas vecinas porque no reservaban su espacio de forma consistente.
- "Editar" y "Eliminar" dejan de ser enlaces de texto y pasan a dos controles ícono sutiles: un
  lápiz (editar, siempre visible, abre el mismo panel de ampliación de hoy) y un menú "···" —el
  primer componente de menú desplegable del sistema, no existe ninguno hoy.
- El menú "···" agrupa: **Eliminar** (misma confirmación inline de hoy, ahora disparada desde el
  menú), **Registrar otra escucha** del mismo objetivo (mismo patrón de creación instantánea +
  ampliación que `MarkAsListened`), y **Agregar a lista** (misma lógica de `AddToListButton`,
  adaptada para disparar desde la fila).
- Cuando el objetivo de una escucha es un álbum o una canción con artista acreditado, el nombre del
  artista (el subtítulo junto al título) pasa a enlazar a la página de ese artista — igual que ya
  hace el feed desde `add-feed-artist-link`. Ese cambio había excluido explícitamente al diario
  propio como Non-Goal ("no lo necesita"); este cambio revisita esa exclusión: se agrega
  `PRIMARY_ARTIST_ID_SQL` (ya existente en `services/feed/feed.ts`) a la consulta del diario, se
  suma `artistId` a `DiaryTargetInfo`, y `TargetTitle` recibe el mismo `artistHref` que ya usa el
  feed — sin cambios de esquema de DB ni de contrato REST, `ListenTargetInfoSchema.artistId` ya
  existía como campo opcional/nulo para exactamente este caso.
- **No incluido en este cambio (Non-Goal explícito)**: una función para ver qué listas o
  comunidades contienen un artista/álbum/canción dado. Requiere una consulta nueva con filtrado de
  privacidad (listas públicas o de seguidos, nunca privadas) y una página nueva — queda para un
  cambio de seguimiento.
- Sin cambios de esquema de base de datos ni de contrato REST — la respuesta de `/api/me/diary` gana
  un campo (`target.artistId`) ya declarado como opcional en el schema existente, no un endpoint
  nuevo. Sin cambios en `DiaryList.tsx` (el rail de solo lectura del diario en perfiles públicos), en
  la barra de filtros, ni en los campos o validación de `ListenEntryForm`.

## Capabilities

### New Capabilities

(ninguna — este cambio no introduce una capacidad nueva, extiende la presentación de una existente)

### Modified Capabilities

- `listen-diary`: los requisitos "Presentación del diario propio", "Vista de cronología del diario
  propio" y "Representación de las reacciones" cambian — nuevo ancho de página, la vista de
  Cronología pasa a ser la única (se retira la vista de Lista y su conmutador), número de día
  deduplicado por fila dentro de cada grupo de mes, reacción en el cluster de acciones con espacio
  siempre reservado y carve-out explícito sobre el requisito general de texto siempre visible,
  acciones de fila como íconos (lápiz + menú "···") con texto del mismo tamaño que el resto de la
  fila, el menú agrega registrar-otra-escucha y agregar-a-lista como acciones alcanzables desde la
  fila del diario, y el artista acreditado de un álbum o canción enlaza a su página.

## Impact

- `src/components/diary/DiaryActivityList.tsx` — anatomía de fila, columnas, acciones.
- `src/components/feed/feed-row-parts.tsx` — `RelativeDate` se adapta o se complementa con un
  nuevo componente de fecha en bloque calendario (uso exclusivo del diario propio; el feed y otras
  superficies que ya consumen `RelativeDate` no cambian).
- `src/components/diary/ReactionBadge.tsx` / `ReactionIcons.tsx` — variante solo-ícono para columna
  angosta.
- Componente nuevo: menú desplegable ("···"), sin precedente en el código actual.
- `src/app/[locale]/me/diary/page.tsx` — ancho `max-w-3xl`.
- `src/services/diary/diary.ts` — `DiaryTargetInfo` gana `artistId`; `selectEntries()` suma
  `PRIMARY_ARTIST_ID_SQL` (importado de `services/feed/feed.ts`, sin duplicar lógica) junto al
  `PRIMARY_ARTIST_SQL` que ya usaba; `serializeEntry` lo mapea a `target.artistId`.
- Reutilizados sin modificar: la lógica de creación de `src/components/diary/MarkAsListened.tsx`, la
  lógica de listas de `src/components/lists/AddToListButton.tsx`, y `PRIMARY_ARTIST_ID_SQL`/
  `TargetTitle`'s `artistHref` (ambos ya existían para el feed, `add-feed-artist-link`).
- Sin impacto en `src/components/diary/DiaryList.tsx` (el rail de solo lectura sigue sin `TargetTitle`
  ni artista enlazado), en el contrato REST (`src/lib/api/diary.ts`, `src/lib/api/lists.ts` se
  consumen tal cual, sin nuevos endpoints), ni en el esquema de DB.
