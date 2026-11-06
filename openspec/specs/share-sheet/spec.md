# share-sheet Specification

## Purpose
Ofrecer un botón Compartir en las páginas de destino que abre una hoja con el menú del sistema, copiar enlace, atajos a las redes, descarga de la imagen y vista previa, usable en el móvil y con respaldo cuando falla el portapapeles.
## Requirements
### Requirement: Botón Compartir en las páginas de destino
Las cabeceras de álbum, artista, canción, género, ceremonia de premio, clase de salón, colección de
Explorar, perfil, reseña, comentario, lista, Camino, colección de un perfil y huella de gusto SHALL mostrar un botón
**Compartir** para cualquier visitante, con o sin sesión. El botón SHALL abrir la hoja de compartir de ese objeto.
La página de relación SHALL mostrarlo cuando un anónimo puede ver su valoración o alguna escucha. Las páginas de gestión `/me/lists/<id>`, `/me/caminos/<id>` y `/me/collection` SHALL mostrarlo solo si un anónimo puede
ver ese contenido. Si no puede, ninguna de estas páginas SHALL mostrar el botón.

#### Scenario: Visitante anónimo
- **WHEN** un visitante sin sesión abre la página de un álbum
- **THEN** ve el botón Compartir y puede abrir la hoja

#### Scenario: Perfil propio
- **WHEN** el dueño abre su perfil
- **THEN** ve el botón Compartir junto a sus controles

#### Scenario: Lista pública en su gestión
- **WHEN** el dueño abre `/me/lists/<id>` de una lista pública
- **THEN** ve el botón Compartir y el enlace de la hoja es el de la vista pública de la lista

#### Scenario: Lista privada en su gestión
- **WHEN** el dueño abre `/me/lists/<id>` de una lista privada
- **THEN** no ve el botón Compartir

### Requirement: Contenido de la hoja
La hoja SHALL ofrecer los formatos **Enlace** (por defecto) e **Historia**, mostrar la vista previa del elegido y estas acciones, en este
orden:
**Compartir…** (menú nativo, solo si el navegador ofrece `navigator.share`), **Copiar enlace**, atajos a
X, WhatsApp, Threads, Bluesky, Facebook, Telegram y Reddit, y **Descargar imagen**. Los atajos SHALL ser
enlaces planos a la URL de publicación de cada red; la hoja SHALL NOT cargar SDK, píxeles ni scripts de
terceros. Si el objeto es propio y un anónimo no puede verlo, SHALL aplicar el requisito "Compartir algo propio
que no es público".

#### Scenario: Navegador sin menú nativo
- **WHEN** el navegador no ofrece `navigator.share`
- **THEN** la hoja no muestra "Compartir…" y muestra el resto de las acciones

#### Scenario: Sin terceros
- **WHEN** se abre la hoja
- **THEN** no se carga ningún recurso de dominios de redes sociales

#### Scenario: Elegir Historia
- **WHEN** se elige Historia en la hoja
- **THEN** la vista previa y "Descargar imagen" pasan a ese formato y los atajos siguen compartiendo el enlace

### Requirement: Enlace compartido con canal
Cada acción SHALL compartir la URL canónica absoluta del objeto en el idioma actual, con el parámetro
`via` igual al canal (`native`, `copy`, `x`, `whatsapp`, `threads`, `bluesky`, `facebook`, `telegram`,
`reddit`). El texto que acompaña al enlace SHALL ser el título del objeto, sin datos del usuario que
comparte.

#### Scenario: Atajo a WhatsApp
- **WHEN** se elige WhatsApp en la hoja de un álbum
- **THEN** se abre la URL de publicación de WhatsApp con el título del álbum y su URL canónica con
  `?via=whatsapp`

#### Scenario: Copiar enlace
- **WHEN** se elige Copiar enlace
- **THEN** el portapapeles contiene la URL canónica con `?via=copy` y la hoja confirma "Enlace copiado"

### Requirement: Descarga de la imagen
**Descargar imagen** SHALL descargar el PNG de la vista previa con un nombre de archivo legible derivado
del objeto (por ejemplo `metallica-master-of-puppets.png`), sin caracteres no válidos en nombres de
archivo.

#### Scenario: Descarga de un álbum
- **WHEN** se elige Descargar imagen en la hoja de un álbum
- **THEN** se descarga un PNG de 1200×630 con un nombre legible del artista y el álbum

### Requirement: Accesibilidad de la hoja
La hoja SHALL ser un diálogo con nombre accesible, foco atrapado mientras está abierta, cierre con
Escape y devolución del foco al botón Compartir. Cada acción SHALL tener nombre accesible y la vista
previa SHALL tener el mismo texto alternativo que la imagen. En pantallas angostas SHALL mostrarse como
hoja inferior sin desplazamiento horizontal.

#### Scenario: Cerrar con teclado
- **WHEN** la hoja está abierta y se presiona Escape
- **THEN** la hoja se cierra y el foco vuelve al botón Compartir

### Requirement: Fallo del portapapeles o del menú nativo
Si copiar al portapapeles falla, la hoja SHALL mostrar el enlace seleccionado en un campo de texto para
copiarlo a mano. Si el usuario cancela el menú nativo, la hoja SHALL quedar abierta sin mostrar error.

