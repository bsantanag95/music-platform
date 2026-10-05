## Context

La pestaña Artistas de `/genre/<slug>` (cambio `redesign-genre-page`) la resuelve `listGenreArtists` (`src/services/genres/artists.ts`): una consulta SQL cruda sobre `artist` con dos `LATERAL` (álbumes del género acreditados y seguidores), filtro por texto y tres órdenes (`albumes`, `seguidos`, `az`). La tarjeta (`GenreArtistCard`) es un enlace con foto, nombre y «N álbumes del género». Mediciones de ese cambio: 35–60 ms por lectura en la base de scratch (7.577 álbumes); presupuesto 800 ms.

Datos disponibles sin migrar:

- `artist.country` (ISO-2, ficha de MusicBrainz), `artist.discography_complete_at` (NULL = la discografía nunca se recorrió entera), `artist.life_begin`.
- `credit` (rol `primary`/`featured`, por `release_group_id`), `release_group.category` y `first_release_year`.
- Relación de la persona con el artista: `artist_follow`, `rating` (`artist_id` o álbum), `listen_entry` (`artist_id` o `release_group_id`), `favorite` y `want_to_listen_entry` (ambas con `artist_id` o `release_group_id`).
- Señal de comunidad: `rating` agregado por álbum (umbral `MIN_RATINGS_PER_ALBUM` = 3).

**Medición de la base real (2026-10-05, solo lectura)** que condiciona el diseño:

| Dato (artistas con género) | Valor |
|---|---|
| Total | 668 (549 personas, 119 grupos) |
| Con discografía completa | 31 (4,6 %); 24 de ellos con 13 o más discos |
| Discografía nunca sincronizada | 637; 531 sin ningún disco propio conocido |
| Elegibles del riel (completa y ≤ 5 discos) | 2 en todo el catálogo (≤ 3: 1; ≤ 8: 6) |
| Álbumes con ≥ 3 valoraciones; seguidores de artistas | 0; 0 |

El tamaño y el debut solo existen si la discografía se recorrió entera. Sin completarlas, el riel saldría vacío y, peor, un artista con 0 discos conocidos pasaría por «discografía corta».

Restricciones:

- `album-discovery` fija que el descubrimiento es «editorial y por reglas, nunca personalizado por afinidad». Este cambio lo respeta: no hay perfil de gusto ni puntaje de afinidad; lo único personal es **excluir lo que la persona ya conoce por acciones explícitas suyas**, y se dice en pantalla.
- Las reglas se aplican en el servicio, y un dato que falta no se inventa (ni debut ni tamaño sin discografía completa).
- La cobertura es baja y desigual: toda sección se omite bajo su umbral.

## Goals / Non-Goals

**Goals:**

- Tarjetas que digan qué conoce la persona y den una razón para entrar (disco destacado).
- Filtros y órdenes que apunten a artistas emergentes: país, década de debut, discografía corta, «que aún no conozco».
- Un riel «Para descubrir» en el Resumen con definición explícita y umbral.
- Que la cobertura de discografías completas crezca (relleno operativo y completado en segundo plano acotado).
- Sin migraciones ni dependencias nuevas.

**Non-Goals:**

- Traer artistas que aún no están en el catálogo (consulta de Wikidata por género); otro cambio y otro ADR.
- Recomendación por afinidad, similitud entre artistas o «quienes siguen a X también siguen…».
- Cambiar el orden predeterminado de la pestaña o la sección «Artistas» del Resumen.
- Mostrar cifras de seguidores o notificar lanzamientos.
- Inferir el debut con `life_begin` (en una persona es el nacimiento) o con los álbumes ya conocidos de una discografía parcial.
- Relajar el umbral de «discografía corta» para compensar la falta de datos.

## Decisions

### D1. «Conocer» a un artista: una sola definición en SQL

Un artista es **conocido** para una persona si existe al menos una de estas señales **explícitas** suyas:

1. lo sigue (`artist_follow`);
2. valoró al artista o un álbum donde figura acreditado (`rating`);
3. registró una escucha del artista o de un álbum donde figura acreditado (`listen_entry`);
4. lo tiene en favoritos o pendientes, o tiene en ellos un álbum suyo (`favorite`, `want_to_listen_entry`).

