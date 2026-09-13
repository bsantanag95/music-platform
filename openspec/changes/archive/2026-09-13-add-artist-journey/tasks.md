## 1. Esquema y migración

- [x] 1.1 Agregar a `user_list` en `src/db/schema.ts`: `kind` (`text`, default `'standard'`,
      `CHECK IN ('standard', 'artist_journey')`), `journeyArtistId` (`uuid`, FK `artist`, `ON
      DELETE CASCADE`, nullable), `journeyArchivedAt` (`timestamp with time zone`, nullable).
- [x] 1.2 Agregar índice único parcial `(owner_id, journey_artist_id) WHERE kind =
      'artist_journey' AND journey_artist_id IS NOT NULL` (migración SQL cruda, mismo criterio
      que otros índices parciales del proyecto).
- [x] 1.3 Escribir la migración SQL (aditiva, sin backfill) y verificar que corre limpia sobre
      una copia de la base de desarrollo.
- [x] 1.4 Actualizar `UserListRow` y tipos derivados en `src/db/schema.ts` si corresponde.
      (`UserListRow = typeof userList.$inferSelect` ya infiere las columnas nuevas, sin cambios
      adicionales).

## 2. Servicio de recorridos

- [x] 2.1 Nuevo módulo `src/services/artist-journeys/` con: activar (idempotente, pre-puebla
      con álbumes de tipo Estudio), obtener detalle con selección agrupada por tipo MusicBrainz
      cruzada contra el catálogo completo del artista, agregar/quitar ítem, archivar/
      desarchivar, borrar.
- [x] 2.2 Función de derivación de estado (`archivado` / `completo` / `en curso`) según D3 de
      `design.md`: cuenta ítems del recorrido con `listen_entry` propio por `releaseGroupId`,
      sin filtro de audiencia.
- [x] 2.3 Reutiliza la clasificación real del catálogo — `release_group.category`
      (`studio`/`single_ep`/`compilation`/`live_other`, ver corrección de alcance en
      `design.md`) vía `findOrIngestDiscography` (mismo helper que ya usa la página de artista,
      incluye roll-up de membresías de banda).
- [x] 2.4 `src/services/lists/lists.ts`, `community.ts` y `discovery.ts` filtran explícitamente
      `kind = 'standard'` en toda lectura (propio, ajeno, Descubrir, Destacadas, Populares, De
      seguidos, conteos). `editorial.ts` y `saved-lists.ts` no lo necesitan: la audiencia de un
      recorrido es siempre `private` y esas rutas ya excluyen `private` (o exigen `ownerId !==
      saverId`, imposible con el propio recorrido) — verificado por lectura, no requiere el
      filtro adicional.
- [x] 2.5 Test de servicio (`artist-journeys.test.ts`, 11 casos): idempotencia de activar,
      pre-población solo de álbumes de estudio, agregar/quitar ítem, validación de álbum ajeno
      al artista, `ARTIST_JOURNEY_NOT_FOUND`. La exclusión de `lists` se verificó por el filtro
      de `kind` agregado en 2.4 más la suite existente de `src/services/lists` (56 tests, sigue
      en verde) — no se sumó un test de integración contra DB real dedicado a la exclusión.
