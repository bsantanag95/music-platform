## Why

La búsqueda de la Etapa 3.1 ya permite encontrar artistas, pero el catálogo todavía no ofrece una vista para conocer su información ni recorrer su discografía. La Etapa 3.2 completa ese siguiente paso del flujo público del catálogo y permite validar la ingesta de artistas completos y artistas stub antes de construir el detalle de álbum.

## Goals

- Ofrecer un perfil público de artista en `/{locale}/artist/{id}`.
- Mostrar identidad del artista y su discografía agrupada por categoría.
- Mantener la experiencia disponible en español e inglés sin traducir datos musicales provenientes de MusicBrainz.
- Cargar las carátulas de los álbumes progresivamente, sin bloquear el render inicial.
- Convertir artistas inexistentes en un 404 amigable y artistas stub en perfiles enriquecidos.

## Non-Goals

- No modificar el backend ni los contratos REST existentes.
- No modificar el esquema de base de datos ni crear migraciones.
- No implementar todavía el detalle de álbum, tracklist o créditos de la Etapa 3.3.
- No agregar autenticación, ratings, favoritos ni otras funciones sociales.

## What Changes

- Crear la ruta localizada del perfil de artista como Server Component.
- Crear los componentes `ArtistHeader`, `AlbumGrid`, `AlbumCard` y `LazyCoverImage`.
- Mostrar nombre, tipo, biografía opcional, foto opcional y discografía agrupada en estudio, singles/EP, compilaciones y directos/otros.
- Agregar el namespace `artist` a los catálogos de mensajes español e inglés.
- Resolver carátulas mediante el endpoint y las utilidades existentes, con fallback visual cuando no estén disponibles.
- Agregar pruebas de componentes y validaciones para artista válido, inexistente, stub y datos opcionales.

## Capabilities

### New Capabilities

- `catalog-artist`: perfil localizado de artista con información básica, discografía agrupada, estados de ausencia y carga progresiva de carátulas.

### Modified Capabilities

No se modifican requisitos de capacidades existentes.

## Impact

- Frontend: nueva página y componentes bajo `src/app/[locale]/(catalog)` y `src/components/catalog`.
- Mensajes: `messages/es/catalog.json` y `messages/en/catalog.json`.
- Pruebas: nuevas pruebas de componentes y comportamiento de carga progresiva.
- Backend: solo se consumen `getArtistById`, `findOrIngestDiscography` y el endpoint existente de detalle de release group; no se cambia su contrato.
- Documentación: se actualizará el estado de la Etapa 3.2 en el plan frontend al finalizar la implementación.
