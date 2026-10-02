# genre-seeds Specification

## Purpose
Géneros semilla de artistas y álbumes desde Wikidata (P136), géneros efectivos con herencia desde el artista, y su separación de los votos de la comunidad.

## Requirements
### Requirement: Géneros semilla del artista desde Wikidata

El sistema SHALL tomar los géneros semilla de un artista de la propiedad de género (P136) de su
entidad de Wikidata, la misma que declara MusicBrainz y que ya usa el enriquecimiento de
Wikimedia, sin requests adicionales. SHALL usar los valores vigentes de P136 (los de rango
preferido si existen; si no, los de rango normal; nunca los obsoletos), traducir cada uno a un
género de la taxonomía por su entidad de Wikidata y descartar los que no tienen traducción o
están ocultos. Cada actualización SHALL reemplazar las semillas del artista conservando el orden
de Wikidata. Un fallo de este paso SHALL conservar las semillas anteriores. Un artista sin
entidad de Wikidata SHALL quedar sin semillas.

#### Scenario: Artista con géneros en Wikidata

- **WHEN** se enriquece un artista cuya entidad de Wikidata tiene en P136 "shoegaze" y "dream pop"
- **THEN** el artista guarda esos dos géneros como semilla, en ese orden

#### Scenario: Valor sin traducción

- **WHEN** P136 incluye una entidad de Wikidata que no corresponde a ningún género de la
  taxonomía
- **THEN** ese valor se descarta y el resto se guarda

#### Scenario: Rango preferido

- **WHEN** P136 tiene un valor de rango preferido y dos de rango normal
- **THEN** el artista guarda solo el de rango preferido

#### Scenario: Wikidata falla

- **WHEN** Wikidata responde con error al actualizar un artista que ya tenía semillas
- **THEN** el artista conserva sus semillas anteriores

### Requirement: Géneros semilla del álbum desde Wikidata

El sistema SHALL tomar los géneros semilla de un álbum de P136 de la entidad de Wikidata que
MusicBrainz declara para ese álbum, con las mismas reglas de rango, traducción y descarte que el
artista. La consulta SHALL ejecutarse en segundo plano al terminar la sincronización de la
discografía, en lotes de hasta 50 álbumes por request, para los álbumes nunca sincronizados o
sincronizados hace más de 30 días. Un álbum sin entidad de Wikidata SHALL quedar sincronizado sin
semillas. Un fallo de un lote SHALL conservar las semillas de esos álbumes.

#### Scenario: Discografía con álbumes enlazados

- **WHEN** termina la sincronización de la discografía de un artista con 80 álbumes enlazados a
  Wikidata
- **THEN** el sistema pide sus entidades en 2 requests en segundo plano y guarda sus semillas

#### Scenario: Álbum sin entidad de Wikidata

- **WHEN** MusicBrainz no declara entidad de Wikidata para un álbum
- **THEN** el álbum queda sin semillas propias y marcado como sincronizado

#### Scenario: Álbum sincronizado hace poco

- **WHEN** se vuelve a sincronizar una discografía y un álbum se sincronizó hace 10 días
- **THEN** no se vuelve a pedir su entidad a Wikidata

### Requirement: Géneros efectivos con herencia

Los géneros efectivos de un álbum SHALL ser sus semillas propias si tiene alguna; si no, SHALL
ser los 3 primeros géneros de estilo (en el orden de Wikidata) de su artista principal (el
primer crédito principal), marcados como heredados. Un álbum SHALL NOT heredar los géneros del
artista más allá de esos 3 ni sus descriptores. Los géneros ocultos SHALL NOT formar parte de
los géneros efectivos. Todas las lecturas de géneros de álbum (Explorar, Caminos, huella de
gusto) SHALL usar esta misma definición.

#### Scenario: Álbum con semillas propias

- **WHEN** un álbum tiene semillas propias y su artista tiene otras
- **THEN** los géneros efectivos del álbum son solo los propios, no heredados

#### Scenario: Álbum que hereda

- **WHEN** un álbum no tiene semillas propias y su artista principal tiene "progressive metal"
- **THEN** el género efectivo del álbum es "progressive metal", marcado como heredado

#### Scenario: Herencia acotada

- **WHEN** un álbum sin semillas propias es de un artista con 7 géneros en Wikidata, el 5.º
  "blues rock"
- **THEN** el álbum hereda solo los 3 primeros y no aparece en la familia Blues por herencia

#### Scenario: Sin datos

- **WHEN** ni el álbum ni su artista principal tienen semillas
- **THEN** el álbum no tiene géneros efectivos

### Requirement: Semillas separadas de los votos

Las semillas de Wikidata SHALL guardarse separadas de cualquier voto de la comunidad, de modo que
actualizarlas no modifique votos y que un voto no modifique semillas.

#### Scenario: Actualización de semillas

- **WHEN** se actualizan las semillas de un álbum desde Wikidata
- **THEN** solo cambian las filas de semillas de ese álbum

### Requirement: Backfill de semillas

Un script SHALL sembrar los géneros de los artistas y álbumes existentes en lote, con opciones de
límite y de simulación sin escritura: los artistas con entidad de Wikidata en lotes de 50 por
request, y los álbumes de los artistas con discografía sincronizada volviendo a recorrer el browse
de discografía para guardar su entidad de Wikidata.

#### Scenario: Simulación

- **WHEN** se ejecuta el backfill en modo simulación
- **THEN** informa cuántos artistas y álbumes sembraría y no escribe en la base
