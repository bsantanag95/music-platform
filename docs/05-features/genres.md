# Géneros

Cambios `add-genre-taxonomy` (datos), `show-genres` (superficie) y `redesign-genre-page` (la página de género). El
modelo de datos vive en `03-data/sql-model.md` (sección "Géneros") y las decisiones en los ADR 0023, 0024 y 0027.

## Dónde se ven

| Superficie | Qué muestra | Fuente |
|---|---|---|
| Cabecera de **artista** | hasta 5 chips de sus géneros semilla y un "+N" desplegable (`<details>`) | `artist_genre_seed` (Wikidata P136) |
| Identidad del **álbum** | hasta 5 chips de géneros efectivos (principal destacado, secundarios y el resto en "+N") y, en una fila aparte sin enlace, los descriptores (Instrumental, Navideña, Orquestal, Banda sonora) | vista `release_group_effective_genre` (semillas + votos) + tipo `Soundtrack` |
| Identidad de la **canción** | los géneros del disco principal, atenuados ("Del álbum") | idem, vía el disco principal |
| `/genre/<slug>` | cabecera + pestañas Resumen, Álbumes, Artistas y Listas (ver "Página de género") | `genre_relation`, semillas, valoraciones, listas, reseñas, `genre_localized_text` |
| `/explore` | chips por familia (`?familia=`) y listado por género con subgéneros | ver `explore.md` |
| Perfil | "Géneros que me mueven" (ficha de la Placa) y la cresta de la huella con la marca de declarado | `app_user.genres`, ver `user-profile.md` |

Los chips son un único componente (`src/components/genres/GenreChips.tsx`): cada chip enlaza a
`/genre/<slug>`, los **heredados del artista** van atenuados con el texto accesible "Heredado de
{artista}" (en la canción, "Del álbum") y los descriptores nunca enlazan. Una cabecera sin géneros ni
descriptores no deja hueco.

## Página de género

Cambios `show-genres` y `redesign-genre-page`. `/{locale}/genre/<slug>` (segmento fijo en inglés, ADR 0007; slug
guardado de la taxonomía, ADR 0023). Es la puerta de entrada al género: qué es y dónde encaja, qué escuchar primero y
qué hace la comunidad con él. Slug desconocido, descriptor u oculto: 404; mayúsculas: 308 al canónico.

**Cabecera fija** (siempre): migas Inicio › Explorar › {primera familia} › género; nombre localizado
(`genreDisplayName`: en español la etiqueta de Wikidata o la corrección curada; si no, el de MusicBrainz); familias,
que enlazan a `/explore?familia=`; y la línea de cifras. Con sesión, el botón **"Me mueve"**. Un género **sin música**
(ningún álbum ni artista) muestra solo la cabecera, el árbol y "Todavía no hay música de este género en el catálogo",
sin pestañas.

### Pestañas y contrato de URL

La pestaña sale de `?tab=`: sin parámetro (o con uno desconocido, que **nunca** da 404) es el **Resumen**; `albums`,
`artists` y `lists` son las otras tres. Cada pestaña consulta y renderiza solo lo suyo. Los demás parámetros (claves en
español, como `decada` o `familia` de Explorar) se leen solo en la pestaña que los usa y un valor inválido cae al
predeterminado (la URL se puede compartir y no se rompe); los servicios, en cambio, validan en estricto
(`VALIDATION_ERROR`). Lo resuelve `src/services/genres/page-params.ts` (`parseGenreParams` / `genrePageHref`: solo se
escribe lo que no es predeterminado y cambiar un filtro vuelve a la página 1).

| Parámetro | Pestaña | Valores |
|---|---|---|
| `tab` | todas | `albums`, `artists`, `lists` (sin valor: Resumen) |
| `q` | Álbumes, Artistas | texto (≤ 100): título o artista acreditado / nombre del artista, sin acentos ni mayúsculas |
| `tipo` | Álbumes | `studio`, `single_ep`, `compilation`, `live_other` |
| `decada` | Álbumes | año de inicio (`1970`) |
| `sub` | Álbumes | slug de un **descendiente** del género (otro se ignora) |
| `solo` | Álbumes | `1`: solo el género exacto, sin subgéneros |
| `orden` | Álbumes | `mejor` (predeterminado), `populares`, `recientes`, `antiguos`, `az` |
| `orden` | Artistas | `albumes` (predeterminado), `seguidos`, `az`, `recientes`, `descubrir` |
| `pais` | Artistas | código ISO-2 de un país presente entre los artistas del género |
| `debut` | Artistas | década de debut (`1990`); solo artistas con debut conocido |
| `tam` | Artistas | `corta`: discografía corta (explorada y de 1 a 5 discos propios) |
| `conocidos` | Artistas | `no`: oculta los artistas que ya conoces (solo con sesión) |
| `vista` | Álbumes | `lista` (predeterminado: cuadrícula) |
| `page` | Álbumes, Artistas, Listas | entero ≥ 1; páginas de 24 |

