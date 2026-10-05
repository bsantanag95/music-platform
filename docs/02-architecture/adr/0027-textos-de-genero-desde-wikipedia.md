# ADR 0027 — Textos de género desde Wikipedia

## Estado

Aceptado (cambio `redesign-genre-page`, 2026-10). Extiende el ADR 0021 (Wikimedia como fuente del perfil de artista) a
los géneros y se apoya en el ADR 0023 (taxonomía de géneros); no reescribe ninguno.

## Contexto

La página de género (`/genre/<slug>`) mostraba relaciones y listados, pero no decía qué es el género. La taxonomía (ADR
0023) ya guarda, por cada género, el `wikidata_id` del ítem que Wikidata enlaza con la propiedad P8052 («ID de género de
MusicBrainz»): la identidad del ítem sale de una declaración atada al MBID, no de buscar por el nombre. El ADR 0021 fijó
las reglas para llegar a Wikimedia (único cliente, User-Agent con contacto, cola serial, `maxlag`) y para tratar el texto
de Wikipedia (CC BY-SA 4.0, atribución visible, sin traducción automática).

Un riesgo propio de los géneros: el nombre mostrado puede no coincidir con el artículo (el género «classical» de
MusicBrainz se muestra como «música clásica» por una corrección curada, pero su ítem de Wikidata es «música culta»).

## Decisión

1. **Se llega a Wikidata solo por `genre.wikidata_id`**, que viene de la declaración P8052 atada al MBID. Nunca se
   busca un ítem por el nombre del género. Un género sin `wikidata_id` queda sin texto.
2. **Se guarda, por género e idioma (`es`, `en`), la descripción corta de Wikidata y la introducción del artículo de
   Wikipedia** con su título y su URL canónica, en `genre_localized_text` (la misma forma que
   `artist_localized_text`). Sin traducción automática: si un idioma no tiene artículo, se muestra el del otro idioma
   indicando cuál es.
3. **Sincronización en segundo plano** (`after()`), con candado por género y vigencia de 30 días. La página nunca
   espera a Wikimedia: la primera visita responde sin texto. Si falla la lectura de la entidad no se escribe nada y el
   género queda pendiente; si falla el extracto de un idioma se conserva el texto anterior de ese idioma.
4. **Atribución visible junto al texto**: «Fuente: Wikipedia» con enlace al artículo —mostrando **el título del
   artículo**, para no presentar «música culta» como «música clásica»— y a la licencia CC BY-SA 4.0. Se muestra el primer
   párrafo (~600 caracteres cortados en límite de oración) y el resto tras un desplegable; el texto no se modifica.
5. **Relleno** con `scripts/backfill-genre-about.ts`: ordenado por cantidad de álbumes del género, reanudable, de un
   solo proceso (respeta la cola serial del cliente). Con ~1 s por género cubre unos 2.200 géneros en menos de una hora.
6. **Sin retiro a pedido**: a diferencia de la foto del artista, un texto equivocado se corrige en la siguiente
   sincronización, y `--force --slug` la adelanta si es urgente.

## Alternativas descartadas

- **Buscar el artículo por el nombre del género.** Es el homónimo-trampa que el ADR 0021 evita («Garage», «House»).
- **Traducir el texto del otro idioma.** La licencia lo permitiría, pero es traducción automática sin revisar; el
  proyecto no la usa para contenido de terceros.
- **Escribir los textos a mano.** No escala a 2.200 géneros y duplica lo que Wikipedia ya mantiene.
- **Sincronizar en la visita y esperar.** La página dependería de la latencia de Wikimedia.

## Consecuencias

- Una tabla nueva (`genre_localized_text`) y una columna (`genre.wikimedia_synced_at`), migración `0059`.
- Hasta tres requests a Wikimedia por género (una entidad y un extracto por idioma), en segundo plano.
- El vandalismo en Wikipedia llega a la página hasta la siguiente sincronización (30 días como máximo); la atribución con
  enlace permite al lector contrastar.
- Licencias que se suman (ver `docs/03-data/data-licensing.md`, sección D): el texto de Wikipedia es CC BY-SA 4.0; los
  datos de Wikidata son CC0.
