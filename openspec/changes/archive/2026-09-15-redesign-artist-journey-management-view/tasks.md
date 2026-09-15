## 1. Datos hacia el componente

- [x] 1.1 `page.tsx` de gestión: pasar `artistPhotoUrl` (de `artistRow.photoUrl`) a
      `ArtistJourneyManager`.

## 2. Editor detrás de un toggle

- [x] 2.1 `ArtistJourneyManager`: agregar estado `editorOpen`, inicializado en
      `journey.progress.selectedCount === 0` (D1/D2 de design.md).
- [x] 2.2 Envolver `ArtistJourneyAlbumGroups` y el pie con "Guardar" en un bloque condicionado por
      `editorOpen`, con un botón "Agregar o quitar álbumes" que lo abre y un botón "Ocultar" (o
      similar) dentro del bloque que lo cierra, sin descartar el borrador.

## 3. Vista de selección (nuevo componente)

- [x] 3.1 Crear `ArtistJourneySelectionView` (lista + gráfico), agrupado por categoría con el
      mismo orden que el editor, mostrando solo álbumes con `selected: true` del borrador actual.
- [x] 3.2 Modo lista: fila con `CoverThumb`, título enlazado a `/album/[id]`, año, botón "Quitar"
      que llama a `toggleAlbum`.
- [x] 3.3 Modo gráfico: pared de carátulas (`CoverThumb` en grilla), título como caption enlazado,
      con la misma acción de quitar accesible desde el tile.
- [x] 3.4 Control de orden (fecha de lanzamiento / alfabético) y de modo (lista/gráfico) como
      estado local sin persistencia (D4 de design.md).
- [x] 3.5 Integrar en `ArtistJourneyManager`: se muestra en vez del editor cuando
      `selectedCount > 0`; usa el borrador local (`selected`, no `journey.albums` crudo) para que
      quitar un álbum se refleje al instante.

## 4. Encabezado

- [x] 4.1 Agregar foto del artista (o `DiscPlaceholder` si no hay) al encabezado de
      `ArtistJourneyManager`, mismo patrón que `ArtistHeader`.
- [x] 4.2 El nombre del artista en el encabezado enlaza a `/artist/[artistId]`.
- [x] 4.3 Centrar el contenedor de la página (`items-center` en vez de `items-start`; ampliar
      `max-w-2xl` a `max-w-3xl`).

## 5. i18n

- [x] 5.1 Agregar claves nuevas a `messages/es/artistJourney.json` y
      `messages/en/artistJourney.json` (abrir/ocultar editor, orden fecha/alfabético, modo
      lista/gráfico, quitar álbum, etc.).

## 6. Pruebas y verificación

- [x] 6.1 Actualizar/crear tests de `ArtistJourneyManager` cubriendo: editor oculto por defecto
      con selección no vacía, editor abierto por defecto con selección vacía, abrir/ocultar el
      editor conserva el borrador, vista de selección agrupada con orden y modo, quitar desde la
      vista de selección habilita "Guardar" sin llamar al servidor, enlaces de álbum y artista.
- [x] 6.2 `npm run typecheck`, `npm run lint`, `npm test` (suite completa).
- [x] 6.3 `npm run build` (con `.next` limpio si hace falta).
- [x] 6.4 Verificación manual en navegador: cargar la página con selección no vacía (editor
      oculto), con selección vacía (editor abierto), abrir/cerrar el editor, cambiar orden y modo
      en la vista de selección, quitar un álbum y guardar, seguir el enlace de un álbum y del
      artista, confirmar la foto del artista.

## 7. OpenSpec

- [x] 7.1 `openspec validate redesign-artist-journey-management-view --strict`.
