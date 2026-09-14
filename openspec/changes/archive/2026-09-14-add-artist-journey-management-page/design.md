## Context

`artist-journey` ya tiene servicio, API y datos completos (`add-artist-journey`, archivado). La
única pieza que queda por resolver, explícitamente diferida en ese spec, es dónde vive la
interacción de gestión: hoy es un modal (`ArtistJourneyModal`) abierto desde la página del
artista, con archivar/desarchivar/borrar también en esa misma tarjeta
(`ArtistJourneySection`). El pedido del usuario para este spec fue puntual: una página dedicada
de gestión, en dos vistas — el listado ya existente (`/me/artist-journeys`, hoy solo lectura) y
un detalle por artista donde ocurra toda la edición.

No hay cambios de datos: `ArtistJourneyDetail`, `ArtistJourneySummary` y los cinco endpoints bajo
`/api/me/artist-journeys/` ya cubren todo lo que la nueva página necesita.

## Goals / Non-Goals

**Goals:**
- Página `/me/artist-journeys/[artistId]` como único lugar de edición de un recorrido: selección
  agrupada por categoría (borrador + guardar), archivar/desarchivar, borrar.
- `ArtistJourneySection` en la página del artista pasa a ser un resumen de solo lectura con un
  único punto de entrada a la gestión.
- `/me/artist-journeys` enlaza cada entrada a la nueva página de detalle, con buscador local y
  los tres modos de visualización ya establecidos en otras superficies de gestión personal
  (Detallada/Índice/Gráfico).

**Non-Goals:**
- Ningún cambio de modelo de datos, servicio o contrato de API — es una reorganización de UI.
- Ninguna funcionalidad nueva de recorrido (sin exportar, sin compartir, sin edición en lote de
  varios artistas a la vez).

## Decisions

**D1 — Ruta `/me/artist-journeys/[artistId]`.** Sigue el mismo patrón que `/artist/[id]`
(artistId como segmento dinámico) y anida bajo la ruta de listado ya existente, coherente con
cómo el resto de la app anida detalle bajo índice (p. ej. `/me/lists/[id]`).

**D2 — Sin endpoints nuevos.** La página de detalle usa exactamente los wrappers de
`src/lib/api/artist-journeys.ts` que ya usaba el modal (`getArtistJourney`,
`setArtistJourneySelection`, `archiveArtistJourney`, `unarchiveArtistJourney`,
`deleteArtistJourney`). Solo cambia dónde se invocan.

**D3 — Recorrido inexistente en la página de detalle → 404.** La página de detalle asume que el
recorrido ya existe (se llega a ella desde "Gestionar recorrido", que solo aparece si hay uno
activo, o desde el modal de inicio tras guardar — D4, revisado). Si `getArtistJourneyDetail`
devuelve `null` para el `artistId` de la URL (link viejo, navegación directa a una URL borrada),
la página responde `notFound()`, igual que la página de artista ante un id inexistente. No se
ofrece un flujo de activación inline ahí: crear un recorrido sigue siendo una acción de la
página del artista, no de la de gestión.

