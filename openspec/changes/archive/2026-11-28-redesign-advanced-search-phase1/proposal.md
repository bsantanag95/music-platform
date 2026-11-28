## Why

La auditoría de `/search/advanced` sin sesión (28 nov 2026, `mockups/advanced-search-2026-11/index.html`) encontró una página
funcional, pero con varios problemas de presentación:

- **Marco y título:** usa 1024 px de ancho y un título de 24 px, mientras que `/search` ya usa el marco de 88rem.
- **Desplegables para pocas opciones:** Tipo y Estado tienen 3 o 4 opciones escondidas en un desplegable nativo.
- **El aviso que más pesa es el menos visible:** «Del catálogo», que convierte la búsqueda en solo-catálogo, va en letra
  monoespaciada de 11 px.
- **Letra pequeña:** hay 10 textos de menos de 12 px.

Se eligió **C · Facetas con las pastillas de A** (filtros en una columna, resultados primero y una hoja de filtros en el
teléfono), en tres fases. Esta es la fase 1: el marco y los controles, sin cambiar todavía dónde va el formulario.

## What Changes

- **Marco de 88rem** con los márgenes del sitio y título de página en la escala de las páginas rediseñadas. El contenido de
  la página queda alineado con `/search`.
- **Pestañas en pastillas**, como en `/search`.
- **Elecciones cortas como pastillas:** Tipo de artista (Cualquiera · Grupo · Solista · Otras personas) y Estado
  (Cualquiera · En actividad · Ya no) pasan de desplegable a botones de radio con forma de pastilla. El Tipo de lanzamiento
  (Álbumes y Canciones) pasa de casillas a pastillas que se marcan y desmarcan. Siguen siendo campos del mismo formulario
  GET (funcionan sin JavaScript) y escriben los mismos parámetros.
- **«Del catálogo» visible:** el grupo lleva una etiqueta «solo lo ya cargado» junto a su título, y su ayuda pasa de 11 px a
  texto legible.
- **Letra mínima de 12 px** en ayudas, contadores y etiquetas del formulario y de sus ejemplos.

## Goals

- Alinear la avanzada con el marco y la escala del resto del sitio.
- Ver las opciones cortas sin abrir un desplegable.
- Que quede claro qué campos solo buscan en el catálogo.

## Non-Goals

- Mover el formulario a una columna lateral y mostrar los resultados primero (fase 2).
- La hoja de filtros del teléfono y los atajos de década (fase 3).
- Cambiar parámetros de URL, criterios, el servicio o el endpoint.
- Cambiar el Rol de una persona (6 opciones, sigue siendo desplegable) o el selector de países.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `advanced-search-filters`: «Formulario agrupado» (pastillas para elecciones cortas, etiqueta visible del catálogo, letra mínima) y «Página de búsqueda avanzada con pestañas» (marco ancho y pestañas en pastillas).

## Impact

- `src/app/[locale]/(catalog)/search/advanced/page.tsx` y `loading.tsx` (marco, título, pestañas).
- `src/components/catalog/advanced-search/AdvancedSearchForm.tsx` (pastillas, grupo del catálogo, tamaños), `AdvancedSearchLanding.tsx` (tamaños) y sus tests.
- `messages/{es,en}/catalog.json` si cambia algún texto (etiqueta del catálogo).
- Sin cambios de URL, API, esquema ni dependencias. La Ayuda no describe estos controles.
