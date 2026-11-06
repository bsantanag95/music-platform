## ADDED Requirements

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

## MODIFIED Requirements

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