**D4 (revisado) — "Armar recorrido" abre un modal de inicio; activar y navegar ocurren juntos
recién al guardar.** Versión original de este spec: el botón activaba de inmediato
(`activateArtistJourney`, persistiendo la preselección de estudio) y navegaba sin más
interacción. Un usuario probando el flujo reportó dos problemas reales: (1) el botón "Guardar" de
la página de gestión aparecía deshabilitado nada más llegar, sin ninguna señal de que eso era
correcto — se leía como una falla (resuelto parcialmente por D11, pero la causa de fondo seguía
sin resolverse); (2) un clic accidental en "Armar recorrido" ya dejaba un recorrido creado, que
había que borrar manualmente. Se evaluaron tres opciones:
  - (a) Mantener la activación inmediata y agregar un toast/mensaje "Discografía agregada" al
    llegar a la gestión. Descartada: no resuelve el problema del clic accidental — el recorrido
    ya está creado antes de que el usuario confirme que lo quiere.
  - (b) No crear nada hasta que el usuario elija álbumes, pero mandarlo directo a
    `/me/artist-journeys/[artistId]` para elegir ahí. Descartada: esa ruta asume que el recorrido
    ya existe (D3) — enviar ahí a un usuario sin recorrido dejaría una página sin datos que
    mostrar, o forzaría a la página de detalle a manejar un segundo modo "creando" que le es
    ajeno.
  - (c) Reintroducir un modal, pero como **único punto de creación** — no de edición general (esa
    quedó resuelta por la página de detalle, D1-D2). Elegida.

  El modal (`ArtistJourneyStartModal`) reutiliza la discografía ya cargada por la página del
  artista (misma `albums`/`categoryLabels` que ya recibía `AlbumGrid` — sin query nueva),
  preselecciona estudio como borrador puramente local, y expone Cancelar/Guardar. Cancelar (o
  `Escape`, o clic fuera) cierra sin ninguna llamada al servidor: nada queda creado. Guardar hace
  dos llamadas a endpoints ya existentes en secuencia — `activateArtistJourney` (crea + prepuebla
  estudio, idempotente) y `setArtistJourneySelection` (reemplaza esa selección por el borrador
  final del modal) — y recién entonces navega a la página de gestión. No se creó un endpoint
  combinado porque esta es una acción de baja frecuencia (una vez por artista) donde dos llamadas
  secuenciales no justifican el costo de un nuevo contrato de API; ver D2. El resultado práctico:
  al llegar a la gestión, lo persistido es exactamente lo que el usuario acaba de elegir y
  confirmar con su propio clic en "Guardar" — el botón deshabilitado con la señal de D11 ya no es
  sorpresivo, porque no hubo ninguna persistencia silenciosa de por medio.

**D5 — Todas las acciones mutables se mudan a la página de detalle.** Archivar, desarchivar y
borrar dejan la tarjeta de la página del artista (que pasa a ser puramente informativa: estado +
progreso + un enlace) y se agrupan en la página de detalle junto a la selección, tal como ya
las agrupaba el modal. Esto además resuelve un problema menor del diseño anterior: la tarjeta del
artista tenía que manejar tres flujos de mutación (`toggleArchive`, `remove`, y abrir el modal);
ahora solo maneja navegación.

**D6 — El modal se retira; su UI se traslada sin cambios de comportamiento.** El árbol de grupos
colapsables, el checkbox maestro con estado indeterminado, el borrador local y el guardado en una
sola operación (`ArtistJourneyModal`) se mueven tal cual a un nuevo componente de la página de
detalle. Al ya no ser un diálogo, se elimina la mecánica de modal (portal, focus-trap, `Escape`,
bloqueo de scroll, backdrop) — la página misma es la superficie, sin necesidad de replicar
accesibilidad de diálogo para contenido que ya está en su propia ruta.

**D6.1 — La grilla de selección se extrae a un componente compartido (D4 revisado la vuelve a
necesitar en dos lugares).** Cuando el modal se retiró (D6), su grilla de categorías
colapsables/checkbox-maestro se movió tal cual a la página de gestión, sin extraerse, porque
tenía un solo consumidor. Al reintroducir un modal de inicio (D4 revisado), esa misma grilla pasa
a tener dos consumidores reales — `ArtistJourneyManager` (edita un `ArtistJourneyDetail` ya
existente, con `selected` propio por álbum) y `ArtistJourneyStartModal` (arma un borrador sobre
la discografía cruda del artista, sin `selected`) — así que se extrae a
`ArtistJourneyAlbumGroups.tsx`, genérico sobre cualquier álbum con
`{id, title, category, firstReleaseYear}` (el subconjunto de campos que ambas fuentes de datos
comparten estructuralmente). Evita duplicar ~70 líneas de JSX idénticas; no se extrajo antes por
no tener un segundo consumidor todavía (dos es el umbral, no una anticipación).

