## MODIFIED Requirements

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
La hoja SHALL mostrar la vista previa de la imagen Enlace del objeto y estas acciones, en este orden:
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

## ADDED Requirements

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
