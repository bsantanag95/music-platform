# Premios

Nominados y ganadores de ceremonias de premios musicales, enlazados al catálogo (cambio `add-music-awards`,
ADR 0032). Primera capa de "actualidad" de la plataforma: como Letterboxd o Backloggd con las ceremonias de cine y
videojuegos.

**Estado:** implementado para cinco premios —Grammy, Latin Grammy, Premio Lo Nuestro, Brit Awards y Mercury Prize—, de 2021 en
adelante y solo ceremonias cerradas (cambio `add-four-music-awards`, ADR 0043).

## Salones de la fama (cambios `add-grammy-hall-of-fame` y `add-national-recording-registry`, ADR 0044)

Un **salón de la fama** (`award.kind = hall_of_fame`) incorpora cada año una **clase** de grabaciones o artistas, sin nominados
ni competencia. Cubre el **Grammy Hall of Fame** (carpeta `grammy-hall-of-fame`, lo decide un comité de la Recording Academy)
con sus **últimas cinco clases cerradas**: 2020 (25 grabaciones), 2021 (29), 2024 (10), 2025 (13) y 2026 (14), 91 en total; el
salón no tuvo clases en 2022 ni 2023. Cada clase tiene dos categorías, Álbumes y Canciones (estas ancladas a su sencillo o
disco); 81 de las 91 incorporaciones están enlazadas al catálogo y 10 se muestran como texto (singles antiguos sin disco ancla
en MusicBrainz). Los datos salen de los comunicados oficiales de la Academia (`sourceUrl` de cada clase), contrastados con
Wikipedia.

El segundo salón es el **National Recording Registry** de la Biblioteca del Congreso de EE. UU. (carpeta
`national-recording-registry`, `voting: jury`: la Bibliotecaria elige con el consejo del National Recording Preservation Board y las
nominaciones del público). Cubre las **últimas cinco clases** (2022, 2023, 2024, 2025 y 2026; una por primavera, sin
interrupciones), con 25 grabaciones cada una, 125 en total. Tiene tres categorías: Álbumes, Canciones (ancladas en su disco o
sencillo) y **Otras grabaciones** (discursos, emisiones de radio, entrevistas, pódcast y sonidos de campo, que se cargan siempre
como texto con `resolved.status = not_found` para que el resolutor no las busque). La fecha de cada clase es la del anuncio (no hay
gala) y su `sourceUrl`, el comunicado de la Biblioteca. 88 de las 125 incorporaciones están enlazadas al catálogo y 37 se muestran
como texto (13 no son música; las demás son grabaciones históricas que MusicBrainz no tiene como disco). Hay entradas fijadas a mano
(`status: manual`) donde MusicBrainz tiene varias grabaciones de la misma canción o el disco de 1961 junto a su reedición.

- **Una clase no es una ceremonia de ganadores:** no tiene número de edición (`edition` nulo), se presenta como "Clase de
  2026" con "Fecha de la clase" (la gala existe desde 2024; las clases 2020 y 2021 solo tienen la fecha del anuncio, que puede
  ser del año anterior: la clase 2021 se anunció el 21-dic-2020), no ofrece historia de la categoría. Desde
  `polish-hall-of-fame-class` la página muestra las incorporaciones como muro de carátulas (portada tipográfica si no hay) sin rotular
  cada una (antes "Ingresó" en ámbar en todas), el disco de una canción solo si se llama distinto de ella, y una cabecera con el nombre
  del salón como línea normal, fondo teñido, mosaico de cuatro carátulas y la cantidad por categoría enlazada a cada sección.
- **No cuenta como premio ganado:** no aparece en las tarjetas de Premios, "Ganadores recientes", "Los más premiados", "Tu
  relación…", los puntajes que ordenan el catálogo ni la plantilla de colección `grammy-winners` (`competitionNominations`,
  `allCeremonies(kind)`).
