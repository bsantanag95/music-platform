## 1. Servicio y esquema

- [x] 1.1 `artist-journeys.ts`: agregar `listenedReleaseGroupIds(ownerId, releaseGroupIds)` (Set de
      ids escuchados), reemplazando el uso de `countListened` dentro de `buildDetail`.
- [x] 1.2 `buildDetail`: calcular `listened` por álbum y derivar `progress.listenedCount`
      intersecando `selectedIds` con el nuevo set; eliminar `countListened` si queda sin uso.
- [x] 1.3 `ArtistJourneyAlbum` (interfaz del servicio): agregar `listened: boolean`.
- [x] 1.4 `schemas.ts`: `ArtistJourneyAlbumSchema` — agregar `listened: z.boolean()`.
- [x] 1.5 Actualizar `artist-journeys.test.ts` (fixtures y aserciones de `buildDetail`/
      `getArtistJourneyDetail`/`activateArtistJourney`/`setJourneySelection` que ya cubren
      `albums`) para incluir `listened`.

## 2. Acción de registrar escucha en la vista de selección

- [x] 2.1 `ArtistJourneySelectionView`: agregar acción "Registrar escucha" por álbum (modo lista y
      modo gráfico), con indicador de "ya escuchado" cuando `album.listened`.
- [x] 2.2 `ArtistJourneyManager`: función `markListened(albumId)` — `createListenEntry` (de
      `@/lib/api/diary`) seguido de `getArtistJourney(artistId)` (de
      `@/lib/api/artist-journeys`) para refrescar `journey`, sin tocar `selected`; manejo de error
      con el mismo `errorCode` genérico ya usado por archivar/borrar/guardar.

## 2b. Panel de ampliación tras registrar

- [x] 2b.1 `ArtistJourneyManager`: estado `listenEntries: Record<albumId, ListenEntry>` con la
      última entrada creada por álbum en esta sesión; `markListened` la guarda ahí antes de
      refrescar `journey`; `saveListenEntry` la actualiza cuando `ListenEntryForm` guarda cambios.
- [x] 2b.2 `ArtistJourneySelectionView`: tras un registro exitoso, abrir automáticamente el panel
      (mismo comportamiento que `MarkAsListened`); control "Ampliar"/"Cerrar" (claves
      `diary.expand`/`diary.collapse`) para alternar sin crear otra entrada.
- [x] 2b.3 Reutilizar `ListenEntryForm` (`src/components/diary/ListenEntryForm.tsx`) sin
      modificarlo, tanto en modo lista (debajo de la fila) como en modo gráfico (debajo de la
      grilla de la categoría, rotulado con el título del álbum expandido).

## 2c. No reemplazar un panel abierto (revisión)

- [x] 2c.1 `ArtistJourneySelectionView`: `markListened` solo abre el panel si no hay ninguno
      abierto (`setExpandedId((current) => current ?? albumId)`) — registrar otro álbum marca
      "✓ Escuchado" igual, sin robarle el panel al que ya estaba abierto (D6 de design.md).
- [x] 2c.2 El panel que sí se abre automáticamente hace `scrollIntoView` (con un `ref` compartido
      entre las dos ubicaciones donde puede renderizarse: la fila en modo lista, el bloque debajo
      de la grilla en modo gráfico) — evita que pase desapercibido, especialmente en modo gráfico
      con categorías largas.

## 2d. Registrar/Quitar registro, no repetir (revisión)

- [x] 2d.1 `ArtistJourneyManager`: función `unmarkListened(albumId)` — `deleteListenEntry` (de
      `@/lib/api/diary`) sobre `listenEntries[albumId].id`, seguido de `getArtistJourney` para
      refrescar `journey`; limpia esa entrada de `listenEntries`; no-op si no hay entrada
      rastreada para ese álbum (D7 de design.md).
- [x] 2d.2 `ArtistJourneySelectionView`: `toggleListened(album)` reemplaza a `markListened` como
      handler único del control — registra si `!album.listened`, quita el registro si
      `album.listened && hasEntry`, no hace nada si `album.listened && !hasEntry` (control sin
      acción en ese caso). Quitar el registro cierra el panel de ampliación si era el que estaba
      abierto.
- [x] 2d.3 Modo lista: el botón junto a "✓ Escuchado" muestra "Registrar escucha" o
      "Quitar registro" según corresponda, y no se renderiza ningún botón cuando el álbum está
      escuchado sin entrada rastreada.
- [x] 2d.4 Modo gráfico: rediseñar el control de escuchado como círculo con `CheckIcon` (SVG,
      trazo grueso) — hueco cuando no está marcado, relleno sólido (`bg-petrol`) cuando sí,
      distinguible por forma además de color; `disabled` (sin estilos atenuados) cuando está
      escuchado sin entrada rastreada, para que siga leyéndose "marcado" aunque no ofrezca acción.

## 3. i18n

- [x] 3.1 Agregar claves nuevas a `messages/es/artistJourney.json` y
      `messages/en/artistJourney.json` bajo `selection` (registrar escucha, registrando, ya
      escuchado, aria-label con el título del álbum).
- [x] 3.2 Agregar `selection.removeListen`, `selection.removeListenAlbum` y
      `selection.listenedAlbum` a `messages/es/artistJourney.json` y
      `messages/en/artistJourney.json`.

## 4. Pruebas y verificación

- [x] 4.1 Tests de servicio (`artist-journeys.test.ts`): `listened` por álbum refleja escuchas
      registradas sobre toda la discografía, no solo la selección.
- [x] 4.2 Tests de `ArtistJourneyManager`/`ArtistJourneySelectionView`: registrar escucha marca el
      álbum, actualiza el progreso sin recargar, un error no descarta el borrador de selección, el
      editor no ofrece la acción, el panel de ampliación se abre solo tras registrar,
      "Ampliar"/"Cerrar" no crea otra entrada, registrar otro álbum mientras un panel está abierto
      no lo reemplaza, un álbum ya escuchado sin entrada rastreada no ofrece registrar ni quitar, y
      quitar el registro de una entrada de esta sesión revierte el álbum a no escuchado.
- [x] 4.3 `npm run typecheck`, `npm run lint`, `npm test` (suite completa).
- [x] 4.4 `npm run build` (con `.next` limpio si hace falta).
- [x] 4.5 Verificación manual en navegador: registrar una escucha desde lista y desde gráfico,
      confirmar que el progreso y el estado (completo/en curso) se actualizan sin recargar, y que
      un borrador de selección sin guardar sobrevive al registro.

## 5. OpenSpec

- [x] 5.1 `openspec validate add-artist-journey-mark-listened --strict`.
