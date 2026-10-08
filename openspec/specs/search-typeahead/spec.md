# search-typeahead Specification

## Purpose

Sugerencias del buscador mientras se escribe, servidas solo desde la base propia (sin MusicBrainz): coincidencia tolerante, puente artista + título, acciones para ver todos los resultados o buscar en otro tipo, y navegación accesible por teclado.
## Requirements
### Requirement: Sugerencias locales instantáneas

Mientras una persona escribe en el buscador (Header o `/search`), el sistema SHALL mostrar hasta
seis sugerencias del tipo activo obtenidas **exclusivamente de la base propia** mediante
`GET /api/search/suggest?type=<tipo>&q=<texto>`. Las sugerencias SHALL pedirse a partir de 2
caracteres tras normalizar y con debounce, y SHALL descartarse las respuestas de consultas
superadas. El endpoint SHALL NOT realizar ninguna solicitud a MusicBrainz ni persistir nada.

#### Scenario: Escribir un artista conocido
- **WHEN** una persona escribe `sabr` con el tipo Artistas y Sabrina Carpenter existe en la base
  local
- **THEN** Sabrina Carpenter aparece entre las sugerencias sin esperar a MusicBrainz

#### Scenario: Presupuesto cero
- **WHEN** se resuelve cualquier solicitud a `/api/search/suggest`
- **THEN** no se emite ninguna solicitud a MusicBrainz

#### Scenario: Menos de dos caracteres
- **WHEN** el campo contiene un solo carácter
- **THEN** no se piden sugerencias

### Requirement: Coincidencia tolerante y orden de sugerencias

Las sugerencias SHALL coincidir sin distinguir mayúsculas ni acentos y SHALL tolerar diferencias
menores de escritura (similitud por trigramas). SHALL ordenarse: coincidencia exacta, luego
prefijo, luego similitud; a igualdad, primero las entidades con actividad en la plataforma. Una
entidad cuyo nombre solo contiene la consulta a mitad de palabra (p. ej. "Morricone" para
`icon`) SHALL quedar detrás de las que coinciden por palabra completa.

#### Scenario: Acentos
- **WHEN** una persona escribe `motorhead` en Artistas
- **THEN** Motörhead aparece como sugerencia

#### Scenario: Palabra completa primero
- **WHEN** una persona escribe `icon` en Artistas y existen "Icon", "Despised Icon" y "Ennio
  Morricone"
- **THEN** "Icon" aparece antes que "Despised Icon" y ambos antes que "Ennio Morricone"

### Requirement: Puente artista + título en las sugerencias

Con el tipo Artistas, si la consulta empieza o termina con el nombre de un artista local y el
resto coincide con el título de un álbum de ese artista en la base local, las sugerencias SHALL
incluir una fila de ese álbum marcada con su tipo ("Álbum"). Elegirla SHALL abrir el álbum. El
puente SHALL calcularse solo con datos locales.

#### Scenario: Artista y álbum en Artistas
- **WHEN** una persona escribe `dokken back for` en Artistas y *Back for the Attack* de Dokken
  existe localmente
- **THEN** las sugerencias incluyen "Álbum · Back for the Attack — Dokken"

### Requirement: Acciones del desplegable

Debajo de las sugerencias, el desplegable SHALL ofrecer "Ver todos los resultados de «<texto>»
en <tipo>" y accesos "Buscar en otro tipo" para los demás tipos, que cambian el tipo del campo
conservando el texto. Si no hay sugerencias locales, el desplegable SHALL mostrar igualmente
estas acciones.

#### Scenario: Sin sugerencias locales
- **WHEN** una persona escribe `farruko` en Artistas y no hay coincidencias locales
- **THEN** el desplegable muestra "Ver todos los resultados de «farruko» en artistas" y los
  accesos a los otros tipos

#### Scenario: Cambiar de tipo desde el desplegable
- **WHEN** una persona pulsa "Álbumes" en "Buscar en otro tipo"
- **THEN** el selector pasa a Álbumes, el texto se conserva y las sugerencias se recalculan para
  álbumes

