# Listas y favoritos

**Fase:** 5 (roadmap). **Estado:** ✅ Implementado (cambio `add-favorites-and-lists`). Este
documento es la especificación de producto cerrada; el detalle de implementación vive en el
change de OpenSpec y en `04-api/contracts.md`.

## Favorito

- Señal simple de interés, sin escala numérica. Aplica a **artista, álbum (release group) y
  canción (recording)**.
- Es un toggle idempotente: un usuario tiene a lo sumo un favorito por objetivo; marcarlo de
  nuevo no duplica, y quitarlo cuando no existe no produce error.
- Tiene **audiencia propia** (`private`/`followers`/`public`, default `followers`),
  independiente de la escucha, la valoración y el comentario del mismo objetivo.
- No implica rating, comentario ni escucha; marcarlo no crea ni modifica ninguna de esas
  acciones.
- Se puede quitar. La audiencia se puede cambiar después de publicar.

## Listas

- Colección curada armada por un usuario, de **un solo tipo de entidad** por lista (solo
  artistas, solo álbumes o solo canciones).
- Primera versión de **propiedad de un único usuario** (no colaborativa).
- Campos: título obligatorio (≤100 caracteres), descripción opcional (≤500), `entityType` fijo
  al crear (no modificable), audiencia propia.
- Orden manual de elementos; un mismo objetivo aparece a lo sumo una vez por lista (agregar de
  nuevo es idempotente).
- El propietario puede agregar/quitar ítems, reordenarlos, editar título/descripción/audiencia
  y borrar la lista (borrado físico, elimina ítems en cascada).
- Visibilidad por audiencia; las listas ajenas se filtran por la matriz de visibilidad (bloqueos,
  perfil privado, relación de seguimiento).

## Decisiones cerradas (antes del cambio)

- Favorito en tres niveles (artista/álbum/canción) — contradice la definición anterior del
  `domain-model.md` ("solo artista"), corregida en el mismo cambio.
- Listas de un solo tipo de entidad (no mixtas en v1).
- Listas de propietario único (no colaborativas en v1).
- El feed incluye favoritos y eventos de listas (creación y actualización de metadatos, no por ítem).

## Lo que quedó fuera de esta entrega

- Listas mixtas y colaborativas.
- "Añadir a lista" dentro del editor como búsqueda de catálogo (la acción contextual en las
  páginas de artista/álbum/canción agrega el objetivo actual a una lista compatible).