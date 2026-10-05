## Why

La página de género (`redesign-genre-page`) sirve para **explorar** un género, pero no para **descubrir artistas nuevos** dentro de él: la pestaña Artistas ordena por álbumes del género (en prog rock salen Pink Floyd con 211 y Queen con 152 antes que cualquier banda pequeña), las tarjetas no dicen qué conoce ya la persona, no hay filtros propios de artista (país, debut, tamaño de la discografía) y la tarjeta no da ninguna razón para entrar. El objetivo del producto es que la app sea ideal para encontrar bandas y artistas nuevos de los géneros que a uno le interesan; este cambio cierra esa brecha con lo que el catálogo y los datos de comunidad **ya** tienen. La única migración es técnica y no cambia ningún comportamiento: materializa la herencia de géneros para que las páginas de género sigan rápidas cuando el catálogo crezca (ver más abajo).

Una medición de la base real (2026-10-05) condiciona el diseño: de 668 artistas con género, solo **31 (4,6 %)** tienen la discografía recorrida entera; 531 no tienen ningún disco propio en el catálogo. Sin ese dato no se puede saber el debut ni el tamaño de la discografía, así que el cambio también **completa las discografías** (en segundo plano al usarse la página y con un relleno operativo para las ya existentes) y nunca presenta un artista sin explorar como si fuera «corto».

## What Changes

- **Tarjeta de artista con relación personal** (solo con sesión): botón **Seguir / Siguiendo** en la propia tarjeta y marca **«Ya lo conoces»** cuando la persona sigue al artista, valoró o escuchó (diario) algo suyo, o lo tiene en favoritos o pendientes.
- **Disco destacado por tarjeta**: el álbum del artista, dentro del género, que da una razón para entrar (el mejor valorado con comunidad suficiente o, si no hay, el más reciente), con título, año y enlace.
- **Filtros propios de artista** en la pestaña Artistas: país, década de debut, «discografía corta» y, con sesión, «que aún no conozco».
- **Dos órdenes nuevos**: `recientes` (debut más reciente primero) y `descubrir` (emergentes con señal de comunidad primero). El orden predeterminado **no cambia** (sigue siendo por álbumes del género: es la lectura de referencia «¿quiénes son los centrales de este género?»).
- **Riel «Para descubrir»** en el Resumen: artistas del género con discografía completa y corta y debut conocido, sin los que la persona ya conoce (el riel lo dice: «Sin los artistas que ya conoces»), con «Ver todo →» a la pestaña con los filtros equivalentes. Se omite bajo su umbral.
- **Discografía sin explorar**: la tarjeta de un artista cuya discografía no se recorrió entera dice **siempre** «Discografía sin explorar» —aunque el catálogo ya conozca algunos de sus álbumes: una cantidad parcial se leería como total—, conserva el disco destacado si lo hay y no entra en los filtros de tamaño ni de debut.
- **Completar discografías en segundo plano**: al mostrar artistas, la página programa la sincronización de la discografía de hasta 3 de ellos que la tengan incompleta (reutilizando la sincronización existente). El riel «Para descubrir», cuando muestra menos de 8 artistas, programa además la de hasta 3 artistas del género sin explorar (los de más álbumes del género): así el riel crece solo con el uso. Para los ya existentes se corre el relleno `scripts/backfill-artist-discography.ts --genre-artists` (paso operativo).
- **Herencia de géneros materializada** (migración `0060`, ADR 0028): la rama de herencia de la vista `release_group_effective_genre` recorría **todos** los release-groups (360 ms con 58 mil; lineal con el catálogo) y era el suelo de rendimiento de las páginas de género. Pasa a leerse de una tabla mantenida por triggers, con el mismo resultado y la misma interfaz de la vista.
- Todo se calcula en lectura a partir de tablas existentes (`credit`, `release_group`, `rating`, `listen_entry`, `artist_follow`, `favorite`, `want_to_listen_entry`, `artist.country`, `artist.discography_complete_at`): **sin migración ni columnas nuevas**.

## Capabilities

### New Capabilities

- `genre-artist-discovery`: qué es «conocer» a un artista, el disco destacado, las reglas de «emergente» (discografía corta y debut conocido), el riel «Para descubrir» y las marcas personales de la tarjeta.

### Modified Capabilities

- `genre-pages`: la tarjeta de artista suma el botón de seguir, la marca «Ya lo conoces» y el disco destacado.
- `genre-page-catalog`: el listado de artistas suma los filtros `pais`, `debut`, `tam` y `conocidos`, y los órdenes `recientes` y `descubrir`.

## Impact

- **Código**: `src/services/genres/artists.ts` (filtros, órdenes, marcas y disco destacado), nuevo `src/services/genres/artist-discovery.ts` (reglas y riel), `src/services/catalog/ingest-discography.ts` (se exporta el agendado existente para completar discografías), `src/services/genres/page-params.ts` (parámetros), `src/components/genres/page/` (`GenreArtistCard` con seguir, `GenreArtistsView` con filtros, riel «Para descubrir», `GenrePageSections`), `src/app/[locale]/(catalog)/genre/[slug]/page.tsx`.
- **API**: ninguna nueva. El botón de seguir usa `followArtist` / `unfollowArtist` de `src/lib/api/catalog.ts` (endpoints existentes de `artist-following`).
- **Datos**: una migración técnica (`0060`: tabla `release_group_inherited_genre`, triggers y la vista `release_group_effective_genre` redefinida con las mismas columnas); no cambia ningún comportamiento de producto. Los valores derivados (debut, tamaño de la discografía, «conocido») se calculan en la consulta.
- **Docs**: `docs/05-features/genres.md` (parámetros, definiciones y umbrales) y las specs `genre-pages`, `genre-page-catalog`, `genre-artist-discovery`.
- **i18n**: `messages/{es,en}/catalog.json`.
- **Dependencias**: ninguna nueva.
- **Rendimiento**: la consulta de artistas se vuelve más pesada (métricas por artista y marcas por lector); el diseño fija un presupuesto medido y una salida si no se cumple.

## Goals

- Que una persona pueda llegar, desde la página de un género, a artistas que **no conoce** y que valga la pena probar, y entender en la propia tarjeta por qué.
- Que «emergente» se defina con reglas explícitas y ejecutadas en el servicio, nunca con un valor inventado cuando falta el dato.
- Que seguir a un artista sea un clic desde la tarjeta.

## Non-Goals

- **Ampliar el catálogo con artistas aún no ingeridos** (consulta de Wikidata por género P136 para traer «stubs»): es una decisión de licencia y arquitectura aparte (extiende el ADR 0023, que hoy prohíbe llegar a Wikidata por otra vía que una declaración atada al MBID) y queda para otro cambio.
- No hay recomendación por afinidad ni perfil de gusto: «Para descubrir» solo **excluye** lo que la persona ya conoce por acciones explícitas suyas y ordena por reglas fijas, igual para todos.
- No cambia el orden predeterminado de la pestaña Artistas ni la sección «Artistas» del Resumen.
- No se muestran cifras de seguidores ni se notifican lanzamientos (fuera de `artist-following`).
- No se infiere el debut con `life_begin` ni con los álbumes ya conocidos de una discografía incompleta: sin discografía completa el dato queda desconocido.
- No se relaja el umbral de «discografía corta» (5 discos) para compensar la falta de datos: se completan los datos.
- No se añaden columnas desnormalizadas ni índices salvo la herencia de géneros materializada, que la medición pidió (D8, D11).