### Requirement: Navegación desde una sugerencia

Elegir una sugerencia SHALL navegar directamente a la entidad (`/artist/<id>`, `/album/<id>` o
`/users/<username>`); una sugerencia de canción SHALL navegar a
`/search?type=song&q=<artista> - <título>`. Enviar el formulario sin una sugerencia activa SHALL
navegar a `/search?type=<tipo>&q=<texto>`.

#### Scenario: Elegir artista sugerido
- **WHEN** una persona selecciona la sugerencia "Icon · US, Arizona hair metal band"
- **THEN** la aplicación abre el perfil de ese artista sin pasar por `/search`

#### Scenario: Enviar sin elegir
- **WHEN** una persona escribe `kiss` y pulsa Enter sin mover la selección
- **THEN** la aplicación navega a `/search?type=artist&q=kiss`

### Requirement: Accesibilidad y teclado del desplegable

El campo SHALL implementar el patrón combobox: `role="combobox"` con `aria-expanded` y
`aria-controls`, lista con `role="listbox"`, opción activa vía `aria-activedescendant`. Flecha
abajo/arriba SHALL mover la opción activa, Enter SHALL elegirla y Escape SHALL cerrar el
desplegable. La tecla Tab SHALL NOT reasignarse: sigue moviendo el foco. El número de
sugerencias SHALL anunciarse de forma no intrusiva.

#### Scenario: Recorrer con flechas
- **WHEN** una persona escribe `kiss`, pulsa flecha abajo dos veces y Enter
- **THEN** se abre la segunda sugerencia

#### Scenario: Escape
- **WHEN** el desplegable está abierto y la persona pulsa Escape
- **THEN** el desplegable se cierra y el foco sigue en el campo con el texto intacto

### Requirement: Falla silenciosa de sugerencias

Si `/api/search/suggest` falla, el buscador SHALL seguir funcionando: el desplegable muestra solo
las acciones y el envío navega a `/search` con normalidad, sin mensaje de error.

#### Scenario: Endpoint caído
- **WHEN** la solicitud de sugerencias falla
- **THEN** la persona puede enviar la búsqueda y llegar a los resultados

### Requirement: Sugerencias de canción agrupadas por canción

Las sugerencias del tipo Canciones SHALL agruparse por canción: título base (sin sufijos de versión como
"(live)", "[demo]" o " - Live at …", el mismo criterio que la búsqueda completa) y artista principal, sin
distinguir mayúsculas ni acentos. Cada grupo SHALL ocupar un solo lugar entre las sugerencias y SHALL
representarse por la grabación del grupo que aparece en más álbumes (`release_group` distintos con una pista de
esa grabación); a igualdad, la de título más parecido a la consulta. Artistas distintos SHALL formar grupos
distintos aunque el título coincida.

#### Scenario: Varias versiones de la misma canción

- **WHEN** una persona escribe `stairway` en Canciones y la base local tiene cuatro grabaciones de «Stairway to
  Heaven» de Led Zeppelin, una de ellas en 27 álbumes
- **THEN** Led Zeppelin aparece una sola vez y la sugerencia corresponde a la grabación de los 27 álbumes

#### Scenario: Misma canción, artistas distintos

- **WHEN** una persona escribe `paranoid` y existen «Paranoid» de Black Sabbath y de Ryan Preston
- **THEN** ambas aparecen como sugerencias separadas

### Requirement: Puente artista + canción en las sugerencias

Con el tipo Canciones, si la consulta empieza o termina con el nombre de un artista local y el resto tiene al
menos 2 caracteres, las sugerencias SHALL incluir las canciones de ese artista (crédito principal) cuyo título
base **empieza** por el resto, antes que las demás sugerencias. El puente SHALL calcularse solo con datos locales.

#### Scenario: Artista y canción

- **WHEN** una persona escribe `metallica one` y «One» de Metallica existe localmente
- **THEN** la primera sugerencia es «One — Metallica»

