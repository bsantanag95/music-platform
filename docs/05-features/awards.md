# Premios

Nominados y ganadores de ceremonias de premios musicales, enlazados al catálogo (cambio `add-music-awards`,
ADR 0032). Primera capa de "actualidad" de la plataforma: como Letterboxd o Backloggd con las ceremonias de cine y
videojuegos.

**Estado:** implementado para los Grammy (ceremonia principal), 2021–2025, solo ceremonias cerradas.

## Alcance

- **Premios:** Grammy. El modelo admite cualquier otro (Grammy Latino, Mercury…) agregando su carpeta en
  `data/awards/`.
- **Categorías:** "nivel A" (campo general: Álbum, Grabación y Canción del año, Mejor artista nuevo) y "nivel B"
  (los "Mejor álbum de …" por género). Ingeniería, empaque, video y demás quedan fuera.
- **Cobertura actual:** 2021–2025 completos, revisados contra Wikipedia (2026-10-10): campo general y nueve
  categorías de álbum por género (pop vocal, dance/electrónico, rock, alternativo, R&B, rap, country, pop latino y
  música urbana). En 2021 la categoría latina era "Mejor álbum de pop latino o urbano", predecesora de las dos que la
  reemplazaron en 2022.
- **Fuera de este cambio:** la insignia de ganador en las fichas de álbum, canción y artista, los ganadores históricos
  del nivel A (1959 en adelante) y la comparación "ganó X; la comunidad prefería Y". Van en un cambio posterior.

## Páginas

| Ruta | Qué muestra |
|---|---|
| `/awards` | Premios cubiertos y sus ceremonias, de la más reciente a la más antigua |
| `/awards/<premio>/<año>` | La ceremonia: edición y fecha, chips a las demás, campo general y después los álbumes por género; en cada categoría el ganador destacado y los nominados |
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

Los datos viven en `data/awards/<premio>/`: `categories.json` (clave, nivel, tipo de sujeto, `honors`, nombre es/en,
predecesora, orden) y `ceremonies/<año>.json` (edición, fecha, `sourceUrl` y las categorías con sus nominados). Una
prueba de CI valida todos los archivos.

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
