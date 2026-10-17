# Premios

Nominados y ganadores de ceremonias de premios musicales, enlazados al catálogo (cambio `add-music-awards`,
ADR 0032). Primera capa de "actualidad" de la plataforma: como Letterboxd o Backloggd con las ceremonias de cine y
videojuegos.

**Estado:** implementado para los Grammy (ceremonia principal), 2021–2026, solo ceremonias cerradas.

## Alcance

- **Premios:** Grammy. El modelo admite cualquier otro (Grammy Latino, Mercury…) agregando su carpeta en
  `data/awards/`.
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
| `/awards` | Premios cubiertos y sus ceremonias, de la más reciente a la más antigua |
| `/awards/<premio>/<año>` | La ceremonia: edición y fecha, chips a las demás, navegación de saltos y los tres niveles (campo general, por álbum, por género con un subtítulo por campo); en cada categoría el ganador destacado y los nominados |
| `/awards/<premio>/categories/<clave>` | Historia de una categoría por año, con "Antes llamada …" / "Después llamada …" |
| `/explore` (sección Premios) | Una tarjeta por cada una de las últimas 5 ceremonias (año, edición y su ganador destacado: el de la categoría general de álbum con menor orden curado, en los Grammy Álbum del año, con carátula, título y artista) y "Ver todos" |

- El texto del nominado es el curado ("Fortnight — Taylor Swift featuring Post Malone") y enlaza a la ficha del
  catálogo cuando está identificado; si no, se muestra solo el texto.
- Las grabaciones muestran la carátula de su disco ancla y un enlace "del disco …". Canción del año aclara que premia
  a los autores.
- Una categoría con cobertura "solo ganador" lo dice: "De esta categoría solo registramos al ganador".
- Los nombres de categoría se traducen; títulos y artistas no.
- Sin logos ni imágenes de trofeos: las únicas imágenes son carátulas y fotos del catálogo.

## Curaduría paso a paso

Los datos viven en `data/awards/<premio>/`: `categories.json` (clave, nivel, `field` en el nivel de género, tipo de
sujeto, `honors`, nombre es/en, predecesora, orden) y `ceremonies/<año>.json` (edición, fecha, `sourceUrl` y las
categorías con sus nominados). Una prueba de CI valida todos los archivos: el nivel `genre` exige `field`, los campos
de un mismo grupo van contiguos en `order`, cada campo tiene nombre es/en en `messages/*/awards.json` (`fields.*`) y una
categoría `complete` tiene al menos tres nominados.

El artículo de cada ceremonia en Wikipedia (`sourceUrl`) trae categorías, nominados y ganador en un formato regular;
al agregar categorías conviene extraerlo del texto fuente (no de un resumen, que omite nominados) y contrastar el
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

## Notas

- La **marca** "Grammy" se usa solo para describir ("Premios Grammy 2025").
- Smoke test: `scripts/smoke-test-music-awards.ts` (ver `AGENTS.md`).
