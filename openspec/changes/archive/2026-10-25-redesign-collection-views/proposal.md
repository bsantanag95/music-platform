## Why

Las fases 1 y 2 dejaron `/me/collection` sin errores y con un encabezado legible, pero las tres vistas siguen siendo las
de la primera versión:

- Cada ficha lleva sus propios enlaces de texto ("Editar", "Quitar") y, en Lista detallada e Índice, un `<select>` de
  audiencia por fila: mucho ruido para acciones poco frecuentes.
- La edición se abre en línea y empuja el resto de la cuadrícula; en la Estantería el panel ocupa el ancho completo
  entre dos filas de carátulas. Los 17 atributos de edición aparecen en un solo bloque, sin agrupar.
- Lista detallada usa tarjetas de 137 px por copia; el Índice es una lista de texto, no una tabla.
- Al pie de cada ficha no hay año del álbum, solo título y artista.
- El modo selección solo cambia la audiencia: no se pueden quitar varias copias a la vez, ni marcar todas.
- En Busco no se puede pasar un disco a Tengo cuando se consigue (hay que agregarlo desde el álbum y quitarlo de la
  búsqueda), y no se ve que ya se tiene otra edición: 4 de las 6 entradas reales ya están en Tengo.

## What Changes

- **Menú `⋯` por copia** en las tres vistas (Tengo y Busco): "Editar copia…", las tres audiencias (marcada la vigente) y
  "Quitar". Reemplaza los enlaces y el `<select>` por fila. En la Estantería va sobre la carátula; una copia privada
  muestra un candado.
- **Edición en una hoja lateral** (`Dialog` con variante `sheet`: a la derecha en pantallas anchas, desde abajo en
  móviles) con los atributos agrupados (Edición, Soporte, Región y contenido, Otros) y "Quitar de la colección" al pie.
  Deja de haber panel en línea.
- **Año del álbum** junto al artista en las tres vistas (`album.year` en la API, aditivo).
- **Lista detallada compacta:** filas separadas por una línea, carátula de 48 px, audiencia y fecha a la derecha.
- **Índice como tabla** (`<table>`): #, Álbum, Artista, Formato, Edición, Añadida y acciones.
- **Selección:** "Seleccionar todo" (lo cargado) y "Quitar" en lote con confirmación (sin deshacer), además del cambio de
  audiencia. La barra queda en una fila.
- **Busco:**
  - **"Lo conseguí"** pasa la variante a Tengo: crea la copia con su formato, atributos y nota (si buscaba "cualquier
    formato", pide el formato en el momento) y quita la variante de la búsqueda. Ofrece "Deshacer".
  - **"Ya tienes: CD · Remasterizada"** cuando el álbum ya está en Tengo (`owned` por entrada en la API, aditivo).
  - Mismo menú `⋯` y misma hoja de edición que Tengo; la fila usa el formato de Lista detallada.

### Goals

- Acciones agrupadas en un solo lugar por copia, con la misma forma en todas las vistas.
- Edición que no reacomoda la página.
- Cerrar el ciclo Busco → Tengo.

### Non-Goals

- Alta en Busco desde la página, "Lo conseguí" en lote, notas largas o fotos de la copia.
- Endpoint de borrado en lote (se quita cada copia, como en Favoritos).
- Cambios de esquema o dependencias.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `physical-collection`: la edición y el quitado pasan al menú `⋯` y a la hoja lateral; las vistas muestran el año;
  Lista detallada compacta e Índice como tabla; quitar en lote con confirmación.
- `collection-wishlist`: menú `⋯` y hoja de edición; "Lo conseguí" (paso explícito a Tengo) y "Ya tienes".

## Impact

- `src/lib/api/schemas.ts`, `src/services/collection/{collection,wanted,types,wanted-types,vocabulary}.ts` y sus pruebas.
- `src/components/ui/Dialog.tsx` (variante `sheet`).
- `src/components/collection/`: `ShelfGrid`, `EntriesDetailed`, `EntriesIndex`, `CollectionShelf`, `WantedShelf`,
  `CollectionEntryForm`, `WantedVariantForm`, `collection-shared.ts`; nuevos `EntryMenu`, `CollectionEditSheet`,
  `WantedEditSheet`, `GotItButton`; se elimina `CollectionEntryControls`.
- `messages/{es,en}/collection.json`.
- `docs/05-features/physical-collection.md`, `docs/04-api/contracts.md`, `docs/01-domain/business-rules.md`.