**D7 — El listado enlaza a la gestión, no al artista.** En `ArtistJourneyList`, el nombre del
artista pasa a enlazar a `/me/artist-journeys/[artistId]` (antes `/artist/[id]}`). Se agrega un
enlace secundario, más discreto, "Ver artista" hacia `/artist/[id]` para no perder ese acceso.

**D8 — Breadcrumbs coherentes con el resto de la app.** La página de detalle usa el mismo
componente `Breadcrumbs` que ya usan artista y otras páginas de gestión: Inicio → Mis recorridos
→ nombre del artista.

**D9 — Modos de visualización calcados de Want to Listen, no una variante nueva.** El listado
propio (`listMyArtistJourneys`) siempre trae el conjunto completo en una sola consulta, sin
paginación de servidor — a diferencia de `/me/lists` o Favoritos, que sí paginan y filtran contra
la API. Por eso el buscador, el orden y los tres modos (Detallada/Índice/Gráfico) se implementan
enteramente en el cliente, sin parámetros de query ni debounce de red: filtrar/ordenar un arreglo
ya cargado es instantáneo. Se calca la estructura de `WantToListenList`/`WantToListenModeSwitcher`
(`ArtistJourneyModeSwitcher`, `use-artist-journey-view-mode.ts` con persistencia en
`localStorage`, un renderer por modo) en vez de inventar un mecanismo nuevo — misma convención
visual y de accesibilidad (`role="radiogroup"`, navegación por flechas) que ya conoce el usuario
de esa superficie. El modo Índice omite la foto (mismo criterio que `EntriesIndex`, pensado para
escanear texto); el modo Gráfico usa `DiscPlaceholder`/foto en cuadrícula (mismo criterio que
`EntriesGraphic`).

**D9.1 — Orden con tres opciones, calcado de `sort` de `/me/lists`/Favoritos más una propia, sin
persistir.** Se reutiliza el mismo `FilterSelect` y las mismas dos opciones base (`recent`/
`alpha`) que ya usan `MyListsTab`/`FavoritesToolbar`, y se agrega una tercera, `state`, propia de
esta capacidad (ninguna otra superficie de la app ordena por estado). "Por orden de agregado"
(recent) no reordena nada: `listMyArtistJourneys` ya devuelve el arreglo por activación
descendente, así que ese modo es la identidad sobre el `filter` de búsqueda. "Alfabético" aplica
`localeCompare` sobre el nombre del artista. "Por estado" ordena por un mapa fijo
`{ in_progress: 0, complete: 1, archived: 2 }` — el mismo orden canónico que ya usa
`ARTIST_JOURNEY_STATES` en `services/artist-journeys/types.ts` — usando `Array.prototype.sort`
(estable en el motor de JS del navegador) para que, dentro de un mismo estado, se conserve el
orden de agregado sin necesidad de un criterio de desempate explícito. A diferencia del modo de
visualización (una preferencia estable de "cómo quiero ver esto siempre"), el orden es un filtro
de la sesión de lectura actual — mismo criterio que ya aplican `MyListsTab`/`FavoritesToolbar`,
que tampoco persisten su `sort`: no se guarda en `localStorage` y vuelve a "recent" en cada
visita.

**D9.2 — Buscador insensible a diacríticos vía normalización NFD, no una librería.** El buscador
comparaba con `toLowerCase()` puro, que no reconoce que "Sabado" y "Sábado" son la misma búsqueda
para quien no tiene tilde a mano o escribe en un teclado distinto. Se agrega
`normalizeForSearch` (`artist-journey-list-shared.tsx`): `value.normalize("NFD")` separa cada
letra de su marca diacrítica en un carácter combinable aparte, que se descarta con la clase
Unicode `\p{M}` ("Mark") antes de comparar en minúsculas. No se suma una dependencia externa
(`normalize.js`/`diacritics`, etc.) porque `String.prototype.normalize` ya es nativo del motor de
JS y cubre el caso. El orden alfabético (`localeCompare`) no necesitó el mismo ajuste: la
colación del navegador ya intercala correctamente nombres con y sin diacríticos.