«Acreditado» incluye los créditos `primary` y `featured`: haber valorado un disco donde el artista colabora cuenta como haberlo escuchado. Se implementa en `artistKnownCondition(readerId)` (un `EXISTS` por señal, correlacionado con `a.id`) y se reutiliza para la marca de la tarjeta, el filtro `conocidos=no` y el riel. Sin sesión no existe: ninguna marca, filtro ni exclusión.

*Alternativa descartada*: usar solo «lo sigue». Dejaría como «desconocidos» a bandas cuyos discos la persona ya valoró, y el riel recomendaría lo que ya escucha.

### D2. Métricas por artista derivadas en la consulta, sin columnas nuevas

Con `LATERAL` sobre `credit` ↔ `release_group` (créditos `primary`, categorías `studio` y `single_ep`; las recopilaciones y los directos no cuentan como «discos propios»):

- **`own_albums`**: cantidad de esos release-groups.
- **`discography_complete`**: `artist.discography_complete_at IS NOT NULL`.
- **`debut_year`**: el menor `first_release_year` de ellos, **solo si `discography_complete`**; si no, `NULL`.
- **Discografía corta**: `discography_complete` **y** `1 ≤ own_albums ≤ DISCOVER_MAX_ALBUMS` (5). Una discografía sin recorrer, o con 0 discos propios conocidos, **no es corta: es desconocida**. Esto corrige un riesgo real: 531 artistas con género tienen 0 discos conocidos y pasarían por «cortos».
- **`country`**: `artist.country` tal cual.

El artista sin discografía completa sigue apareciendo en el listado sin filtros; solo queda fuera de `tam=corta`, de `debut=` y del riel.

*Alternativas descartadas*: desnormalizar `debut_year` y `own_albums` en `artist` (migración, triggers y backfill, y se desincronizan al ingerir); usar `life_begin` como debut (para una persona es el nacimiento y para un grupo la formación, no el primer disco; cubriría 113 de 119 grupos y ninguna persona, que son el 82 %); estimar con los álbumes ya conocidos (falso si faltan discos).

### D3. Contrato de URL

Se suman a la pestaña Artistas (se ignoran en las demás):

| Parámetro | Valores |
|---|---|
| `pais` | código ISO-2 en mayúsculas de un país presente entre los artistas del género; otro valor se ignora |
| `debut` | año de inicio de década (`1990`); exige debut conocido |
| `tam` | `corta`: discografía corta (D2) |
| `conocidos` | `no`: oculta los artistas conocidos (solo con sesión; sin ella se ignora) |
| `orden` | además de `albumes` (predeterminado), `seguidos` y `az`: `recientes` y `descubrir` |

Lectura tolerante en la página y validación estricta en el servicio (`VALIDATION_ERROR`), como el resto. `genrePageHref` escribe solo lo no predeterminado y cambiar un filtro vuelve a la página 1.

Órdenes nuevos (siempre con `a.id` de desempate):

- `recientes`: `debut_year` descendente, desconocidos al final, luego álbumes del género.
- `descubrir`: **(1)** con señal de comunidad primero, **(2)** más seguidores, **(3)** debut más reciente (desconocido al final), **(4)** nombre. «Señal de comunidad» = algún álbum del artista dentro del género con al menos `MIN_RATINGS_PER_ALBUM` valoraciones y media ≥ `DISCOVER_MIN_AVG` (3,5). Solo **ordena**: no excluye a quien no la tiene (hoy ningún álbum la tiene). Es el orden con el que se arma el riel; en la pestaña no filtra por sí mismo.

### D4. Riel «Para descubrir»: reglas fijas, exclusión declarada

Elegibles: artistas del género (o subgéneros) con discografía corta (D2, o sea completa) y debut conocido y, con sesión, **no conocidos** por la persona. Orden `descubrir`, tope `GENRE_OVERVIEW_ARTISTS` (8), «Ver todo →» a `?tab=artists&orden=descubrir&tam=corta` (más `conocidos=no` con sesión: la exclusión viaja **explícita en la URL** y se puede quitar). Se omite si hay menos de `DISCOVER_MIN_ARTISTS` (4) elegibles: debajo de eso no es un riel.