### Resumen

Cada sección **se omite** si su lectura no llega a su umbral (constantes en `src/services/genres/constants.ts`; el
servicio los aplica, la interfaz nunca recibe una cifra bajo el mínimo):

| Sección | Qué muestra | Umbral |
|---|---|---|
| Cifras | álbumes y artistas del género y sus subgéneros; valoraciones y media de la comunidad; década de auge; "Les mueve a N personas" | media/valoraciones desde 5 valoraciones; década de auge desde 2 décadas; "les mueve" desde 5 personas |
| Sobre el género | primer párrafo de Wikipedia (~600 caracteres, en límite de oración), resto tras "Leer más", atribución | solo si hay texto sincronizado |
| Esenciales | mejor valorados del subárbol (riel de 12, "Ver todo →") | álbumes con ≥ 3 valoraciones y ≥ 6 elegibles |
| Novedades | estudio y single/EP por año descendente | siempre que haya |
| Para descubrir | hasta 8 artistas con discografía corta y debut conocido, sin los que ya conoces (ver "Descubrir artistas") | desde 4 elegibles |
| Artistas | 8 tarjetas con foto, "N álbumes del género", disco destacado y, con sesión, Seguir | siempre que haya |
| Listas de la comunidad | carrusel de hasta 6 | listas con ≥ 3 álbumes del género |
| Reseñas recientes | las 5 últimas reseñas visibles | siempre que haya |
| Aside: Tu huella | solo con sesión | ver abajo |
| Aside: Dónde encaja | padres → género → subgéneros con su cantidad de álbumes (por tamaño, atenuados los vacíos; > 12 tras un desplegable) y géneros cercanos (fusión de, luego influido por; hasta 8) | se omite si no hay nada que mostrar |
| Aside: Por década | barras de álbumes por década, cada una enlaza a Álbumes filtrado | desde 2 décadas |

Cada riel tiene "Ver todo →" hacia su pestaña. En escritorio el aside va a la derecha; en móvil, bajo el contenido.

### Álbumes, Artistas y Listas

- **Álbumes**: búsqueda, tipo, década, subgénero (solo si hay subgéneros con música), "solo este género", orden y vista
  (cuadrícula o lista) en la URL, con paginación en servidor. `orden=mejor` con los demás filtros apagados es el orden
  de Explorar. Lo ejecuta `listAlbumsFiltered` (`discovery.ts`), la misma función que ya usan los listados de Explorar.
  Con filtros sin resultados se ofrece "Limpiar filtros"; con el género sin música, el mensaje de género vacío.
- **Artistas**: los de las semillas del género o de un subgénero (tipo conocido), con foto y "N álbumes del género"
  (los acreditados que cumplen el género, no el total), búsqueda por nombre, filtros de descubrimiento y órdenes (ver
  "Descubrir artistas"). `seguidos` ordena por cantidad de seguidores sin mostrarla.
- **Listas**: listas públicas de álbumes con ≥ 3 álbumes del género, por guardados y luego por álbumes del género. La
  visibilidad es **la misma** que la de "listas públicas que contienen un ítem" (`publicListBaseConditions`): audiencia
  pública, tipo estándar, visibles para moderación, dueño con perfil público y cuenta activa, sin retiro oficial y sin
  bloqueo con el lector. Los Caminos quedan fuera.

### Descubrir artistas

Cambio `add-genre-artist-discovery`. La pestaña Artistas y el Resumen ayudan a **encontrar artistas que aún no conoces**
dentro de un género, con datos que ya existen (la única migración, `0060`, es técnica y no cambia ningún comportamiento:
materializa la herencia de géneros, ver "Herencia materializada"):

**Tarjeta de artista.** Foto, nombre, "N álbumes del género" (o **siempre "Discografía sin explorar"** cuando la discografía no
se recorrió entera, aunque el catálogo ya conozca algunos álbumes suyos: una cantidad parcial se leería como el total), un **disco destacado**
("Empieza por «…» · año") y, con sesión, el botón **Seguir / Siguiendo** (actualización optimista, nunca dentro de un
enlace) y la etiqueta **"Ya lo conoces"** si lo conoces y no lo sigues.

