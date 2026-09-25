# album-editions Specification

## Purpose
Guardar todas las ediciones de un álbum desde MusicBrainz y derivar de ellas las variantes con pistas adicionales, sin darle página propia a ninguna edición.

## Requirements
### Requirement: Resumen de todas las ediciones

El sistema SHALL guardar, por cada `release_group` ingerido, un resumen de **todas** sus
ediciones en MusicBrainz, obtenido con el browse paginado de ediciones por release-group
(`inc=labels+media+release-groups`, 100 por página), con: `mbid`, título, desambiguación,
estado, fecha (fecha completa cuando existe y año con cualquier precisión), país, embalaje,
formato de cada disco, cantidad de discos, cantidad total de pistas (nula si MusicBrainz no
la informa) y sus sellos con número de catálogo. Los sellos SHALL guardarse como entidades
propias identificadas por su `mbid`. La ingesta SHALL ser idempotente: repetirla no
duplica ediciones, sellos ni relaciones. Las llamadas SHALL pasar por el cliente de
MusicBrainz existente.

#### Scenario: Álbum con más de 100 ediciones

- **WHEN** se ingiere un álbum con 150 ediciones en MusicBrainz
- **THEN** el sistema pide dos páginas y guarda las 150 ediciones con sus sellos

#### Scenario: Edición con sello y número de catálogo

- **WHEN** una edición informa el sello "Harvest" con número de catálogo "SHVL 804"
- **THEN** la edición queda asociada al sello "Harvest" (creado una sola vez por `mbid`)
  con ese número de catálogo

#### Scenario: Número de catálogo sin sello

- **WHEN** una edición informa un número de catálogo sin sello identificado
- **THEN** se guarda el número de catálogo sin sello

#### Scenario: Fecha parcial

- **WHEN** una edición tiene fecha "1973"
- **THEN** se guarda el año 1973 y la fecha completa queda nula

#### Scenario: Reingesta

- **WHEN** se sincronizan dos veces las ediciones del mismo álbum sin cambios en
  MusicBrainz
- **THEN** la base queda igual que tras la primera sincronización

### Requirement: Tope de páginas en la primera ingesta

En la primera ingesta de un álbum, el sistema SHALL pedir las páginas de ediciones en el
camino de la request hasta un máximo de 5 páginas (500 ediciones). Por encima del tope
SHALL continuar con las ediciones obtenidas y registrar un aviso en el log, sin fallar.

#### Scenario: Álbum que excede el tope

- **WHEN** un álbum tiene 700 ediciones en MusicBrainz
- **THEN** el sistema pide 5 páginas, elige la edición representativa entre esas 500 y
  registra un aviso

### Requirement: Sincronización de ediciones de álbumes existentes

Para un álbum ya ingerido cuyo resumen de ediciones está pendiente, el sistema SHALL
sincronizarlo fuera del camino de la respuesta (después de enviarla) al visitar la página
del álbum, con un lock por release-group que evite sincronizaciones concurrentes
duplicadas, y SHALL marcar el álbum como sincronizado solo al terminar correctamente. Un
fallo de MusicBrainz SHALL NOT afectar la respuesta de la página. La sincronización SHALL
NOT cambiar la edición representativa: si la elección sobre el conjunto completo difiere de
la ingerida, SHALL registrarlo en el log. El sistema SHALL ofrecer un script de backfill
con modos `--dry-run`, `--limit` y un reporte de álbumes cuya edición representativa
cambiaría.

#### Scenario: Primera visita tras el despliegue

- **WHEN** una persona visita un álbum ingerido antes de este cambio
- **THEN** la página responde con los datos actuales y el resumen de ediciones se
  sincroniza después, de modo que la siguiente visita ya lo tiene

#### Scenario: MusicBrainz caído

- **WHEN** la sincronización en segundo plano falla por un error de MusicBrainz
- **THEN** la página no se ve afectada y el álbum queda pendiente para un nuevo intento

#### Scenario: Representativa distinta sobre el conjunto completo

- **WHEN** con todas las ediciones la selección elegiría otra edición representativa
- **THEN** la sincronización no la cambia y el caso aparece en el reporte del script

#### Scenario: Visitas concurrentes

- **WHEN** dos visitas simultáneas encuentran el mismo álbum pendiente
- **THEN** solo una sincronización llama a MusicBrainz

