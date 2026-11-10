## Why

La Lista detallada de `/me/collection` repetía en cada fila una insignia "Seguidores" que no informaba nada, mostraba una
fecha sin rotular (se confundía con la del lanzamiento), formato y atributos como etiquetas con borde que parecían
tocables, y el encabezado ofrecía segmentos de formato vacíos y deshabilitados. Además había tres acentos ámbar a la vez.

## What Changes

- Lista detallada (Tengo y Busco): la audiencia Pública / Seguidores es solo un ícono discreto; la Privada conserva nombre y ámbar.
- Lista detallada: la fecha dice "Añadida el …".
- Lista detallada: formato y atributos en una línea de texto "CD · Edición limitada" en lugar de etiquetas.
- Segmentos de formato: los formatos sin copias no se muestran (salvo el elegido).
- El segmento y el modo de vista elegidos usan un estado neutro; el ámbar queda para la pestaña activa.

## Capabilities

### Modified Capabilities
- `physical-collection`: segmentos sin formatos vacíos y fila de Lista detallada.

## Impact

`src/components/collection/{EntryMenu,EntriesDetailed,CollectionFormatSegments,CollectionModeSwitcher}.tsx`, mensajes
`collection.addedOn`, tests y `docs/05-features/physical-collection.md`. Sin cambios de API ni de esquema.
