## Context

`docs/00-product/product_philosophy.md` §6.4 ya resolvió el producto (nombre, default de
selección, estados, exclusión de curaduría editorial, distinción con Want to Listen, veto a
agregado comunitario). Este documento resuelve cómo implementarlo sobre el esquema existente
sin introducir una entidad nueva, siguiendo el precedente ya usado por `lists` (columnas
editoriales agregadas a `user_list` en el cambio `add-editorial-curator-role`) y por "En
rotación"/la huella de gusto (progreso calculado bajo demanda, sin tabla materializada).

Piezas existentes relevantes:
- `user_list` / `user_list_item` (`src/db/schema.ts:540-606`): mecanismo de listas genérico,
  ya con precedente de columnas de subtipo (`isOfficial`, columnas editoriales).
- `listen_entry` (`src/db/schema.ts:885`): diario de escucha, con `releaseGroupId` — fuente
  del progreso.
- `artist_follow` (spec `artist-following`): base de la sección "Exploración" del perfil, único
  lugar donde este change toca una superficie ya existente.
- Clasificación de álbumes por tipo: **corrección de alcance detectada al implementar** — el
  catálogo no expone el `primary-type`/`secondary-type` crudo de MusicBrainz por álbum; ya
  normaliza cada `release_group` a una de **cuatro** categorías fijas en la columna
  `release_group.category` (`studio | single_ep | compilation | live_other`,
  `src/db/schema.ts:333`), con labels ya resueltos en `artist.categories.*` (`messages/es`,
  `messages/en`) y ya usados por `AlbumGrid` en la página de artista. El recorrido se agrupa
  sobre estas cuatro categorías reales, no sobre una taxonomía MusicBrainz más fina — mismo
  espíritu que §6.4 (Estudio como grupo principal pre-marcado, el resto desmarcado), ajustado al
  dato que el catálogo realmente tiene.

## Goals / Non-Goals

**Goals:**
- Reutilizar `user_list`/`user_list_item` sin duplicar semántica de "lista" ya resuelta
  (agregar/quitar ítem, borrado en cascada, unicidad de objetivo por lista).
- Que un recorrido sea indistinguible de una lista normal a nivel de tabla, pero invisible en
  toda superficie genérica de listas.
- Derivar "completo" en lugar de mantenerlo sincronizado a mano, para que agregar o quitar un
  ítem nunca deje un estado "completo" obsoleto.

**Non-Goals:**
- No se diseña aquí la sugerencia o incorporación automática de lanzamientos nuevos del artista
  a una selección existente (ver Open Questions).
- No se diseña una superficie de listado propio tipo `/me/artist-journeys` (ver Open
  Questions) — la gestión ocurre desde la página de cada artista.
- No se toca el modelo de `lists` ni sus endpoints existentes.

## Decisions

### D1 — Extender `user_list`, no crear tabla nueva

Se agregan a `user_list`: `kind` (`text`, default `'standard'`, `CHECK IN ('standard',
'artist_journey')`), `journeyArtistId` (`uuid`, FK `artist`, `ON DELETE CASCADE`, nullable) y
`journeyArchivedAt` (`timestamp`, nullable). Índice único **no parcial** `(owner_id,
journey_artist_id)` — un recorrido activo por usuario y artista.

**Corrección durante la implementación:** el diseño original proponía un índice único
*parcial* (`WHERE kind = 'artist_journey' AND journey_artist_id IS NOT NULL`). Verificado en
navegador contra la base real, `ON CONFLICT (owner_id, journey_artist_id) DO NOTHING` falla en
Postgres contra un índice parcial (`no hay restricción única o de exclusión que coincida con
la especificación ON CONFLICT`, error `42P10`) salvo que la sentencia repita el mismo
predicado `WHERE`, algo que drizzle-orm no expresa bien. Se resolvió con un índice único
simple, mismo patrón que `favorite`/`want_to_listen_entry`: las listas genéricas siempre
tienen `journey_artist_id = NULL`, y Postgres nunca considera dos `NULL` iguales en una
restricción única, así que no compiten con las filas de recorrido.

**Alternativa considerada y descartada:** tabla dedicada (patrón `collection_entry` de §6.6).
Se descarta porque, a diferencia de la colección física, un recorrido no necesita atributos
por ítem (formato, nota) que ensuciarían `user_list_item` — es exactamente el mismo shape que
una lista de álbumes (`entityType = 'release-group'`, ítems = FK a `release_group`, `position`
para orden de visualización). Reusar es el caso donde "encaja sin distorsión" (criterio de
§6.6), a diferencia de la colección física.