Con sesión, el riel lleva el subtítulo **«Sin los artistas que ya conoces»**, para que la exclusión sea visible y no una personalización silenciosa. Un anónimo ve el riel sin exclusión ni subtítulo. No hay aleatoriedad (resultado estable y enlazable) ni aprendizaje: dos personas con las mismas acciones ven lo mismo. La distinción «exclusión por acciones explícitas ≠ afinidad inferida» se documenta en `docs/05-features/genres.md`.

Los umbrales (5 discos, 3,5 de media, 4 elegibles) **no se tocan** para compensar la falta de datos: se completan los datos (D9).

### D5. Disco destacado por tarjeta

Por artista, entre sus álbumes `primary` de categoría `studio`/`single_ep` que son del género (o subgéneros): el de **mayor media con al menos `MIN_RATINGS_PER_ALBUM` valoraciones**; si ninguno llega, el **más reciente prefiriendo los de estudio sobre los single/EP** (un sencillo reciente o una remezcla rara es mala razón para entrar; `first_release_year` descendente, desempate por id). Una consulta `DISTINCT ON (artist)` sobre los artistas de la página (no sobre todo el género). La tarjeta muestra título y año y enlaza al álbum; sin álbum elegible, la tarjeta no lo muestra.

### D6. Tarjeta: enlace y acciones sin anidar interactivos

La tarjeta pasa a un contenedor con (a) el enlace al artista (foto, nombre, conteo), (b) el disco destacado como segundo enlace y (c) el botón de seguir como control separado, nunca anidado dentro de un enlace. El botón (cliente) usa `followArtist` / `unfollowArtist` con actualización optimista y vuelve atrás si falla, como `ArtistRelationPanel`; solo se renderiza con sesión. «Ya lo conoces» es una etiqueta de texto (no color solo), omitida si la persona ya lo sigue (el botón «Siguiendo» ya lo dice).

### D7. Filtros de país y debut: opciones desde los datos

Las opciones del selector de país salen de los artistas del género (conteo por país, de mayor a menor, nombre con `Intl.DisplayNames` en el idioma de la ruta) y las de debut de las décadas con artistas de debut conocido. Un selector sin opciones no se ofrece (hoy el de debut tendría muy pocas: es esperable y mejora con D9). Una única consulta agrupada, sin una por opción.

### D8. Rendimiento

Presupuesto: la pestaña Artistas de un género raíz grande (`rock`) responde en ≤ 800 ms. Las métricas D2 se calculan para todos los artistas del género porque los filtros y órdenes las necesitan. Se mide con `EXPLAIN (ANALYZE)` en `rock`, `electronic`, `progressive-rock` y `shoegaze` (scratch). Si se supera: primero materializar el conjunto de artistas del subárbol en una CTE (como `albumInGenreTreeOnce`, que evitó una reevaluación por fila en el cambio anterior), después limitar las métricas a la página cuando el orden y los filtros no las usan; solo con una medición que lo justifique, desnormalizar. Las marcas personales (D1) y el disco destacado (D5) se calculan **solo para los artistas de la página**.

**Medición (apply).** Con el catálogo de scratch antes del relleno (7,6 mil release-groups) todas las lecturas tardan 14–180 ms. Aplicadas las salidas de este apartado (conjuntos del subárbol en CTE materializadas, seguidores y discos propios solo cuando el orden o los filtros los usan), con el catálogo ×7,7 tras el relleno (58,5 mil release-groups) la pestaña Artistas tarda 440–860 ms y el riel 240–550 ms. El suelo (~440 ms incluso para `az` o un género pequeño) era el recorrido de la rama de herencia de `release_group_effective_genre`, una búsqueda lateral por cada release-group (360 ms), que también afectaba a las cifras de la cabecera y al listado de álbumes: no era de esta consulta. **Se resolvió en D11** (herencia materializada). Medido después, con los mismos 58,5 mil release-groups: pestaña Artistas 97–261 ms (`descubrir`: 117–520 ms), riel 50–204 ms, cifras de la cabecera 54–89 ms y listado de álbumes 43–102 ms, dentro del presupuesto de 800 ms.

### D9. Completar las discografías: relleno operativo y agendado acotado

Dos mecanismos complementarios, ambos reutilizando la sincronización existente (`syncArtistDiscography`, modo `full`, con su candado por artista, el límite de MusicBrainz de ≥ 1,1 s y `discography_complete_at` solo si recorrió todas las páginas):

