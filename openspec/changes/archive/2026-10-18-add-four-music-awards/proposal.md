## Why

Los premios hoy son solo los Grammy (2021–2026). Es un único premio, estadounidense y en inglés, en una plataforma con interfaz en
español: la sección "Premios" de Explorar y la página `/awards` (que ya redirige porque no hay nada que indexar) dicen poco. Hay
cuatro premios que encajan con el modelo actual (álbum, grabación y artista, en niveles general, por álbum y por género) y con el
contexto de la página, y cuyas ceremonias de 2021 en adelante ya están cerradas:

- **Latin Grammy** (industria, latino): la misma estructura que los Grammy, en español.
- **Premio Lo Nuestro** (Univision, votación mixta, latino): seis ceremonias cerradas (2021–2026).
- **Brit Awards** (industria británica): álbum, canción, artista, grupo y actos por género.
- **Mercury Prize** (críticos, solo álbumes): doce álbumes por año, una sola categoría; el contrapunto de crítica frente a los premios de industria.

Descartados, con motivo: AMAs (votación 100 % de fans y un año sin ceremonia), Billboard Latin Music Awards (los ganadores salen de listas
de ventas y streaming, no de votos ni jurado), Juno (~40 categorías y menos relevancia), Ivor Novello (nicho), Polaris (duplica el formato
del Mercury) y MTV VMAs, EMAs y BET (premian videos, coreografía o dirección: el modelo no tiene ese sujeto).

Con cinco premios la página deja de funcionar como está: la sección "Premios" de Explorar muestra las últimas 5 ceremonias sin importar el
premio (la dominarían los tres que se celebran en febrero) y `/awards` redirigía porque había un solo premio.

## What Changes

- **Cuatro premios nuevos, 2021 en adelante, todos en un mismo cambio** (datos en `data/awards/<premio>/`, con el flujo de curaduría de
  siempre: texto, resolución a MusicBrainz, revisión de lo ambiguo, carga):
  - Mercury Prize: 2021–2025. Latin Grammy: 2021–2025. Premio Lo Nuestro: 2021–2026. Brit Awards: 2021–2026.
  - Las ediciones de 2026 del Mercury (22-oct-2026) y del Latin Grammy (12-nov-2026) se agregan cuando se celebren: el modelo solo
    admite ceremonias cerradas.
  - De cada premio se cubren las categorías con nominados cuyo sujeto es un álbum, una grabación o un artista; no los reconocimientos
    honoríficos ni las categorías de video, técnicas, de empaque o de otros sujetos (alcance por premio en el diseño).
- **Sección "Premios" de Explorar: una tarjeta por premio** con su ceremonia más reciente y su ganador destacado (hoy son las últimas 5
  ceremonias de cualquier premio).
- **`/awards` pasa a ser el hub de premios** (con más de un premio): una tarjeta por premio, la misma de Explorar. Con un solo premio sigue
  redirigiendo.
- **Migas de pan con el nivel "Premios"** (Inicio / Premios / <premio> / <año>), que enlaza al hub.
- **Campos de género nuevos** con nombre es/en: urbano, tropical, regional mexicano, cantautor, brasileña y portuguesa, y otros géneros
  (los de Brit reutilizan pop, dance y electrónica, rock y alternativa, R&B y rap).
- **Fuente y tipo de votación en la página de la ceremonia**: una línea bajo el título con quién decide el premio (la academia, un jurado,
  el público y un comité) y un enlace a la fuente de la ceremonia (`sourceUrl`, hoy solo en los archivos), por la atribución de Wikipedia.
  Cada premio declara cómo se decide en su `categories.json` (campo `voting`) y cada ceremonia ya trae su `sourceUrl`; ambos se guardan en
  la base con una migración aditiva.
- **Documentación**: `docs/05-features/awards.md` (premios cubiertos y alcance de cada uno) y un ADR corto con los criterios para sumar un
  premio (encaje con el modelo, ceremonias cerradas, naturaleza editorial, relevancia y costo).

Fuera de alcance:

- Años anteriores a 2021 y cualquier otro premio (Juno, Ivor Novello, Polaris, AMAs…).
- Un sujeto nuevo (video) o distinguir el tipo de votación categoría por categoría: se indica por premio, no por categoría.
- Automatizar el borrador de las ceremonias desde Wikipedia (sigue siendo curaduría manual asistida; ver ADR 0032).
- Cambios en las páginas de ceremonia y de historia de categoría más allá de la miga de pan.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `music-awards`: se amplía la lista de campos de género, se agregan los requisitos de premios y años cubiertos con su alcance y de fuente y
  tipo de votación de la ceremonia, la miga de pan gana el nivel "Premios" y el índice pasa a ser un hub de tarjetas por premio.
- `album-discovery`: la sección "Premios" de Explorar muestra una tarjeta por premio con su ceremonia más reciente.

## Impact

- `data/awards/{mercury-prize,brit-awards,latin-grammy,lo-nuestro}/` (`categories.json` y `ceremonies/<año>.json`): ~2.500 nominaciones en total
  (estimado: Latin Grammy ~1.250, Lo Nuestro ~1.000, Brit ~360, Mercury ~70). Resolución a MusicBrainz con
  `scripts/resolve-award-nominees.ts` (unas 1,5–2 h de máquina en total, estimado) y carga con `scripts/load-awards.ts`.
- `src/services/awards/read.ts` (`listRecentCeremonies` → una ceremonia más reciente por premio), `AwardsExploreSection` (la tarjeta se
  extrae para compartirla con el hub), `awards/page.tsx` (hub), las migas de pan de la ceremonia y de la historia, y
  `explore/page.tsx`.
- Migración `0073_award_source_and_voting.sql` (aditiva): `award.voting` y `award_ceremony.source_url`, ambas nulas hasta la próxima carga
  (sin valores inventados) y con `CHECK`; espejo en `src/db/schema.ts` y `docs/03-data/sql-model.md`. `curation-schema.ts` (`voting` en
  `categories.json`, obligatorio), `load.ts` (escribe ambas columnas, idempotente) y los `categories.json` de los Grammy, que ganan `voting`.
- `getCeremonyPage` devuelve `sourceUrl` y `voting`; la cabecera de la ceremonia los muestra.
- `messages/{es,en}/awards.json`: nombres de premio, campos nuevos, tipos de votación y la etiqueta de fuente.
- Docs: `docs/05-features/awards.md`, `docs/03-data/sql-model.md`, ADR 0043. Sin cambios de API.
