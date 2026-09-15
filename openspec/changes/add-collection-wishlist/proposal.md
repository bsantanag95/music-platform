## Why

Hoy la colección física (`physical-collection`) modela solo posesión: un usuario registra las
copias que **ya tiene**. No existe forma de anotar los discos que **querría conseguir**, algo que
la propia documentación de la feature (`docs/05-features/physical-collection.md`, sección "Fuera
de alcance") ya dejó anotado como pendiente ("Wishlist / lista de deseados... Change aparte si el
uso lo pide"). El usuario lo pidió: quiere poder marcar álbumes deseados, en uno o varios
formatos/ediciones a la vez (a diferencia de una copia real, un deseo no es una sola combinación),
sin que compita con "ya lo tengo" ni lo bloquee.

## What Changes

- Nueva capability `collection-wishlist`: entradas de deseo (`wanted_entry`) por álbum, con **uno
  o más** formatos/atributos deseados por entrada (a diferencia de `collection_entry`, que exige
  un formato único por copia), sin nota ni audiencia pública — la wishlist es privada del dueño.
- El botón "Agregar a la colección" de la página de álbum deja de ir directo al formulario de
  "la tengo": ahora abre primero una elección **"La tengo" / "La quiero"**, y cada opción muestra
  su propio formulario (formato único obligatorio vs. selección múltiple de formato/atributos).
- El menú "···" de `AlbumCard` (`src/components/ui/RowMenu.tsx`) suma dos ítems nuevos: **"Lo
  quiero"** (alta rápida a la wishlist, sin abrir formulario) y **"Ya la tengo"** (lleva al flujo
  de alta de colección de la página de álbum).
- Dentro de `/me/collection` se agrega una segunda pestaña **"Quiero"** junto a la existente
  ("Tengo"), reutilizando el header y, donde el modelo lo permite, la toolbar y los modos de
  visualización ya construidos para la estantería.
- Tener un álbum en la colección y quererlo en la wishlist **no son mutuamente excluyentes**: no
  hay bloqueo ni deduplicación entre ambas señales.

## Capabilities

### New Capabilities
- `collection-wishlist`: alta, listado propio, edición y baja de entradas de deseo por álbum,
  con selección múltiple de formato/atributos por entrada, acción en la página de álbum, alta
  rápida desde el menú "···" de `AlbumCard`, y su propia pestaña dentro de `/me/collection`.

### Modified Capabilities
- `physical-collection`: el requirement "Acción de colección en la página de álbum" cambia — el
  punto de entrada único ahora bifurca entre "La tengo" (comportamiento sin cambios) y "La
  quiero" (delegado a `collection-wishlist`), en vez de ir directo al formulario de alta de
  copia.

## Impact

- **Base de datos**: tabla nueva `wanted_entry` (migración Drizzle), análoga a `collection_entry`
  pero con formato/atributos como colección en vez de columna única obligatoria.
- **Servicios**: `src/services/collection/` — nuevo servicio de wishlist junto al de colección
  (o submódulo), reutilizando el vocabulario cerrado de `src/services/collection/vocabulary.ts`.
- **API**: endpoints nuevos bajo `/api/me/collection/wanted` (o ruta equivalente), siguiendo el
  patrón de `docs/04-api/contracts.md` para la colección existente.
- **Frontend**:
  - `src/components/collection/CollectionAlbumAction.tsx` (bifurcación "La tengo" / "La quiero").
  - `src/components/catalog/AlbumCard.tsx` (dos ítems nuevos en el `RowMenu`).
  - `/me/collection`: nueva pestaña "Quiero" (componentes bajo `src/components/collection/`).
  - Mensajes nuevos en `messages/es/collection.json` (y su contraparte si el proyecto tiene otro
    locale activo).
- **Documentación**: actualizar `docs/05-features/physical-collection.md` (ya no queda "fuera de
  alcance") y `docs/04-api/contracts.md`.
