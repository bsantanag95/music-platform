## Why

El diálogo "Añadir" cubre seis acciones, pero quedaron fuera tres que hoy exigen ir a una página de gestión: agregar un disco a la **colección**, activar un **recorrido de artista** y crear un **Camino**. Es la segunda tanda que dejó planteada `add-header-quick-actions`.

## What Changes

- Tres chips nuevos en el diálogo "Añadir", con el mismo patrón de buscar → elegir → aplicar:
  - **Colección:** buscar un álbum → elegir el formato (vinilo, CD, casete, otro) → se agrega una copia al instante, con "Deshacer". Atributos y nota quedan para la página.
  - **Recorrido:** buscar un artista → se activa su recorrido (`activateArtistJourney`). Si ya existe se informa y se enlaza, sin tocar nada.
  - **Nuevo Camino:** solo el título → se crea el Camino con la audiencia por defecto. Al crearlo se ofrece "Agregar a este Camino", que lleva al chip "A lista" con búsqueda de álbumes (el panel de listas ya ofrece los Caminos para álbumes).
- Orden de los chips: Escucha, Valorar, Favorito, Pendiente, Colección, Recorrido, A lista, Nueva lista, Nuevo Camino.

## Capabilities

### New Capabilities
- Ninguna.

### Modified Capabilities
- `header-quick-actions`: el diálogo pasa de seis a nueve acciones; el buscador de objetivos restringe Colección a álbumes y Recorrido a artistas; tres requisitos nuevos (uno por acción).

## Goals

- Llevar Colección, Recorrido y Nuevo Camino a un máximo de tres pasos.
- Reutilizar contratos existentes: `POST /api/me/collection`, `POST/GET /api/me/artist-journeys`, `POST /api/me/caminos`. Sin endpoints nuevos ni migraciones.

## Non-Goals

- Atributos de edición, nota y audiencia de la copia: se editan en la página de colección.
- "La quiero" (wishlist de ediciones) y la selección de álbumes del recorrido: siguen en sus páginas.
- Descripción y audiencia del Camino: se aplica la audiencia por defecto.

## Impact

- **Frontend:** `src/components/quick-actions/` (tipos, chips, paneles nuevos `CollectionPanel`, `JourneyPanel`, `NewCaminoPanel`, ajustes en `QuickActionsDialog`).
- **i18n:** claves nuevas en `quickActions` (es/en).
- **Docs:** `phase-5-design.md` (lista de acciones del diálogo).
- Sin cambios de API, esquema ni dependencias.
