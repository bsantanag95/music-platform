## Context

Tras `add-genre-taxonomy` y `show-genres`, los géneros de un álbum salen de la vista `release_group_effective_genre`: semillas propias de Wikidata (P136, lista plana sin conteos) o, si no hay, los 3 primeros géneros de estilo del artista principal. Todas las lecturas (chips, Explorar, Caminos, huella de gusto, página de género) usan esa vista. Ya existe: `rating`, `listen_entry` y `collection_entry` por usuario y álbum; `hasActiveRestriction(userId, "social_activity")`; `app_user.deactivated_at`; la búsqueda `GET /api/genres/search`.

Este cambio agrega votos de la comunidad sobre el álbum. Las decisiones de producto (votar solo álbumes, ± por género, quién puede votar, privacidad, semilla acotada) están tomadas desde la exploración; aquí se fijan las cuatro pendientes y el mecanismo.

## Goals / Non-Goals

**Goals:**
- Que la comunidad corrija y matice los géneros de un álbum con votos ± y propuestas del vocabulario cerrado.
- Mantener **una sola definición** de géneros efectivos: los lectores existentes no cambian de consulta.
- Que un voto individual no sea deducible ni aparezca en el feed.

**Non-Goals:**
- Votos sobre artistas o canciones (el artista conserva su semilla; la canción hereda del álbum).
- Votar descriptores o géneros ocultos; proponer géneros fuera de la taxonomía.
- Moderación específica de votos (las restricciones `social_activity` ya cubren el abuso).
- Importar votos de MusicBrainz (CC BY-NC-SA, ADR 0023).

## Decisions

**1. La semilla de Wikidata vale un voto +1.** Se guarda aparte (`release_group_genre_seed`, sin cambios) y se suma al calcular el puntaje. Así un voto −1 la neutraliza (1 − 1 = 0, deja de ser positiva), dos la dejan en −1 y un voto +1 de la comunidad la iguala. Una persona sola puede quitar una semilla errónea de Wikidata, y otra puede devolverla. *Alternativa descartada:* peso mayor para la semilla (3), porque volvería casi imposible corregir un error de Wikidata; *y* ignorarla en cuanto hay votos, porque perdería la señal en álbumes con pocos votantes.

**2. Puntaje, principal y secundarios.** `score(g) = (1 si g es semilla propia) + Σ votos(g)`. Géneros del álbum = los de `score > 0`, ordenados por puntaje (desempate: posición de la semilla, luego nombre). **Principal** = el primero; **secundarios** = los que tienen `score ≥ max(1, 0,5 × principal)`; los demás con `score > 0` siguen siendo géneros del álbum (cuentan en Explorar y en la huella) pero se muestran en el "+N". *Alternativa descartada:* umbral absoluto de votos, porque depende del tamaño de la comunidad de cada álbum.

**3. Herencia solo sin géneros positivos.** Si ningún género del álbum tiene `score > 0`, se heredan los 3 primeros del artista como hasta ahora (`inherited = true`). Un álbum con una propuesta aprobada deja de heredar: la comunidad ya dijo algo. Los votos negativos sobre una semilla no activan la herencia por sí solos (si la semilla queda en ≤ 0 y no hay otros, se hereda).

**4. Vista en dos capas, mismas columnas.** Nueva `release_group_genre_score(release_group_id, genre_id, seed, up, down, score, position)` y `release_group_effective_genre` redefinida sobre ella con las columnas actuales (`release_group_id, genre_id, position, inherited`) más `score` al final. `position` pasa a ser el rango por puntaje (1 = principal). Los lectores existentes (`read.ts`, `camino/discovery.ts`, `stats.ts`) no cambian de forma; solo `display.ts` lee `score` para separar principal de secundarios. Los géneros `hidden` y los de `kind <> 'style'` no se cuentan.

**5. Quién puede votar.** Sesión + cuenta no desactivada + sin restricción `social_activity` activa + haber interactuado con **ese** álbum (existe fila en `rating`, `listen_entry` o `collection_entry` con `release_group_id` igual). Se comprueba **al escribir**, no al leer: un voto **sobrevive** a que la persona quite su valoración, entrada o colección. *Alternativa descartada:* revalidar la interacción en cada lectura, porque haría el puntaje inestable y caro y castigaría a quien limpia su diario.

