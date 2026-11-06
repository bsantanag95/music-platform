## MODIFIED Requirements

### Requirement: Imágenes por objeto
El sistema SHALL generar la imagen Enlace de cada objeto con este cuerpo:
- **Álbum:** carátula, título, artista principal y año; la media de estrellas de la comunidad solo con 5 o
  más valoraciones.
- **Canción:** carátula de su disco, título, artista principal y disco.
- **Artista:** foto (o monograma), nombre, tipo y años de actividad cuando se conocen.
- **Género:** nombre y un mosaico de hasta 4 carátulas de sus discos de estudio más valorados.
- **Índices de premios, de salones y de colecciones:** composición tipográfica con el nombre. La ficha de un
  premio o de un salón redirige a su última ceremonia o clase, así que se comparte esa.
- **Ceremonia de premio y clase de salón:** nombre, año y un mosaico de hasta 4 carátulas de ganadores o
  incorporados (sin repetir disco). Con un solo disco, su carátula con el disco detrás en vez del mosaico.
- **Colección de Explorar:** título en el idioma de la ruta y un mosaico de hasta 4 carátulas de sus
  discos.
- **Perfil:** avatar o monograma, nombre visible, `@usuario` y contadores de seguidores y seguidos; si el
  anónimo tiene acceso al perfil, además hasta 3 carátulas de su Tarjeta de Identidad.
- **Reseña:** carátula del álbum, título y artista, una cita de hasta 200 caracteres, las estrellas del autor y su
  `@usuario`. Nunca su puntaje detallado, que solo ve el autor.
- **Comentario:** cita de hasta 200 caracteres, `@autor` y el objeto comentado con su carátula o foto.
- **Lista:** título, `@dueño`, cantidad de ítems y un mosaico de hasta 4 carátulas. Una lista de artistas es
  tipográfica, sin fotos.
- **Camino:** título, `@dueño`, cantidad de discos y un mosaico de hasta 4 carátulas, sin el progreso del dueño.
- **Colección de un perfil:** nombre del dueño, conteos por formato y un mosaico de hasta 4 carátulas de sus
  entradas públicas más recientes.
- **Huella de gusto:** identidad del dueño y su década y familia de géneros más presentes, calculadas solo con lo que
  un anónimo puede ver.

#### Scenario: Álbum con pocas valoraciones
- **WHEN** se genera la imagen de un álbum con 3 valoraciones
- **THEN** la imagen no muestra ninguna media de la comunidad

#### Scenario: Perfil privado
- **WHEN** se genera la imagen de un perfil privado
- **THEN** la imagen muestra su identidad (foto o monograma, nombre, usuario y contadores) y no muestra
  carátulas de su Tarjeta de Identidad

#### Scenario: Reseña con puntaje detallado
- **WHEN** se genera la imagen de una reseña cuyo autor valoró 86 (4.5 estrellas)
- **THEN** la imagen muestra las 4.5 estrellas y ningún número de 1 a 100

#### Scenario: Reseña sin nota
- **WHEN** se genera la imagen de una reseña cuyo autor borró su valoración
- **THEN** la imagen muestra la cita sin ninguna nota

#### Scenario: Reseña editada
- **WHEN** el autor edita el texto de su reseña
- **THEN** la versión de la imagen cambia

#### Scenario: Lista de artistas
- **WHEN** se genera la imagen de una lista pública de artistas
- **THEN** la imagen es tipográfica y no incluye fotos

#### Scenario: Colección con entradas de distinta audiencia
- **WHEN** se genera la imagen de una colección con 3 entradas públicas y 10 para seguidores
- **THEN** la imagen y sus conteos solo incluyen las 3 públicas

#### Scenario: Huella en inglés
- **WHEN** se genera la imagen de una huella con `locale=en`
- **THEN** sus textos están en inglés

### Requirement: Imagen genérica cuando no se puede ver
Cuando el objeto no existe, pertenece a una cuenta desactivada, está oculto por moderación o el
visitante anónimo no puede verlo, el sistema SHALL responder con la imagen genérica de la marca (firma y
"Contenido no disponible" en el idioma pedido), nunca con una versión recortada del objeto ni con un
error visible para el crawler. Una lista o un Camino que no son públicos, una lista generada por plantilla, una
colección sin entradas públicas y la huella de un perfil privado o sin datos SHALL responder igual.

#### Scenario: Cuenta desactivada
- **WHEN** se pide la imagen del perfil de una cuenta desactivada
- **THEN** la respuesta es la imagen genérica

#### Scenario: Objeto inexistente
- **WHEN** se pide la imagen de un álbum con un id que no existe
- **THEN** la respuesta es la imagen genérica

#### Scenario: Reseña oculta por moderación
- **WHEN** se pide la imagen de una reseña oculta
- **THEN** la respuesta es la imagen genérica

#### Scenario: Lista para seguidores
- **WHEN** se pide la imagen de una lista con audiencia `followers`
- **THEN** la respuesta es la imagen genérica, sin su título

#### Scenario: Reseña de una cuenta desactivada
- **WHEN** se pide la imagen de una reseña de una cuenta desactivada
- **THEN** la respuesta es la imagen genérica