**Artista conocido** (`artist-known.ts`, una sola definición en SQL): existe al menos una señal **explícita** tuya: lo
sigues; valoraste al artista o un álbum donde figura acreditado (principal o invitado); registraste una escucha del
artista o de un álbum suyo; o lo tienes en favoritos o pendientes, o tienes en ellos un álbum suyo. Sin sesión nadie es
conocido y no hay marcas ni filtro. Las señales nunca son visibles para otras personas.

**Discografía explorada, corta y debut** (`artists.ts`; nada se inventa):

- *Discos propios* = álbumes como artista **principal** de categoría estudio o single/EP (sin los marcados fuera de la
  discografía). Las recopilaciones y los directos no cuentan.
- *Explorada* = `artist.discography_complete_at` no es nulo.
- *Debut* = el menor año de los discos propios, **solo si está explorada**; si no, desconocido. No se usa `life_begin`
  (en una persona es el nacimiento) ni los álbumes ya conocidos de una discografía parcial.
- *Discografía corta* = explorada **y** de 1 a 5 discos propios (`DISCOVER_MAX_ALBUMS`). Sin explorar, o con 0 discos
  conocidos, el tamaño es **desconocido, no corto**.

**Disco destacado.** Entre los álbumes del artista como principal, de estudio o single/EP, del género o sus subgéneros:
el de mayor media con ≥ 3 valoraciones; si ninguno llega, el más reciente prefiriendo los de estudio sobre los single/EP.

**Filtros y órdenes de la pestaña Artistas** (parámetros en la tabla de arriba): `pais`, `debut`, `tam=corta` y, con
sesión, `conocidos=no`; `orden=recientes` (debut más reciente, desconocidos al final) y `orden=descubrir` (primero con
señal de comunidad —un álbum del género con ≥ 3 valoraciones y media ≥ 3,5—, luego más seguidores, luego debut reciente,
luego nombre). Los selectores de país y de debut solo ofrecen opciones reales. El **orden predeterminado no cambia**
(`albumes`): es la lectura de referencia "¿quiénes son los centrales de este género?".

**Riel "Para descubrir"** (Resumen, encima de "Artistas"): hasta 8 artistas del género con discografía corta y debut
conocido y, con sesión, **sin los que ya conoces**. Se omite con menos de 4 elegibles. Con sesión lleva el subtítulo
"Sin los artistas que ya conoces" y su "Ver todo →" arrastra `conocidos=no` explícito en la URL (reversible).

> **Principio.** `album-discovery` fija que el descubrimiento es "editorial y por reglas, nunca personalizado por
> afinidad". El riel lo respeta: no hay perfil de gusto ni puntaje de afinidad; lo único personal es **excluir lo que la
> persona ya conoce por acciones explícitas suyas**, y se dice en pantalla. Dos personas con las mismas acciones ven lo
> mismo; no hay aleatoriedad.

**Completar discografías.** El tamaño y el debut solo existen con la discografía explorada, y la base real casi no la
tiene (medición 2026-10-05: 31 de 668 artistas con género). Hay dos mecanismos (el primero con dos orígenes), ambos sobre la sincronización existente
(`syncArtistDiscography` modo `full`, con candado por artista y el límite de ritmo de MusicBrainz):

1. **Al mostrar artistas** (Resumen y pestaña Artistas), la página programa con `after()` —después de responder, sin
   esperar— la sincronización de hasta **3** de los artistas mostrados con la discografía sin explorar y con MBID, uno
   tras otro (`artist-prefetch.ts` → `runDiscographySync`). Un fallo se registra y el artista queda pendiente. Además, el
   riel "Para descubrir", cuando muestra menos de 8 artistas, programa del mismo modo hasta 3 artistas **del género** sin
   explorar (los de más álbumes del género): el riel solo muestra artistas explorados y así crece con el uso.
2. **Relleno operativo**: `tsx --env-file=.env scripts/backfill-artist-discography.ts --genre-artists [--limit N]
   [--dry-run]` procesa los artistas con géneros semilla sin discografía completa, incluidos los nunca sincronizados
   (reanudable). Se corre primero en scratch.

