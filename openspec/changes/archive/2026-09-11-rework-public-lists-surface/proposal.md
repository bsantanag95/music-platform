## Why

La superficie pública `/[locale]/lists` nació como una vidriera editorial fija (Destacadas →
Populares → De usuarios seguidos → Recientes) y hoy no permite filtrar ni ordenar: quien llega a
explorar no puede acotar por texto, tipo de entidad ni orden, y debe recorrer cuatro secciones sin
herramientas. Además, las listas editoriales oficiales (publicadas por un `editorial_curator` bajo
la cuenta `@exploracion`) no aparecen en "Destacadas", la sección que el producto reserva para la
curaduría, pese a que esa superficie ya distingue el contenido oficial con una insignia. Este cambio
convierte `/lists` en una superficie de **descubrimiento y exploración**, conservando la composición
editorial como estado por defecto.

## What Changes

- **Toolbar de exploración** en `/lists` (siempre visible): búsqueda por texto, filtro por tipo de
  entidad (artista / álbum / canción) y orden (Populares / Recientes). El estado vive en la URL
  (`?q=&type=&sort=`) para ser enlazable y sobrevivir a la recarga.
- **Dos estados de presentación** de la misma ruta:
  - **Vitrina** (sin `q`, `type` ni `sort`): se conserva la composición actual por secciones
    (Destacadas → Populares → De seguidos → Recientes).
  - **Explorar** (con algún filtro activo): una única grilla paginada de resultados, con conteo,
    resumen de filtros activos y acción "Limpiar filtros"; Destacadas y la composición por
    secciones se ocultan porque el visitante ya no navega la curaduría.
- **Destacadas incluye las listas editoriales oficiales publicadas**: primero las oficiales, luego
  las destacadas por `rank`, sin duplicar. La distinción visual sigue siendo la insignia "Oficial"
  ya existente.
- **`GET /api/lists/discover` acepta filtros opcionales** `q`, `entityType` y `sort`
  (`recent` por defecto, `popular` alternativo). Sin filtros, su contrato y comportamiento actuales
  se conservan (orden cronológico), de modo que la pestaña "Descubrir" de `/me/lists` y la sección
  "Recientes" siguen funcionando igual.
- Se mantiene la regla de producto: **sin recomendación algorítmica ni personalización por
  afinidad**. El orden "Populares" es el mismo criterio social agregado (guardados) que ya usa la
  sección homónima; "Recientes" es cronológico.

No es un cambio de esquema: no hay migraciones.

## Capabilities

### New Capabilities
<!-- Sin capabilities nuevas: el comportamiento se incorpora a specs existentes. -->

### Modified Capabilities
- `community-lists`: la superficie `/lists` gana el toolbar de filtros/orden, el estado "Explorar"
  con grilla unificada, y "Destacadas" pasa a incluir las listas editoriales oficiales publicadas.
- `list-discovery`: el listado paginado de listas públicas acepta filtros opcionales (`q`,
  `entityType`) y un orden alternativo por guardados (`sort=popular`), manteniendo el orden
  cronológico por defecto.

## Impact

- **Servicios**: `src/services/lists/discovery.ts` (`listDiscoverLists` con filtros y orden),
  `src/services/lists/community.ts` (`listFeaturedLists` incluye oficiales).
- **API**: `src/app/api/lists/discover/route.ts` (nuevos query params opcionales). Contratos
  actualizados en `docs/04-api/contracts.md`. Sin endpoints nuevos.
- **Frontend**: `src/app/[locale]/lists/page.tsx` (parseo de `searchParams` y modo),
  `src/components/lists/CommunityListsToolbar.tsx` (nuevo), `src/components/lists/` (grilla de
  exploración y ajustes a secciones/cards), i18n en `messages/es/lists.json` y
  `messages/en/lists.json`.
- **Docs**: `docs/05-features/lists-and-favorites.md` (superficie pública).
- **Sin dependencias nuevas. Sin migraciones.**
