# search-query-matching Specification

## Purpose

Cómo se emparejan las consultas con artistas, álbumes y canciones: una sola normalización de texto, cobertura de términos para "artista + título" en cualquier orden, separador explícito, detección del artista en Canciones, agrupación por (canción, artista), actividad propia como señal de orden y herramientas para acotar consultas genéricas.
## Requirements
### Requirement: Normalización de consultas y nombres

Para comparar consultas con nombres y títulos, el sistema SHALL normalizar ambos lados: minúsculas,
sin acentos ni diacríticos, puntuación convertida en espacio (salvo apóstrofos internos, que se
eliminan) y espacios colapsados. Las comparaciones de "coincidencia exacta" y "cobertura" de este
cambio SHALL usar esta normalización.

#### Scenario: Diacríticos y puntuación
- **WHEN** se compara la consulta `motorhead - ace of spades` con el artista "Motörhead" y el
  título "Ace of Spades"
- **THEN** ambos se consideran coincidencias por palabra completa

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

### Requirement: Separador explícito opcional

Si la consulta contiene ` - ` (guion con espacios), el sistema SHALL tratar los dos lados como
artista y título, probando ambos órdenes, y SHALL consultar MusicBrainz con campos explícitos
(título y artista) en lugar de texto libre. Sin separador SHALL aplicarse la cobertura de
términos.

#### Scenario: Separador
- **WHEN** una persona busca `KISS - Destroyer` en Álbumes
- **THEN** los resultados priorizan álbumes titulados "Destroyer" acreditados a KISS

### Requirement: Detección del artista en Canciones

En el tipo Canciones, el sistema SHALL buscar una interpretación "canción X de artista Y" solo
con artistas cuyo nombre normalizado coincide con el **inicio o el final** de la consulta en
límite de palabra, dejando un resto de al menos 2 caracteres. Los candidatos SHALL salir de la
base local y de una búsqueda de artistas en MusicBrainz sobre la consulta completa, y SHALL
ordenarse por relevancia (actividad local y score de MusicBrainz), **no** por longitud del nombre.
El sistema SHALL probar la mejor interpretación y, si no produce una canción relevante, la
consulta completa como título (la cobertura de términos ordena igual los resultados); con
separador explícito SHALL probar los dos órdenes escritos. Nunca SHALL hacer más de dos búsquedas
de grabaciones. La página SHALL mostrar la interpretación usada ("Interpretado como canción «kiss
of death» de Dokken") y SHALL ofrecer como alternativa, a lo sumo, una lectura no probada y
plausible (score de MusicBrainz ≥ 80 o con actividad), como enlace que reescribe la consulta con
separador explícito. Una grabación cuyo título es igual a la consulta completa SHALL NOT
confirmar una interpretación con artista: la persona escribió un título.

#### Scenario: Dokken kiss of death
- **WHEN** una persona busca `dokken kiss of death` en Canciones, y tanto "Dokken" (inicio) como
  la banda "Kiss of Death" (final) son candidatos
- **THEN** se prueba primero Dokken, se encuentra *Kiss of Death* en sus álbumes y la página
  muestra "Interpretado como canción «kiss of death» de Dokken" con la alternativa "¿Buscabas
  «dokken» de Kiss of Death?"

#### Scenario: Título igual a la consulta completa
- **WHEN** una persona busca `stairway de prueba`, existe una banda "Stairway" y la grabación se
  titula "Stairway de Prueba"
- **THEN** la lectura «de prueba» de Stairway no se confirma y se busca la consulta completa como
  título

#### Scenario: Artista en medio de la consulta
- **WHEN** la consulta contiene el nombre de un artista solo en medio del texto
- **THEN** ese artista no se usa como interpretación

#### Scenario: Canción sin artista
- **WHEN** una persona busca `stairway to heaven` en Canciones y ningún artista coincide con el
  inicio o el final
- **THEN** se busca la consulta completa como título

#### Scenario: Título que contiene nombres de artistas
- **WHEN** una persona busca `kiss of death` en Canciones y "KISS" y "Death" ocupan sus extremos,
  pero ninguno tiene esa canción
- **THEN** tras la primera interpretación fallida se busca `kiss of death` como título y se
  listan las canciones con ese título agrupadas por artista

### Requirement: Resultados de canción agrupados por canción y artista

Los resultados del tipo Canciones SHALL agruparse por (título normalizado, artista principal): las
grabaciones de un mismo grupo (estudio, en vivo, remix, remasterizaciones) SHALL tratarse como la
misma canción y sus apariciones SHALL unirse, pero apariciones de grupos distintos SHALL NOT
mezclarse. El título del grupo SHALL ser el título base (sin sufijos de versión como "(live)",
"[demo]" o " - Live at …"). Una grabación sin artista acreditado (defecto de datos de
MusicBrainz) SHALL unirse al artista de la interpretación o, si no hay, al grupo con el mismo
título base. El primer grupo SHALL mostrarse expandido con sus álbumes; los demás SHALL mostrarse
como filas "<título> — <artista>" que al abrirse navegan a `/search?type=song&q=<artista> -
<título>`.

#### Scenario: Versión sin artista acreditado
- **WHEN** entre las grabaciones de "Stairway de Prueba" hay una toma de estudio acreditada y una
  en vivo sin artist-credit
- **THEN** ambas forman un solo grupo y sus álbumes se unen

#### Scenario: Título compartido por varios artistas
- **WHEN** una persona busca `kiss of death` en Canciones sin artista
- **THEN** ve grupos separados para Dokken, New Order, IC3PEAK y otros, cada uno con sus propios
  álbumes, sin una lista única que los mezcle

### Requirement: Herramientas para consultas genéricas

Cuando una búsqueda de Álbumes o Canciones sin artista detectado devuelve más de 50 coincidencias
en MusicBrainz, la página SHALL mostrar una sugerencia para acotarla ("<N> álbumes se llaman
«<consulta>». Agregá el artista") con hasta cinco de los artistas más frecuentes entre los
resultados cargados como atajos, que reescriben la consulta como `<artista> - <consulta>`. Los
resultados de Álbumes SHALL poder filtrarse por categoría (estudio, EP/single, compilado, en vivo
y otros) y por década, filtros reflejados en la URL y aplicados también a la consulta a
MusicBrainz. Ambos tipos SHALL ofrecer "Cargar más" para pedir la página siguiente de
MusicBrainz, conservando los resultados ya mostrados.

#### Scenario: Destroyer
- **WHEN** una persona busca `destroyer` en Álbumes
- **THEN** ve la sugerencia de agregar el artista con atajos a los artistas más frecuentes de
  los resultados, y puede filtrar por "De estudio" y "1970s" (quedando *Destroyer* de KISS)

#### Scenario: Cargar más
- **WHEN** una persona pulsa "Cargar más" en una búsqueda de álbumes
- **THEN** se agregan los 25 resultados siguientes debajo de los existentes

### Requirement: Actividad de la plataforma como señal de orden

Dentro de un mismo nivel de coincidencia, las entidades con actividad en la plataforma
(calificaciones, reseñas, escuchas registradas o seguidores del artista) SHALL ordenarse antes que
las que no la tienen, de mayor a menor actividad. La señal SHALL calcularse solo con datos propios.

#### Scenario: Homónimo con actividad
- **WHEN** dos álbumes se titulan exactamente "Destroyer" y solo uno tiene calificaciones en la
  plataforma
- **THEN** el que tiene calificaciones aparece primero

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

