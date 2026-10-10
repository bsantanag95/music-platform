## Why

Novedades y Próximos lanzamientos son los dos lados de una misma línea de tiempo, pero solo el segundo tiene un
"Ver todo →" y un listado completo. El riel de Novedades se corta en 12 aunque haya decenas de lanzamientos en los
últimos 90 días, y no hay forma de recorrer el resto. Además su tarjeta muestra el año, que no dice nada en una
ventana de 90 días.

## Goals

- Dar a Novedades el mismo recorrido que Próximos lanzamientos: "Ver todo →" a un listado completo, paginado y
  cronológico, con la fecha exacta en la tarjeta.
- Que los dos listados se enlacen entre sí para saltar entre pasado y futuro sin volver a la portada.

## Non-Goals

- No cambiar la condición de Novedades (90 días, fecha completa, hasta hoy, con carátula) ni su umbral de omisión
  del riel: el listado usa la misma ventana que el riel para que ambos sean coherentes.
- No tocar el riel de Novedades de la página de género, Inicio ni el calendario de lanzamientos.
- Sin migraciones, sin dependencias nuevas, sin cambios en contratos REST.

## What Changes

- Nuevo listado `/explore?novedades=1`: la misma condición del riel de Novedades, paginado
  (`FILTERED_PAGE_SIZE`), por `first_release_date` descendente (el más reciente primero), con filtro por tipo
  (`tipo=`), sin selector de orden y sin el umbral de 6. Sin resultados, estado vacío.
- El riel de Novedades gana "Ver todo →" hacia ese listado y muestra la fecha de lanzamiento ("9 oct") en la
  tarjeta en lugar del año, igual que Próximos lanzamientos.
- Los listados de Novedades y de Próximos lanzamientos muestran cortes hermanos (chips "Novedades | Próximos
  lanzamientos") para saltar entre ellos.
- La condición de Novedades se extrae a una función compartida entre el riel y el listado; nueva
  `listNewAlbums` en el servicio de descubrimiento.
- Se actualizan el spec `album-discovery`, `docs/05-features/explore.md` y las cadenas es/en.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `album-discovery`: se añade el requisito del listado completo de novedades; se modifica "Novedades" (fecha en la
  tarjeta y "Ver todo") y "Listado completo de próximos lanzamientos" (cortes hermanos y prioridad respecto al
  nuevo corte).

## Impact

- Código: `src/services/discovery/discovery.ts`, `src/app/[locale]/(catalog)/explore/page.tsx`,
  `messages/{es,en}/catalog.json`. Los componentes de listado y la etiqueta de fecha ya existen.
- Pruebas: `src/services/discovery/discovery.test.ts`.
- Docs: `docs/05-features/explore.md`; spec `album-discovery`.
