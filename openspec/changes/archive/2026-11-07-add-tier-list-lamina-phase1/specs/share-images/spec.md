## ADDED Requirements

### Requirement: Imagen de una tier list
El sistema SHALL generar la imagen de una tier list con sus seis niveles en orden, vacíos incluidos, cada uno con su etiqueta sobre el color de
su tramo de la escala de la casa, que no cambia con la etiqueta. La bandeja SHALL NOT aparecer. Los primeros 10 discos, desde el nivel más alto y
en su orden, SHALL llevar carátula; el resto SHALL ir como ficha de texto con su título. La imagen SHALL llevar título, nombre y `@usuario`, firma y
créditos, y las notas solo si la tier list las muestra. Los formatos SHALL ser `post` (por defecto), `link` y `story`; en `link`, los tres primeros
niveles con discos. Una tier list que un anónimo no puede ver SHALL responder con la imagen genérica.

#### Scenario: Más de 10 discos
- **WHEN** se genera la imagen de una tier list con 14 discos en niveles
- **THEN** los 10 primeros desde S llevan carátula y los otros 4 van como fichas de texto

#### Scenario: Bandeja
- **WHEN** una tier list tiene 3 discos en la bandeja
- **THEN** la imagen no los muestra

#### Scenario: Etiqueta cambiada
- **WHEN** el dueño renombra el nivel S como "Dios"
- **THEN** la imagen muestra "Dios" sobre el color dorado del tramo 91–100

#### Scenario: Formato ajeno
- **WHEN** se pide la imagen `square` de una tier list
- **THEN** la respuesta es `400` con `VALIDATION_ERROR`
