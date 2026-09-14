## 1. Página de gestión de detalle

- [x] 1.1 Crear `src/app/[locale]/me/artist-journeys/[artistId]/page.tsx`: server component que
      requiere sesión (`requirePageUser`), valida el `artistId` (`isValidUuid`), resuelve el
      artista (404 si no existe) y el detalle del recorrido vía `getArtistJourneyDetail` (404 si
      es `null`), arma `categoryLabels` igual que la página de artista, y renderiza breadcrumbs
      (Inicio → Mis recorridos → artista) más el componente cliente de gestión.
- [x] 1.2 Crear `src/components/artist-journey/ArtistJourneyManager.tsx` (client component):
      traslada de `ArtistJourneyModal` la selección agrupada por categoría con colapsables,
      checkbox maestro con estado indeterminado, borrador local y guardado en una sola operación
      (`setArtistJourneySelection`), sin la mecánica de diálogo (sin portal, sin focus-trap, sin
      `Escape`, sin bloqueo de scroll) — es contenido de página, no un modal.
- [x] 1.3 En el mismo componente (o uno hermano dentro de la página), agregar los controles de
      archivar/desarchivar y borrar (con confirmación de dos pasos) que hoy viven en
      `ArtistJourneySection`, junto con el estado y el progreso (barra + texto, mismo criterio de
      §6.4.1: sin fracción numérica fuera de esta página).
- [x] 1.4 Borrar un recorrido desde esta página redirige al listado `/me/artist-journeys`.
- [x] 1.5 Agregar una señal textual discreta ("Sin cambios pendientes" / `noChanges`) junto al
      botón "Guardar" cuando el borrador no difiere de lo ya persistido, para que un recorrido
      recién activado (con la preselección de estudio ya guardada) no dé la impresión de que la
      página está trabada.

## 2. Simplificar la tarjeta de la página del artista

- [x] 2.1 Reescribir `ArtistJourneySection.tsx` a un resumen de solo lectura: estado, barra de
      progreso sin fracción, y un único enlace/botón — "Armar recorrido" si no existe uno (abre
      el modal de inicio, § grupo 6 — revisado: ya no activa directo), o "Gestionar recorrido" si
      ya existe (navega directo, sin llamar a la API).
- [x] 2.2 Quitar de `ArtistJourneySection` el estado y las llamadas de archivar/desarchivar/borrar
      y la apertura del modal.
- [x] 2.3 Borrar `src/components/artist-journey/ArtistJourneyModal.tsx` y su test, una vez que su
      lógica quedó trasladada a `ArtistJourneyManager`.

## 3. Listado propio

- [x] 3.1 En `ArtistJourneyList.tsx`, cambiar el enlace principal de cada entrada de
      `/artist/[id]` a `/me/artist-journeys/[artistId]`.
- [x] 3.2 Agregar un enlace secundario discreto "Ver artista" hacia `/artist/[id]` en la misma
      entrada.
- [x] 3.3 Crear `artist-journey-view-mode.ts` y `use-artist-journey-view-mode.ts` (tipos,
      constantes y hook de persistencia en `localStorage`), calcados de sus equivalentes de
      `want-to-listen`.
- [x] 3.4 Crear `ArtistJourneyModeSwitcher.tsx` (radiogroup Detallada/Índice/Gráfico, calcado de
      `WantToListenModeSwitcher`) y los tres renderers `ArtistJourneysDetailed.tsx`,
      `ArtistJourneysIndex.tsx`, `ArtistJourneysGraphic.tsx`.
- [x] 3.5 Reescribir `ArtistJourneyList.tsx` como orquestador de cliente: buscador con filtro
      local por nombre de artista, conmutador de modo, y despacho al renderer elegido; estado
      vacío de "sin resultados" distinto del estado vacío de "todavía no armaste ningún
      recorrido" (que no muestra buscador ni conmutador).
- [x] 3.6 Agregar un `FilterSelect` de orden (`recent`/`alpha`, calcado de `MyListsTab`/
      `FavoritesToolbar`) que reordene el arreglo ya filtrado — "recent" es la identidad sobre el
      orden que ya trae `listMyArtistJourneys`, "alpha" aplica `localeCompare` por nombre de
      artista. Sin persistencia (vuelve a "recent" en cada visita, igual que esos dos precedentes).
- [x] 3.7 Agregar una tercera opción de orden, `state`, propia de esta capacidad: mapa fijo
      `{ in_progress: 0, complete: 1, archived: 2 }` (mismo orden canónico que
      `ARTIST_JOURNEY_STATES`) con `Array.prototype.sort` (estable, conserva el orden de agregado
      dentro de un mismo estado).
- [x] 3.8 Agregar `normalizeForSearch` (`artist-journey-list-shared.tsx`): NFD + descarte de
      marcas Unicode (`\p{M}`) + minúsculas, y usarla tanto en el texto del buscador como en el
      nombre de cada artista al filtrar, para que la búsqueda no distinga diacríticos (á/a, ñ/n).

