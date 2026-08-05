## Why

La Etapa 3.1 (vista de búsqueda) se construyó con todos los textos hardcodeados en español, rutas en español (`/buscar`, `/artista/[id]`) y sin soporte de internacionalización. Antes de avanzar a la Etapa 3.2 (perfil de artista) y las siguientes, es necesario introducir el sistema de idiomas para no repetir el mismo retrofit sobre cada componente nuevo. El producto requiere soporte de español e inglés desde el lanzamiento, con una arquitectura extensible a futuros locales sin tocar componentes ni rutas.

## What Changes

- **BREAKING**: Las rutas de página pasan de `/buscar` y `/artista/[id]` a `/search` y `/artist/[id]`, bajo un segmento `[locale]` (`/es/search`, `/en/artist/...`). La ruta `/` redirige al locale por defecto (`/es`).
- **BREAKING**: Los componentes `ErrorState` y `EmptyState` pasan a requerir `title` y `description` como props obligatorios, sin valores por defecto hardcodeados.
- Se instala `next-intl` y se configura como motor de internacionalización.
- Se crea la infraestructura de i18n: `src/i18n/` (routing, request, navigation), `src/middleware.ts`, y catálogos de mensajes en `messages/{locale}/`.
- Todos los strings visibles al usuario se extraen a `messages/{locale}/{namespace}.json`.
- La navegación programática usa el wrapper locale-aware de `src/i18n/navigation.ts`.
- Los tests de componente usan `renderWithIntl()` y el test de consistencia de claves entre locales se agrega al gate de QA.
- Se documenta explícitamente que los datos del catálogo musical (nombres de artistas, álbumes, canciones, biografías) **no se traducen** — i18n aplica solo al chrome de la interfaz.

## Capabilities

### New Capabilities
- `i18n-routing`: Segmento `[locale]` en la URL, middleware de detección, navegación locale-aware, y configuración de next-intl para Server y Client Components.
- `i18n-messages`: Catálogos de mensajes por locale organizados por dominio (`common`, `catalog`, `errors`), con test de consistencia de claves entre locales.
- `i18n-ui-components`: Componentes de UI agnósticos de i18n (reciben texto traducido vía props requeridas) y componentes de dominio responsables de resolver traducciones.

### Modified Capabilities
- `catalog-search`: La ruta `/buscar` se renombra a `/search` y pasa bajo `[locale]`. Los strings del formulario de búsqueda se externalizan a catálogos de mensajes. La navegación a perfil de artista usa slugs neutros en inglés.

## Impact

- **Rutas**: `src/app/` se reestructura bajo `src/app/[locale]/`. Las rutas de API (`/api/catalog/*`) no cambian.
- **Dependencias**: Se agrega `next-intl` a `package.json`.
- **Configuración**: `next.config.mjs` recibe el plugin de next-intl.
- **Componentes afectados**: `SearchForm.tsx`, `ErrorState.tsx`, `EmptyState.tsx`, `Skeleton.tsx`, `layout.tsx`, `page.tsx`, `buscar/page.tsx`, `providers.tsx`.
- **Tests**: `SearchForm.test.tsx` migra a `renderWithIntl()`. Se agrega `src/test/i18n-test-utils.tsx` y test de consistencia de mensajes.
- **Documentación**: `business-rules.md`, `catalog-browsing.md`, `code-walkthrough.md`, `docs/README.md`, `frontend-plan/README.md`, `02-implementation-plan.md`.