**D10 — Sin cambios de alcance en desempeño.** Con conjuntos grandes (cientos de recorridos) el
filtro en memoria seguiría siendo instantáneo del lado del cliente; no se agrega paginación de
servidor a `listMyArtistJourneys` en este cambio porque el volumen esperado (recorridos activados
uno por uno, por artista, self-service) es bajo — la misma premisa que ya asumía el listado de
solo lectura.

**D11 — "Guardar" deshabilitado sin cambios queda como está; se agrega una señal textual, no se
habilita siempre.** Reporte de usuario: al entrar recién activado un recorrido, "Guardar" aparece
deshabilitado pese a que los álbumes de estudio ya se ven marcados — se leyó como una falla. No lo
es: `activateArtistJourney` ya persiste esa preselección al crear el recorrido (Requirement
"Activar un recorrido de artista"), así que el borrador arranca igual a lo guardado y no hay nada
que enviar — el escenario "Guardar sin cambios no envía nada" (§ specs) ya lo exigía así
explícitamente. Se evaluaron tres opciones: (a) dejarlo sin cambios, (b) agregar una señal
discreta de "sin cambios pendientes" junto al botón, (c) habilitar "Guardar" siempre aunque no
haya diferencia. Se descartó (a) porque el usuario reportó confusión real con el estado
deshabilitado sin ninguna explicación visible, y (c) porque reintroduciría el problema que motivó
el borrador local en primer lugar (D8 de `add-artist-journey`): una petición al servidor que no
cambia nada. Se implementó (b): un `<span>` discreto (`font-data text-xs text-paper-muted`) junto
al botón, visible solo cuando `!dirty && !saving`, con el texto localizado `noChanges`.

**D12 — Eliminar desde el listado reutiliza el endpoint de borrado; confirmación de dos pasos
calcada de Want to Listen, no del patrón de dos botones de la gestión.** La página de gestión
usa Eliminar/Confirmar/Cancelar como tres controles de texto separados (espacio de sobra en una
tarjeta ancha). El listado no tiene ese espacio por fila, especialmente en modo Índice — se
calca en cambio `RemoveEntryButton` de Want to Listen: un solo botón que arma la confirmación al
primer clic (cambia su texto y `aria-label`) y la ejecuta al segundo, con auto-desarme a los 4s o
al perder el foco. `ArtistJourneyDeleteButton` es esa misma mecánica con las traducciones de
`artistJourney` (`listDeleteItem*`) y llamando a `deleteArtistJourney` (mismo wrapper y mismo
endpoint que ya usaba la gestión). `ArtistJourneyList` pasa de derivar `visible` directamente de
la prop `journeys` a mantener un estado local `items` (inicializado con esa prop) para poder
quitar una entrada al eliminar sin recargar la página — mismo patrón que `WantToListenList` con
`removeFromWantToListen`.

**D13 — El modo Gráfico consolida sus acciones en un menú "⋮" (`RowMenu`), en vez de replicar
los enlaces sueltos de Detallada/Índice.** Pedido explícito del usuario con una captura de
referencia, tras ver el modo Gráfico con "Ver artista" + eliminar como controles de texto
sueltos sobre una tarjeta angosta (grid de 3 a 5 columnas): apretados, y sin espacio para sumar
"Archivar" como tercera acción sin volverse ilegible. Se reutiliza `RowMenu`/`RowMenuItem` de
`src/components/ui/RowMenu.tsx` — el mismo primitivo "···" ya usado en el menú de fila del
Diario (`redesign-diary-row`) — en vez de construir un menú nuevo: mismo trigger
`aria-haspopup="menu"`/`aria-expanded`, mismo `<ul role="menu">` con navegación por flechas y
cierre con `Escape`/click afuera, mismo estilo de ítem `danger` para el rojo de "Eliminar".
Inicialmente solo el modo Gráfico cambió — Detallada e Índice conservaban sus enlaces/botón de
texto sueltos, porque sí tenían el ancho para mostrarlos sin esconder nada — pero D14 (más abajo)
extiende el mismo menú a los tres modos, a pedido del usuario.