## 4. i18n

- [x] 4.1 Agregar a `messages/{es,en}/artistJourney.json` las claves nuevas de la página de
      gestión (título, enlaces de breadcrumb, "Ver artista", "Gestionar recorrido", "Iniciar
      recorrido" si difiere del `start` actual).
- [x] 4.2 Retirar claves que queden sin uso tras eliminar el modal (`modalTitle`, `modalClose`,
      `editSelection` si se reemplaza por la nueva etiqueta del enlace) — confirmar con
      `grep` antes de borrar cada clave.
- [x] 4.3 Agregar claves para el buscador y el conmutador de modo (`searchPlaceholder`,
      `noResultsTitle`, `noResultsDescription`, `viewModeLabel`, `viewMode.detailed/index/graphic`).
- [x] 4.4 Agregar claves para el orden (`sortLabel`, `sort.recent`, `sort.alpha`), reutilizando
      la misma redacción ("Recientes"/"Alfabético") que `lists.json`/`favorites.json`.
- [x] 4.5 Agregar `sort.state` ("Por estado" / "By status") para la tercera opción de orden.
- [x] 4.6 Agregar `noChanges` ("Sin cambios pendientes" / "No pending changes").
- [x] 4.7 Re-agregar `modalTitle`/`modalClose` (retirados en 4.2, ahora vuelven a hacer falta
      para el modal de inicio) con redacción propia de "armar", no de "gestionar".
- [x] 4.8 Agregar claves para eliminar desde el listado (`listDeleteItem`, `listDeleteItemShort`,
      `listDeleteItemNamed`, `listDeleteItemConfirm`, `listDeleteError`).

## 5. Specs y verificación

- [x] 5.1 Confirmar que `openspec/changes/add-artist-journey-management-page/specs` refleja el
      comportamiento final una vez implementado (ajustar si la implementación revela un detalle
      no anticipado en el delta).
- [x] 5.2 Actualizar/crear tests: `ArtistJourneyManager` (selección, borrador, guardar, archivar,
      borrar), `ArtistJourneySection` (resumen de solo lectura, abrir/cancelar/guardar el modal
      de inicio), `ArtistJourneyStartModal` (preselección, cancelar sin request, guardar
      crea+navega, error mantiene abierto, Escape) y `ArtistJourneyList` (buscador, orden,
      conmutador de modo, estados vacíos, eliminar).
- [x] 5.3 Correr typecheck, lint, tests y build; verificar en el navegador el flujo completo:
      artista sin recorrido → abrir modal → elegir álbumes → guardar → gestión (sin cambios
      pendientes) → archivar → desarchivar → editar selección → borrar → listado → eliminar
      otro recorrido directamente desde el listado.

## 6. Modal de inicio (revisión) y eliminar desde el listado

- [x] 6.1 Extraer `ArtistJourneyAlbumGroups.tsx` (grilla de categorías colapsables + checkbox
      maestro + checkboxes, genérica sobre `{id, title, category, firstReleaseYear}`) desde
      `ArtistJourneyManager.tsx`, y hacer que `ArtistJourneyManager` la consuma en vez de tener
      la grilla inline.
- [x] 6.2 Crear `ArtistJourneyStartModal.tsx`: modal (portal, focus-trap, `Escape`, bloqueo de
      scroll, backdrop) con la discografía del artista agrupada vía `ArtistJourneyAlbumGroups`,
      estudio preseleccionado como borrador local (sin persistir nada al abrir). "Cancelar" cierra
      sin llamar al servidor. "Guardar" llama `activateArtistJourney` y luego
      `setArtistJourneySelection` con el borrador elegido, y solo entonces navega a
      `/me/artist-journeys/[artistId]`; un error deja el modal abierto con aviso.
- [x] 6.3 `ArtistJourneySection.tsx`: "Armar recorrido" abre `ArtistJourneyStartModal` en vez de
      llamar `activateArtistJourney` directo; requiere `albums`/`categoryLabels`/`artistName`
      como props nuevas.
- [x] 6.4 Página de artista: pasar `albums`/`categoryLabels` (ya cargados para `AlbumGrid`) a
      `ArtistJourneySection`.
- [x] 6.5 Crear `ArtistJourneyDeleteButton.tsx` (confirmación de dos pasos con auto-desarme,
      calcado de `RemoveEntryButton` de Want to Listen) y agregarlo a `ArtistJourneysDetailed` e
      `ArtistJourneysIndex` (el modo Gráfico pasa a un menú de tarjeta, ver grupo 7).
- [x] 6.6 `ArtistJourneyList.tsx`: mantener `items` como estado local (inicializado desde la prop
      `journeys`) para poder quitar una entrada al eliminar sin recargar; manejar `busyId` y un
      aviso de error si el borrado falla.

## 7. Menú de tarjeta en el modo Gráfico (revisión, con captura de referencia del usuario)

- [x] 7.1 Agregar `archive`/`unarchive` a `ArtistJourneyListActions` y a `ArtistJourneyList.tsx`
      (`handleArchiveToggle`): llama `archiveArtistJourney`/`unarchiveArtistJourney` según el
      estado actual del ítem y actualiza su `state` en `items` sin recargar; `ARTIST_JOURNEY_
      NOT_FOUND` lo saca de la vista igual que un borrado; cualquier otro error muestra
      `listArchiveError`.
- [x] 7.2 Reescribir `ArtistJourneysGraphic.tsx`: reemplazar los enlaces sueltos ("Ver artista",
      eliminar) por un `RowMenu`/`RowMenuItem` (`src/components/ui/RowMenu.tsx`, calcado del menú
      de fila del Diario) con "Ver artista" (navega con `router.push`), "Archivar"/"Desarchivar"
      (llama `actions.archive`), y "Eliminar" (arma un `pendingDeleteId` local del renderer en
      vez de borrar directo). El estado pasa de badge a punto de color + texto en una fila propia
      bajo un separador.
- [x] 7.3 Cuando hay un `pendingDeleteId` armado, la tarjeta muestra la confirmación de dos pasos
      en el lugar del estado, con "Confirmar eliminación" y "Cancelar".
- [x] 7.4 Agregar i18n: `cardMenuLabel`, `listArchiveError`.
- [x] 7.5 Verificar visualmente en el navegador que el disparador "⋮" tiene contraste suficiente
      en reposo (preocupación explícita del usuario) antes de dar el cambio por terminado.

## 8. Extender el menú de tarjeta a Detallada e Índice (pedido de seguimiento del usuario)

- [x] 8.1 Extraer `ArtistJourneyCardMenu.tsx` (el `RowMenu` con Ver artista/Archivar-Desarchivar/
      Eliminar) desde `ArtistJourneysGraphic.tsx`, genérico para los tres renderers.
- [x] 8.2 Extraer `ArtistJourneyDeleteConfirm.tsx` (bloque de confirmación de dos pasos) con un
      `sizeClassName` opcional para la tipografía más chica de Gráfico.
- [x] 8.3 Reescribir `ArtistJourneysDetailed.tsx` y `ArtistJourneysIndex.tsx`: quitar el enlace
      "Ver artista" y `ArtistJourneyDeleteButton`; agregar `ArtistJourneyCardMenu` junto al
      `StateLabel`, al final de la fila, con `pendingDeleteId` local que alterna entre el
      estado+menú y `ArtistJourneyDeleteConfirm`.
- [x] 8.4 Reescribir `ArtistJourneysGraphic.tsx` para consumir los dos componentes recién
      extraídos en vez de tener el `RowMenu`/confirmación inline duplicados.
- [x] 8.5 Borrar `ArtistJourneyDeleteButton.tsx` (sin consumidores) y la clave i18n
      `listDeleteItemNamed` (era su `aria-label`, ya no se usa).

## 9. Detalle propio de Detallada: progreso discreto + última actualización

- [x] 9.1 Antes de implementar, señalar al usuario que "total agregado"/"escuchados" chocan con
      el Requirement "Progreso informativo acotado a la página de gestión" (§6.4.1) y ofrecerle
      opciones — se eligió barra sin números + última actualización.
- [x] 9.2 Extender `ArtistJourneySummary` (servicio) y `ArtistJourneySummarySchema` con
      `progress: { selectedCount, listenedCount }` y `updatedAt`.
- [x] 9.3 `listMyArtistJourneys`: sumar `updatedAt` al `select` existente y exponer `progress` ya
      calculado por `countsByListId` (sin consulta nueva).
- [x] 9.4 `setJourneySelection`: cuando hay altas o bajas, tocar la fila de `user_list` con un
      update no-op (`title` sin cambios) dentro de la misma transacción, para que el trigger de
      `updated_at` (migración 0009) refleje también las ediciones de selección, no solo
      creación/archivado.
- [x] 9.5 `ArtistJourneysDetailed.tsx`: agregar una segunda fila con barra de progreso
      (`selectedCount > 0` únicamente; sin barra cuando la selección está vacía) y
      `RelativeDate` (`src/components/feed/feed-row-parts.tsx`) para la última actualización.
- [x] 9.6 No tocar `ArtistJourneysIndex.tsx`: se mantiene compacto a propósito.
- [x] 9.7 Actualizar los fixtures de test que construyen `ArtistJourneySummary`
      (`ArtistJourneyList.test.tsx`, `artist-journeys.test.ts`) y los mocks de
      `setJourneySelection` (`mocks.db.update`) para el nuevo update dentro de la transacción.
