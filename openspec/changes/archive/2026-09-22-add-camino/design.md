## Context

`artist-journey` (`/artist-journeys`, producto "Recorrido") reutiliza `user_list`/`user_list_item`
con `kind = 'artist_journey'` para modelar el progreso de un usuario sobre la discografía de un
artista. El progreso nunca se persiste: se deriva en lectura cruzando `user_list_item` contra
`listen_entry` (`src/services/artist-journeys/artist-journeys.ts`, funciones `buildDetail` y
`countsByListId`). Esa misma capability excluye explícitamente `kind = 'artist_journey'` de toda
lectura genérica de `user_list` (Mis listas, Guardadas, Descubrir, conteos, widgets de Inicio) —
ver Requirement "Exclusión de toda superficie que lea listas genéricamente" de `artist-journey`.

Por separado, `list-saves` ya modela guardar/seguir una lista ajena (`list_save`, PK
`(saverId, listId)`, eje `following`) y `community-lists`/`list-discovery` ya exponen conteos
agregados de guardado como dato público en `/lists`, con precedente explícito de que el conteo
agregado es público pero la identidad de quién guarda es privada.

Este change generaliza el mecanismo de progreso derivado de `artist-journey` para dos casos
nuevos que no encajan en su alcance (atado a un artista, sin agregado social) ni en el de
`lists` (sin noción de progreso): un Camino armado a mano por su dueño, y el progreso de
cualquier usuario sobre una lista ajena de álbumes.

## Goals / Non-Goals

**Goals:**
- Generalizar el cálculo de progreso derivado (`countsByListId`/`deriveJourneyState`) para que no
  dependa de `journeyArtistId` ni asuma que quien trackea es el dueño de la lista, sin duplicar la
  lógica que ya usa `artist-journey`.
- Permitir crear un Camino dinámico: conjunto de álbumes armado a mano, sin discografía de fondo.
- Permitir trackear el progreso propio sobre una lista ajena de álbumes, como decisión unilateral
  de quien trackea, reusando `list_save`.
- Exponer un descubrimiento público de Caminos ordenado por trackeo activo real, no por guardado
  simple, filtrable por género y artista.
- Cero impacto en los contratos existentes de `artist-journeys` y `lists`.

