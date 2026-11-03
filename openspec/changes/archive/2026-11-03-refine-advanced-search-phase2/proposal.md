## Why

Segunda fase del rediseño de la búsqueda avanzada (auditoría del 2026-11-03, respuestas recomendadas). El formulario mezcla
anchos y ubicaciones: "Nombre" es más angosto que el resto porque la casilla de coincidencia exacta va a su lado, la ayuda
de "Año de inicio" va arriba y la de "Ciudad" abajo, el selector de países usa otra tipografía y nada agrupa los campos.
En móvil el botón "Buscar" queda a 1.026 px. Los errores de los años salen en el globo del navegador y un valor de la URL
que no se entiende (`category=live`) se ignora sin aviso. Sin campos, la página es solo un formulario: no muestra qué
resuelve ni las búsquedas hechas.

## What Changes

- Campos agrupados con nombre: Artistas en Identidad · Origen · Época; Álbumes y Canciones en Identidad · Lanzamiento.
  Todos del mismo ancho y alineados, la coincidencia exacta bajo su campo y las ayudas siempre bajo el control.
- En móvil, la fila de envío queda fija abajo con la cantidad de criterios ("3 criterios · Limpiar · Buscar").
- Validación propia en español (año de 4 dígitos, "desde" posterior a "hasta", duración `m:ss`) con el mensaje bajo el
  campo; sin JavaScript sigue la validación del navegador.
- Aviso de los valores de la URL que no se reconocen y se ignoraron.
- Sin campos: tres ejemplos por pestaña y las búsquedas avanzadas recientes, guardadas en el navegador.

## Capabilities

### Modified Capabilities

- `advanced-search-filters`: formulario agrupado, envío fijo en móvil, validación, aviso de valores ignorados, ejemplos
  y recientes.

## Impact

`AdvancedSearchForm.tsx`, `CountryMultiPicker.tsx`, `SearchablePicker.tsx` (`inputClassName`), página
`search/advanced/page.tsx`, componentes nuevos `AdvancedSearchLanding.tsx` y `advanced-examples.ts`,
`src/lib/search/recent-advanced-searches.ts`, `filters.ts` (`ignoredParams`, `validateAdvancedForm`), mensajes es/en,
tests y `docs/05-features/catalog-browsing.md`. Sin cambios de esquema ni de API.
