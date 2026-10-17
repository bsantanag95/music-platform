# ADR 0042 — Niveles y campos de categoría de premios; categorías de persona

## Estado

Aceptado (cambio `expand-grammy-categories`, 2026-10). Extiende el ADR 0032 (premios curados en JSON versionado) sin
reescribirlo.

## Contexto

`add-music-awards` cargó los Grammy con dos niveles de categoría: `general` (las cuatro grandes) y `genre` (los
"Mejor álbum de …"). Para cubrir la ceremonia de 2026 y sumar las categorías que más se comentan después de las
grandes —interpretaciones, canciones y grabaciones por género, Productor y Compositor del año— hacen falta tres cosas
que el modelo no tenía: una jerarquía de tres niveles, una forma de agrupar decenas de categorías de género sin que la
página sea una lista interminable, y un sujeto para las categorías que premian a una persona.

## Decisión

1. **Tres niveles**, en este orden de presentación: `general`, `album` y `genre`. El orden es el de la tupla
   `AWARD_CATEGORY_TIERS` y de ella se derivan `awardTierRank` (TypeScript) y `awardTierRankSql` (SQL). Los tres
   lugares que ordenaban "general primero, el resto después" (página de ceremonia, contexto de la colección de
   ganadores y la plantilla `grammy-winners`) usan esas dos funciones. La migración `0072` pasa las filas `genre`
   existentes a `album`: todas eran "Mejor álbum de …".
2. **Campo** (`award_category.field`) para el nivel `genre`: pop, dance-electronic, rock-alternative, rnb, rap,
   country. Es obligatorio en ese nivel y solo en él (`CHECK`). Su nombre visible es texto de interfaz
   (`messages/*/awards.json`, `fields.*`), con una prueba que falla si falta una traducción, y el orden de los campos
   es el de sus categorías (la validación exige que las de un campo sean contiguas).
3. **Productor y Compositor del año** son categorías de `subject_kind = artist` en el nivel `general`: reutilizan el
   sujeto de "Mejor artista nuevo" y la nominación enlaza al perfil del artista. No se carga la lista de obras que cita
   la fuente.
4. **Selección acotada de categorías.** Entran las transversales, los álbumes de los campos principales y las
   interpretaciones, canciones y grabaciones de pop, dance/electrónica, rock/metal/alternativa, R&B, rap y country.
   Quedan fuera las técnicas, las de otro formato y las de nicho. El criterio vive en `docs/05-features/awards.md`.
5. **Una categoría renombrada es otra categoría** (ADR 0032, punto 6) también cuando la fuente lo revela al cargar:
   "Mejor grabación dance" (2021) y su sucesora "Mejor grabación dance/electrónica" (desde 2022) quedan enlazadas.
6. **Una categoría `complete` exige al menos tres nominados** en la validación del esquema. No se deja a la
   revisión humana.

## Consecuencias

- Agregar una categoría o un campo es una entrada en `categories.json` (y un nombre de campo en `messages` si el campo
  es nuevo); no cambia el esquema ni el cargador.
- El nivel `genre` cambió de significado; cualquier consumidor que filtre por `tier = 'genre'` esperando álbumes debe
  revisarse (los usos conocidos se actualizaron en el mismo cambio).
- La señal de "premio" que usa Explorar para ordenar discos cuenta cualquier nominación, también las de grabación
  (por su disco ancla); con más categorías, más discos reciben la señal. Es coherente con el diseño original y no se
  modificó.
- Las categorías de grabación sin disco conocido arrancan con el sencillo homónimo como ancla; las que MusicBrainz no
  resuelve así quedan como texto hasta que la persona curadora fija el álbum.

## Alternativas descartadas

- **Un solo nivel con campo para todo** ("Pop: álbum, interpretación, canción"): rompe la jerarquía (lo general
  primero) y mezcla en una tarjeta cosas de peso muy distinto.
- **Tabla `award_field` con nombres es/en:** más fiel al modelo, pero una tabla, un archivo y un cargador para seis
  valores casi inmutables.
- **Un sujeto "persona" nuevo para Productor y Compositor:** el artista del catálogo ya es esa persona y ya tiene perfil.
- **Cargar todas las categorías del premio:** volumen alto para un valor bajo en las técnicas y de nicho.