1. **Relleno operativo** de los 637 artistas con género sin discografía: `scripts/backfill-artist-discography.ts`, que es reanudable pero hoy solo retoma las discografías **parciales** (`discography_synced_at` no nulo). Se le agrega la opción `--genre-artists`, que también incluye a los nunca sincronizados con géneros semilla (cambio mínimo de selección; la sincronización es la misma). Queda como paso explícito de despliegue (≈ 1–2 h por la cola de MusicBrainz).
2. **Completado en segundo plano al mostrar artistas**: tras responder, la página agenda con `after()` la sincronización de hasta `GENRE_DISCOGRAPHY_PREFETCH` (3) de los artistas **mostrados** cuya discografía esté incompleta y tengan `mbid`, uno tras otro en un solo `after()`. Para eso se extrae y exporta el cuerpo que `ingest-discography.ts` ya ejecuta dentro de su `after()` privado (`runDiscographySync`); el agendado existente lo reutiliza. El tope de 3 acota el tiempo que la cola serial de MusicBrainz queda ocupada por una visita (peor caso ~3 × 20 páginas); el candado por artista evita trabajo duplicado entre visitas simultáneas; un fallo se registra y el artista queda pendiente para la próxima. Fuera de una request (scripts) se omite sin error, como el resto.

3. **El riel «Para descubrir» alimenta su propia cobertura**: cuando muestra menos de `GENRE_OVERVIEW_ARTISTS` (8) artistas, la sección programa además, con el mismo mecanismo y tope, la sincronización de hasta 3 artistas **del género** con la discografía sin explorar y con MBID, elegidos por más álbumes del género (los más probables de ser relevantes). Sin esto el riel, que solo muestra artistas explorados, no tendría de dónde crecer cuando los artistas sin explorar no aparecen en la página visible. Si dos secciones eligen al mismo artista, el candado por artista hace que la segunda omita el trabajo.

*Alternativas descartadas*: sincronizar toda la página (24) por visita (monopoliza la cola de MusicBrainz); solo el relleno (la cobertura vuelve a degradarse con cada artista nuevo); solo el agendado (la cobertura tardaría meses en llegar a artistas poco visitados, justo los emergentes).

### D10. Tarjeta de un artista sin discografía explorada

Si `discography_complete` es falso, la tarjeta dice **siempre «Discografía sin explorar»** y no muestra «N álbumes del género»: una cantidad parcial (los álbumes que el catálogo conoce por una búsqueda o por un invitado) se leería como el total y contradice «no sé cuántos tiene». Conserva el **disco destacado** si el catálogo ya conoce alguno suyo del género (es verdadero: es un álbum real). Con la discografía explorada, el conteo y el disco destacado funcionan como en D5. *Alternativa descartada*: mostrar el conteo conocido cuando es mayor que 0 (más informativo, pero engañoso para quien ve «2 álbumes» de un artista con 40).

### D11. Herencia de géneros materializada (migración `0060`, ADR 0028)

La rama de herencia de `release_group_effective_genre` (0057) hace, por **cada** release-group, una búsqueda lateral de su primer crédito principal y de los 3 primeros géneros de estilo de ese artista: 360 ms con 58,5 mil release-groups, lineal con el catálogo, y ningún predicado por género se empuja dentro de ella. Es el suelo de rendimiento medido en D8 (también de las cifras de la cabecera y del listado de álbumes).

