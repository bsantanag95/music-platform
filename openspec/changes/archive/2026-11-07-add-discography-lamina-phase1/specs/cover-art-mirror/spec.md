## MODIFIED Requirements

### Requirement: Sin exposición de las carátulas como colección
El sistema SHALL NOT exponer ningún endpoint ni superficie que liste, enumere o permita descargar
en bloque las carátulas espejadas. Las carátulas SHALL servirse solo por su URL exacta, en el
contexto de su álbum. Como única excepción, una imagen para compartir (ver `share-images`) SHALL poder
componer hasta 4 miniaturas (hasta 10 en una Lámina armada por una persona o en una discografía), cada una a no más de 250 px de lado e identificando su disco dentro de un
objeto concreto (un género, una ceremonia, una clase de salón, una colección, una Lámina o una discografía), con la línea de créditos
y respetando los retiros; esa imagen SHALL NOT exponer las URL ni las claves de las carátulas que
contiene.

#### Scenario: No hay listado de carátulas
- **WHEN** se inspeccionan las rutas de la API
- **THEN** ninguna devuelve un listado de claves o URLs de carátulas desvinculado de sus álbumes

#### Scenario: Mosaico de una ceremonia
- **WHEN** se genera la imagen para compartir de una ceremonia
- **THEN** la imagen contiene como máximo 4 carátulas, ninguna de más de 250 px de lado, y la respuesta
  no incluye las URL de esas carátulas

#### Scenario: Carátula retirada en un mosaico
- **WHEN** uno de los discos del mosaico tiene la carátula retirada a pedido
- **THEN** el mosaico muestra el recuadro tipográfico de ese disco en lugar de su carátula