Dentro del menú, "Eliminar" no borra directo: `RowMenuItem.onSelect` cierra el menú y arma un
`pendingDeleteId` local del renderer (no en `ArtistJourneyList`, porque ningún otro modo lo
necesita), y la tarjeta muestra su propia confirmación de dos pasos en el lugar donde antes
mostraba el estado — mismo criterio que ya usa `DiaryActivityList` (el ítem de menú "Eliminar"
arma un `pendingDeleteId` de fila, no borra desde el propio menú). "Ver artista" pasa de ser un
`<Link>` a una navegación programática (`router.push` dentro de `onSelect`): pierde la semántica
nativa de enlace (abrir en pestaña nueva, etc.) a cambio de vivir dentro de un `RowMenuItem`
(un `<button role="menuitem">`, no un link) — aceptable para una acción secundaria de tercer
nivel; en Detallada/Índice sigue siendo un `<Link>` real.

Sobre la legibilidad del disparador "⋮" (preocupación explícita del usuario): se reutiliza el
estilo por defecto de `RowMenu` (`text-paper-muted` en reposo, `hover:text-paper`) — el mismo
que ya usa el ícono de editar del Diario — en vez de inventar una variante más brillante solo
para esta superficie; se verificó visualmente en el navegador antes de dar el cambio por
terminado, no se asumió que alcanzaba por reutilizar el componente.