**Por qué no un `journeyStatus` enum de tres valores:** ver D3 — "completo" se deriva, no se
persiste, para que nunca quede desincronizado.

### D2 — La selección ES la lista de ítems (no un flag por álbum)

`user_list_item` no gana columnas. El "álbum marcado" de la UI de selección **es** tener una
fila en `user_list_item`; "desmarcado" es no tenerla. Marcar/desmarcar reutiliza exactamente la
semántica ya probada de agregar/quitar ítem de lista (idempotente, sin duplicados). La vista de
gestión (agrupada por tipo MusicBrainz) se arma en el servidor cruzando **todos** los
release-groups del artista (catálogo) con los que ya son `user_list_item` del recorrido —
el cruce, no el almacenamiento, es lo que produce la grilla con checkboxes.

### D3 — Estado visual derivado en el momento de lectura, no persistido

`journeyArchivedAt IS NOT NULL` → **archivado**. Si no: se cuenta cuántos ítems del recorrido
tienen un `listen_entry` propio con el mismo `releaseGroupId` (cualquier escucha, sin filtro de
audiencia — es lectura del propio dueño sobre su propio progreso); si `itemCount > 0` y
`listenedCount === itemCount` → **completo**; si no → **en curso**. Un recorrido con 0 ítems
seleccionados se trata como **en curso** (nunca "completo" trivial).

**Por qué derivado y no un trigger/columna sincronizada:** agregar o quitar un ítem, o borrar
una escucha del diario, tendría que disparar una recomputación en cascada si el estado fuera
persistido — más superficie de bugs que un `COUNT` en el momento de lectura, calculado bajo
`cache()` por request (mismo patrón que la huella de gusto y "En rotación",
`src/services/profiles/stats.ts` / `in-rotation.ts`). El volumen por artista (decenas de
álbumes, no miles) hace el cálculo trivial.

### D4 — Exclusión de recorridos de las superficies genéricas de listas

Todo servicio de lectura de `lists` (propio, ajeno, Descubrir, Guardadas, conteos) SHALL
filtrar `kind = 'standard'` explícitamente. Se implementa como una condición agregada en las
funciones de consulta existentes de `src/services/lists/`, no como una vista de base de datos
nueva — mantiene una sola fuente de verdad para el filtro y es trivial de testear
(test de "un recorrido nunca aparece en `/me/lists`, Descubrir ni conteos de lista").

### D5 — Endpoints propios, no extender la API de `lists`

Nuevo namespace `src/app/api/me/artist-journeys/`: crear/activar por artista (idempotente,
devuelve el existente si ya hay uno), agregar/quitar ítem, archivar/desarchivar, borrar,
detalle con progreso derivado. No se reutiliza `/api/me/lists/*` aunque la tabla sea la misma:
mantiene el contrato de `lists` sin condicionales de subtipo y evita que un cliente de la API
genérica de listas descubra o manipule recorridos por accidente.

### D6 — Facet en "Exploración" vía consulta batch, no N+1

El servicio de perfil que arma la sección "Exploración" (spec `artist-following`) gana una
consulta adicional: para los artistas seguidos visibles en esa página, un solo `JOIN` batch
sobre `user_list` (`kind = 'artist_journey'`, `owner_id` del dueño del perfil,
`journey_artist_id IN (...)`) más el conteo de ítems/escuchados por recorrido, en una sola
consulta agregada — no una consulta por artista.

### D7 — Modal para la selección, no inline en la página (rediseño, 2026-09)

Feedback de producto tras la primera entrega: el checklist plano embebido en la página de
artista no se sentía coherente con el resto de la identidad visual. Se extrajo a
`ArtistJourneyModal`, un modal portal-based con el mismo lenguaje visual y mecánica de
accesibilidad que `RegisterListenDialog`/`ConfirmDialog` (focus-trap, `Escape`, bloqueo de
scroll, cierre al clickear el fondo). La tarjeta que queda inline en la página
(`ArtistJourneySection`) se redujo a estado + progreso + archivar/eliminar + un botón "Editar
selección" que abre el modal — más liviana y más parecida al resto de acciones de la página
(botones cortos en fila) que el bloque grande anterior.

Cada grupo de categoría es colapsable (mismo patrón `Set<categoría>` + `ChevronIcon` que
`DiaryActivityList` usa para meses). Default: `studio` expandido, el resto colapsado — refleja
que el default de selección también prioriza estudio (§6.4).

