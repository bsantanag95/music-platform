## Why

Los géneros de un álbum hoy vienen solo de Wikidata (P136): una lista plana que cubre ~40 % de los álbumes y no puede corregirse. La comunidad que valora, escucha y colecciona un álbum es la mejor fuente para decir de qué género es, y el usuario especialista necesita poder corregir y matizar. Este es el cambio 2 de la serie de géneros (después de `add-genre-taxonomy` y `show-genres`).

## What Changes

- Una persona que **interactuó con el álbum** (valoración, entrada de diario o colección) puede votar cada género del álbum **+1 / −1**, y **proponer** un género del vocabulario cerrado (la taxonomía de estilos) con un +1.
- Los votos son de **álbum**; el artista conserva su semilla de Wikidata y la canción hereda del álbum (sin cambios).
- Puntaje por género = semilla propia de Wikidata (cuenta como **un voto +1**) + votos de la comunidad. Los géneros con puntaje > 0 son los del álbum; **principal** = el de mayor puntaje, **secundarios** = los que alcanzan al menos la mitad del puntaje del principal; el resto queda en el "+N" de los chips. Sin géneros con puntaje positivo, el álbum **hereda** del artista como hasta ahora.
- **Agregado público, voto individual privado**; los votos no aparecen en el feed. Las cifras de votos se muestran solo con ≥ 5 votantes distintos para que un voto no sea deducible.
- Un voto **sobrevive** a que la persona quite su valoración, entrada o colección; las cuentas **desactivadas** dejan de contar mientras lo estén y vuelven al reactivarse; al **eliminar** la cuenta se borran en cascada. Las restricciones `social_activity` bloquean votar.
- Los **descriptores** (Instrumental, Navideña, Orquestal, Banda sonora) y los géneros ocultos **no se votan** en esta versión.
- Tope de **8 géneros votados** por persona y álbum.
- Interfaz: botón "Votar géneros" junto a los chips del álbum con un panel de ▲/▼ por género y buscador para proponer; para quien no puede votar, un aviso de por qué.
- Nueva migración `0057` (tabla de votos y redefinición de la vista de géneros efectivos).

## Capabilities

### New Capabilities
- `genre-votes`: votos ± y propuestas de género por álbum, elegibilidad, tope, privacidad, umbral de cifras y tratamiento de cuentas desactivadas.
- `genre-vote-panel`: panel de votación en la página del álbum y su API.

### Modified Capabilities
- `genre-seeds`: los géneros efectivos pasan a calcularse con puntaje (semilla + votos), principal/secundarios y herencia solo si no hay géneros positivos.
- `genre-display`: los chips del álbum se ordenan por puntaje y distinguen principal de secundarios.

## Impact

- Esquema: tabla `release_group_genre_vote`; vistas `release_group_genre_score` y `release_group_effective_genre` (redefinida con las mismas columnas más `score`); `src/db/schema.ts`; `docs/03-data/sql-model.md`.
- Servicios: `src/services/genres/votes.ts` (nuevo), `display.ts` y `read.ts` (orden por puntaje; mismas firmas), `catalog/` sin cambios.
- API: `GET/PUT/DELETE` bajo `/api/me/release-groups/{id}/genre-votes` y `GET /api/catalog/release-group/{id}/genre-votes`; `docs/04-api/contracts.md`.
- UI: componente `GenreVotePanel` en la cabecera del álbum; mensajes es/en.
- Docs: `business-rules.md`, `domain-model.md`, `05-features/genres.md`, ADR 0025 (los votos de la comunidad como fuente de géneros del álbum).
- Sin dependencias nuevas. Los votos de MusicBrainz siguen sin ingerirse (CC BY-NC-SA, ADR 0023).