**Costo del relleno** (medido en scratch, `--genre-artists` completo, 2026-10-05): 746 artistas en ~30 min, sin
errores. La tabla `artist` pasó de 16.175 a 27.747 filas (**+11.572 "stubs" de invitados**: 20.434 en total), los
release-groups de 7.633 a 58.513 (**×7,7**) y las discografías completas de 119 a 885. Es el comportamiento ya aceptado
del "cacheo bajo demanda", pero cambia la escala del catálogo: los conteos de las páginas de género crecen en
proporción (el género `rock` pasó de cientos a 15.551 álbumes) y conviene decidir si se corre en la base real.

**Rendimiento a esa escala.** La pestaña Artistas calcula el conjunto de álbumes y de artistas del subárbol una sola vez
(CTE materializada) y solo calcula seguidores y discos propios cuando el orden o los filtros los usan. Con 58 mil
release-groups y la vista antigua tardaba 440–860 ms: el suelo era la rama de herencia de `release_group_effective_genre`
(una búsqueda lateral por **cada** release-group, 360 ms, lineal con el catálogo). Se resolvió materializando la herencia
(migración `0060`, ADR 0028; ver "Herencia materializada"). Medido tras eso, mismos 58,5 mil release-groups, en
`rock`, `electronic`, `progressive-rock`, `shoegaze` y `pop`: pestaña Artistas 97–261 ms (`descubrir`, que calcula la
señal de comunidad para todos los artistas, 117–520 ms), riel 50–204 ms, cifras de la cabecera 54–89 ms, listado de álbumes
43–102 ms: dentro del presupuesto de 800 ms.

**Herencia materializada.** Un álbum sin géneros propios con puntaje positivo hereda los 3 primeros géneros de estilo de su
primer artista principal. Esa herencia vive en `release_group_inherited_genre`, que mantienen **triggers** sobre `credit`
(créditos principales de álbum), `artist_genre_seed` y `genre.kind`; la aplicación nunca la escribe. La vista
`release_group_effective_genre` conserva su interfaz y aplica en lectura `kind = 'style'` y la ausencia de puntaje
positivo, así que votos y semillas del álbum se reflejan al instante. `SELECT rebuild_inherited_genres()` reconstruye
toda la tabla si se sospecha de un desfase.

### Comunidad y personalización

- **Reseñas recientes**: `listRecentAlbumReviews` (`reviews.ts`) con las reglas de la página del álbum: solo
  `moderation_status = 'visible'`, autor desactivado enmascarado y, con sesión, sin autores bloqueados en ninguna
  dirección.
- **Tu huella en este género** (solo con sesión, solo del propio lector): álbumes que valoró, su media, sus 3 favoritos
  y sus pendientes del género. Sin actividad no muestra ceros sino una invitación: a los Esenciales si el género los
  tiene y, si no, a la pestaña Álbumes.
- **Me mueve**: agrega o quita el género de "Géneros que me mueven" con
  `PUT/DELETE /api/me/profile/genres/{slug}` (ver `contracts.md`): una sola sentencia atómica e idempotente que **no
  reemplaza** la lista, así que no pisa lo editado desde otra pestaña. Con la lista llena (5) el alta responde 409
  `MUSIC_IDENTITY_GENRES_FULL` y la interfaz explica el motivo. Se declara el género **exacto**: no cuenta un subgénero
  cuando el padre ya está declarado.
- **Les mueve a N personas**: cuentas activas con perfil público que declaran exactamente este género; solo desde 5 y
  nunca una lista de nombres.

### Sobre el género (Wikipedia)

ADR 0027. La tabla `genre_localized_text` guarda, por género e idioma (`es`, `en`), la descripción de Wikidata y la
introducción del artículo de Wikipedia con su título y su URL. Se llega a Wikidata **solo** por `genre.wikidata_id`
(la declaración P8052 atada al MBID), nunca por el nombre. La sincronización corre en segundo plano (`after()`) al
visitar un género nunca sincronizado o con más de 30 días, con candado por género: la primera visita sale sin texto y
un fallo de Wikimedia no afecta la página. Si falla la entidad no se escribe nada (ni la marca); si falla el extracto de
un idioma se conserva el anterior de ese idioma. Se muestra el idioma de la ruta o, si falta, el otro indicando cuál
es; la **atribución es obligatoria** ("Fuente: Wikipedia — {título del artículo}", CC BY-SA 4.0) y nombra el título del
artículo, que puede diferir del nombre mostrado (el género "música clásica" es el artículo "Música culta").

Relleno: `tsx --env-file=.env scripts/backfill-genre-about.ts [--limit N] [--dry-run] [--force] [--slug <slug>]`
(primero los géneros con más álbumes; reanudable; un solo proceso por la cola serial del cliente; ~1 s por género).
`--force --slug <slug>` adelanta la corrección de un texto. No hay retiro a pedido.