- **Dónde se ve:** sección "Salón de la Fama" de `/explore` (tras Premios y con su mismo aspecto: una tarjeta por salón, `HallOfFameTile`,
  con el año de su última clase, cuántas grabaciones ingresaron y carátulas —primero las que tienen carátula, luego las del catálogo
  sin ella—, que abre esa clase; con hasta dos salones, tarjetas anchas de dos por fila con ocho carátulas desde `lg`, y con más, la
  grilla de Premios con cuatro (openspec: polish-hall-of-fame-tiles); "Ver todos" al índice; el encabezado va en plural con más de un
  salón) y su **propia página `/hall-of-fame`** (cambio `add-hall-of-fame-page`): el índice con un bloque por salón
  (`HallOfFameLatestRail`: rango de clases, cuántas, quién decide, todas las clases como enlaces y el riel con las incorporaciones de su
  última clase; sin la tarjeta del salón, que repetía esa clase —openspec: polish-hall-of-fame-page—); `/hall-of-fame/<salón>` redirige a la clase más reciente y `/hall-of-fame/<salón>/<año>` es la clase (miga "Inicio / Salón de la
  Fama / <salón> / Clase de <año>"; las demás salen como años en la fila "Clase"). `/awards/<salón>[/<año>]` redirige de forma
  permanente a esas rutas y el hub `/awards` solo trae un enlace "Salones de la fama →". Las incorporaciones completas se listan solo en la
  página de la clase.
- **Sin carátula o sin ficha** (openspec: polish-hall-of-fame-page): el texto curado "Título — Artista" se parte en título y artista
  (`nominee-text.ts`, también en premios), y en el riel y la tarjeta del salón una incorporación sin carátula lleva una portada
  tipográfica (`TypeCover`: la inicial del título sobre un tono estable) en vez de la silueta del disco. Muchas grabaciones de los salones
  tienen el disco sin carátula resuelta; resolverlas por lote es una operación aparte sobre la base.
- **Para sumar otro salón:** una carpeta en `data/awards/<salón>/` con `kind: "hall_of_fame"` en `categories.json`, sin `edition`
  en sus clases, y su nombre en `messages/*/awards.json` (`names.<slug>`). Criterios en el ADR 0044.

## Alcance

- **Premios cubiertos** (cada uno con su tipo de votación, `voting` en su `categories.json`):

  | Premio | Carpeta | Años | Decide |
  |---|---|---|---|
  | Premios Grammy | `grammy` | 2021–2026 | la academia |
  | Premios Latin Grammy | `latin-grammy` | 2021–2025 (22.ª a 26.ª; la de 2026 es el 12-nov-2026) | la academia |
  | Premio Lo Nuestro | `lo-nuestro` | 2021–2026 (33.ª a 38.ª) | el público y un comité |
  | Premios Brit | `brit-awards` | 2021–2026 (41.ª a 46.ª) | la academia (industria) |
  | Premio Mercury | `mercury-prize` | 2021–2025 (30.ª a 34.ª; la de 2026 es el 22-oct-2026) | un jurado |

  Las ediciones de 2026 del Latin Grammy y del Mercury se agregan cuando se celebren (el modelo solo admite ceremonias
  cerradas). **Alcance de los cuatro nuevos:** toda categoría con nominados cuyo sujeto es un álbum, una grabación o un
  artista; quedan fuera los reconocimientos honoríficos, el video, la gira, la ingeniería, los arreglos, el empaque, las
  composiciones clásicas, las mezclas y remezclas y las categorías de DJ o de "combinación". El tipo de votación es por
  premio, no por categoría (los Brit y Lo Nuestro mezclan: se muestra cómo se decide el premio en general).
- **Campos nuevos** (nivel por género, ADR 0043): urbano, tropical, regional mexicano, cantautor, brasileña y portuguesa y
  otros géneros (Latin Grammy: la canción de raíces). Los Brit reutilizan pop, R&B, dance y electrónica, rock y alternativa
  y rap.
- **Categorías renombradas:** Latin Grammy (álbum vocal pop → pop contemporáneo y pop tradicional, 2025), Lo Nuestro
  (artista pop → masculino y femenino, artista de música mexicana → masculino y femenino) y Brit (Single → Canción, Rising
  Star → Critics' Choice, pop y R&B → pop y R&B por separado) están enlazadas con `predecessor`. Los Brit de 2021 tenían
  solista masculino y femenino por separado: son categorías propias de ese año.
- **Premio de una sola categoría:** el Mercury solo tiene Álbum del año; su ceremonia no muestra los niveles por álbum ni por
  género ni la navegación "En esta página".
- **Tres niveles** (cambio `expand-grammy-categories`, ADR 0042), en este orden en la página de la ceremonia:
  1. **Campo general:** Álbum, Grabación y Canción del año, Mejor artista nuevo, **Productor del año** y **Compositor
     del año** (no clásicos; este último solo desde 2023). Los dos últimos premian a una persona: su sujeto es el
     artista del catálogo y enlazan a su perfil.
  2. **Por álbum:** los "Mejor álbum de …" de pop vocal, dance/electrónico, rock, alternativo, R&B, rap, country
     (desde 2026 dividido en contemporáneo y tradicional), pop latino y música urbana. En 2021 la categoría latina era
     "pop latino o urbano", predecesora de las dos que la reemplazaron en 2022.
  3. **Por género:** interpretaciones, canciones y grabaciones, agrupadas por campo — pop (interpretación solista y de
     dúo o grupo), dance y electrónica (grabación; "dance pop" desde 2025; "Mejor grabación dance" en 2021, renombrada en
     2022), rock y alternativa (interpretación de rock, de metal, canción de rock e interpretación alternativa desde
     2023), R&B (interpretación, interpretación tradicional, canción), rap (interpretación, rap melódico, canción) y
     country (interpretación solista, de dúo o grupo, canción).
- **Criterio de selección.** Entra lo transversal a todos los géneros, los álbumes de los campos principales y las
  interpretaciones, canciones y grabaciones de los seis campos de música popular de gran público. **Quedan fuera:** las
  técnicas (ingeniería, empaque, notas, arreglo, remezclas, producción clásica), las de otro formato (video musical,
  película, banda sonora de videojuegos o de medios visuales, comedia, palabra hablada, teatro musical, infantil), las
  de nicho (clásica, jazz, góspel, raíces —americana, folk, bluegrass, blues—, reggae, música global y africana, polka,
  nueva era) y los álbumes de subgéneros específicos (R&B progresivo, latino tropical, de jazz latino, de rock o
  alternativo latino, de música mexicana). Sumar una categoría es una entrada más en `categories.json`.
- **Cobertura actual:** 2021–2026 completos con la selección anterior. Las categorías que una ceremonia no otorgó
  (Compositor del año antes de 2023, la grabación dance pop antes de 2025) no aparecen en su archivo.
- **Fuera de este cambio:** la insignia de ganador en las fichas de álbum, canción y artista, los ganadores históricos
  del nivel A (1959 en adelante) y la comparación "ganó X; la comunidad prefería Y". Van en un cambio posterior.

## Páginas

| Ruta | Qué muestra |
|---|---|
| `/awards` | Con **un solo premio** redirige a su ceremonia más reciente (la ceremonia ya trae la navegación por años); con **varios**, el hub (openspec: enrich-awards-hub): bajo el título, "N premios · M ceremonias"; una tarjeta por premio (la de Explorar en modo `detailed`: además del ganador destacado, el rango de años, las ceremonias, quién vota y hasta cinco ediciones anteriores como enlaces), de la más reciente a la más antigua, en una sola grilla (la agrupación por tipo de premio de `award-groups.ts` está preparada y apagada: `GROUP_AWARDS_ON_HUB`); **Ganadores recientes**, el ganador destacado de las últimas tres ceremonias de cada premio como riel de carátulas (`listRecentHeadlineWinners`; con sesión, la relación de la persona —openspec: add-awards-personal-progress—: "Has escuchado N de M álbumes ganadores" con barra, marca Escuchado (escucha o valoración) o Pendiente en cada carátula y el filtro Todos / Te faltan N, `?ganadores=faltan`, que deja los no escuchados una vez cada uno; `services/awards/personal.ts` reutiliza `getDiscographyMarks`), y **Los más premiados**, hasta diez artistas con más premios ganados cruzando todos los premios (`listMostAwardedArtists`: solo categorías de intérprete; el premio de un álbum o grabación suma a cada artista principal; los nominados solo texto no cuentan; mínimo dos premios; se muestra desde tres artistas). Sin premios, un mensaje |
| `/awards/<premio>` | La dirección estable del premio ("Premios Grammy", la que enlazan las migas de pan): redirige a su ceremonia más reciente (`getLatestCeremonyYear`); inexistente → no encontrada |
| `/awards/<premio>/<año>` | La ceremonia (ver abajo): cabecera, fila "Año", navegación "En esta página" y los tres niveles |
| `/awards/<premio>/categories/<clave>` | Historial de una categoría (openspec: redesign-category-history): bajo el título, "Premio · N ediciones · desde–hasta"; "Ganadores por año" en una fila (carátula o foto del ganador de cada ceremonia, enlazada a su año); cada año en forma compacta con ancla `#anio-<año>`, el ganador y los nominados plegados (abierto solo el más reciente); al costado, **Los más nominados** (artistas con 2 o más nominaciones en la categoría, con sus victorias; calculado en la página, sin consultas nuevas) y **Otras categorías** del premio en el orden de la ceremonia. Con "Antes llamada …" / "Después llamada …" |
| `/explore` (sección Premios) | Una tarjeta por **premio** con su ceremonia más reciente (año, edición y su ganador destacado: el de la categoría general de álbum con menor orden curado —Álbum del año, en los cinco—, con carátula, título y artista) y "Ver todos" al hub (`listLatestCeremoniesByAward`: una consulta para las ceremonias y otra para los ganadores) |

### La ceremonia (cambio `redesign-awards-pages`)

La página medía 9.036 px en escritorio y 19.370 en móvil (33 categorías, todas con todos sus nominados y el ganador a ~50 px); ahora ~5.800 y
~11.200, con el resultado primero y los nominados a un clic.

- **Cabecera**: una **portada** como las de las décadas y colecciones: el título grande, edición y fecha y, a la derecha, el ganador de la
  primera categoría general de álbum (en los Grammy, Álbum del año) con su carátula y trofeo, y esa carátula difuminada de fondo. Migas
  Inicio / Premios / Premios Grammy / 2026 ("Premios" enlaza al hub y el premio a `/awards/<premio>`), **sin rótulo
  encima** (se retiraron "Actualidad", "Ceremonia" y "Categoría": el sistema de diseño no admite un eyebrow sobre el encabezado) y una
  fila rotulada **Año** (`FacetRow`, el mismo componente de la vista de década; más reciente primero, como el índice, con la actual
  marcada).
- **Votación y fuente** (cambio `add-four-music-awards`): bajo la edición y la fecha, una línea con quién decide el premio ("Votan los
  miembros de la academia", "Lo decide un jurado", "Vota el público", "Votan el público y un comité"; `voting` del premio) y
  "Fuente: <sitio>" enlazado a la `sourceUrl` de la ceremonia (`rel="noopener noreferrer"`; el sitio es el host de la URL). Ambos se
  guardan en la base (`award.voting`, `award_ceremony.source_url`, migración `0073`, nulas hasta la próxima carga); si faltan, la
  línea se omite.
- **"En esta página"** (`StickyJumpNav`, enlaces `#ancla`): Campo general, Por álbum y, en lugar de "Por género", uno por cada campo (Pop,
  Dance y electrónica, Rock y alternativa, R&B, Rap, Country; `#field-<campo>`). **Queda fija** bajo la cabecera del sitio al bajar y marca
  el grupo que se está viendo (`aria-current="location"`): la página es muy larga y antes había que volver arriba para saltar de grupo.
- **Ganador**: trofeo y "Ganador" en texto ámbar, sin bloque relleno (con decenas de categorías, el bloque ámbar macizo en cada una gastaba
  el color). Los nominados usan la misma tipografía de títulos que el ganador. En las categorías de personas (`subjectKind = artist`:
  Mejor artista nuevo, Productor y Compositor del año), un nominado sin foto lleva su **inicial** en un círculo, no la silueta de disco.
- **Categorías destacadas** (`FEATURED_CATEGORIES = 4`, `featured-categories.ts`): las cuatro primeras del campo general en el orden curado
  (en los Grammy, las "Big Four": Álbum, Grabación y Canción del año y Mejor artista nuevo) llevan el ganador grande (carátula de 112 px) y
  todos los nominados a la vista, con su número. Es una regla de presentación: no hay un campo nuevo en los JSON curados.
- **Filas compactas** (`AwardCategory variant="compact"`): el resto del campo general (Productor y Compositor del año) y los niveles por
  álbum y por género. Nombre con su enlace a la historia, el ganador con una carátula de 64 px y los nominados plegados bajo
  **«Nominados (N)»** (`<details>`, cerrado, sin JavaScript; la búsqueda de la página del navegador lo abre). Una categoría de la que solo
  se registró al ganador no lleva el control y dice por qué. El enlace a la historia va siempre arriba a la derecha ("Historial" a secas en
  las compactas, para no apretar el título). Grilla de 1, 2 y 3 columnas según el ancho —dos en `xl` cuando el grupo tiene 2 o 4 categorías,
  para no dejar huecos—, `items-start` para que abrir una
  fila no estire a la de al lado. El número de nominados es un dato editorial finito, no una cifra que crezca con la base: por eso se muestra.
- El historial de una categoría usa la forma compacta por año (abierto solo el más reciente): con la forma destacada, seis años
  eran unos 3.500 px y para saber quién ganó cada año había que recorrerlos todos. Mismo ancho de página que la ceremonia.
- **Sin ámbar decorativo**: los campos son un encabezado normal; el ámbar queda para la insignia de ganador.

- Con el sujeto resuelto en el catálogo (álbum o grabación), el nominado muestra **el título y el artista del catálogo en dos líneas**
  (como las tarjetas de Explorar) y el título enlaza a la ficha; sin resolver se muestra el texto curado ("Fortnight — Taylor Swift featuring
  Post Malone") y su crédito, sin enlace. El título del catálogo puede diferir en mayúsculas del curado (p. ej. "DeBÍ TiRAR MáS FOToS",
  la grafía oficial).
- Las grabaciones muestran la carátula de su disco ancla y un enlace "del disco …". Canción del año aclara que premia
  a los autores.
- La carga crea las grabaciones como stub, sin pistas, y la ficha de canción se arma desde las pistas (disco principal,
  carátula, apariciones, créditos). Por eso, al abrir la ficha de una grabación de premios, se ingiere bajo demanda la
  lista de pistas de su disco ancla si aún no la tiene (`ensureAnchorTracks`, la misma función que usa la página de
  álbum, que no consulta MusicBrainz si el disco ya está ingerido). La ficha usa la edición representativa del disco
  ancla, así que, cuando MusicBrainz tiene dos grabaciones duplicadas, la curaduría elige la que está en esa edición: la
  primera visita tarda lo que tarde MusicBrainz y las siguientes salen de la base. Si MusicBrainz falla, la ficha se
  muestra mínima, sin error.
- Una categoría con cobertura "solo ganador" lo dice: "De esta categoría solo registramos al ganador".
- Los nombres de categoría se traducen; títulos y artistas no.
- Sin logos ni imágenes de trofeos: las únicas imágenes son carátulas y fotos del catálogo.

## Curaduría paso a paso

Los datos viven en `data/awards/<premio>/`: `categories.json` (`voting` del premio; por categoría, clave, nivel, `field` en el nivel de
género, tipo de sujeto, `honors`, nombre es/en, predecesora, orden) y `ceremonies/<año>.json` (edición, fecha, `sourceUrl` y las
categorías con sus nominados). Una prueba de CI valida todos los archivos: el nivel `genre` exige `field`, los campos
de un mismo grupo van contiguos en `order`, cada campo tiene nombre es/en en `messages/*/awards.json` (`fields.*`) y una
categoría `complete` tiene al menos tres nominados.

El artículo de cada ceremonia en Wikipedia (`sourceUrl`) trae categorías, nominados y ganador en un formato regular;
al agregar categorías conviene extraerlo del texto fuente (no de un resumen, que omite nominados: el wikitexto
se baja con `https://en.wikipedia.org/w/index.php?title=<página>&action=raw` y se procesa con un script, porque cada premio
y año ordena distinto —título y artista, o artista y título, o el ganador sin viñeta—) y contrastar el
conteo de nominados de cada categoría (cinco; ocho en las grandes; más si hubo empate en el último lugar) y los
ganadores con el artículo antes de resolver. Una grabación sin disco conocido arranca con su sencillo homónimo como
ancla; si la resolución no lo encuentra, se cambia `anchor` por el álbum donde aparece.

1. **Escribir la ceremonia en texto.** Por nominado: `title`, `artist` (no en categorías de artista), `won` y, en
   categorías de grabación, `anchor` (el disco o sencillo donde aparece). `credits` es opcional. Si el título oficial no
   coincide con MusicBrainz ("Justice (Triple Chucks Deluxe)"), `searchAs` dice cómo buscarlo sin cambiar lo visible.
   Si solo se conoce el ganador de una categoría, `coverage: "winner_only"` con un solo nominado.
2. **Resolver:** `npx tsx --env-file=.env scripts/resolve-award-nominees.ts [--award grammy] [--year 2025]`. Busca por
   el cliente de MusicBrainz y escribe en cada nominado `resolved` con su estado:
   - `exact`: un solo candidato en el mejor rango (título idéntico; para discos, álbum antes que sencillo homónimo y
     sin tipos secundarios; para grabaciones, sin desambiguación y luego "explicit"; para artistas, nombre idéntico).
   - `ambiguous`: dos o más candidatos empatados; el reporte final los lista.
   - `not_found`: ningún candidato con puntaje ≥ 95.
3. **Revisar:** contrastar la ceremonia con `sourceUrl` y fijar cada ambiguo a mano: `status: "manual"` con el `mbid` y
   la `seed` del candidato elegido. `--retry` vuelve a buscar los ambiguos y no encontrados.
4. **Cargar:** `npx tsx --env-file=.env scripts/load-awards.ts`. Valida todo y aborta sin escribir si algo falla; crea
   como stub los álbumes, grabaciones (con su disco ancla) y artistas que falten, desde la semilla, sin consultar
   MusicBrainz. Idempotente.

Los nominados `ambiguous` o `not_found` se cargan igual, como texto sin enlace.

**Resolución medida (base de prueba, 2026-10-18):** Mercury 100 % (60 de 60); Brit 93 % (473 de 507: las canciones con coautores
y las artistas homónimas —Dave, JADE, Flo— se fijaron a mano o quedaron como texto); Premio Lo Nuestro 78 % (1.207 de 1.550) y
Latin Grammy 60 % (827 de 1.388). En los dos latinos pesa MusicBrainz: los álbumes de nicho (tejano, tango, infantil, cristiano
en portugués, clásico) y las canciones sin sencillo homónimo como disco ancla no se encuentran. Una canción solo se resuelve si
su disco ancla (el sencillo homónimo, por omisión) existe en MusicBrainz con ese título; las que no, quedan como texto sin
enlace, igual que los 56 ambiguos de esos dos premios. Mejorar la cifra es curaduría (cambiar `anchor` por el álbum, `searchAs`
o fijar a mano), no código.

## Notas

- La **marca** "Grammy" se usa solo para describir ("Premios Grammy 2025", "Grammy Hall of Fame"): sin logos ni imágenes del
  Grammy Museum, y sin copiar las descripciones del sitio de la Academia (solo hechos).
- Smoke test: `scripts/smoke-test-music-awards.ts` (ver `AGENTS.md`).
