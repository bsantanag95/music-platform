## Why

En el panel de búsqueda del header se cortaba el tipo, justo la palabra que distingue la opción, y la fila de tipos se partía
en dos. En los formularios avanzados las casillas blancas eran lo que más brillaba, los campos casi no se distinguían de la
tarjeta, "Cualquiera" parecía un valor elegido, quedaban celdas vacías, había ayudas que repetían la etiqueta y términos
internos a la vista, y se ofrecía limpiar un formulario vacío.

## What Changes

- Panel: "Buscar «texto» en tipo" (se corta el texto, no el tipo); "Otro tipo" y "Búsqueda avanzada →" en una fila y los tipos juntos en la siguiente.
- Formularios: casillas oscuras (`.form-check`), campos con fondo más oscuro, selectores sin elección atenuados y alineados.
- Grupos de tres campos en tres columnas en pantallas anchas; títulos de grupo en gris y con menos aire.
- Textos: sin ayudas que repiten la etiqueta, "Desde"/"Hasta", "Coincidencia exacta", intro más corta, sin "MusicBrainz" ni "explorada" a la vista.
- Sin criterios no se muestran la cifra ni "Limpiar".

## Capabilities

### Modified Capabilities
- `advanced-search-filters`: presentación del formulario y de la fila de envío.
- `search-typeahead`: textos y disposición de las acciones del desplegable.

## Impact

`AdvancedSearchForm.tsx`, `ScopedSearchField.tsx`, `globals.css`, mensajes `catalog.search`, tests y
`docs/05-features/catalog-browsing.md`. Sin cambios de API ni de esquema.