### Rendimiento

Los conteos recorren la CTE recursiva "subgénero de" sobre la vista `release_group_effective_genre`. Mediciones en la
base de scratch (7.577 álbumes): cada lectura del Resumen y de las pestañas tarda unos **35–60 ms** en `rock`,
`electronic`, `progressive-rock` y `shoegaze`, muy por debajo del presupuesto de 800 ms. Hallazgo: las consultas cuyo
lado exterior es pequeño (reseñas recientes, listas, huella) deben usar `albumInGenreTreeOnce` (CTE materializada) en
vez de `albumInGenreTree` (`EXISTS` correlacionado): con 19 reseñas el planificador elegía un bucle anidado que volvía
a evaluar la vista entera por cada fila (265–371 ms); materializado, 55–75 ms. Si algún día el presupuesto no se
cumple: primero evaluar el subárbol una sola vez por request y, solo con una medición que lo justifique, cachear los
agregados públicos 5 minutos (`unstable_cache`); no una vista materializada.

## Selector de géneros del perfil

"Géneros que me mueven" ya no es una lista cerrada: el editor tiene un buscador sobre los ~2.200 estilos de la
taxonomía (`GET /api/genres/search`, por nombre en español o inglés, sin tildes), con resultados navegables con
teclado, chips quitables y el contador "n de 5". Vacío ofrece los géneros más usados. El servidor valida el formato
del slug y que sea un estilo visible (ADR 0024); un género retirado u oculto se ignora al mostrar sin tocar lo
guardado.

## Declarado frente a real

Si el perfil es accesible y el dueño declaró géneros, la cresta de la huella marca (★ con texto accesible) las
familias que contienen alguno de ellos y nombra aparte las declaradas que no aparecen en lo que valora. Sin géneros
declarados no hay marcas.

## Votos de la comunidad sobre los géneros del álbum

Cambios `add-genre-votes` (ADR 0025) y `move-genre-votes-to-relation-panel`. Votar es una acción personal sobre el
álbum, así que vive en el panel **"Tu relación"** (junto a valorar, escuchar, Colección y Listas), no en la cabecera,
que solo informa: la fila **"Géneros"** tiene el enlace **"Votar géneros"**, que despliega en el propio panel
(`GenreVotePanel`) los géneros del álbum con ▲ / ▼ conmutables (pulsar el voto activo lo retira) y el rango
(Principal / Secundario). Un buscador (el mismo `GET /api/genres/search`) permite **proponer** un género nuevo, que
se vota +1 al elegirlo. Los visitantes sin sesión no ven la fila: "Tu relación" les ofrece iniciar sesión. El panel
recibe `interacted` (valoración, escuchas o colección, según el estado de "Tu relación") en la clave de su consulta:
al valorar, registrar una escucha o agregar el álbum a la colección el acceso se vuelve a pedir sin cerrarlo.

- **Quién vota:** quien valoró, escuchó (diario) o coleccionó ese álbum, con la cuenta activa y sin suspensión social.
  Quien no puede ve los controles desactivados y el motivo; sin sesión, la invitación a iniciar sesión.
- **Puntaje y rangos:** semilla de Wikidata (vale 1) + votos. Los géneros son los de puntaje > 0; el primero es el
  **principal** (chip destacado), los que llegan a la mitad de su puntaje (mínimo 1) son **secundarios** y el resto va al
  "+N". Un −1 neutraliza una semilla; una propuesta aprobada hace que el álbum deje de heredar del artista (el panel
  lo avisa).
- **Privacidad:** el voto individual solo lo ve su autor y no genera actividad. Las cifras (▲ y ▼) se muestran solo con
  al menos 5 votantes distintos.
- **Tope:** 8 géneros votados por persona y álbum. No se votan descriptores ni géneros ocultos.
- **Supervivencia:** el voto sigue contando aunque se quite la valoración, entrada o colección; una cuenta desactivada
  deja de contar mientras lo esté.

Todas las lecturas (Explorar, Caminos, huella, página de género, cabeceras, canción) usan la misma vista de géneros
efectivos, así que reflejan el puntaje sin cambios propios.

## Fuera de alcance

Votos sobre artistas, canciones o descriptores, géneros propios de canción, edición de géneros de un artista o álbum,
búsqueda de géneros en el buscador del encabezado y, en la página de género, canciones destacadas (hace falta decidir
qué álbum aporta el género a cada canción), página de familia propia y recomendación por afinidad.
