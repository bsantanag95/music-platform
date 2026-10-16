## Why

La vista que se abre al elegir una familia de géneros (`/explore?familia=rock`) es un listado plano: un título, veinte chips con
todas las familias en dos filas, los filtros de tipo y una rejilla de 24 discos. Probándola con el contenido real:

- **El orden "Mejor valorados" no ordena por valoración.** Solo 32 discos de toda la base tienen valoraciones, así que en la
  práctica sale por año descendente: el primer disco de Rock es *Sacrosanct* (fecha 2027, aún sin salir), seguido de sencillos,
  remixes y conciertos. De los 17.317 discos de Rock, 3.373 son de estudio; quien entra ve lo último que se ingestó, no lo mejor.
- **No hay contexto ni camino hacia dentro.** No hay forma de afinar por subgénero (hard rock, post-punk, shoegaze…) y la página
  completa de cada género (`/genre/rock`, con "Sobre el género", subgéneros, artistas y listas) no está enlazada desde aquí: son dos
  páginas paralelas para lo mismo y la pobre es a la que llega quien elige una tarjeta de familia.
- **Ruido arriba.** Veinte chips de familia ocupan dos filas antes del primer disco, y un rótulo "FAMILIA DE GÉNEROS" va sobre
  el título (el sistema de diseño no lo permite: sin eyebrow sobre el encabezado).

## What Changes

- **Orden por defecto con sentido ("Destacados")**: el orden compartido de los listados pasa a ser valoración de la comunidad (con
  umbral) → premio ganador/nominado → discos de estudio antes que sencillos, recopilaciones y directos → carátula ya resuelta →
  año descendente → id, y **los lanzamientos futuros van al final**. La opción del selector deja de llamarse "Mejor valorados" (no
  lo es) y pasa a "Destacados" / "Featured".
- **Géneros de la familia**: una fila de hasta 12 chips con los géneros más grandes de la familia, cada uno hacia su página
  (`/genre/<slug>`), de modo que la ficha completa queda a un clic y los subgéneros son la forma natural de seguir navegando.
- **Cabecera sin rótulo**: se quita el "FAMILIA DE GÉNEROS" sobre el título de los listados de década, familia y género (la miga de pan
  ya dice dónde estás).
- **Selector de familias plegado**: los veinte chips pasan a un desplegable "Otras familias" bajo los géneros, cerrado por defecto,
  para que el primer disco quede a la vista.

Fuera de alcance:

- Los listados de década, novedades y próximos (solo les afecta el nuevo orden por defecto y la cabecera sin rótulo).
- La página de género y su contenido.
- Resolver carátulas por adelantado: las que no están resueltas se piden al mostrarse (con lo que las tarjetas se llenan de a
  poco); el nuevo orden solo sube las ya resueltas.
- Una descripción escrita a mano por familia (los géneros más grandes dicen qué hay dentro sin texto que mantener).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `album-discovery`: el orden por defecto de los listados filtrados y su etiqueta, y la vista de familia (géneros de la familia,
  cabecera sin rótulo, selector de familias plegado).

## Impact

- `src/services/discovery/discovery.ts` (orden compartido), `src/services/discovery/family-genres.ts` (nuevo) y un helper de caché con
  TTL compartido con `family-covers.ts`.
- `src/components/discovery/FilteredAlbumList.tsx` (sin rótulo, géneros, selector plegable) y `ExploreFilterBar.tsx` (etiqueta).
- `src/app/[locale]/(catalog)/explore/page.tsx` y mensajes `catalog.json` (es/en).
- La pestaña de álbumes de la página de género comparte el orden "best": cambia igual.
- Docs: `docs/05-features/explore.md`. Sin migraciones ni cambios de API.