**Non-Goals:**
- Canciones o artistas como tipo de Camino (solo `release-group`).
- Que el dueño de una lista controle si admite trackeo — la decisión es siempre de quien trackea.
- Convertir una Lista existente en Camino o viceversa.
- Integrar el progreso de Camino al feed de actividad.
- Caminos colaborativos (multi-dueño).
- Reabrir la exclusión de agregado/ranking de `artist-journey` (Requirement "Sin agregado ni
  ranking comunitario") — sigue vigente sin cambios; el agregado de esta capability es un
  precedente nuevo y explícito para `camino`, no una excepción a esa regla existente.

## Decisions

### D1. Tercer `kind` sobre `user_list`, no una tabla nueva
Reutilizar `user_list`/`user_list_item` con `kind = 'custom_journey'` en vez de una tabla propia.
**Alternativa considerada**: tabla `camino` independiente — se descartó porque duplicaría
`entityType`, `title`, `description`, `audience`, posición de ítems y toda la infraestructura de
visibilidad/moderación que `user_list` ya resuelve, exactamente el mismo trade-off que ya se
resolvió a favor de reutilización en `artist_journey`.

### D2. Progreso derivado, extraído a un módulo compartido
Extraer `countsByListId` y `deriveJourneyState` de
`src/services/artist-journeys/artist-journeys.ts` a un módulo compartido (p. ej.
`src/services/journeys/progress.ts`), generalizando la firma de `countsByListId` de
`(ownerId, listIds)` a `(trackerId, listIds)` — el significado no cambia (progreso de una persona
sobre los ítems de una lista), solo deja de asumir que esa persona es el dueño. `artist-journey`
pasa a importar el helper compartido; su comportamiento y sus tests existentes no cambian.
**Alternativa considerada**: duplicar la función dentro del nuevo servicio de Camino — se
descartó por riesgo de divergencia silenciosa entre dos cálculos de "completo" que deberían ser
idénticos.

### D3. Tracking como campo de `list_save`, no una tabla nueva
Agregar una columna `tracking boolean not null default false` a `list_save`, con el mismo criterio
que ya existe para `following`: es un eje adicional del guardado, no una relación distinta.
Activar tracking sobre una lista no guardada crea el guardado y el tracking en una sola operación
(mismo patrón que ya existe para "guardar y seguir" en un solo paso). Quitar el guardado elimina
el tracking junto con él — no hay pérdida de dato real porque el progreso nunca se persiste, solo
se pierde la preferencia de "estoy siguiendo mi progreso acá", recuperable con volver a activarla.
**Alternativa considerada**: tabla `camino_tracking(trackerId, listId)` aparte — se descartó por
ser estructuralmente idéntica a `list_save` con un solo booleano de diferencia; hubiera obligado a
mantener dos verificaciones de visibilidad en paralelo (guardado vs. tracking) para el mismo par
`(usuario, lista)`.

### D4. Restricción a `entityType = 'release-group'` en el servicio, no en un CHECK cruzado
Postgres no expresa bien un `CHECK` de `list_save` que dependa de una columna de `user_list`
(tabla distinta). La validación "solo se puede trackear una lista de álbumes" vive en el servicio,
igual que ya ocurre con otras invariantes cruzadas del proyecto (mismo criterio documentado para
los índices parciales de `user_list`). Intentar activar tracking sobre una lista de artistas o
canciones responde `400 VALIDATION_ERROR`.

### D5. Descubrimiento público en ruta propia `/caminos`, no como sección de `/lists`
Camino tiene una métrica de popularidad distinta a la de Listas ("Populares" en `/lists` ordena
por guardados simples; Camino ordena por trackeo activo — dos señales distintas del mismo objeto
subyacente). Mezclarlas en una sola página obligaría a explicar dos números diferentes para el
mismo tipo de tarjeta. Se opta por una ruta propia, con la misma estructura de toolbar
(texto/orden/filtro) que ya usa `/lists`, filtrando por género (join a `release_group_tag` de los
álbumes de la lista) y por artista (join a través de `release_group` → artista acreditado).
**Alternativa considerada**: agregar una pestaña "Caminos" a `/lists` — se descartó por mezclar el
significado de "popular" entre dos superficies con semántica de conteo distinta.

### D6. `custom_journey` hereda la exclusión de lecturas genéricas de `artist_journey`
Mismo criterio que ya rige para `artist_journey` (Requirement "Exclusión de toda superficie que
lea listas genéricamente"): un Camino dinámico no aparece en `/me/lists`, Guardadas, Descubrir de
Listas, el widget "Retomá una lista" de Inicio, los eventos de feed de listas, ni los conteos de
la huella de gusto del perfil. Se especifica como parte de la capability `camino`, sin reabrir la
spec de `artist-journey`.

## Risks / Trade-offs

- **[Riesgo] Confusión de nombres entre "Recorrido" (artist-journey) y "Camino"** → mitigado por
  el trabajo de naming ya hecho (se descartaron "Ruta", "Trayecto" por sonar demasiado cercanos);
  falta validar con copy real en la UI que ambos conceptos se lean como cosas distintas la primera
  vez que un usuario los ve juntos en el menú.
- **[Riesgo] El refactor de D2 toca código de producción de `artist-journey` que hoy funciona y
  tiene cobertura** → mitigado por ser una extracción mecánica sin cambio de comportamiento; los
  tests existentes de `artist-journeys.test.ts` deben seguir pasando sin modificación como
  criterio de aceptación del refactor.
- **[Riesgo] Un usuario activa tracking sobre una lista ajena muy grande (cientos de ítems) y el
  cálculo de progreso en cada lectura se vuelve costoso** → mismo perfil de costo que ya acepta
  `artist-journey` hoy (join agregado por `listId`, sin N+1); si aparece un caso real de listas
  desproporcionadas, es un problema de límite de tamaño de lista, no específico de este change.
- **[Trade-off] Perder el tracking al quitar el guardado (D3)** → aceptado porque el progreso
  nunca se persiste de todos modos; el usuario puede reactivar tracking guardando de nuevo sin
  perder señal real (la única señal real, las escuchas en el diario, vive en `listen_entry` y no
  se toca).

## Migration Plan

1. Migración SQL: agregar `'custom_journey'` al `CHECK` de `user_list.kind`; agregar columna
   `tracking boolean not null default false` a `list_save` con su índice de soporte para filtrar
   "mis Caminos trackeados" (`(saverId) WHERE tracking`) y para el agregado de descubrimiento
   (`(listId) WHERE tracking`). Migración aditiva, sin backfill, sin downtime.
2. Extraer el módulo de progreso compartido (D2) y migrar `artist-journeys.ts` a usarlo, sin
   cambios de comportamiento — se puede desplegar y verificar de forma aislada antes de construir
   Camino sobre él.
3. Servicio y API de Camino dinámico (creación, ítems, progreso, archivado, borrado).
4. Extensión de `list-saves` con el eje de tracking.
5. Superficie `/me/caminos` y acceso desde menú de usuario / panel de gestión del perfil.
6. Acción de tracking en el detalle de lista ajena — `/users/[username]/lists/[listId]` para
   Listas normales, y una ruta de lectura propia `/users/[username]/caminos/[caminoId]` para un
   Camino ajeno (surgió durante la implementación: un Camino no puede leerse a través de los
   endpoints de `lists` por la exclusión de la Decisión D6, así que necesita su propio detalle de
   lectura en vez de reusar el de Listas).
7. Descubrimiento público `/caminos` con filtros de género y artista.

**Rollback**: cada paso es aditivo (nuevo valor de enum, columna con default, endpoints y rutas
nuevas); revertir el código de aplicación en cualquier paso no deja datos huérfanos ni rompe
`artist-journey` o `lists`, porque ninguno de los dos lee `kind = 'custom_journey'` ni la columna
`tracking` antes de este change.

## Open Questions

Resueltas durante la implementación:

- **Criterio de coincidencia del filtro de género**: "al menos un álbum de la lista tiene esa
  etiqueta" (EXISTS, no un umbral de proporción) — especificado en
  `specs/camino-discovery/spec.md`.
- **Tope de ítems por Camino dinámico**: sin límite, mismo criterio que Listas.
- **Filtro de artista en `/caminos`**: búsqueda por nombre (ILIKE sobre `artist.name`), no un
  selector con autocompletado por id — se evaluó construir un picker de artista dedicado y se
  descartó por alcance para v1; queda en el backlog de `docs/05-features/caminos.md`.
- **Copy para distinguir "Camino" de "Recorrido"**: `messages/{es,en}/camino.json`, con "Paths"
  como traducción al inglés (evita "Route"/"Journey", ya usados o descartados). Falta validar
  con uso real, no solo con revisión de texto.
