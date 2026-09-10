## Why

Registrar una escucha —la acción recurrente central del producto, su equivalente del "Log a
Game" de Backloggd— hoy **solo se puede iniciar desde una página de artista, álbum o
canción** (`MarkAsListened`). Para anotar algo que estás escuchando tenés que buscarlo,
abrir su página y recién ahí registrar. La barra general del Header quedó curada y con
espacio (Buscador · Explorar · Listas) tras `regroup-authenticated-header`, y el sprint de
continuación acordado es sumar un acceso global `+ Registrar`.

## What Changes

- **Nuevo control `+ Registrar` en la barra general del Header**, visible **solo con
  sesión**, junto a Buscador · Explorar · Listas. En el panel móvil vive en el bloque de
  barra general.
- El control abre un **modal de registro** que compone: un buscador del catálogo → elección
  de un resultado (álbum, artista, o canción vía `songContext`) → creación inmediata de la
  escucha → panel para ampliarla (impresión, contexto, reacción, audiencia) o cerrar.
- Es **el mismo flujo crear+ampliar de `MarkAsListened`** con un paso previo de elegir
  objetivo. La escucha nace `private` igual que hoy; el modelo de la entrada no cambia.
- El objetivo sugerido como primario es el **álbum** (la "obra"); artista y canción también
  son válidos.
- **Fuera de alcance**: registrar varios objetivos de una vez; historial/recientes en el
  modal; registrar desde el modal sin buscar (p. ej. "lo último que registré"); cualquier
  cambio en el modelo de la entrada de diario o en su audiencia inicial.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `listen-diary`: el requisito **"Acción Marcar como escuchado"** gana un **punto de entrada
  global** que no parte de una página de entidad: primero resuelve el objetivo mediante el
  buscador del catálogo y luego corre el mismo flujo de creación inmediata + ampliación. La
  escucha así creada sigue naciendo con audiencia `private`. Sin sesión el punto de entrada
  no se ofrece.
- `cross-view-navigation`: el requisito **"Estructura del Header para el usuario
  autenticado"** suma a la barra general un control `+ Registrar` visible solo con sesión,
  en escritorio y en el bloque de barra general del panel móvil; el control **no** es un
  enlace de navegación sino el disparador del modal de registro.

## Impact

- **Componentes**: nuevo `RegisterListenDialog` (o `RegisterListenButton` + diálogo) en
  `src/components/diary/` — modal con portal/focus-trap/Escape (mismo patrón que
  `GetStartedModal`), que compone un buscador de catálogo y, tras elegir, `ListenEntryForm`.
  `src/components/layout/Header.tsx` monta el disparador en la barra general (con y sin
  colapso móvil), condicionado a `currentUser`.
- **Reuso sin cambios**: `searchCatalog` / `GET /api/catalog/search` (ya persiste stubs
  locales de cada resultado, así que `resolveDiaryTarget` los encuentra), `createListenEntry`
  / `POST /api/me/diary`, `ListenEntryForm`, `ReactionPicker`, `CatalogSearchResult` /
  `songContext`.
- **i18n**: nuevas claves en `messages/{es,en}/diary.json` (rótulo del control, título del
  modal, "elegí qué querés registrar", placeholder del buscador, estados vacío/carga/error,
  confirmación con enlace a `/me/diary`).
- **Tests**: nuevo test del diálogo (buscar → elegir → crear → ampliar; sin sesión no se
  monta); `Header.test.tsx` (el control aparece con sesión y no sin ella).
- **Sin** endpoints nuevos, **sin** migración, **sin** cambios en contratos REST.
