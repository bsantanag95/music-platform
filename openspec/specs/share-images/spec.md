# share-images Specification

## Purpose
Generar la imagen para compartir (formato Enlace, 1200×630) de cada página de destino con un solo renderizador y el marco común de las Láminas, calculada como visitante anónimo, con caché inmutable versionada por contenido y respetando las condiciones de licencia de carátulas y fotos.
## Requirements
### Requirement: Un solo renderizador con el marco común de las Láminas
El sistema SHALL generar toda imagen para compartir en el servidor con un único renderizador y un único
marco común (cabecera con título, subtítulo e identidad; cuerpo; leyenda opcional; firma y línea de
créditos), sobre una rejilla de 8 px con márgenes de 64 px y alturas fijas de cabecera y firma por
formato. Cada tipo de objeto SHALL aportar solo el cuerpo y los textos del marco; ningún tipo SHALL
dibujar su propia cabecera, firma o créditos. El fondo SHALL ser el tema oscuro de la marca
(`--color-ink`) con texto `--color-paper` / `--color-paper-muted`, sea cual sea el tema del visitante.

#### Scenario: Dos objetos distintos comparten el marco
- **WHEN** se generan la imagen de un álbum y la de un género
- **THEN** ambas tienen la cabecera, la firma y la línea de créditos en la misma posición y con la misma
  tipografía, y solo difiere el cuerpo

#### Scenario: Tema claro del visitante
- **WHEN** la imagen se genera para un enlace abierto por alguien que usa el tema claro
- **THEN** la imagen usa igualmente el fondo oscuro de la marca

### Requirement: Formato Enlace
El sistema SHALL ofrecer el formato **Enlace** de 1200×630 px en PNG para todos los objetos de este
cambio. El sistema SHALL rechazar cualquier otro formato solicitado con `VALIDATION_ERROR` hasta que
un cambio posterior lo agregue.

#### Scenario: Formato pedido existente
- **WHEN** se pide la imagen de un álbum en formato `link`
- **THEN** la respuesta es un PNG de 1200×630

#### Scenario: Formato no disponible todavía
- **WHEN** se pide la imagen de un álbum en formato `story`
- **THEN** la respuesta es un error `VALIDATION_ERROR`

### Requirement: Tipografías de la marca
Las imágenes SHALL usar las tipografías de la app: Space Grotesk para títulos, IBM Plex Mono para
números y datos, y Source Serif 4 para citas. Las fuentes de la marca SHALL cargarse desde archivos TTF u
OTF estáticos versionados en el repositorio, con su licencia, y SHALL NOT descargarse en tiempo de
ejecución. Los glifos fuera de su cobertura (otras escrituras, emoji) los resuelve el renderizador con su
fuente de respaldo; sin ella, la imagen SHALL generarse igual.

#### Scenario: Generación sin red
- **WHEN** se genera una imagen en un entorno sin acceso a Google Fonts
- **THEN** la imagen se genera con las tres tipografías de la marca

### Requirement: Escala de la casa
El sistema SHALL definir en un único módulo la escala de color de la nota 1–100 con seis tramos
alineados a los rangos de las estrellas: 91–100, 81–90, 71–80, 61–70, 41–60 y 1–40. Solo el tramo
91–100 SHALL usar el dorado de la marca (`--color-amber`). Cada tramo SHALL garantizar un contraste
de al menos 4.5:1 entre el número y su fondo. Una nota expresada solo en estrellas SHALL ubicarse en
el tramo de su rango y mostrarse como estrellas; el sistema SHALL NOT derivar un número 1–100 de las
estrellas para mostrarlo. La leyenda SHALL mostrar los tramos como rangos numéricos, no como
adjetivos.

#### Scenario: Nota detallada
- **WHEN** se ubica una nota de 86
- **THEN** cae en el tramo 81–90 y se muestra el número 86

#### Scenario: Solo estrellas
- **WHEN** se ubica una valoración de 4.5★ sin nota detallada
- **THEN** cae en el tramo 81–90 y se muestra "4.5★", sin ningún número 1–100

#### Scenario: Dorado reservado
- **WHEN** se colorean notas de 95 y de 88
- **THEN** solo la de 95 usa el dorado de la marca

