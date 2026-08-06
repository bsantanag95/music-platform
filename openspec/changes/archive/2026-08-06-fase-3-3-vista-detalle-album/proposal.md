## Why

La Fase 3 ya permite buscar artistas y explorar su discografía, pero las tarjetas todavía no conducen a una vista de álbum funcional. Hace falta mostrar el tracklist completo, sus duraciones, créditos y carátula para cerrar el catálogo navegable y validar el modelo musical contra álbumes reales.

La carga inicial debe seguir el patrón de Server Components y compartir la misma lectura completa entre la página y el endpoint REST, evitando duplicar consultas y reglas de ordenamiento.

## Goals

- Exponer el detalle localizado de un álbum en `/{locale}/album/{id}`.
- Construir un read-model interno con `release_group`, edición seleccionada, carátula, tracks y créditos.
- Reutilizar ese read-model desde el Server Component y el endpoint REST.
- Mostrar el tracklist agrupado visualmente por disco, ordenado por disco y posición.
- Mantener los créditos visibles como texto, dejando sus enlaces para la Etapa 3.4.

## Non-Goals

- Crear enlaces de créditos hacia perfiles de artistas; corresponde a la Etapa 3.4.
- Crear selector de ediciones alternativas.
- Crear la página de canción o el endpoint de recording; corresponde a la Fase 4.
- Crear `error.tsx`, breadcrumbs, selector de idioma o el pulido global de la Etapa 3.6.
- Cambiar el shape público del endpoint REST si el read-model permanece interno.

## What Changes

- Crear la capacidad de detalle de álbum `catalog-album`.
- Crear un servicio/read-model compartido para resolver el álbum completo.
- Garantizar en SQL el orden estable por `disc_number` y `position`.
- Crear la página Server Component `/[locale]/album/[id]`.
- Crear `TrackList` con agrupación por disco, posición, título, duración y créditos.
- Crear `AlbumCover` usando únicamente la carátula proporcionada por el backend.
- Agregar el namespace `album` a los catálogos de mensajes de español e inglés.
- Sincronizar `TrackSchema` para conservar `recordingId`, ya presente en la respuesta REST.
- Cubrir álbum válido, álbum inexistente, álbum sin ediciones, duración nula, créditos y carátula ausente.

## Capabilities

### New Capabilities

- `catalog-album`: detalle localizado de álbum con edición seleccionada, tracklist agrupado por disco, duraciones, carátula y créditos visibles.

### Modified Capabilities

- Ninguna. La capacidad `catalog-artist` ya prepara los enlaces hacia `/album/{id}` y no cambia sus requisitos.

## Impact

- Servicios de catálogo: nuevo read-model de detalle y reutilización desde el endpoint existente.
- API REST: se conserva el payload público actual; `recordingId` se refleja en el schema frontend porque ya forma parte del contrato efectivo.
- Frontend: nueva ruta y componentes de catálogo para el detalle del álbum.
- Mensajes localizados: nuevos textos del namespace `album`.
- Pruebas: nuevas pruebas unitarias/de componentes y smoke test de catálogo si se modifica la capa de servicios.
- Documentación: actualizar solo el contrato REST y documentos técnicos si cambia el payload público; documentar el read-model como implementación interna.