- [x] 2.6 Cubierto por `deriveJourneyState` (pure function, testeada directo): agregar un ítem a
      un recorrido completo baja `selectedCount`/`listenedCount` a desigual en el próximo cálculo
      → "en curso" sin ningún campo persistido que actualizar (ver test "agregar un álbum válido
      es idempotente y recalcula el detalle").

## 3. API

- [x] 3.1 Endpoints bajo `src/app/api/me/artist-journeys/[artistId]/`: `GET`/`POST`/`DELETE` en
      la raíz (detalle, activar, borrar), `POST` en `items/` (agregar), `DELETE` en
      `items/[releaseGroupId]/` (quitar), `POST`/`DELETE` en `archive/` (archivar/desarchivar).
- [x] 3.2 Esquemas Zod nuevos en `src/lib/api/schemas.ts` (`ArtistJourneyState`,
      `ArtistJourneyAlbum`, `ArtistJourneyDetail`, `ArtistJourneyDetailResponse`,
      `AddArtistJourneyAlbumRequest`) + código de error `ARTIST_JOURNEY_NOT_FOUND`.
- [x] 3.3 Manejo de errores con `ApiError.code` en las cinco rutas, mismo patrón que `lists` y
      `want-to-listen` (`validId` con `z.uuid()`, `requireUser`, `requireSocialActivityAllowed`
      antes de mutar).
- [x] 3.4 Test de API para la ruta raíz (`[artistId]/route.test.ts`, 8 casos): detalle propio,
      `journey: null` sin activar, id inválido, activar y responder 201, suspensión social
      bloquea la activación, borrar y 204, recorrido inexistente en borrado, sesión requerida.
      No se sumaron tests de ruta dedicados para `items/` y `archive/` (wrappers finos sobre el
      servicio ya cubierto en 2.5) — trade-off de alcance por presupuesto de esta entrega.

## 4. UI — página de artista

- [x] 4.1 `ArtistJourneySection` (`src/components/artist-journey/ArtistJourneySection.tsx`),
      integrada en la página de artista junto al resto de acciones. Botón "Armar recorrido"
      con estados de carga/error; sin sesión, enlace a login (mismo patrón que
      `WantToListenButton`). El detalle se precarga en servidor
      (`getArtistJourneyDetail`), sin bloquear el resto de la página.
- [x] 4.2 Vista de gestión: grupos por categoría real del catálogo (`studio`/`single_ep`/
      `compilation`/`live_other`, mismo orden y labels que `AlbumGrid`), checkboxes por álbum,
      sin distinción visual dentro de un grupo.
- [x] 4.3 Barra de progreso + texto "`X` de `Y` escuchados", visible únicamente dentro de la
      sección de gestión; el resto de la página (incluida la faceta de perfil) no muestra
      fracciones.
- [x] 4.4 Estado "Completo" con borde/texto `petrol` (color de confirmación ya usado en
      `SaveListButton` para "guardado"), etiqueta de estado sobria ("Completo"), nunca copy de
      logro.
- [x] 4.5 Archivar/Desarchivar inline + Eliminar con confirmación en dos pasos (mismo patrón
      `pendingDelete` que `ListDetailHeader`). La edición de la selección es el checklist mismo
      (no hay un modo "editar" separado, dado que marcar/desmarcar ya es la edición).

## 5. UI — perfil (faceta en "Exploración")

- [x] 5.1 `journeyStatesForArtists` (artist-journeys.ts) + `listProfileFollowedArtists`
      (`src/services/profiles/exploration.ts`) resuelven el estado de todos los artistas
      seguidos visibles en una sola consulta agregada — no N+1.
- [x] 5.2 `ExploreSection` muestra un punto discreto (petrol si completo, gris si en curso) en
      la esquina del avatar del artista; sin indicador para archivado o ausencia de recorrido
      (`journeyState` queda `undefined` en ambos casos, por diseño de `journeyStatesForArtists`).
- [x] 5.3 Verificado por lectura: ni `ExploreSection` ni el resto de `sections.tsx` agregan un
      conteo — la faceta es por-tarjeta, no hay ningún `journeys.length`/`completedCount` en el
      perfil.
- [x] 5.4 `ExploreSection.test.tsx` (6 casos): sin artistas no renderiza, sin recorrido sin
      indicador, en curso, completo, archivado/ausente equivalentes (`journeyState: undefined`)
      sin indicador, y sin conteo agregado visible.

## 6. i18n y copy anti-gamificación

- [x] 6.1 `messages/{es,en}/artistJourney.json` (nuevo namespace, registrado en
      `src/i18n/request.ts`) + dos claves nuevas en `users.json` (`journeyStateInProgress`/
      `journeyStateComplete`) para la faceta de perfil.
- [x] 6.2 Verificado por grep sobre los archivos de mensajes y componentes nuevos: sin
      "completar/lograste/insignia/pendiente/logro" en ningún string de usuario (el único hit es
      "solicitudes pendientes", string preexistente de follow requests, no de esta capacidad).
      "Completo" se redacta neutro ("Completo" como etiqueta de estado + progreso "`X` de `Y`
      escuchados"), sin frase de celebración.
- [x] 6.3 El progreso (`ArtistJourneySection`) solo se renderiza dentro de esa sección; ningún
      otro componente de esta entrega (`ExploreSection`, página de artista) menciona una
      cantidad de álbumes restantes.

## 7. Documentación

- [x] 7.1 No se agregó una entrada nueva en `docs/05-features/`: verificado que `want-to-listen`
      —la capacidad más comparable, recién mergeada— tampoco tiene una (vive solo en
      `openspec/specs/want-to-listen/`). Se sigue el mismo precedente: el contrato completo
      queda en `openspec/specs/artist-journey/spec.md` + `docs/00-product/product_philosophy.md`
      §6.4, sin duplicar en `05-features/`.
- [x] 7.2 §6.4 marcada `✅ implementado` con referencia al change y a `design.md`. Se corrigió
      además la mención a "`primary-type`/`secondary-type` de MusicBrainz" (no existe tal cual
      en el catálogo) por la clasificación real (`release_group.category`, cuatro valores) — ver
      la misma corrección aplicada en los artefactos de OpenSpec.
- [x] 7.3 Sin cambios: `domain-model.md` ya documenta las cuatro categorías de álbum en términos
      generales y no necesita mencionar el subtipo interno de `user_list` (detalle de
      implementación, no de dominio).

## 8. Calidad y verificación

- [x] 8.1 `typecheck`, `lint` y `build` (`next build`) en verde, incluidas las cuatro rutas
      nuevas de `/api/me/artist-journeys/*`. `test` en verde salvo 2 archivos con 7 tests que ya
      fallaban en `main` antes de este change (`album/[id]/page.test.tsx`, confirmado
      reproduciendo el fallo con `git stash` — no relacionado con esta capacidad).
- [x] 8.2 Verificación manual en navegador (dev server real, artista "Iron Maiden", 20 álbumes
      de estudio): activar el recorrido (pre-pobló exactamente los álbumes de categoría studio),
      agregar un álbum en vivo (progreso pasó de "0 de 19" a "0 de 20"), archivar (badge →
      "Archivado", acción → "Desarchivar"), eliminar (dos pasos, volvió al botón inicial "Armar
      recorrido"). Encontró y corrigió un bug real en el camino (ver D1 de `design.md`): el
      índice único parcial original rompía `ON CONFLICT` en Postgres; se corrigió a un índice
      único simple. No se verificó la faceta de perfil en navegador con sesión real (requiere
      además seguir al artista) — queda cubierta por los tests de servicio/componente (5.1–5.4).
- [x] 8.3 No se ejecuta en esta sesión: `openspec archive` es un paso que decide el usuario
      (cierra el change y lo mueve a `openspec/changes/archive/`), no parte automática de
      `/opsx:apply`.

## 9. Rediseño de modal, selección masiva y acceso de menú (feedback de usuario, 2026-09)

- [x] 9.1 `ArtistJourneyModal.tsx`: modal portal-based (mismo patrón que `RegisterListenDialog`)
      con grupos por categoría colapsables (`studio` expandido por defecto, resto colapsado,
      mismo mecanismo `Set` + `ChevronIcon` que `DiaryActivityList`).
- [x] 9.2 `ArtistJourneySection.tsx` reducida a estado + progreso + archivar/eliminar + botón
      "Editar selección" que abre el modal; el checklist inline se retiró.
- [x] 9.3 "Seleccionar todo" / "Deseleccionar todo" por grupo: servicio
      `setJourneyCategorySelection` (una sola escritura, no N por álbum), endpoint `PUT
      /api/me/artist-journeys/[artistId]/categories/[category]`, cliente
      `setArtistJourneyCategorySelection`.
- [x] 9.4 Acceso "Recorridos" agregado a `user-menu-items.ts` (grupo `library`, ambas
      superficies) — aparece automáticamente en el menú del Header y en `OwnerHubPanel` al ser
      la misma fuente de datos.
- [x] 9.5 `listMyArtistJourneys` (servicio) + `/me/artist-journeys` (página) + `ArtistJourneyList`
      (componente): listado propio de solo lectura, sin progreso ni fracciones, con estado por
      recorrido (incluye archivados).
- [x] 9.6 **Bug encontrado y corregido durante la verificación en navegador** (ver D9 de
      `design.md`): la exclusión de recorridos de "superficies genéricas de listas" solo se
      había aplicado a `src/services/lists/`. Un recorrido de prueba apareció en el widget
      "Retomá una lista" de Inicio. Auditoría completa de `user_list` en todo `src/services`
      encontró y corrigió cinco puntos más: `home.ts`, `feed.ts`, `profiles/recency.ts`,
      `profiles/stats.ts` (conteo de listas de la huella de gusto) y `discovery/discovery.ts`.
      Verificado en navegador tras el fix: el widget de Inicio deja de mostrarlo y el "reparto"
      de la huella vuelve a `0` listas.
- [x] 9.7 Tests nuevos: `setJourneyCategorySelection` (select-all/deselect-all/categoría vacía),
      `listMyArtistJourneys` (deriva estado por fila incluidos archivados), ruta
      `categories/[category]` (5 casos). Sin test dedicado para los 5 fixes de exclusión
      (verificados manualmente en navegador; agregar un condition-inspection test sobre el
      query builder de Drizzle sería frágil y de bajo valor frente a la suite existente de cada
      servicio, que sigue en verde).
- [x] 9.8 `typecheck`, `lint` y la suite de tests afectada en verde tras los cambios de esta
      sección. Verificación manual completa en navegador: modal (expandir/colapsar, seleccionar
      todo por categoría, progreso live en la tarjeta), menú de usuario (Header y panel de
      gestión), listado `/me/artist-journeys`.
- [x] 9.9 Specs actualizadas: `artist-journey/spec.md` (modal + colapsables + selección masiva +
      exclusión generalizada a "toda lectura de `user_list`" + listado propio + acceso de menú),
      delta `cross-view-navigation/spec.md` (MODIFIED: recorridos agregados a la enumeración del
      menú de usuario).

## 10. Guardado en lote — feedback de usuario sobre lentitud (2026-09)

- [x] 10.1 Reemplazadas `addAlbumToJourney`/`removeAlbumFromJourney`/`setJourneyCategorySelection`
      por `setJourneySelection(ownerId, artistId, releaseGroupIds)`: calcula el diff contra la
      selección persistida y aplica altas/bajas en una transacción (ver D8 revisado en
      `design.md`).
- [x] 10.2 Eliminados los endpoints ahora sin uso: `POST /items`, `DELETE
      /items/[releaseGroupId]` y `PUT /categories/[category]` (archivos y carpetas borrados).
      Único endpoint de escritura de ítems: `PUT /api/me/artist-journeys/[artistId]/items` con
      `{ releaseGroupIds: string[] }`, reemplazo completo de la selección.
- [x] 10.3 `ArtistJourneyModal` pasa a editar un borrador local (`Set<releaseGroupId>`): marcar
      álbumes y "Seleccionar todo"/"Deseleccionar todo" por grupo ya no llaman al servidor.
      Botón "Guardar" (deshabilitado sin cambios) envía el borrador completo en una sola
      petición; cerrar sin guardar (✕/`Escape`/click fuera) descarta el borrador.
- [x] 10.4 Tests de servicio reescritos para `setJourneySelection` (agrega y quita en una
      transacción, sin cambios no abre transacción, valida pertenencia al artista, recorrido
      ajeno/inexistente) — 12 tests en verde. Eliminado el test de la ruta `categories/`
      (endpoint retirado).
- [x] 10.5 Verificado en navegador: activar → desmarcar 3 álbumes → cero peticiones de red hasta
      "Guardar" → una sola `PUT .../items` (200) → progreso actualizado (0 de 19 → 0 de 16).
      Verificado también el descarte: marcar un álbum adicional y cerrar con `Escape` no generó
      ninguna petición y el progreso quedó sin cambios.
- [x] 10.6 `typecheck`, `lint` y suite targeted en verde. Specs actualizadas: el requirement
      "Selección o deselección masiva por grupo" + "Editar la selección libremente" se
      fusionaron en "Editar un borrador local y guardar en una sola operación", reflejando que
      ya no existen escrituras individuales por álbum ni por categoría.

## 11. Orden de álbumes por año — feedback de usuario (2026-09)

- [x] 11.1 `sortDiscographyByYear` (año ascendente, sin año al final, desempate alfabético —
      mismo criterio que `AlbumGrid.tsx`), aplicado en `buildDetail` antes de mapear a
      `ArtistJourneyAlbum[]`. Resuelto en el servicio, no en el modal.
- [x] 11.2 6 tests nuevos para `sortDiscographyByYear` (orden ascendente, sin año al final,
      desempate por título con y sin año, no muta el arreglo original) + 1 test de integración
      confirmando que `activateArtistJourney` devuelve los álbumes ordenados aunque el catálogo
      los entregue en otro orden. 18 tests en verde en total para el servicio.
- [x] 11.3 Verificado en navegador (Iron Maiden): el modal muestra el grupo de estudio en orden
      1980→2010, coincidente con el orden ya visible en `AlbumGrid` en la misma página.
- [x] 11.4 `typecheck`/`lint` en verde. Spec actualizada: "Vista de gestión agrupada por tipo,
      en un modal colapsable" ahora especifica el orden dentro de cada grupo, con dos escenarios
      nuevos.

## 12. Ajustes visuales del modal — feedback de usuario (2026-09)

- [x] 12.1 "Seleccionar todo"/"Deseleccionar todo" pasa de enlace de texto a un checkbox
      "maestro" (`GroupSelectAllCheckbox`) por grupo, con estado `indeterminate` cuando el grupo
      está parcialmente seleccionado (ver D11 en `design.md`).
- [x] 12.2 Checkboxes (álbum y grupo) con `size-4 shrink-0 accent-amber` — convención ya usada en
      `EntriesDetailed`/`EntriesIndex`/`ShelfGrid`/`FavoriteTile` que faltaba aplicar acá. Antes
      usaban el estilo blanco por defecto del navegador, que desentonaba con la paleta oscura.
- [x] 12.3 Verificado en navegador: checkboxes en color ámbar; el checkbox maestro muestra el
      guion de "indeterminado" con 18/19 álbumes marcados y vuelve a check completo al
      seleccionar el restante.
- [x] 12.4 `typecheck`/`lint` en verde. Claves i18n `selectAll`/`deselectAll` (ya no usadas, eran
      el texto del enlace) reemplazadas por `selectAllAria`/`deselectAllAria` con `{category}`,
      usadas como `aria-label` del checkbox maestro.