### Requirement: Firma de la marca en un solo lugar
Toda imagen SHALL llevar la firma de la marca: el monograma actual de la app, el nombre de la app
tomado de los mensajes (`common.appName`) y el dominio de `NEXT_PUBLIC_APP_URL`. La firma SHALL
definirse en un único componente, de modo que cambiar el nombre o el logo del producto no requiera
tocar ningún formato.

#### Scenario: Cambio del nombre de la app
- **WHEN** cambia el valor de `common.appName`
- **THEN** todas las imágenes muestran el nombre nuevo sin cambiar ningún formato

### Requirement: Carátulas y fotos en la imagen
Las carátulas SHALL obtenerse solo a través del pipeline de carátulas existente (espejo o miniatura
`front-250` de Cover Art Archive) y SHALL dibujarse a su tamaño de origen o menor: el sistema SHALL NOT
ampliar una carátula más allá de 250 px de lado ni pedir otra resolución. Las imágenes en formatos que
el renderizador no acepta (como WebP) SHALL convertirse a PNG en el servidor antes de componerse. Un
disco sin carátula, con la carátula retirada o cuya carátula falla al obtenerse SHALL mostrarse con un
recuadro tipográfico (título y artista), y la imagen SHALL generarse igual. La foto de un artista SHALL
usarse solo si la ficha tiene foto con licencia verificada y SHALL ir acompañada de su crédito (autor y
licencia) en la línea de créditos; sin foto, el artista SHALL mostrarse con un monograma tipográfico.
El avatar de un usuario SHALL mostrarse si existe; si no, su monograma determinista.

#### Scenario: Carátula en WebP del espejo
- **WHEN** la carátula de un álbum está en el espejo como WebP
- **THEN** la imagen del álbum muestra esa carátula, convertida, a no más de 250 px de lado

#### Scenario: Carátula retirada
- **WHEN** un disco tiene la carátula retirada a pedido
- **THEN** la imagen muestra el recuadro tipográfico del disco y no la carátula

#### Scenario: Foto de artista con licencia
- **WHEN** se genera la imagen de un artista con foto de Commons
- **THEN** la línea de créditos incluye el autor y la licencia de la foto

#### Scenario: Falla al obtener la carátula
- **WHEN** el espejo y Cover Art Archive fallan al servir una carátula
- **THEN** la imagen se genera con el recuadro tipográfico en su lugar

### Requirement: Línea de créditos
Toda imagen que muestre carátulas, datos del catálogo o una foto de Commons SHALL incluir una línea de
créditos con las fuentes correspondientes (Cover Art Archive, MusicBrainz, el crédito de la foto).

#### Scenario: Imagen con carátulas
- **WHEN** se genera la imagen de una ceremonia con carátulas
- **THEN** la línea de créditos nombra a Cover Art Archive y a MusicBrainz

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

### Requirement: Idioma de la imagen
Los textos de la imagen SHALL salir de los catálogos de mensajes del idioma pedido (`es` o `en`), que es
el del segmento `[locale]` de la página compartida.

#### Scenario: Enlace en inglés
- **WHEN** se comparte `/en/explore/collections/<colección>`
- **THEN** la imagen muestra el título de la colección y los textos del marco en inglés

### Requirement: Caché versionada por contenido
La URL de cada imagen SHALL incluir una versión derivada de los datos que la imagen muestra. Con
versión, la imagen de un objeto de catálogo (álbum, canción, artista, género, premios, salones y colecciones de Explorar) SHALL
servirse con `Cache-Control: public, max-age=31536000, immutable`; lo que es de una persona SHALL llevar siempre la caché corta, porque
moderación o su dueño pueden cerrarlo; un
cambio en los datos visibles SHALL producir una versión distinta. Sin versión o con una versión que no
coincide con los datos actuales, el sistema SHALL generar la imagen con los datos actuales y servirla
con una caché corta. Si alguna imagen con URL (carátula, foto o avatar) no se pudo obtener, la respuesta SHALL
llevar la caché corta aunque la versión coincida, para que el CDN no congele la versión con el recuadro
tipográfico; un fallo al obtener una imagen SHALL recordarse a lo sumo 5 minutos antes de reintentarse.