#### Scenario: Portapapeles bloqueado
- **WHEN** el navegador rechaza escribir en el portapapeles
- **THEN** la hoja muestra el enlace en un campo seleccionado

### Requirement: Compartir un comentario desde su fila
Cada comentario raíz de un artista, un álbum o una canción SHALL ofrecer **Compartir** a cualquier visitante, con la
dirección de su página propia. Las respuestas no SHALL ofrecerlo. La fila no SHALL hacer una consulta adicional por
comentario para mostrar el botón.

#### Scenario: Compartir un comentario de una canción
- **WHEN** un visitante abre la hoja desde un comentario raíz de una canción
- **THEN** el enlace de la hoja es la dirección propia de ese comentario

#### Scenario: Respuesta en un hilo
- **WHEN** un visitante abre un hilo de un artista
- **THEN** las respuestas no muestran el botón Compartir

### Requirement: Compartir algo propio que no es público
Al abrir la hoja de una valoración o escucha propia que un anónimo no puede ver, la hoja SHALL mostrar un aviso, **Hacer pública y
compartir** y **Descargar imagen**, sin copiar enlace ni atajos. El aviso de una escucha con texto SHALL decir que la impresión
también se verá, y el de una valoración, que el enlace mostrará la nota vigente. Tras el gesto, la hoja SHALL pasar a las acciones
normales sin cerrarse. Con el perfil privado SHALL mostrar un aviso y solo **Descargar imagen**. Sin el gesto SHALL NOT cambiar
ninguna audiencia ni marca.

#### Scenario: Valoración sin marca
- **WHEN** el dueño abre la hoja de su valoración sin marca
- **THEN** ve el aviso, "Hacer pública y compartir" y "Descargar imagen", y no ve "Copiar enlace"

#### Scenario: Hacer pública desde la hoja
- **WHEN** el dueño pulsa "Hacer pública y compartir"
- **THEN** la hoja muestra las acciones normales con la imagen pública

#### Scenario: Descargar sin publicar
- **WHEN** el dueño descarga la imagen sin hacer el gesto
- **THEN** la valoración sigue sin marca

#### Scenario: Perfil privado
- **WHEN** el dueño de un perfil privado abre la hoja de su valoración
- **THEN** ve el aviso y "Descargar imagen", y no ve "Hacer pública y compartir"

### Requirement: Entradas para compartir lo propio
El panel "Tu relación" de álbum y canción SHALL ofrecer **Compartir** cuando hay valoración propia; si está marcada, la hoja SHALL
ofrecer **Dejar de compartir**. Cada fila de `/me/diary` de un álbum o una canción SHALL ofrecer **Compartir**. Una escucha de un artista no SHALL
ofrecerlo. Mostrar estos botones no SHALL agregar consultas: el estado se pide al abrir la hoja.

#### Scenario: Panel sin valoración
- **WHEN** una persona abre un álbum que no valoró
- **THEN** el panel no ofrece Compartir

#### Scenario: Escucha de un artista
- **WHEN** una persona ve en su diario una escucha de un artista
- **THEN** la fila no ofrece Compartir

### Requirement: Compartir el archivo desde el menú nativo
Con Historia elegida, **Compartir…** SHALL mandar la imagen como archivo si el navegador lo permite (`navigator.canShare({ files })`) y, si no, el
enlace. El evento SHALL registrar el formato.

#### Scenario: Móvil que comparte archivos
- **WHEN** en un móvil que lo permite se elige Historia y se pulsa "Compartir…"
- **THEN** el menú del sistema recibe el PNG

#### Scenario: Navegador sin archivos
- **WHEN** el navegador no permite compartir archivos
- **THEN** "Compartir…" comparte el enlace

### Requirement: Ofrecimiento en momentos con significado
El sistema SHALL ofrecer **Compartir** en un aviso descartable, nunca en un modal, al publicar una reseña por primera vez, al pasar una lista a
`public` y al completar un Camino público. El aviso SHALL desaparecer solo y no SHALL robar el foco. Valorar, registrar una escucha, editar una
reseña o completar algo que no es público no SHALL ofrecerlo.

#### Scenario: Reseña nueva
- **WHEN** una persona publica su reseña de un álbum
- **THEN** ve un aviso con "Compartir" que abre la hoja de esa reseña

#### Scenario: Reseña editada
- **WHEN** una persona edita su reseña
- **THEN** no ve ningún ofrecimiento

#### Scenario: Valorar
- **WHEN** una persona valora un disco
- **THEN** no ve ningún ofrecimiento

#### Scenario: Lista que pasa a pública
- **WHEN** el dueño cambia la audiencia de su lista a `public`
- **THEN** ve un aviso con "Compartir"

### Requirement: Compartir desde los menús
Las acciones rápidas de un disco SHALL ofrecer **Compartir** a cualquier visitante. Los menús de las tarjetas de listas y Caminos propios SHALL
ofrecerlo solo si son públicos. Los datos SHALL pedirse al abrir la hoja, sin consultas por fila. Si el objeto ya no se puede ver, la hoja SHALL
decirlo.

#### Scenario: Disco en la discografía
- **WHEN** un visitante elige Compartir en el menú de un disco
- **THEN** se abre la hoja de ese álbum con su enlace canónico

#### Scenario: Lista privada
- **WHEN** el dueño abre el menú de la tarjeta de una lista privada
- **THEN** el menú no ofrece Compartir