### Requirement: Detección de variantes con pistas adicionales

El sistema SHALL detectar, mediante una función pura y determinista sobre el resumen de
ediciones, las **variantes** de un álbum: grupos de ediciones oficiales cuyo recuento
efectivo de pistas (contando una sola vez las capas de un SACD híbrido, que repiten el
programa) es mayor que el de la edición representativa, agrupadas por cantidad de pistas y
formatos. Cada variante SHALL exponer una edición elegida con los criterios de la selección
de edición representativa, un nombre (título de la edición si difiere del título del álbum,
si no la primera frase de su desambiguación, si no "Edición {año} · {formato}"),
año, sellos, formatos, países y cantidad de ediciones del grupo, la cantidad estimada de
pistas adicionales y si es una **caja** (embalaje de caja, 4 o más discos, o más del triple
de pistas que la representativa). Las ediciones con igual o menor cantidad de pistas que la
representativa SHALL NOT ser variantes.

#### Scenario: Ediciones de DSOTM

- **WHEN** se evalúan las 150 ediciones reales de *The Dark Side of the Moon*, cuya
  representativa tiene 10 pistas
- **THEN** las ediciones de 9 y 10 pistas no son variantes, los SACD híbridos de 30 pistas
  (3 capas del mismo programa) tampoco, la Experience Edition de 20 pistas es una sola
  variante con +10 pistas, y las ediciones de 74, 152 y 193 pistas son cajas

#### Scenario: Misma edición con distintas desambiguaciones de prensado

- **WHEN** varias ediciones con los mismos formatos y cantidad de pistas se diferencian solo
  por detalles de prensado en la desambiguación ("printed in EU", "stars in matrix")
- **THEN** forman una sola variante, nombrada con la primera frase de la desambiguación

#### Scenario: Varias ediciones con la misma lista

- **WHEN** tres ediciones oficiales "Experience Edition" de GB, US y JP tienen 20 pistas
- **THEN** forman una sola variante con 3 ediciones y los países GB, US y JP

#### Scenario: Orden indiferente

- **WHEN** el mismo conjunto de ediciones se evalúa en distinto orden
- **THEN** el resultado es el mismo

### Requirement: Pistas adicionales de una variante bajo demanda

El sistema SHALL exponer
`GET /api/catalog/release-group/{id}/editions/{editionId}/extra-tracks`, que devuelve las
pistas que la edición agrega a la lista de la edición representativa. Si la edición no
tiene tracklist ingerida, SHALL ingerirla con el cliente de MusicBrainz como edición **no
representativa** (una sola vez; después se lee de la base). Una pista SHALL considerarse
adicional si su grabación no está en la lista de la representativa y su título normalizado
tampoco coincide con el de una pista de esa lista. La normalización SHALL ignorar
mayúsculas, acentos y marcas de remasterización, y SHALL conservar cualquier otro
calificador (en vivo, demo, remix). Para una variante de tipo caja el endpoint SHALL
responder con un código de error propio sin ingerir la lista. El endpoint SHALL usar la
respuesta de error uniforme.

#### Scenario: Primera apertura de una variante

- **WHEN** se piden las pistas adicionales de una edición sin tracklist ingerida
- **THEN** el sistema hace una request a MusicBrainz, guarda la edición como no
  representativa y responde las pistas adicionales

#### Scenario: Segunda apertura

- **WHEN** se piden de nuevo las pistas adicionales de la misma edición
- **THEN** el sistema responde desde la base sin llamar a MusicBrainz

#### Scenario: Remaster como grabación distinta

- **WHEN** la edición contiene "Money - 2011 Remaster" como grabación distinta de "Money"
  de la lista principal
- **THEN** esa pista no se devuelve como adicional

#### Scenario: Versión en vivo

- **WHEN** la edición contiene "Money (Live)" como grabación distinta
- **THEN** esa pista se devuelve como adicional

#### Scenario: Caja

- **WHEN** se piden las pistas adicionales de una variante de tipo caja
- **THEN** el endpoint responde el error de caja y no llama a MusicBrainz

#### Scenario: Edición de otro álbum

- **WHEN** el `editionId` no pertenece al release-group del path
- **THEN** el endpoint responde not found con el formato de error uniforme