### D8 — Borrador local + guardado en lote, no una petición por casillero (revisado, 2026-09)

**Primera versión (superada):** cada checkbox y cada "Seleccionar todo"/"Deseleccionar todo"
llamaban al servidor de inmediato (`POST`/`DELETE .../items`, `PUT .../categories/[category]`).
Funcionaba, pero se sentía lento con discografías grandes: cada clic esperaba una ida y vuelta
de red antes de responder visualmente, y un "Seleccionar todo" sobre una categoría de 50+
lanzamientos significaba 50 escrituras individuales encadenadas visualmente aunque el servidor
las resolviera en una sola query.

**Rediseño:** el modal edita un **borrador local** (`Set<releaseGroupId>` en el cliente) — marcar
un álbum, y "Seleccionar todo"/"Deseleccionar todo" por grupo, solo tocan ese estado en memoria,
sin red. Un único botón **"Guardar"** envía el conjunto final completo a
`PUT /api/me/artist-journeys/[artistId]/items` (`{ releaseGroupIds: string[] }`), que reemplaza
la service function original por `setJourneySelection`: calcula el `diff` contra la selección
persistida (altas y bajas) y lo aplica en una transacción — no vacía y reinserta todo, para
conservar la posición de los ítems que se mantienen sin cambios. Cerrar el modal sin guardar
(✕, `Escape`, click fuera) descarta el borrador sin tocar el servidor.

Esto **eliminó** los endpoints `POST/DELETE .../items[/{releaseGroupId}]` y
`PUT .../categories/[category]` (y las funciones `addAlbumToJourney`, `removeAlbumFromJourney`,
`setJourneyCategorySelection`): con guardado en lote, "seleccionar todo" en una categoría ya no
necesita su propio endpoint — es una operación local sobre el mismo borrador que termina en el
mismo `PUT` final. Un solo endpoint de escritura de ítems, no tres.

### D9 — Auditoría de exclusión: el alcance real era más amplio que "la capacidad `lists`"

Al verificar en navegador el rediseño del modal, un recorrido de prueba apareció en el widget
"Retomá una lista" de Inicio — un canal que D4 no cubría, porque D4 y el requirement de
exclusión original se habían escrito pensando solo en la capacidad `lists` (`/me/lists`,
Descubrir, Guardadas). En los hechos, `user_list` se lee directamente, sin pasar por
`src/services/lists/`, desde: `home.ts` ("Retomá una lista"), `feed.ts` (eventos de lista),
`profiles/recency.ts` ("última señal" del perfil), `profiles/stats.ts` (conteo de listas del
"reparto" de la huella de gusto) y `discovery/discovery.ts` (colecciones destacadas). Se
agregó `eq(userList.kind, "standard")` a las cinco. El requirement de la spec se generalizó de
"toda lectura de la capacidad `lists`" a "toda lectura de `user_list` que no pertenezca a esta
capacidad, sin importar en qué capacidad viva" — la lección es que una exclusión por columna
(`kind`) debe auditarse por **tabla**, no por capacidad consumidora, porque nada impide que
otra capacidad futura vuelva a leer `user_list` directamente.

**Nota de alcance:** `moderation.ts` actualiza `user_list` por `id` conocido (acciones de
reporte/ocultamiento) sin enumerar filas; no hay ruta de UI para reportar un recorrido, así que
queda fuera de este barrido — se documenta acá para que quede explícito que se revisó y se
descartó, no que se pasó por alto.

### D10 — Orden de álbumes: por año ascendente, igual que `AlbumGrid` (feedback de usuario, 2026-09)

El orden de `journey.albums` no tenía criterio: era el orden de llegada de
`findOrIngestDiscography` (por crédito de MusicBrainz, no por fecha). Se agregó
`sortDiscographyByYear` en `artist-journeys.ts`, aplicado en `buildDetail` antes de mapear a
`ArtistJourneyAlbum[]` — mismo criterio que ya usa `AlbumGrid.tsx` para la discografía de la
página de artista (año ascendente, sin año al final, desempate alfabético por título). Se
resuelve en el servicio, no en el modal: cualquier consumidor futuro de `journey.albums` recibe
el mismo orden sin tener que reimplementarlo. Verificado en navegador: el orden dentro de cada
grupo del modal coincide con el de `AlbumGrid` en la misma página.

### D11 — Checkbox "maestro" en vez de enlace de texto, y color de acento consistente (feedback de usuario, 2026-09)

Dos ajustes visuales pedidos tras ver el modal en uso:

