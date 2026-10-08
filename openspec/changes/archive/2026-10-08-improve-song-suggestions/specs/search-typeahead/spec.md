## ADDED Requirements

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
