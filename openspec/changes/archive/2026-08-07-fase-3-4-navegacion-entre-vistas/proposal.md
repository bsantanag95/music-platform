## Why

La Fase 3 ya permite buscar artistas y consultar sus perfiles y álbumes, pero el recorrido
entre esas vistas todavía no está completo: el usuario debe volver atrás o escribir URLs para
continuar explorando. La Etapa 3.4 cierra el catálogo navegable antes del pulido de la Etapa
3.6, manteniendo el locale activo y haciendo explícita la relación entre álbumes y artistas.

## Goals

- Conectar búsqueda, perfil de artista y detalle de álbum mediante enlaces locale-aware.
- Permitir navegar desde un crédito destacado de una canción al perfil del artista acreditado.
- Añadir un encabezado global con acceso al buscador y selector de idioma.
- Mostrar breadcrumbs localizados y navegables desde el inicio hasta el artista y el álbum.
- Ampliar el read-model de álbum para incluir el artista principal del `release_group`, sin
  inferirlo en componentes de presentación.

## Non-Goals

- Crear la página de detalle de canción o el endpoint de recording; permanece diferida a Fase 4.
- Implementar autenticación, ratings, comentarios o funciones sociales.
- Resolver el pulido responsive, boundaries globales y estados de carga de la Etapa 3.6.
- Traducir nombres de álbumes, canciones, artistas o créditos musicales.

## What Changes

- Crear la capacidad de navegación cruzada entre las vistas públicas del catálogo.
- Modificar el read-model de detalle de álbum para devolver el artista principal asociado.
- Convertir los créditos destacados del tracklist en enlaces a perfiles de artista.
- Añadir `Header` global con enlace al buscador y cambio de locale preservando la ruta actual.
- Añadir breadcrumbs localizados para las páginas de artista y álbum.
- Cubrir con tests la preservación de locale, los enlaces de créditos y los breadcrumbs.

## Capabilities

### New Capabilities

- `cross-view-navigation`: navegación locale-aware entre búsqueda, artistas, álbumes y créditos,
  con encabezado global y breadcrumbs.

### Modified Capabilities

- `catalog-album`: el read-model incluye el artista principal y los créditos destacados pasan
  de texto sin enlace a enlaces locale-aware hacia sus perfiles.
- `catalog-artist`: la navegación desde las tarjetas de discografía forma parte del flujo
  completo y el perfil incorpora el breadcrumb y el encabezado global.

## Impact

- Frontend: `Header`, breadcrumbs, `AlbumCard`, `TrackList`, layouts y mensajes localizados.
- Catálogo: `src/services/catalog/album-detail.ts` y sus tipos de read-model.
- Tests: componentes, página de álbum, página de artista y navegación entre locales.
- Documentación: contrato de navegación de catálogo y plan de implementación de la Fase 3.
- Dependencias: ninguna nueva; se reutilizan `next-intl` y la navegación existente del proyecto.
