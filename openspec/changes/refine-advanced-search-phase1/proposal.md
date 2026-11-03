## Why

Primera fase del rediseño de la búsqueda avanzada (auditoría del 2026-11-03, respuestas recomendadas). Los filtros traen lo
que piden, pero el recorrido no acompaña: tras buscar, el formulario sigue abierto y el primer resultado queda a 839 px en
escritorio y a 1.163 px en móvil; el encabezado repite "Resultados" sin decir qué se buscó; sin coincidencias solo dice
"prueba quitando alguno"; una búsqueda amplia muestra a la vez "más de 1000" y "Hay 14514 resultados"; y las canciones
sin título reutilizan el bloque de mejor coincidencia ("Álbumes que contienen «Separator»").

## What Changes

- Con una búsqueda en curso, el formulario se recoge en una barra de criterios: una pastilla por criterio que lo quita y
  "Editar búsqueda", que abre el formulario. En todas las anchuras.
- El encabezado de resultados dice la cifra y qué se cuenta ("53 grupos", "14.514 álbumes"), con separador de miles y
  sin el tope "más de 1000".
- Sin coincidencias: un enlace por criterio para quitarlo con la cifra que daría (de 2 a 4 criterios; la cifra llega por
  streaming) y, con nombre, la misma búsqueda en la búsqueda rápida.
- Búsqueda amplia: el aviso ya no repite la cifra; sugiere qué campos agregar y cada sugerencia abre el formulario en ese
  campo.
- Canciones sin título: lista simple, sin bloque de mejor coincidencia.

## Capabilities

### Modified Capabilities

- `advanced-search-filters`: barra de criterios, encabezado, estado sin coincidencias, búsqueda amplia y canciones sin
  título.

## Impact

`src/app/[locale]/(catalog)/search/advanced/page.tsx`, `sections.tsx`, `SearchChrome.tsx`, `SongResults.tsx`,
componentes nuevos en `src/components/catalog/advanced-search/` (barra de criterios, disclosure del formulario,
alternativas sin coincidencias), `filters.ts` (`criterionChips`, `removeCriterion`), mensajes es/en, tests y
`docs/05-features/catalog-browsing.md`. Sin cambios de esquema ni de API.
