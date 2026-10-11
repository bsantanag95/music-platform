# ADR 0032 — Premios musicales curados a mano en JSON versionado

## Estado

Aceptado (cambio `add-music-awards`, 2026-10). Primer alcance: los Grammy (la ceremonia principal, no el Grammy
Latino), solo ceremonias ya cerradas. Se aplica a cualquier premio que se agregue después.

## Contexto

Queremos mostrar nominados y ganadores de ceremonias de premios, enlazados al catálogo (álbum, grabación, artista) y,
más adelante, una insignia de ganador en las fichas. Ninguna fuente automática es confiable:

- **Sitio oficial (grammy.com):** lista completa, pero sin API pública; extraerla choca con sus términos.
- **Wikidata** (`P166` premio recibido, `P1411` nominado a, con `P585` fecha y `P1686` obra): consultado el
  2026-10-10 para "Grammy al Álbum del año" (`Q904528`) desde 2021. Faltan casi todos los nominados (2024 solo trae
  boygenius; 2025 no trae ninguno), hay nominaciones mal fechadas (álbumes de 2014 y 2016 como nominados de 2022 y
  2023), la fecha mezcla año de ceremonia y de elegibilidad, y la obra a veces es el propio ítem y a veces un
  calificador. No sirve ni como borrador.
- **Wikipedia:** un artículo por ceremonia con tablas completas, pero el parseo es frágil y el texto es CC BY-SA.
- **MusicBrainz:** no modela premios.

A la vez, el volumen es acotado y la frecuencia mínima: una ceremonia por año. Con el alcance acordado —categorías del
campo general ("nivel A": Álbum, Grabación y Canción del año, Artista nuevo) y "Mejor álbum de …" por género ("nivel
B")— son unas 200 nominaciones por ceremonia. Los ganadores del nivel A en toda la historia (desde 1959) son unas 265
entradas.

Una prueba contra la búsqueda de MusicBrainz (2026-10-10, los 8 nominados a Álbum del año 2025 y una muestra de
grabaciones y artistas) mostró que álbumes y artistas resuelven sin ambigüedad (score 100, único). Las grabaciones no:
"Not Like Us" o "Espresso" devuelven varias grabaciones con score 100 (mezcla Dolby Atmos, megamix de DJ, lyric
video).

## Decisión

1. **Los premios se curan a mano en archivos JSON versionados** en `data/awards/<premio>/`, con el mismo patrón que
   la taxonomía de géneros (`data/genres/taxonomy.json` → `scripts/load-genre-taxonomy.ts`): un script idempotente los
   carga en la base. Cada ceremonia nueva o corrección es un cambio revisado en el repositorio.
2. **El curador escribe texto, no MBID.** Un script de resolución busca cada nominado por el cliente de MusicBrainz
   (`src/services/musicbrainz/client.ts`, único punto de salida) y escribe el MBID con su confianza; el curador solo
   revisa los ambiguos o sin resultado. Lo resuelto se guarda en el JSON junto con la semilla mínima para crear la
   fila (título, categoría, fecha, créditos), así que cargar no consulta MusicBrainz: crea los stubs que falten con
   las funciones del catálogo (`upsertReleaseGroupStub`, `upsertArtistStub`, `findOrIngestRecording`).
3. **El álbum es el ancla.** Las grabaciones se resuelven a través de su disco: el curador indica el álbum o sencillo
   donde aparece, se resuelve ese release-group y se busca la grabación dentro de él (`rgid:`), nunca por búsqueda
   suelta de grabación. "Canción del año" premia la composición, pero su sujeto es esa misma grabación ancla: la
   página de canción ya muestra sus autores ("Escrita por"), así que no hace falta un sujeto de tipo obra.
4. **Un nominado sin resolver no bloquea la publicación:** se guarda como texto y se muestra sin enlace hasta que se
   resuelva.
5. **La cobertura es explícita por categoría y ceremonia:** `complete` (todos los nominados) o `winner_only` (solo el
   ganador). La interfaz lo declara en vez de presentar una lista parcial como si fuera la real. Esto permite cubrir
   los ganadores del nivel A de toda la historia sin cargar sus nominaciones.
6. **Las categorías son por ceremonia, con una clave estable** para su historia. Una categoría renombrada, fusionada o
   dividida es una categoría distinta, enlazada a la anterior ("antes llamada …").
7. **Los nombres de categoría se traducen** (es/en) como texto de interfaz, porque en español se conocen por su nombre
   traducido ("Álbum del año"). Los títulos de obras y nombres de artistas siguen sin traducir, como todo dato
   musical.
8. **No se consulta Wikidata ni ninguna otra fuente para premios.** La regla del ADR 0021 (a Wikidata solo se llega
   desde la relación que declara MusicBrainz) no cambia.

## Consecuencias

- Cubrir una ceremonia es trabajo manual (unas 200 líneas de texto más la revisión de ambiguos), pero ocurre una vez
  al año y queda auditado en el historial de git.
- La base no es la fuente de verdad de los premios: el JSON lo es. Un cambio hecho directo en la base se pierde en la
  próxima carga.
- Los nominados que no estén en el catálogo entran como stub (`upsertReleaseGroupStub`, `upsertArtistStub`), igual que
  el cacheo bajo demanda; resolver una ceremonia puede sumar discos al catálogo.
- Los datos de premios son hechos y no tienen derechos de autor. "Grammy" es marca registrada: se usa solo para
  describir ("Premios Grammy 2025"), sin logos, imágenes de la estatuilla ni nada que sugiera afiliación.
- Si la carga se vuelve frecuente o la hace otra persona, se puede mover a la aplicación con el rol existente
  `editorial_curator`, manteniendo el mismo modelo.

## Alternativas descartadas

- **Wikidata como fuente o borrador:** cobertura y calidad insuficientes (ver Contexto).
- **Extraer grammy.com o Wikipedia:** términos de uso en el primer caso; parseo frágil y licencia del texto en el
  segundo. Ambos siguen siendo la referencia que el curador lee.
- **Curar desde la aplicación (rol `editorial_curator`) desde el inicio:** cómodo a largo plazo, pero exige
  formularios, permisos y auditoría que el volumen actual no justifica.
- **Buscar grabaciones directamente:** devuelve mezclas y versiones con el mismo puntaje que la original.
