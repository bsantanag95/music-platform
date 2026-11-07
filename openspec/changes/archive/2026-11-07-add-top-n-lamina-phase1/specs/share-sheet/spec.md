## MODIFIED Requirements

### Requirement: Contenido de la hoja
La hoja SHALL ofrecer los formatos que el objeto declara, con el primero por defecto: **Enlace** e **Historia** en general, y además **Publicación** o
**Cuadrado** en una Lámina, que los pone primero, mostrar la vista previa del elegido y estas acciones, en este
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

Con un formato que no es Enlace, **Compartir…** SHALL mandar la imagen como archivo si el navegador lo permite.

#### Scenario: Lámina
- **WHEN** se abre la hoja de un Top 5
- **THEN** ofrece Publicación, Enlace e Historia, con Publicación elegida