- **Tabla `release_group_inherited_genre`** `(release_group_id, genre_id, position)`, PK `(release_group_id, genre_id)`, índice por `genre_id`, FK `ON DELETE CASCADE` a ambos lados. Guarda **solo** la herencia (los 3 primeros géneros de estilo del primer artista principal), no el puntaje.
- **La vista conserva su interfaz** (mismas columnas, tipos y semántica): la rama propia (puntaje > 0) queda igual y la rama heredada lee de la tabla, uniendo con `genre` para exigir `kind = 'style'` y con la comprobación `NOT EXISTS` de puntaje positivo **en lectura**. Así los votos y las semillas del álbum no necesitan mantenimiento alguno: siguen reflejándose al instante.
- **Mantenimiento por triggers** (el estado derivado no depende de la disciplina de la aplicación): sobre `credit` (alta, baja y cambio de un crédito de álbum: recalcula el álbum afectado), sobre `artist_genre_seed` (por sentencia, con tablas de transición: recalcula los álbumes donde esos artistas son principales) y sobre `genre` (cambio de `kind`: recalcula los álbumes de los artistas con ese género). La función de recálculo es una sola y es idempotente.
- **Migración**: crea la tabla, la llena desde la definición actual de la vista, instala los triggers y redefine la vista. Una prueba del smoke compara, sobre datos reales, la vista nueva con la definición antigua (diferencia vacía en ambos sentidos).
- *Alternativas descartadas*: vista materializada (`REFRESH` completo ante cada voto o cada ingesta, con ventana de datos viejos); reescribir la vista para partir de los artistas con semillas (no baja del orden de los release-groups de esos artistas, que tras el relleno son casi todos); cachear en la aplicación (cada servicio la reinventaría).

## Risks / Trade-offs

- **[«Emergente» mal definido espanta o engaña]** → definición explícita y documentada (completa, 1–5 discos, debut conocido), constantes en un solo módulo, y los datos que faltan excluyen en vez de adivinar.
- **[La cobertura deja el riel vacío]** → D9 (relleno + agendado), umbral de 4 con omisión, y `tam=corta` en la pestaña mejora a medida que se completan discografías. Hasta correr el relleno, el riel puede seguir sin aparecer: es el comportamiento correcto, no un fallo.
- **[Tensión con «nunca personalizado por afinidad»]** → exclusión solo por acciones explícitas, visible en pantalla («Sin los artistas que ya conoces») y reversible en la URL.
- **[Consulta más pesada]** → presupuesto D8, marcas solo para la página, salida CTE.
- **[El agendado satura la cola de MusicBrainz]** → tope de 3 por visita, candado por artista, `after()` secuencial; las visitas a artistas y álbumes comparten la misma cola serial y no se bloquean (solo se espera su turno).
- **[Debut falso por discografía parcial]** → solo con `discography_complete_at` no nulo.
- **[El orden `descubrir` favorece lo ya valorado]** → la señal de comunidad solo ordena hacia arriba; un artista sin valoraciones sigue siendo elegible.
- **[Triggers de herencia: un caso sin cubrir deja la herencia desactualizada]** → una sola función de recálculo, triggers sobre las tres tablas de las que depende, prueba de equivalencia contra la definición antigua en el smoke y una función `rebuild_inherited_genres()` para reconstruir todo si se sospecha de un desfase.
- **[Ingesta masiva más lenta por los triggers]** → recalcular un álbum son un borrado y un alta de ≤ 3 filas con dos búsquedas por índice; medido en el relleno completo.
- **[El relleno crea muchos stubs y release-groups]** → medido: 746 artistas → +11,6 mil artistas stub y ×7,7 release-groups (ver D8). Es el comportamiento ya aceptado de la ingesta («cacheo bajo demanda»), pero exige la materialización de la herencia de géneros antes de repetirlo en la base real.

## Migration Plan

Una migración técnica (`0060`, D11): se aplica antes del código; reconstruye la tabla desde la vista actual y deja la vista con la misma interfaz, así que el código anterior sigue funcionando con ella. Reversión: revertir el código y la migración deja la vista original (se guarda su definición en el propio archivo). Paso operativo posterior (no bloquea el despliegue): correr `scripts/backfill-artist-discography.ts` en scratch (`--limit` primero, luego completo) y después en la base real.

## Open Questions

Resueltas (2026-10-05):

- **¿El riel excluye a los conocidos?** Sí, pero declarado: subtítulo «Sin los artistas que ya conoces» y filtro explícito y reversible en el enlace «Ver todo →».
- **Umbrales** (`DISCOVER_MAX_ALBUMS` 5, `DISCOVER_MIN_AVG` 3,5, `DISCOVER_MIN_ARTISTS` 4): se mantienen; la falta de datos se resuelve completando discografías (D9), no relajando reglas.
- **Orden predeterminado de la pestaña**: sin cambio (`albumes`).
- **Debut y tamaño**: solo con discografía completa; relleno operativo + agendado acotado de 3 por visita.

Sin preguntas abiertas.
