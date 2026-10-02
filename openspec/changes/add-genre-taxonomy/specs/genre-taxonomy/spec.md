## ADDED Requirements

### Requirement: Catálogo de géneros de MusicBrainz

El sistema SHALL mantener un catálogo con los géneros de la lista oficial de MusicBrainz, cada uno
identificado por su MBID, con su nombre de MusicBrainz y una clase: estilo (`style`), descriptor
(`descriptor`) u oculto (`hidden`). El catálogo SHALL provenir solo de los datos CC0 de
MusicBrainz (el dump core) y SHALL NOT incluir votos, etiquetas ni géneros por entidad de
MusicBrainz.

#### Scenario: Género presente en MusicBrainz

- **WHEN** se carga la taxonomía generada desde el dump de MusicBrainz
- **THEN** el género "shoegaze" existe en el catálogo con su MBID y la clase `style`

#### Scenario: Sin votos de MusicBrainz

- **WHEN** se genera o se carga la taxonomía
- **THEN** ningún paso lee ni guarda votos o etiquetas de géneros por artista, álbum o grabación
  de MusicBrainz

### Requirement: Relaciones entre géneros

El catálogo SHALL guardar las relaciones de MusicBrainz entre géneros: "subgénero de", "fusión
de" e "influido por", siempre en la dirección "el género es subgénero de / fusión de / influido
por el género relacionado". Un género SHALL NOT relacionarse consigo mismo. Un género puede tener
más de un padre.

#### Scenario: Subgénero

- **WHEN** se carga la taxonomía
- **THEN** "progressive rock" figura como subgénero de "rock"

#### Scenario: Fusión

- **WHEN** se carga la taxonomía
- **THEN** "blackgaze" figura como fusión de "black metal" y de "shoegaze"

### Requirement: Slugs estables

Cada género SHALL tener un slug único derivado de su nombre de MusicBrainz (minúsculas, sin
diacríticos, `&` como `and`, separadores como `-`). Al regenerar la taxonomía, el sistema SHALL
conservar el slug ya asignado a cada MBID aunque MusicBrainz cambie el nombre, y SHALL resolver
las colisiones con un sufijo determinista.

#### Scenario: Slug derivado

- **WHEN** se genera la taxonomía por primera vez
- **THEN** "hip hop" tiene el slug `hip-hop` y "r&b" el slug `r-and-b`

#### Scenario: Renombre en MusicBrainz

- **WHEN** MusicBrainz cambia el nombre de un género que ya tenía slug y se regenera la taxonomía
- **THEN** el género conserva su slug anterior y su nombre se actualiza

### Requirement: Nombres por idioma

El nombre de un género en español SHALL ser la etiqueta en español de su entidad de Wikidata
(enlazada por la propiedad P8052, el ID de género de MusicBrainz); si no existe, SHALL mostrarse
el nombre de MusicBrainz. Cuando la entidad enlazada es de otro concepto, una corrección
editorial versionada en la curaduría SHALL reemplazar esa etiqueta. En inglés SHALL mostrarse el
nombre de MusicBrainz. El sistema SHALL NOT traducir automáticamente nombres de géneros.

#### Scenario: Género con etiqueta en español

- **WHEN** se muestra "progressive rock" en español
- **THEN** su nombre es "rock progresivo"

#### Scenario: Género sin etiqueta en español

- **WHEN** un género no tiene etiqueta en español en Wikidata
- **THEN** en español se muestra su nombre de MusicBrainz

#### Scenario: Etiqueta de otro concepto corregida

- **WHEN** P8052 enlaza "classical" con una entidad de Wikidata cuya etiqueta es "música culta"
- **THEN** en español se muestra el nombre curado "música clásica"

### Requirement: Familias curadas

