# share-sheet Specification

## Purpose
Ofrecer un botón Compartir en las páginas de destino que abre una hoja con el menú del sistema, copiar enlace, atajos a las redes, descarga de la imagen y vista previa, usable en el móvil y con respaldo cuando falla el portapapeles.
## Requirements
### Requirement: Botón Compartir en las páginas de destino
Las cabeceras de álbum, artista, canción, género, ceremonia de premio, clase de salón, colección de
Explorar y perfil SHALL mostrar un botón **Compartir** para cualquier visitante, con o sin sesión. El
botón SHALL abrir la hoja de compartir de ese objeto.

#### Scenario: Visitante anónimo
- **WHEN** un visitante sin sesión abre la página de un álbum
- **THEN** ve el botón Compartir y puede abrir la hoja

#### Scenario: Perfil propio
- **WHEN** el dueño abre su perfil
- **THEN** ve el botón Compartir junto a sus controles

### Requirement: Contenido de la hoja
La hoja SHALL mostrar la vista previa de la imagen Enlace del objeto y estas acciones, en este orden:
**Compartir…** (menú nativo, solo si el navegador ofrece `navigator.share`), **Copiar enlace**, atajos a
X, WhatsApp, Threads, Bluesky, Facebook, Telegram y Reddit, y **Descargar imagen**. Los atajos SHALL ser
enlaces planos a la URL de publicación de cada red; la hoja SHALL NOT cargar SDK, píxeles ni scripts de
terceros.

#### Scenario: Navegador sin menú nativo
- **WHEN** el navegador no ofrece `navigator.share`
- **THEN** la hoja no muestra "Compartir…" y muestra el resto de las acciones

#### Scenario: Sin terceros
- **WHEN** se abre la hoja
- **THEN** no se carga ningún recurso de dominios de redes sociales

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

