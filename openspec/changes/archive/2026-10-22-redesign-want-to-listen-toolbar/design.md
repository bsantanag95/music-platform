## Context

`/me/want-to-listen` muestra la lista propia de Pendientes en dos secciones con tres modos. El listado viene de
`listMyWantToListen` (página 1 sembrada por el servidor, "Cargar más" en el cliente con estado local, sin TanStack
Query). Favoritos ya resolvió en su Fase 2 los segmentos de tipo con conteos (`FavoritesTypeSegments`) y Calificaciones
el orden en el servidor. El diálogo global "+ Añadir" (`QuickActionsDialog`) ya tiene la acción Pendiente y emite
`OWN_DATA_CHANGED_EVENT` al guardar.

Restricciones: sin esquema nuevo; la tabla tiene índice `(user_id, created_at DESC)`; las listas son cortas (decenas).

## Goals / Non-Goals

**Goals:** cabecera que explica la página y deja anotar; segmentos y orden en el servidor; conteos honestos.

**Non-Goals:** búsqueda de texto, acciones nuevas por entrada, metadatos (Fase 3).

## Decisions

**D1. Filtros en la API con Zod.** `WantToListenFiltersSchema = { type?: "artist" | "release-group", sort?: "recent" |
"oldest" | "alpha" }`; la ruta valida `type`/`sort` y responde `400 VALIDATION_ERROR` si son inválidos (mismo patrón
que favoritos). La página, en cambio, ignora un valor inválido de la URL.

**D2. Orden.** `recent` = `created_at DESC, id DESC` (actual); `oldest` = `created_at ASC, id ASC`; `alpha` =
`lower(coalesce(artist.name, release_group.title)) ASC, id ASC`. El desempate por `id` mantiene estable el "Cargar
más" por offset.

**D3. `counts` por tipo, sin el filtro de tipo.** Una consulta agrupada aparte (`count(artist_id)`,
`count(release_group_id)` sobre las entradas del usuario) — es una faceta: cada segmento muestra su cantidad aunque
haya otro tipo elegido. Se agrega a toda respuesta del listado (también la del Diario, que la ignora; el costo es una
consulta indexada por usuario). En el esquema de respuesta es obligatorio.

**D4. Las secciones muestran `counts[type]`.** Con la cifra del servidor el encabezado vuelve a mostrar el conteo
siempre; la regla de la Fase 1 ("solo con la lista completa") se reemplaza. Al quitar una entrada se descuenta en el
cliente.

**D5. Segmentos calcados de Favoritos.** `WantToListenTypeSegments`: botones con `aria-pressed`, cantidad al lado, el
activo no se desactiva; un tipo con 0 entradas queda `disabled` (salvo que esté activo). Con un tipo elegido solo se
renderiza esa sección. Con la lista vacía no hay barra.

**D6. Orden con `FilterSelect`** (`variant="boxed"`, `label` "Orden") a la derecha de los segmentos, junto al
conmutador de modo. En móvil la barra se parte en dos líneas.

**D7. Estado de filtros y recarga.** El estado vive en la lista; al cambiarlo se reemplaza la URL (`replaceState`, sin
historial) y se pide la página 1. Las respuestas viejas se descartan con un contador de petición. Mientras carga, la
lista anterior se atenúa (`aria-busy`). El servidor siembra la página 1 con los filtros de la URL.

**D8. "Anotar algo" reutiliza el diálogo global.** `QuickActionsDialog` gana `initialAction` opcional (por defecto
`listen`, sin cambio para el Header ni el Diario). `AddPendingButton` lo abre en `pending`. La lista escucha
`OWN_DATA_CHANGED_EVENT` y vuelve a pedir la página 1 con los filtros actuales, así lo anotado aparece sin recargar
(el `router.refresh()` del diálogo no alcanza: la lista guarda su estado en el cliente).

**D9. Cabecera en la página.** `page.tsx` arma título, descripción y botón (cliente); la lista conserva la barra.

## Risks / Trade-offs

- [Una consulta más por listado, también en el Diario] → Consulta agrupada por `user_id` con índice; trivial frente al
  listado.
- [`alpha` no usa índice] → Ordena solo las filas del usuario (decenas); aceptable.
- [Refetch tras cualquier cambio del diálogo, no solo Pendiente] → Una petición de página 1; simple y correcto.

## Migration Plan

Sin migraciones. La respuesta suma `counts`; los clientes que no lo lean no cambian. Revertir es revertir el commit.