El sistema SHALL agrupar los géneros en 20 familias curadas: 17 principales (Rock, Metal, Punk y
hardcore, Pop, Electrónica, Hip hop, R&B soul y funk, Jazz, Blues, Folk y cantautor, Country,
Clásica, Experimental, Ambient y new age, Reggae y Caribe, Latina, Brasileña) y 3 secundarias
(Palabra y escena, Religiosa, Del mundo). Un género SHALL poder pertenecer a varias familias. La
pertenencia SHALL calcularse al generar la taxonomía, en este orden: huérfanos curados; familias
de las raíces del género por "subgénero de" más las familias culturales de su subárbol; familias
de los géneros de los que es "fusión de"; y, si nada aplica, "Del mundo". Los nombres de las
familias SHALL ser textos de la interfaz traducidos por idioma. La música de España (flamenco,
copla, pasodoble) SHALL pertenecer a Folk y cantautor, no a Latina.

#### Scenario: Género en dos familias

- **WHEN** se carga la taxonomía
- **THEN** "trap latino" pertenece a Hip hop y a Latina

#### Scenario: Raíz regional en una familia cultural

- **WHEN** se carga la taxonomía
- **THEN** "cumbia", "reggaeton" y "regional mexicano" pertenecen a Latina, y "bossa nova" a
  Brasileña

#### Scenario: Huérfano resuelto por fusión

- **WHEN** un género sin padre es "fusión de" "black metal" y "shoegaze" y no está curado
- **THEN** pertenece a Metal y a Rock

#### Scenario: Sin asignación

- **WHEN** un género no tiene padre, no está curado y no es fusión de ningún género con familia
- **THEN** pertenece a Del mundo

### Requirement: Descriptores y géneros ocultos

Los géneros "instrumental", "christmas music" y "orchestral" SHALL ser descriptores (Instrumental,
Navideña, Orquestal) y SHALL NOT contar como géneros de estilo. "Banda sonora" SHALL ser un
descriptor derivado del tipo secundario `Soundtrack` del álbum, no un género. Los géneros
"non-music", "asmr", "production music", "cyberpunk", "steampunk" y "progressive" SHALL quedar
ocultos: no se muestran ni cuentan en ninguna lectura de géneros.

#### Scenario: Descriptor fuera de las lecturas de estilo

- **WHEN** un álbum tiene como géneros "instrumental" y "post-rock"
- **THEN** las lecturas de géneros de estilo cuentan solo "post-rock" y la lectura de
  descriptores devuelve Instrumental

#### Scenario: Banda sonora

- **WHEN** un álbum tiene el tipo secundario `Soundtrack`
- **THEN** la lectura de descriptores del álbum incluye Banda sonora

#### Scenario: Género oculto

- **WHEN** Wikidata asigna a un álbum un género marcado como oculto
- **THEN** ese género no aparece en ninguna lectura de géneros del álbum

### Requirement: Generación offline y carga idempotente

La taxonomía SHALL generarse offline con un script que lee las tablas de géneros del dump core
de MusicBrainz y las etiquetas de Wikidata, aplica la curaduría versionada en el repo y escribe un
archivo de taxonomía versionado y ordenado de forma determinista. El script SHALL fallar si un
nombre curado no existe en MusicBrainz, si una familia principal queda vacía o si aparece una
familia desconocida. Un script de carga SHALL aplicar el archivo a la base de forma idempotente
(upsert por MBID); un género que ya no aparece en el archivo SHALL conservarse como oculto.

#### Scenario: Carga repetida

- **WHEN** se ejecuta la carga dos veces con el mismo archivo
- **THEN** la segunda ejecución no cambia ningún dato

#### Scenario: Nombre curado desaparecido

- **WHEN** la curaduría nombra un género que el dump ya no contiene
- **THEN** la generación falla indicando el nombre y no escribe el archivo

#### Scenario: Género retirado por MusicBrainz

- **WHEN** un género cargado antes ya no figura en el archivo nuevo
- **THEN** la carga lo deja como oculto y conserva las semillas que lo referencian
