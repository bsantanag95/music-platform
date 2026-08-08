## Why

Las vistas públicas de búsqueda, artista y álbum ya forman un recorrido navegable, pero la
Fase 3 todavía necesita cerrar sus estados de carga, error, responsive y accesibilidad antes
de validarse con usuarios. La disponibilidad transitoria de Cover Art Archive también puede
dejar tarjetas rotas aunque la URL cacheada sea válida, por lo que ahora corresponde añadir
resiliencia limitada sin introducir almacenamiento propio.

## Goals

- Dejar el catálogo navegable listo para revisión manual en escritorio y móvil.
- Ofrecer estados localizados y consistentes durante carga, ausencia de datos y errores.
- Tolerar fallos transitorios de carátulas mediante reintentos acotados y fallback estable.
- Mantener el alcance de solo lectura y la arquitectura existente.

## Non-Goals

- Crear una página de detalle de canción o el endpoint de recording.
- Implementar autenticación, ratings, comentarios o funciones sociales.
- Añadir CDN, proxy, almacenamiento propio o analytics de imágenes.
- Implementar manifest, service worker o cualquier otra capacidad PWA.
- Modificar el contrato REST, el esquema SQL o la política de resolución de carátulas.

## What Changes

- Añadir boundaries localizados de error y not-found bajo el segmento `[locale]`.
- Añadir estados `loading.tsx` para las rutas públicas de búsqueda, artista y álbum.
- Consolidar skeletons, placeholders y estados vacíos para que no haya pantallas en blanco.
- Añadir reintentos limitados con backoff a la carga visual de carátulas, con fallback definitivo
  al agotar los intentos y sin loops de requests.
- Ajustar las tres vistas y sus componentes para uso mobile-first, sin overflow horizontal ni
  contenido cortado.
- Auditar y corregir labels, textos alternativos, estados ARIA, foco y contraste básico.
- Confirmar la configuración de `next/image` para los hosts reales de carátulas.
- Cubrir los nuevos estados y regresiones con tests y actualizar la documentación de la Fase 3.

## Capabilities

### New Capabilities

- `catalog-view-states`: estados localizados de carga, error, not-found, vacío y fallback para
  las vistas públicas del catálogo, incluyendo los requisitos básicos de responsive y
  accesibilidad del cierre de Fase 3.

### Modified Capabilities

- `catalog-artist`: la carga progresiva de carátulas incorpora reintentos limitados, backoff,
  placeholder durante el reintento y fallback definitivo sin bloquear la discografía.
- `catalog-album`: la carátula del detalle debe degradar de forma estable ante errores de carga,
  manteniendo visible el tracklist y los controles de navegación.

## Impact

- Frontend: rutas bajo `src/app/[locale]`, componentes de catálogo y UI compartida.
- Configuración: `next.config.mjs` para permitir los hosts necesarios de `next/image`.
- Mensajes: catálogos `messages/es` y `messages/en` para estados y accesibilidad.
- Tests: componentes, páginas y boundaries localizados.
- Documentación: plan de implementación, riesgos y walkthrough si los estados observables
  cambian.
- No se añaden dependencias, migraciones SQL ni cambios a endpoints REST.
