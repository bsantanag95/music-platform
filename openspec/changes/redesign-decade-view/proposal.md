## Why

La vista de una década (`/explore?decada=1980`), tal como quedó en `redesign-explore-decades`, lleva a la época pero no dice qué es ni qué
se está viendo. Revisada en pantalla:

- **Demasiados controles antes del contenido:** años, géneros, "Otras décadas", tipo y orden son cinco filas; el primer disco empieza
  a ~444 px de un viewport de 800 y, en móvil, los géneros ocupan cuatro filas.
- **Los chips de género prometen una cosa y hacen otra:** los años filtran la misma lista, pero un género te saca a la página del
  género. Se ven como controles hermanos, sin rótulo en ninguna fila, así que no se sabe qué filtra cada uno ni que uno te hace salir.
  Era justo el cruce década × género que dejamos fuera de ese cambio, y es donde más se nota su falta.
- **Sin propósito ni contexto:** solo un título y una grilla. No dice cómo se ordenó, y "Destacados" sugiere curaduría cuando con tan
  pocas valoraciones el orden es casi por id (en los 1980s abre con Sonic Youth antes que Pink Floyd).
- **Detalles que chirrían:** en los 1980s los primeros chips son ópera, sinfonía y clasicismo musical (ordenados por tamaño); en los
  2020s hay un chip "2027" con solo discos por salir; en los 1910s (2 sencillos) siguen "De estudio" y "Compilaciones", que llevan a un
  estado vacío; y "los 1980s" suena a anglicismo en español.

## What Changes

- **Los géneros de la década filtran en el sitio** (`?decada=1980&genero=hard-rock`): década × género dentro de Explorar, con año y
  tipo combinables. El año, el género, el tipo y el orden se conservan al cambiar cualquiera de los demás; al cambiar de década se
  conservan el género, el tipo y el orden. El enlace a la página completa del género pasa a ser un vínculo explícito bajo el título.
- **Tres filas de controles en vez de cinco, con rótulo:** "Año" (con "Otras décadas" al final de la misma fila, como menú), "Género"
  y la barra de tipo y orden. Los géneros pasan a una sola fila desplazable en móvil.
- **Cabecera de época:** el título, una línea que explica el orden ("Premiados y mejor valorados primero; con pocas valoraciones, el
  orden es estable pero no un ranking") y, a la derecha, el mosaico 2×2 de la tarjeta de la portada (mismas carátulas, sin consulta
  nueva) que da continuidad con lo que se tocó. Sin mosaico en móvil.
- **Géneros ordenados por familia**, en el orden de la taxonomía (Rock, Metal, Pop… Clásica al final) y por tamaño dentro de cada
  una, en lugar de solo por tamaño. La selección (12, tope de 3 por familia) no cambia.
- **Pulido:** un año con solo discos por salir no aparece como chip; los tipos sin discos en el corte se muestran deshabilitados; en
  español la década se nombra "Años 80" (no "1980s") en tarjetas, miga, título y chips.

Fuera de alcance:

- El cruce década × familia (la fila de géneros ya cubre el cruce por género, y la familia sigue siendo un corte aparte).
- Cambiar el orden "Destacados", la selección de géneros, las carátulas de la portada o la vista de familia.
- Cambiar cómo se nombra la década en la página de género, las colecciones o el perfil.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `album-discovery`: el listado de década admite `genero` como refinamiento (década × género), la vista de década gana rótulos, cabecera,
  menú de otras décadas en la fila de años, tipos deshabilitados y años publicados, la fila de géneros se ordena por familia, y la
  década se nombra "Años 80" en español.

## Impact

- `src/services/discovery/discovery.ts`: `ExploreListOptions` admite `decade`; `listDecadeYears` solo cuenta años con discos
  publicados; nueva `listCategoriesIn` (tipos con discos en un corte). `decade-genres.ts` devuelve la familia de cada género y los
  ordena por la taxonomía. `decade-label.ts` nuevo (nombre de la década por idioma).
- `src/components/discovery/`: `FilteredAlbumList` (filas de faceta con rótulo, cabecera, miga de varios niveles, acción de vacío),
  `ExploreFilterBar` (tipos deshabilitados), `MosaicGrid` (etiqueta de la década) y pruebas.
- `src/app/[locale]/(catalog)/explore/page.tsx` y mensajes `catalog.json` (es/en).
- Docs: `docs/05-features/explore.md`, `docs/04-api/contracts.md`. Sin migraciones ni cambios de API.
