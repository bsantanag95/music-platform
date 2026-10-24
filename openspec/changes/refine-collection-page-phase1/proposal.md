## Why

Una auditoría de `/me/collection` (Colección física) en escritorio y a 375 px, con datos reales, encontró errores que no
dependen de un rediseño:

- **Dato incoherente que no se puede corregir:** una copia en CD guarda "Vinilo de color". El servidor no comprueba que
  los atributos de vinilo vayan con el formato vinilo, y el formulario oculta ese chip para un CD, así que no se puede
  quitar y se vuelve a guardar sin que se vea.
- **La Estantería (vista por defecto) no permite quitar una copia:** solo ofrece "Editar".
- **El Índice deja huecos:** los controles se ocultan con opacidad pero siguen ocupando 30 px de cada fila de 70 px.
- **Quitar es inmediato**, sin confirmación ni deshacer, y el error aparece al final de la página.
- **Los filtros no viajan a la URL**, aunque la página los lee de ella y la documentación dice que sí.
- **Salto de modo:** la página pinta Estantería y salta al modo guardado.
- **Selectores cortados** ("Todos los format…", "Por artis…"), controles de 16–30 px en pantallas táctiles.
- **Selección:** la casilla mide 16 px, tocar la carátula abre el álbum en vez de marcarla y no se ve qué está marcado.
- **Lista detallada** repite el artista bajo el encabezado del artista; la carátula es un enlace de 64×104 px.
- **Busco** usa otro estilo de botones que Tengo y destaca "Cualquier formato" como si fuera un dato.

Son el mismo tipo de defectos que `/me/ratings`, `/me/favorites` y `/me/want-to-listen` corrigieron en su Fase 1.

## What Changes

- **Coherencia formato ↔ atributos en el servidor** (colección y búsqueda): un atributo de vinilo (`colored-vinyl`,
  `picture-disc`, `180g`, `gatefold`) con un formato que no es vinilo responde `400 VALIDATION_ERROR`. Si una edición
  cambia solo el formato, el servidor quita esos atributos (lo mismo que ya hace el formulario). La búsqueda sin formato
  admite todos.
- **Corrección del dato heredado al editar:** el formulario avisa qué atributo no aplica al formato y lo quita al guardar.
- **Quitar en todas las vistas, con deshacer:** "Quitar" aparece también en la Estantería; tras quitar, un aviso ofrece
  "Deshacer" durante 6 s (vuelve a crear la copia con los mismos datos). Lo mismo en Busco. El error de quitar aparece
  junto a esa entrada y el quitado se anuncia a lectores de pantalla.
- **Índice sin huecos:** los controles van siempre visibles en la misma fila (a la derecha desde `sm`).
- **Filtros en la URL:** pestaña, búsqueda, formato, atributo, orden y agrupación se escriben con `replaceState` cuando
  difieren del valor por defecto.
- **Sin parpadeo de modo:** marcador neutro y conmutador invisible hasta leer el modo guardado.
- **Ancho único y encabezado a la izquierda:** `max-w-4xl`, como las demás páginas propias; la colección del perfil
  conserva su ancho.
- **Selectores legibles** (anchos que caben) y **áreas táctiles** de 44 px con puntero grueso.
- **Selección más clara:** casilla de 24 px con puntero grueso, tocar la ficha la marca y la ficha marcada se resalta.
- **Lista detallada sin repetición:** sin artista cuando se agrupa por artista; la carátula deja de estirarse.
- **Busco con el mismo estilo de controles** que Tengo; "Cualquier formato" pasa a texto secundario.
- **Rendimiento:** las primeras carátulas cargan con prioridad.

### Goals

- Corregir los errores confirmados sin cambiar el diseño de las vistas.
- Que el servidor no acepte la combinación incoherente de formato y atributos.

### Non-Goals

- Segmentos por formato, pestañas con conteo, "Sin agrupar", barra en una línea, "Añadir copia" (Fase 2).
- Menú `⋯`, hoja lateral de edición, Índice como tabla, quitar en lote, "Lo conseguí", "Ya tienes" (Fase 3).
- `CHECK` en SQL para la coherencia: queda en la capa de servicio (ver design D1). Sin migraciones ni dependencias.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `physical-collection`: atributos coherentes con el formato; quitar con deshacer desde cualquier modo; Índice con
  controles visibles; modo sin parpadeo; requisito nuevo de la página propia (ancho, URL, áreas táctiles, selección).
- `collection-wishlist`: atributos coherentes con el formato cuando hay formato; quitar con deshacer en Busco.

## Impact

- `src/services/collection/{vocabulary,collection,wanted}.ts` y sus pruebas; rutas `api/me/collection/**` (sin cambio de
  firma).
- `src/app/[locale]/me/collection/page.tsx`; `src/components/collection/` (`CollectionShelf`, `WantedShelf`,
  `CollectionToolbar`, `ShelfGrid`, `EntriesDetailed`, `EntriesIndex`, `CollectionEntryControls`, `CollectionEntryForm`,
  `WantedVariantForm`, `CollectionModeSwitcher`, `collection-shared.ts`, `use-collection-view-mode.ts`); nuevo
  `src/components/ui/UndoToast.tsx`.
- `messages/{es,en}/collection.json`.
- `docs/05-features/physical-collection.md`, `docs/01-domain/business-rules.md`, `docs/04-api/contracts.md`,
  `docs/04-api/errors.md`.
