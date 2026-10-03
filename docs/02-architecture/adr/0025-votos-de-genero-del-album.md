# ADR 0025 — Votos de la comunidad como fuente de géneros del álbum

## Estado

Aceptado (cambio `add-genre-votes`, 2026-10). Complementa el ADR 0023 (taxonomía y semillas) y el ADR 0024.

## Contexto

Los géneros de un álbum salían solo de Wikidata (P136): una lista plana, sin conteos y con cobertura parcial. No había
forma de corregirla ni de matizarla. Los votos por entidad de MusicBrainz no pueden ingerirse (CC BY-NC-SA, ADR 0023),
así que la señal que falta tiene que venir de la propia comunidad.

## Decisión

1. **Se vota solo el álbum.** El artista conserva su semilla de Wikidata y la canción hereda del álbum de su disco
   principal. Un voto es +1 o −1 sobre un género de estilo visible; votar un género que el álbum no tiene lo propone.
   No hay tabla de propuestas: el vocabulario cerrado es la taxonomía.
2. **Puntaje = semilla + votos.** La semilla de Wikidata vale **un voto +1** y se guarda aparte; los votos de cuentas con
   `deactivated_at IS NULL` suman ±1. Los géneros del álbum son los de puntaje > 0. Un −1 neutraliza una semilla
   (1 − 1 = 0) y otro +1 la devuelve.
3. **Principal y secundarios derivados del puntaje.** El de mayor puntaje es el principal; los que alcanzan al menos la
   mitad de su puntaje (mínimo 1) son secundarios; el resto queda en el "+N". Ninguna marca se almacena.
4. **Herencia solo sin géneros positivos.** Si ningún género del álbum tiene puntaje > 0, se heredan los 3 primeros del
   artista (ADR 0023). Una propuesta aprobada deja de heredar: la comunidad ya habló.
5. **Quién vota.** Sesión, cuenta no desactivada, sin restricción `social_activity` y haber interactuado con **ese**
   álbum (valoración, entrada de diario o colección). La interacción se comprueba **al escribir**: el voto sobrevive a
   que la persona quite su valoración, entrada o colección. Tope de 8 géneros votados por persona y álbum, validado en el
   servicio dentro de una transacción con bloqueo consultivo por persona y álbum (un `CHECK` no cuenta filas).
6. **Privacidad.** El voto individual solo lo lee su autor y no genera actividad. Las cifras (▲ / ▼) solo se publican con
   al menos 5 votantes distintos, para que un voto no sea deducible.
7. **Una sola definición para todas las lecturas.** La vista `release_group_effective_genre` se redefine sobre una nueva
   `release_group_genre_score` y conserva sus columnas (se suma `score`). Explorar, Caminos, la huella de gusto, la página
   de género y las cabeceras reflejan el puntaje sin cambiar sus consultas.
8. **Cuentas.** Los votos de una cuenta desactivada no cuentan mientras lo esté y vuelven al reactivarla; al eliminar la
   cuenta se borran en cascada. Una restricción social bloquea votar pero no retira votos ya emitidos.

## Alternativas descartadas

- **Dar más peso a la semilla** (p. ej. 3 votos): haría casi imposible corregir un error de Wikidata.
- **Ignorar la semilla en cuanto hay votos:** se pierde la única señal en álbumes con pocos votantes.
- **Revalidar la interacción en cada lectura:** puntaje inestable y caro; castigaría a quien limpia su diario.
- **Umbral absoluto de votos para el principal:** depende del tamaño de la comunidad de cada álbum.
- **Votar artistas y canciones:** el artista ya tiene semilla y la canción hereda; duplicaría el trabajo sin valor claro.
- **Tabla de propuestas aparte:** el vocabulario es cerrado; una propuesta es un voto +1.

## Consecuencias

- Migración `0057`: tabla `release_group_genre_vote`, vista `release_group_genre_score` y vista de efectivos redefinida.
- La vista agrega votos en cada lectura (índice `(release_group_id, genre_id)`); si pesa con catálogos grandes habrá que
  materializar el puntaje (decisión fuera de este cambio).
- Una sola persona puede neutralizar una semilla con un −1 y otra devolverla con un +1: es el coste de que la semilla
  valga un voto.
- La interacción exigida es un requisito de entrada, no de permanencia: un voto puede quedar sin valoración que lo
  respalde. Es deliberado.
- Superficie: `GET /api/catalog/release-group/{id}/genre-votes`, `PUT`/`DELETE
  /api/me/release-groups/{id}/genre-votes/{slug}` y el panel `GenreVotePanel` de la cabecera del álbum.