#### Scenario: Carátula que no se pudo obtener
- **WHEN** CAA no responde a tiempo al generar la imagen de un género con la versión vigente
- **THEN** la imagen sale con el recuadro tipográfico de ese disco y con una caché corta, no inmutable

#### Scenario: Cambio de carátula
- **WHEN** cambia la carátula de un álbum
- **THEN** la página del álbum anuncia una URL de imagen con otra versión

#### Scenario: Versión vieja
- **WHEN** un crawler pide la imagen con una versión que ya no coincide
- **THEN** recibe la imagen con los datos actuales y una caché corta

#### Scenario: Reseña oculta después de compartirse
- **WHEN** se pide la imagen de una reseña con la versión vigente
- **THEN** la respuesta lleva la caché corta, no inmutable

#### Scenario: Tipo nuevo
- **WHEN** un tipo de objeto no está en la lista de catálogo
- **THEN** su imagen lleva la caché corta

### Requirement: Límite de generación
El sistema SHALL limitar la cantidad de imágenes generadas por dirección IP en una ventana de tiempo;
al superarlo SHALL responder `429` con el código `RATE_LIMITED`. Las respuestas servidas desde la caché
del CDN no cuentan.

#### Scenario: Ráfaga de pedidos
- **WHEN** una misma IP pide más imágenes de las permitidas en la ventana
- **THEN** los pedidos de más reciben `429` con `RATE_LIMITED`

### Requirement: Imágenes de valoración y de escucha
El sistema SHALL generar la imagen Enlace de:
- **Valoración:** carátula, título, artista, la nota y `@usuario`. La nota SHALL ser el puntaje detallado si existe y, si no, las
  estrellas; nunca un número derivado de las estrellas.
- **Escucha:** carátula, título, artista, mes y año, reacción si tiene, `@usuario` y su impresión como cita de hasta 200 caracteres.

Solo existen para álbumes y canciones. Una valoración sin marca ni destacado, una escucha que no es pública ni destacada, o de un
perfil que un anónimo no puede ver, SHALL responder con la imagen genérica.

#### Scenario: Valoración con puntaje
- **WHEN** se genera la imagen de una valoración marcada de 4,5 estrellas y puntaje 86
- **THEN** la imagen muestra 86 con el color de su tramo

#### Scenario: Valoración solo con estrellas
- **WHEN** se genera la imagen de una valoración marcada de 4,5 estrellas sin puntaje
- **THEN** la imagen muestra las estrellas y ningún número de 1 a 100

#### Scenario: Valoración sin marca
- **WHEN** se pide la imagen de una valoración sin marca
- **THEN** la respuesta es la imagen genérica

#### Scenario: Valoración destacada
- **WHEN** se pide la imagen de una valoración destacada sin marca
- **THEN** la respuesta es la imagen de la valoración

#### Scenario: Escucha sin impresión
- **WHEN** se genera la imagen de una escucha pública sin texto
- **THEN** la imagen no muestra ninguna cita

### Requirement: Formato Historia
El sistema SHALL generar con `format=story` una imagen de 1080×1920 para todo objeto con imagen Enlace, con la misma marca, tipografías y
escala, y a partir de los mismos datos. Todo el contenido, salvo la firma de la marca, SHALL quedar dentro de los márgenes seguros de 250 px
arriba y abajo. Una carátula SHALL dibujarse a 250 px como máximo, sin ampliar, sobre un vinilo dibujado. El formato no SHALL cambiar la versión
de la imagen.

#### Scenario: Historia de un álbum
- **WHEN** se pide la imagen de un álbum con `format=story`
- **THEN** es un PNG de 1080×1920 con la carátula a 250 px sobre el vinilo

#### Scenario: Objeto que no se puede ver
- **WHEN** se pide con `format=story` la imagen de una reseña oculta
- **THEN** la respuesta es la imagen genérica en 1080×1920

#### Scenario: Imagen privada
- **WHEN** el dueño pide su imagen personal con `format=story`
- **THEN** la respuesta lleva `private, no-store`

#### Scenario: Título largo
- **WHEN** se genera la Historia de un disco con un título de 80 caracteres
- **THEN** el título entra sin salirse del lienzo