**D14 — El menú "⋮" se extiende a Detallada e Índice; se extraen `ArtistJourneyCardMenu` y
`ArtistJourneyDeleteConfirm` para no triplicar la lógica.** Pedido de seguimiento del usuario:
que Detallada e Índice tengan el mismo menú que Gráfico, con las mismas tres acciones, en vez de
sus enlaces sueltos de siempre. Con tres consumidores idénticos del mismo menú (antes había uno
solo, Gráfico, por eso D13 no lo extrajo — ver D6.1 sobre el mismo criterio de "dos o más
consumidores reales, no una anticipación"), se extrae:
- `ArtistJourneyCardMenu.tsx`: el `RowMenu` con las tres `RowMenuItem` (Ver artista/Archivar
  o Desarchivar/Eliminar), idéntico en los tres modos — antes vivía inline solo en
  `ArtistJourneysGraphic`.
- `ArtistJourneyDeleteConfirm.tsx`: el bloque de confirmación de dos pasos ("¿Eliminar?" +
  Confirmar + Cancelar), parametrizado por `sizeClassName` porque Gráfico usa una tipografía más
  chica (`text-[0.65rem]`) que Detallada/Índice (`text-xs`, el valor por defecto) — la única
  diferencia real entre los tres usos, así que se resuelve con una prop en vez de tres
  componentes casi iguales.

`ArtistJourneyDeleteButton.tsx` (el botón autoarmado calcado de `RemoveEntryButton` que usaban
Detallada/Índice) se elimina: con el menú unificado, ningún modo lo necesita — habría quedado
como un segundo mecanismo de confirmación redundante con `ArtistJourneyDeleteConfirm`. Cada
renderer sigue manteniendo su propio `pendingDeleteId` local (no se centraliza en
`ArtistJourneyList`): es estado de presentación de ESE renderer, y los tres modos nunca están
montados a la vez.

Ubicación: el pedido fue "al lado del estado" — en Detallada e Índice el menú se agrega después
del `StateLabel` existente, al final de la fila (mismo lugar donde antes estaban "Ver artista" y
el botón de eliminar); en Gráfico se queda donde ya estaba, junto al nombre, sin mover el estado
de su fila propia bajo el separador.

**D15 — Detalle propio de Detallada: barra sin números + última actualización, no los conteos
crudos que pidió el usuario.** Con D14, Detallada e Índice quedaron visualmente casi idénticos
(la única diferencia real era la foto) — el usuario lo notó y pidió sumarle información útil:
"el total de discos que agregó, los que lleva, última actualización". Los primeros dos son
exactamente la fracción numérica que el Requirement "Progreso informativo acotado a la página de
gestión" (§6.4.1 de `product_philosophy.md`) prohíbe fuera de la página de gestión — decisión
cerrada, discutida a fondo al abrir esta misma sesión de trabajo. Se lo señalé al usuario antes
de implementar y eligió, de tres opciones ofrecidas, la que no reabre esa decisión: una barra de
progreso discreta (mismo criterio ya permitido para la tarjeta de la página del artista) más la
fecha de última actualización, que no es progreso — es un dato temporal, sin tensión con la
regla.

Cambios de datos, mínimos y aditivos:
- `ArtistJourneySummary` (servicio y `ArtistJourneySummarySchema`) gana `progress` (crudo, para
  calcular el ancho de la barra — nunca se renderiza como texto) y `updatedAt`.
- `listMyArtistJourneys` ya calculaba `selected`/`listened` por lista (`countsByListId`) para
  derivar el estado; solo hacía falta exponerlos y sumar `updatedAt` al `select` existente — sin
  consulta nueva.
- `setJourneySelection` guardar la selección solo tocaba `user_list_item`, nunca la fila de
  `user_list` — sin eso, "última actualización" nunca habría reflejado una edición de selección,
  solo la creación y los archivados/desarchivados (que sí pasan por `db.update(userList)`). Se
  agrega un `tx.update(userList).set({ title: listRow.title })` (no-op semántico, título sin
  cambios) dentro de la misma transacción cuando hay altas o bajas, para que el trigger
  `trg_user_list_updated_at` (migración 0009 — `updated_at` se estampa por trigger, nunca desde
  la app) lo actualice como cualquier otro cambio real de la fila.
- Reutiliza `RelativeDate` de `src/components/feed/feed-row-parts.tsx` (`useFormatter`/`useNow`
  de next-intl) — ya compartido entre Diario, Listas y Moderación — en vez de un formateador de
  fecha nuevo.

Índice no cambia: sigue siendo, a propósito, la vista compacta sin esta información — es lo que
la diferencia de Detallada ahora que ambas comparten el mismo menú "⋮" (D14).

## Risks / Trade-offs

- [Riesgo] Perder el acceso directo "Ver artista" desde el listado si solo se cambia el destino
  del enlace principal → Mitigación: D7 agrega un acceso secundario explícito — originalmente un
  enlace de texto, luego (D14) un ítem del menú de tarjeta; sigue alcanzable en los tres modos,
  solo cambió el mecanismo de acceso.
- [Riesgo] El "Guardar" del modal de inicio (D4 revisado) hace dos llamadas secuenciales
  (`activateArtistJourney` + `setArtistJourneySelection`); si la primera tiene éxito y la segunda
  falla, queda un recorrido creado con solo la preselección de estudio, no con lo que el usuario
  eligió → Mitigación: el modal muestra el error y no navega, así que el usuario ve que algo
  falló y puede reintentar "Guardar" desde el mismo modal (`activateArtistJourney` es idempotente,
  no crea un segundo recorrido) o corregirlo después desde la página de gestión; no es un estado
  invisible ni definitivo.
- [Riesgo] Enlaces existentes o marcadores a un estado previo (n/a: el modal nunca tuvo URL propia,
  no hay URLs que migrar).
- [Trade-off] La página de detalle repite parte de la carga de datos que ya hace la página del
  artista (discografía + traducciones de categoría) porque son rutas distintas; es el mismo costo
  que ya pagaba el modal (recibía `categoryLabels` como prop) — no se introduce una consulta
  nueva, solo se recalculan las etiquetas de categoría vía `getTranslations` en el nuevo server
  component, igual que hace la página del artista.