**6. Cuentas.** Los votos de una cuenta con `deactivated_at` no nulo **no cuentan** (condición en la vista) y vuelven al reactivarse; al eliminar la cuenta se borran por `ON DELETE CASCADE`. Una restricción `social_activity` bloquea votar pero no retira votos ya emitidos.

**7. Tabla y restricciones.** `release_group_genre_vote(id, user_id, release_group_id, genre_id, value, created_at, updated_at)` con `UNIQUE (user_id, release_group_id, genre_id)`, `CHECK (value IN (-1, 1))`, FK a `genre` con `RESTRICT` (igual que las semillas) y `ON DELETE CASCADE` hacia usuario y álbum. Índice por `(release_group_id, genre_id)`. El tope de **8 géneros por persona y álbum** y que el género sea `kind = 'style'` se validan en el servicio, en una transacción que cuenta las filas del usuario (un `CHECK` no puede contar filas). `updated_at` con el trigger común.

**8. Proponer es votar +1.** No hay tabla de propuestas: votar +1 un género que el álbum no tiene lo crea con puntaje 1. El vocabulario cerrado es la taxonomía de estilos (se reutiliza `GET /api/genres/search`).

**9. Privacidad y cifras.** Los votos individuales solo los lee su autor. El agregado público expone, por género, el puntaje y los votos ▲/▼ **solo si el álbum tiene ≥ 5 votantes distintos**; con menos se muestran los géneros ordenados sin cifras. No se publica evento al feed.

**10. API.** `GET /api/catalog/release-group/{id}/genre-votes` (público: géneros con puntaje, principal/secundario y cifras según el umbral; con sesión añade `mine` y `canVote` con la razón); `PUT /api/me/release-groups/{id}/genre-votes/{slug}` con `{ value: 1 | -1 }` (crea o cambia); `DELETE` del mismo recurso retira el voto. Errores con el contrato uniforme: `403` (`SOCIAL_SUSPENSION_ACTIVE`, `GENRE_VOTE_NO_INTERACTION`), `400 VALIDATION_ERROR` (género no votable, tope), `404` (`ALBUM_NOT_FOUND` o `GENRE_NOT_FOUND`).

**11. Canción.** Sigue heredando del álbum de su disco principal (`getSongGenres(principalDisc.releaseGroupId)`); no cambia.

## Risks / Trade-offs

- **Manipulación por cuentas falsas** → exigir interacción real con el álbum, el tope de 8, las restricciones sociales y que la semilla y el voto de una sola persona no desplacen a una comunidad; no se descarta moderación posterior.
- **Comunidad pequeña: un solo votante decide** → con pocos votos el puntaje ya es la mejor señal disponible; las cifras se ocultan bajo 5 votantes para no exponer a nadie.
- **Vista más cara** (agrega votos en cada lectura) → índice `(release_group_id, genre_id)`; las lecturas de Explorar ya filtran por género; medir en scratch y, si pesa, materializar el puntaje (decisión fuera de este cambio).
- **Voto que sobrevive sin interacción** → es deliberado (decisión 5); documentado en `business-rules.md`.
- **Reordenar la vista afecta a todos los lectores** → se mantienen columnas y semántica de `inherited`; pruebas de la vista y smoke de Explorar, Caminos y huella.

## Migration Plan

1. Migración `0057_genre_votes.sql`: crea la tabla y el trigger, crea `release_group_genre_score` y reemplaza `release_group_effective_genre` (`DROP VIEW` + `CREATE VIEW`; solo la leen consultas, ninguna vista ni función depende de ella).
2. Sin datos que migrar: sin votos el resultado de la vista es idéntico al actual (la semilla vale 1 y es el único término).
3. Reversión: volver a la definición de la vista de `0056` y borrar la tabla en un `.sql` nuevo; no se edita un `.sql` aplicado.

## Open Questions

- Si más adelante conviene un voto sobre descriptores (Instrumental, Orquestal) o sobre canciones.
- Materializar el puntaje si la vista resulta lenta con catálogos grandes.
