## MODIFIED Requirements

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

## ADDED Requirements

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
