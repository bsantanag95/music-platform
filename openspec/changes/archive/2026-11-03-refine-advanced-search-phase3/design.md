## Decisions

### D1. Años y lugar desde la propia búsqueda

La búsqueda de artistas de MusicBrainz ya trae `life-span` y `begin-area`. `searchArtists` guarda el resultado remoto en
cada entrada y la ficha local manda: un stub sin ficha toma de ahí el año de inicio, el de fin (solo si terminó) y la
ciudad o región. Sin requests nuevas y sin escribir esos datos en el stub (la ficha se completa al visitar el artista).

### D2. Duración del grupo de canciones

Un grupo junta grabaciones de distinta duración. Se muestra la de la primera grabación remota que la trae (el orden de
MusicBrainz, el mismo que elige la grabación del grupo) o, sin remotas, la de la local más presente.

### D3. Destacados como datos

`highlightFields(type, criteria)` traduce los criterios a los datos de la fila que filtran (en `filters.ts`). Las filas
reciben la lista y marcan sus segmentos (`MetaLine`); la búsqueda rápida no la pasa y se ve igual que antes.

### D4. Tabla prerenderizada y vista en el cliente

La vista elegida vive en `localStorage`, que el servidor no lee: la sección renderiza la lista y la tabla de la primera
página y `ResultsViewSwitch` (cliente) muestra una u otra. Con Tabla, la lista sigue debajo de `md` (la tabla no cabe en
un teléfono). "Cargar más" lee la vista del contexto y agrega tablas sin encabezado con las mismas columnas
(`table-fixed` y anchos fijos), así quedan alineadas. Sin orden por columna.
