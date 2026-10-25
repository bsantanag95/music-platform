## Context

Tras `refine-collection-page-phase1` y `redesign-collection-header-toolbar`, `/me/collection` tiene pestañas con total,
segmentos por formato y barra en una fila. Las vistas (`ShelfGrid`, `EntriesDetailed`, `EntriesIndex`) comparten
`CollectionEntryControls` (selector de audiencia + Editar + Quitar, y el formulario en línea). Busco (`WantedShelf`)
tiene su propia fila y su formulario en línea. Favoritos y Pendientes ya resolvieron el mismo rediseño con un menú `⋯`
(`FavoriteActions`, `EntryActions`), aviso con deshacer y quitar en lote sin endpoint propio.

## Goals / Non-Goals

**Goals:** menú único por copia; edición en hoja; año; vistas compactas; selección completa; Busco → Tengo.

**Non-Goals:** ver la propuesta.

## Decisions

**D1. `EntryMenu` compartido.** Un componente para Tengo y Busco con disparador `⋯` (y, opcional, insignia de
audiencia): "Editar copia…", las tres audiencias como `menuitemradio` y "Quitar" en rojo. Misma mecánica que
`FavoriteActions` (Escape, clic fuera, flechas, foco de vuelta al disparador). Reutiliza `AudienceIcon` de Favoritos.
Si al abrir no cabe a la derecha, se alinea a la izquierda del disparador.

**D2. Hoja lateral = variante de `Dialog`.** `Dialog` gana `size="sheet"`: panel fijo a la derecha, de alto completo y
`max-w-md` desde `sm`; bajo `sm`, hoja desde abajo con `max-h-[90vh]`. Conserva portal, foco atrapado, Escape y
bloqueo de scroll. `CollectionEditSheet` y `WantedEditSheet` envuelven los formularios existentes con Guardar,
Cancelar y "Quitar…" al pie. Alternativa descartada: un componente de hoja nuevo (duplicaría la mecánica de foco).

**D3. Atributos agrupados.** `vocabulary.ts` exporta `ATTRIBUTE_GROUPS` (Edición, Soporte, Región y contenido, Otros)
con el mismo orden que `EDITION_ATTRIBUTES`. Los dos formularios pintan un subtítulo por grupo y saltan los grupos sin
opciones para el formato (Soporte con CD queda solo con "Box set"). También beneficia al alta en la página del álbum.

**D4. Año aditivo.** `CollectionAlbumSchema.year` (`number | null`, opcional) sale de `release_group.first_release_date`
en el `select` compartido de colección y búsqueda. El pie dice "Artista · 1987"; sin año, solo el artista.

**D5. "Ya tienes" aditivo.** `WantedEntrySchema.owned` (opcional): copias del mismo álbum en Tengo
(`{ format, attributes }[]`), leídas en una sola consulta por lote para la página de la búsqueda. Solo lo trae el listado
propio de Busco. La fila muestra "Ya tienes: CD · Remasterizada" (la primera copia y "+N" si hay más).

**D6. "Lo conseguí".** Acción explícita del dueño, no un efecto de otra operación (se respeta la independencia entre
colección y búsqueda). Con formato, crea la copia (`POST /api/me/collection`: formato, atributos compatibles, nota; la
audiencia es la por defecto) y luego quita la variante. Sin formato, primero abre en la fila los cuatro formatos para
elegir. Si quitar la variante falla, se borra la copia recién creada y se avisa. El aviso ofrece "Deshacer": quita la
copia y vuelve a crear la variante. La pestaña Tengo suma uno y Busco resta uno (los totales los informa el estante
abierto; Tengo se refresca por la invalidación de `["collection"]`).

**D7. Vistas.** Estantería: `⋯` sobre la carátula (semitransparente, siempre visible con puntero grueso, al pasar el
mouse o con foco con ratón), candado si es privada; pie con título, "artista · año" y "formato · primer atributo +N".
Lista detallada: `divide-y`, carátula 48 px, chips de atributos, nota en serif, a la derecha insignia de audiencia,
fecha y `⋯`. Índice: `<table>` con encabezados `sr-only` bajo `sm`, columnas Formato/Edición ocultas bajo `sm`.

**D8. Selección.** "Seleccionar todo" marca lo cargado; "Quitar" en lote pide confirmación en la misma barra y quita
cada copia con `Promise.allSettled` (si alguna falla, se restaura la lista y se avisa), como en Favoritos. Sin deshacer.
La barra pasa a una fila con desplazamiento horizontal en móvil.

**D9. `CollectionEntryControls` desaparece.** Las acciones viven en `EntryMenu`; la edición, en la hoja.

## Risks / Trade-offs

- ["Lo conseguí" son dos llamadas] → Compensación si la segunda falla; no hay estado intermedio visible para el dueño.
- [La copia creada usa la audiencia por defecto, no la de la variante] → La búsqueda suele ser privada y la colección
  no; el dueño la cambia desde el menú.
- [Quitar en lote sin deshacer] → Confirmación previa, mismo criterio que Favoritos.

## Migration Plan

Sin migraciones; la API solo agrega campos. Revertir es revertir el commit.
