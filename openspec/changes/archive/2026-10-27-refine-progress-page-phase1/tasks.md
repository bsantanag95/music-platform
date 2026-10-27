## 1. Base

- [x] 1.1 `useArtistJourneyViewMode` y `useCaminoViewMode` devuelven `ready`; marcador y conmutador `invisible` hasta entonces.
- [x] 1.2 Página en `max-w-4xl` con cabecera a la izquierda; pestañas en una fila en móvil.
- [x] 1.3 Misma barra en las tres pestañas; el placeholder de búsqueda no se corta.
- [x] 1.4 Fondo en las fotos mientras cargan.
- [x] 1.5 ⋮ de 32/44 px en los menús de Discografías y Mis listas.

## 2. Acciones

- [x] 2.1 `ArtistJourneyDeleteDialog` y `CaminoDeleteDialog`; los renderers piden borrar y se borran las confirmaciones en línea.
- [x] 2.2 Dejar de seguir con nombre, 32/44 px y `UndoToast` con Deshacer.

## 3. Información

- [x] 3.1 `ProgressBar` con etiqueta discreta en Detallada (ambas pestañas) y en Listas que sigo.
- [x] 3.2 Estados vacíos con enlace; título de Listas que sigo.

## 4. URL

- [x] 4.1 `useProgressFilters` escribe `q`, `sort` y `state` con `replaceState`.
- [x] 4.2 La página valida los parámetros por pestaña y los pasa a cada listado.

## 5. Cierre

- [x] 5.1 Pruebas de componentes, del hook y de la página.
- [x] 5.2 Documentación en `docs/05-features/caminos.md`.
- [x] 5.3 typecheck, lint, test y build; verificación en el navegador a 1280 y 375 px.