1. **"Seleccionar todo"/"Deseleccionar todo" pasa de enlace de texto a un checkbox real** en la
   cabecera del grupo (`GroupSelectAllCheckbox`), con estado `indeterminate` (vía `ref` +
   `useEffect`, la única forma de expresarlo en un `<input>` HTML) cuando el grupo está
   parcialmente seleccionado. Mismo lenguaje visual que los casilleros de cada álbum en vez de
   una acción de texto aparte — patrón de "checkbox maestro" estándar en listas seleccionables.
   El nombre accesible (`aria-label`) sigue distinguiendo seleccionar/deseleccionar y menciona la
   categoría, para que varios checkboxes maestros en pantalla no se anuncien todos igual a
   lectores de pantalla.
2. **Los checkboxes no tenían la clase `accent-amber`** que ya es convención en el resto de la
   aplicación (`EntriesDetailed`, `EntriesIndex`, `ShelfGrid`, `FavoriteTile` en
   `src/components/collection/` y `src/components/favorites/`) — sin ella, un checkbox usa el
   estilo por defecto del navegador (blanco), que desentona con la paleta oscura. Se agregó
   `size-4 shrink-0 accent-amber` a ambos niveles de checkbox (álbum y grupo). No fue una decisión
   de diseño nueva, sino un olvido: la convención ya existía, solo faltaba aplicarla acá.

- **[Riesgo] Deriva de lenguaje en copy de UI** ("completar", "te faltan N discos") reintroduce
  el framing que motivó el renombre de §6.4 → Mitigación: checklist explícito de copy en
  `tasks.md` (sin "completar"/"logro"/"pendiente" en ningún string de i18n de esta capacidad;
  revisión antes de cerrar el change).
- **[Riesgo] Condición de carrera al activar un recorrido dos veces** (doble clic) → Mitigado
  por el índice único parcial (D1) + creación idempotente (D5: devuelve el existente en vez de
  fallar).
- **[Riesgo] Cálculo de "completo" ignora la edición/versión de la escucha** — un usuario que
  escucha una edición distinta del mismo álbum (misma `release_group_id`, distinta `release`)
  igual cuenta como escuchado → Aceptado a propósito: `listen_entry` y `rating` ya operan a
  nivel de `release_group_id` en todo el resto del producto (ver `add-album-edition-selection`
  como excepción acotada a la página de álbum), así que este comportamiento es consistente, no
  una excepción nueva.
- **[Trade-off] Sin materialización del progreso** — cada apertura de la página de gestión de
  un recorrido paga el `COUNT` de cruce → Aceptado: volumen bajo por artista, mismo patrón ya
  validado en producción para "En rotación"/huella.

## Migration Plan

Migración aditiva única sobre `user_list`: tres columnas nullable/con default + un índice único
parcial. Sin backfill (ninguna fila existente tiene `kind = 'artist_journey'`). Sin cambios a
`user_list_item`. Reversible sin pérdida de datos preexistentes: `DROP COLUMN`/`DROP INDEX` es
seguro porque nada fuera de esta capacidad depende de las columnas nuevas (D4/D5 aíslan el
acceso). Despliegue en un solo paso, sin bandera de feature — no hay superficie visible hasta
que se agregan la acción en la página de artista y la faceta de perfil, que se despliegan en el
mismo change.

## Open Questions

- **Incorporación de lanzamientos nuevos a una selección existente**: si un artista edita un
  álbum de estudio nuevo después de que el usuario ya armó su recorrido, ¿se agrega solo o
  requiere acción manual? Se define aquí que es **manual** (Non-Goals) para este change —
  automático rompería un recorrido "completo" sin que el usuario hiciera nada, contradiciendo
  §6.4.1. Queda pendiente evaluar, con datos reales, si conviene un aviso discreto y opcional
  ("hay un álbum de estudio nuevo, ¿sumarlo?") en una iteración posterior — nunca automático.
- ~~Superficie de listado propio `/me/artist-journeys`~~ — **resuelto (2026-09):** el usuario
  pidió explícitamente el acceso desde el menú, que necesita un destino. Se implementó como
  listado de solo lectura (estado por recorrido, sin progreso), la gestión sigue viviendo en la
  página de cada artista.
- **Borrado vs. archivado**: se incluye borrado físico (igual que una lista normal) además de
  archivado, agrupado con Editar en la gestión del recorrido. A confirmar en `tasks.md` si el
  borrado necesita una confirmación reforzada (acción destructiva, mismo patrón que borrar una
  lista) — se asume que sí por consistencia con `lists`.
