# ADR 0044 — Los salones de la fama como tipo de premio

## Estado

Aceptado (cambio `add-grammy-hall-of-fame`, 2026-10). Extiende los ADR 0032 (premios curados en JSON versionado) y 0043
(premios adicionales y criterios para sumar uno) sin reescribirlos, y enmienda el punto 3 del 0043 ("no se cargan los
reconocimientos honoríficos") solo para los salones de la fama.

## Contexto

Los premios (ADR 0032, 0043) son competencias: una ceremonia anual, categorías con nominados y un ganador por categoría. Un
**salón de la fama** es otra cosa: incorpora cada año una **clase** de grabaciones o artistas por su valor histórico, sin
nominados ni competencia. El Grammy Hall of Fame (datos al 2026-10-19):

- Honra grabaciones de más de 25 años, álbumes y canciones de cualquier género; lo decide un comité de miembros de la
  Recording Academy.
- Las últimas cinco clases son 2020 (25 grabaciones), 2021 (29), 2024 (10), 2025 (13) y 2026 (14): **no hubo clases en 2022 ni
  en 2023**. La clase "2021" se anunció el 21 de diciembre de 2020; la gala existe desde 2024 (las clases 2020 y 2021 solo
  tienen fecha de anuncio).
- El comunicado oficial de cada clase solo trae título, artista y formato; no trae género, sello ni año de grabación.

El modelo de premios admite casi todo esto (una ceremonia por clase, una categoría para los álbumes y otra para las canciones,
sujetos del catálogo, ganadores) pero tres supuestos no se cumplen: toda ceremonia tiene un número de edición, su fecha es del
año de su edición, y toda nominación ganadora cuenta como premio ganado en las tarjetas, los rankings y el orden del catálogo.

## Decisión

1. **Un tipo de premio, no tablas nuevas.** `award.kind` es `competition` (por omisión: describe con verdad a los cinco premios
   cargados) o `hall_of_fame`. La curaduría, la resolución a MBID y la carga de ADR 0032 se reutilizan; sumar otro salón es una
   carpeta en `data/awards/` con `kind: hall_of_fame` en su `categories.json`.
2. **Una clase es una ceremonia sin número de edición.** `award_ceremony.edition` admite `NULL` (las organizaciones no numeran
   sus clases y numerarlas sería inventar un dato). `held_on` es la fecha de la gala; si la fuente no la da, la del anuncio, y
   puede ser del año anterior al de la clase (`CHECK` de `held_on` entre `year - 1` y `year`). Que una competencia exija edición
   y el mismo año, y un salón no tenga edición, cruza tablas: lo valida la carga (`validateCeremony`), no un `CHECK`.
3. **Dos categorías por clase** del Grammy Hall of Fame: Álbumes (sujeto: el disco) y Canciones (sujeto: la grabación anclada en
   su sencillo o disco, ADR 0032 punto 3). Cada incorporación es una nominación ganadora. Un salón no tiene mínimo de nominados
   (una clase puede traer dos canciones) y su cobertura es siempre `complete`.
4. **Solo clases cerradas**, como los premios: una clase se carga cuando su gala ya se celebró; la carga rechaza una con
   `held_on` futura. Se cubren las últimas **cinco clases**, no los últimos cinco años.
5. **Una incorporación no es un premio ganado.** Las tarjetas de premios (Explorar y hub), "Ganadores recientes", "Los más
   premiados", "Tu relación con los ganadores recientes", los dos puntajes que ordenan el catálogo (`awardScore` de
   `discovery.ts` y de `collections/signal.ts`) y la plantilla de colección `grammy-winners` leen solo premios `competition`. El
   puntaje se excluye para no alterar el orden del catálogo sin decisión de producto; que una incorporación sume es un cambio
   aparte. `grammy-winners` elegía la ceremonia más reciente **de cualquier premio**: sin el filtro, la clase 2026 del salón (8 de
   mayo) se habría vuelto "Ganadores del grammy-hall-of-fame 2026".
6. **Presentación propia dentro de las mismas rutas.** La ceremonia de un salón es "Clase de {año}", con "Fecha de la clase"
   (no "Gala": las clases 2020 y 2021 no tuvieron), "Ingresó" en lugar de "Ganador", sin edición, sin bloque de nominados si no
   los hay y sin historia de la categoría. Explorar suma una sección "Salón de la Fama" tras Premios y el hub `/awards` un bloque
   "Salones de la fama" bajo los premios.
7. **Marca y fuente.** "Grammy Hall of Fame" se usa como nombre descriptivo, sin logos ni imágenes del Grammy Museum. No se
   copian las descripciones del sitio de la Academia: solo hechos (título, artista, formato, año de la clase). Cada clase cita
   su comunicado oficial (`sourceUrl`), contrastado con las tablas de Wikipedia ("Year inducted").
8. **Criterios para sumar otro salón** (equivalentes a los del ADR 0043, adaptados): el sujeto de cada incorporación es un álbum,
   una grabación o un artista del catálogo; decide una academia, un comité o un jurado, no el público; cada clase es pública y
   tiene una fuente citable; hay clases cerradas recientes; el volumen es abordable.

## Consecuencias

- `award.kind` y `award_ceremony.edition` nulable (migración `0074`) son aditivas: el código anterior trata toda ceremonia como
  una competencia. La migración también ensancha `held_on`; una competencia sigue validándose con el mismo año en la carga.
- Todo lector nuevo de `award_nomination` debe decidir si cuenta los salones. La subconsulta `competitionNominations` y el
  parámetro de `allCeremonies(kind)` existen para no repetir el filtro; el smoke test carga un salón sintético y comprueba que no
  aparece en las tarjetas, los rankings ni los puntajes.
- Las canciones antiguas (singles de 1926) rara vez tienen un disco ancla en MusicBrainz: se publican como texto sin enlace
  (10 de las 91 incorporaciones de las cinco clases); no bloquean la carga.
- Los discos que entran como stub no traen carátula hasta que alguien los ve: se resuelven bajo demanda desde Cover Art Archive,
  como cualquier disco del catálogo.
- Un salón futuro que publique nominados que no entraron cabe en el modelo (`won: false`); la presentación ya omite el bloque
  "Nominados" solo cuando no hay ninguno.

## Nota (cambio `add-national-recording-registry`, 2026-10)

El segundo salón, el National Recording Registry de la Biblioteca del Congreso (`voting: jury`), se sumó **sin cambios de modelo ni de
lectura**: una carpeta en `data/awards/`, su nombre en los mensajes y una categoría más ("Otras grabaciones", de entradas que no son música
y se cargan siempre como texto). Confirma el punto 1 (un salón es una carpeta de datos). Con dos salones, la sección de Explorar dejó
el riel con las incorporaciones por una tarjeta por salón, como Premios (el riel de cada clase escalaba mal); las incorporaciones se
ven en la página de la clase.

## Alternativas descartadas

- **Tablas propias para los salones:** duplicaría curaduría, resolución y carga para un modelo que ya los cubre.
- **Reconocer un salón por su slug:** frágil; un `kind` explícito se valida y se lee.
- **Numerar las clases:** inventar un dato que la fuente no da.
- **Contar las incorporaciones como premios ganados:** inflaría "Los más premiados" y el puntaje de destacados con algo que no
  es una competencia.
- **Dos premios, uno de álbumes y otro de canciones:** partiría una clase en dos páginas.