#### Scenario: Canción a medio escribir

- **WHEN** una persona escribe `oasis wonderw` y «Wonderwall» de Oasis existe localmente
- **THEN** la primera sugerencia es «Wonderwall — Oasis», no un tema de otro artista titulado «Oasis»

### Requirement: Orden de las sugerencias de canción

Las sugerencias de canción SHALL ordenarse: primero las del puente artista + canción; después las que cubren la
consulta (ver "Cobertura de la consulta en las sugerencias de canción"); después las coincidencias difusas, primero
las que cubren más palabras de la consulta. Dentro de cada bloque, por nivel de coincidencia del título base
(exacta, palabra completa, prefijo, resto) y, a igualdad:
actividad en la plataforma de cualquier grabación del grupo; número de álbumes en que aparece la canción; artista
con discografía explorada o con seguidores; similitud de texto. Ninguna de estas señales SHALL exponerse en la
respuesta.

#### Scenario: La versión con más álbumes primero

- **WHEN** una persona escribe `one` y existen «One» de Metallica (en 3 álbumes) y «One» de un cuarteto de
  cuerdas (en 1 álbum), sin actividad ninguna de las dos
- **THEN** «One — Metallica» aparece antes

#### Scenario: La actividad pesa más que los álbumes

- **WHEN** dos grupos empatan en nivel de coincidencia y el que aparece en menos álbumes tiene valoraciones en la
  plataforma
- **THEN** el que tiene valoraciones aparece antes

#### Scenario: Entre las difusas, las que cubren más palabras

- **WHEN** una persona escribe `oasis wonderw` y, además de «Wonderwall» de Oasis, existen «Wonderwall» de otros
  artistas e «I Wonder Why»
- **THEN** después de «Wonderwall — Oasis» aparecen las otras «Wonderwall» antes que «I Wonder Why»

#### Scenario: Una grabación sin álbumes va detrás

- **WHEN** una persona escribe `wonderwall` y una de las versiones es una grabación registrada sin pistas
- **THEN** las versiones que aparecen en algún álbum van antes que ella

### Requirement: Cobertura de la consulta en las sugerencias de canción

Una sugerencia de canción **cubre** la consulta si cada palabra de la consulta aparece, sin distinguir mayúsculas
ni acentos, entre las palabras del título o del artista principal; la última palabra puede ser un prefijo, porque
se está escribiendo. Las sugerencias que no cubren la consulta (coincidencias difusas por trigramas) SHALL
mostrarse solo para completar los lugares que dejen libres las que sí la cubren, para conservar la tolerancia a
erratas.

#### Scenario: Coincidencias difusas detrás

- **WHEN** una persona escribe `metallica one` y la base local tiene «One» de Metallica, «String Metallica» y
  «Metall»
- **THEN** «One — Metallica» aparece antes que «String Metallica» y «Metall»

#### Scenario: Errata

- **WHEN** una persona escribe `bohemian rapsody` y ninguna canción cubre la consulta
- **THEN** las sugerencias muestran igualmente las coincidencias difusas, como «Bohemian Rhapsody»

### Requirement: Tiempo de respuesta de las sugerencias de canción

Las sugerencias de canción SHALL mantener el tiempo de respuesta de una búsqueda local: las señales de orden
SHALL obtenerse con un número fijo de consultas en lote sobre los candidatos (nunca una por candidato), en
paralelo cuando no dependen entre sí. Con 3 caracteres o más tras normalizar, la mediana del cálculo SHALL NOT
superar 40 ms sobre la base de scratch; con 2 caracteres SHALL NOT superar la mediana anterior al cambio.

#### Scenario: Consulta habitual

- **WHEN** se piden sugerencias de canción para `taste` sobre la base de scratch
- **THEN** la mediana de varias ejecuciones es de 40 ms o menos

#### Scenario: Consulta de dos caracteres

- **WHEN** se piden sugerencias de canción para `on`
- **THEN** el tiempo no empeora respecto del medido antes del cambio

