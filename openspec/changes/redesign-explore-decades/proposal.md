## Why

"Explorar por década" es un histograma del catálogo: una barra por década con el número de álbumes encima (588 en los 50s,
15.117 en los 2010s). Ese número es lo que la base ha guardado, no lo que se publicó: crece con cada artista que alguien abre,
sesga la lectura ("los 2010s fueron la mejor década") y deja la década en curso siempre incompleta. Es la misma lección de
"Explorar por género" (cambio `visual-genre-families`): la sección es un punto de entrada para elegir una época, no un tablero,
y hoy es la única de `/explore` sin una sola carátula. Además, la lista "Antes" ocupa un tercio del gráfico para decir que hay 2
álbumes en los 1910s, y al entrar a una década solo se puede cambiar de década: no hay forma de ir a un año ni a un género
dentro de ella, y el orden por defecto apila el último año de la década.

## What Changes

- **El histograma se reemplaza por tarjetas de mosaico**, una por década, con el mismo lenguaje visual que las familias de
  géneros: hasta cuatro carátulas de discos de estudio de la década con su nombre ("1990s") encima, **sin número de álbumes ni
  barra**. Las carátulas se eligen por la señal de calidad de las colecciones y son estables entre visitas.
- Las décadas van de la más reciente a la más antigua. Desde 1950 son tarjetas de la grilla; las anteriores (1890s–1940s) quedan
  detrás de una tarjeta "Décadas anteriores", sin cifras (una década sin carátulas se muestra plana).
- **La sección sube**: pasa a ir justo después de "Explorar por género" (los dos ejes del catálogo juntos, antes de los feeds con
  fecha) y la navegación rápida sigue ese orden.
- **Vista de década** (`/explore?decada=1990`):
  - una fila de **años** (1990 … 1999, solo los que tienen álbumes, más "Toda la década") que filtra con `?anio=`;
  - una fila de **géneros de la década** (hasta 12 chips, sin cifras) enlazados a la página del género ya filtrada por esa
    década;
  - el selector de otras décadas pasa a un desplegable cerrado, como el de familias;
  - el orden "Destacados" deja de desempatar por año descendente dentro de una década, para no llenar la grilla del último
    año.
- Se retira el componente `DecadeHistogram` y los textos de conteo (`decadeBarLabel`, `decadesEarlier`).

Fuera de alcance:

- Combinar década con familia o género en el mismo listado (p. ej. "Rock de los 90"): el contrato sigue siendo un corte a la
  vez; el chip de género lleva a la página del género, que ya filtra por década. Si más adelante se quiere el cruce dentro de
  Explorar, es otro cambio.
- Cambiar qué décadas existen, el listado de álbumes sin filtros nuevos o el orden "Populares".
- Seleccionar a mano las carátulas de cada década.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `album-discovery`: la sección de décadas pasa a ser un mosaico sin cifras y sube junto a géneros; la vista de década
  gana años y géneros y cambia su desempate; la navegación rápida sigue el orden nuevo.

## Impact

- `src/components/discovery/FamilyGrid.tsx` → se generaliza como `MosaicGrid` (ids propios) y lo usan géneros y décadas;
  `DecadeHistogram.tsx` se elimina; `FilteredAlbumList.tsx` gana la fila de años y el parámetro de miga de pan; pruebas.
- `src/services/discovery/`: `decade-covers.ts` y `decade-genres.ts` nuevos (consulta con ventana y caché en memoria, como
  `family-covers.ts` / `family-genres.ts`); `discovery.ts` (`ExplorePage.decades` lleva carátulas, `listDecadeYears`, filtro
  `year`, orden sin año en una década); `explore-params.ts` si aplica.
- `src/app/[locale]/(catalog)/explore/page.tsx` y mensajes `catalog.json` (es/en).
- Docs: `docs/05-features/explore.md`. Sin migraciones ni cambios de API.
