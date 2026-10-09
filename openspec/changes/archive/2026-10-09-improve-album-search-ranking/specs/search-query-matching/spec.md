## MODIFIED Requirements

### Requirement: Emparejamiento por cobertura de términos en Álbumes y Canciones

En los tipos Álbumes y Canciones, las palabras de la consulta SHALL poder repartirse entre el
título y el nombre del artista acreditado, en cualquier orden. Cada candidato SHALL clasificarse
en niveles, del mejor al peor:

1. un artista acreditado ocupa el inicio o el final de la consulta y el título coincide
   exactamente con las palabras restantes, o la consulta completa es el nombre de un artista
   acreditado;
2. el título coincide exactamente con la consulta completa, sin contar un artículo inicial en
   ninguno de los dos;
3. todas las palabras cubiertas por título ∪ artista;
4. cobertura parcial.

Dentro de cada nivel el orden SHALL ser: actividad en la plataforma, luego notoriedad (en Álbumes,
el número de ediciones que informa MusicBrainz), luego contenido ya cacheado, luego el orden de
relevancia de MusicBrainz. El sistema SHALL NOT exigir que la persona separe artista y título.

#### Scenario: Artista delante
- **WHEN** una persona busca `kiss destroyer` en Álbumes
- **THEN** *Destroyer* de KISS aparece primero

#### Scenario: Artista detrás
- **WHEN** una persona busca `destroyer kiss` en Álbumes
- **THEN** *Destroyer* de KISS aparece primero

#### Scenario: Canción con título homónimo de otra banda
- **WHEN** una persona busca `dokken kiss of death` en Canciones
- **THEN** *Kiss of Death* de Dokken aparece antes que *Kiss of Death* de New Order, que no cubre
  la palabra "dokken"

#### Scenario: Consulta que es el nombre de un artista
- **WHEN** una persona busca `pink floyd` en Álbumes y existe un álbum de otro artista titulado «Pink Floyd»
- **THEN** los discos de Pink Floyd aparecen antes que el álbum homónimo del otro artista

#### Scenario: Título con artículo inicial
- **WHEN** una persona busca `dark side of the moon` en Álbumes
- **THEN** *The Dark Side of the Moon* cuenta como título exacto y no cae al nivel de cobertura de palabras

## ADDED Requirements

### Requirement: Notoriedad como señal de orden en Álbumes

En Álbumes, entre candidatos del mismo nivel y con la misma actividad, el que tenga más ediciones
según MusicBrainz SHALL aparecer antes. La señal SHALL salir de la misma respuesta de búsqueda, sin
solicitudes adicionales, y los candidatos locales que MusicBrainz no devolvió SHALL tratarse como
sin notoriedad conocida. Si la consulta es el nombre de un artista local, sus discos SHALL sumarse a
los candidatos locales (de estudio primero, por año).

#### Scenario: Homónimos exactos
- **WHEN** una persona busca `abbey road` y MusicBrainz devuelve tres álbumes con ese título, uno con 73 ediciones y dos con una
- **THEN** el de 73 ediciones aparece primero

#### Scenario: Discografía local del artista
- **WHEN** una persona busca `pink floyd`, Pink Floyd existe como artista local y tiene discos locales
- **THEN** esos discos forman parte de los candidatos aunque MusicBrainz no los traiga en la primera página
