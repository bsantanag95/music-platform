## Context

La página de artista es un layout de pestañas (`(tabs)/layout.tsx`) que carga cabecera, panel, comunidad y comentarios,
y una página por pestaña. La Discografía recibe las seis secciones completas y elige una con `?section=`.

## Decisions

### D1. Sección en el cliente con `history.pushState`

Las pastillas siguen siendo enlaces (`<a href>` para abrir en otra pestaña y para quien no tiene JS), pero un clic
simple hace `preventDefault`, cambia el estado local y escribe la URL con `window.history.pushState`. Next 15 integra
`pushState` con su router, así que la entrada queda en el historial sin una petición RSC. Un `popstate` vuelve a
leer `?section=` de `location.search` (`sectionFromSearch`, con la misma regla del servidor: desconocida o vacía →
la primera). El servidor sigue leyendo `?section=` para la carga inicial y los enlaces compartidos. `prefetch={false}`
evita precargar seis variantes de la misma página.

Alternativa descartada: `router.push(..., { scroll: false })` — sigue pidiendo el segmento al servidor.

### D2. Discos del modal bajo demanda

`journeyAlbums` solo lo usa `ArtistJourneyStartModal`, que se abre desde "Completar discografía". El layout lo
calculaba para cualquier usuario sin recorrido (una segunda lectura de la discografía y ~80 KB en el HTML). Ahora el
panel llama a `GET /api/catalog/artist/[id]/journey-albums` al pulsar la acción y abre el modal con la respuesta. La
lectura (`listArtistJourneyAlbums`) es la misma de antes, movida a un servicio. El endpoint es público (datos de
catálogo) y comprueba la existencia con una consulta propia en lugar de `getArtistById`, que podría enriquecer un stub
contra MusicBrainz.

### D3. `HiddenOnTab` para el resumen

El layout no conoce la pestaña activa en el servidor (los layouts no reciben el segmento hijo). Un componente cliente
mínimo en `ArtistTabs.tsx` usa `useSelectedLayoutSegment` —como la barra de pestañas— y no renderiza sus hijos en
Biografía. El resumen sigue siendo de servidor: se pasa como hijo.

### D4. Columnas según los datos

`signedIn` viaja en `DiscActions` (marcas `null` = sin sesión). "Media" se decide sobre los discos de la tabla
(la sección, o todos los grupos durante la búsqueda); `colSpan` de los encabezados de grupo se calcula.

## Risks / Trade-offs

- **Divergencia del árbol RSC**: tras `pushState` el árbol de la página sigue siendo el de la sección inicial. Es
  inocuo porque la página solo usa `section` para el estado inicial; un `router.refresh()` reconcilia sin efecto
  visible.
