## Why

Al usar el selector de favoritos (Tarjeta de Identidad y "Empieza por aquí") el usuario observó dos fallas: buscar un artista o banda solo devuelve al artista, no los álbumes ni canciones suyos que tiene como favoritos (el filtro `q` de favoritos solo mira el título del objetivo), y con el editor en un panel angosto las tres columnas de la Tarjeta dejan cada tarjeta tan estrecha que los títulos se cortan a tres letras y el texto apenas se lee.

## Goals

- Que `q` encuentre también los álbumes y canciones favoritos por el nombre de su artista acreditado, como ya hace la búsqueda de la colección.
- Que el selector y el editor de la Tarjeta de Identidad se lean cómodamente en el panel lateral: un slot por fila, texto de tamaño legible y títulos completos.

## Non-Goals

- No convertir el selector en una búsqueda de catálogo: sigue eligiendo entre favoritos.
- No buscar por otros campos (año, género, créditos secundarios); solo el artista principal acreditado.
- No cambiar el orden de los resultados ni el tope de 50 por consulta.
- No tocar el diseño de "Empieza por aquí" en el perfil ni el muro de Favoritos, salvo el efecto de la búsqueda ampliada.

## What Changes

- `GET /api/me/favorites` y `GET /api/users/{username}/favorites`: `q` coincide, sin distinguir mayúsculas, con el título del objetivo **o** con el nombre del artista principal acreditado del álbum o canción. Los favoritos de artista siguen coincidiendo por su nombre. `counts` refleja el conjunto filtrado.
- El editor de la Tarjeta de Identidad muestra los tres slots apilados a lo ancho (en lugar de tres columnas), con la acción "Quitar" junto al elemento elegido y tipografías mayores; el selector usa filas más altas y texto de tamaño de lectura.
- Efecto secundario deseado: el buscador de la página de Favoritos (propia y ajena) también encuentra por artista.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `favorites`: el parámetro `q` de la lista de favoritos busca también por el nombre del artista acreditado de álbumes y canciones.

## Impact

- `src/services/favorites/favorites.ts` (`listMyFavorites`, `listUserFavorites`) y su test; sin migraciones ni cambios de contrato en las formas de respuesta.
- `src/components/profiles/FavoritePicker.tsx`, `OwnerIdentityCardEditor.tsx` y sus tests.
- `docs/05-features/user-profile.md` y la documentación de favoritos que describa `q`.
