## ADDED Requirements

### Requirement: Géneros declarados frente a los reales

Cuando el perfil es accesible y el dueño declaró géneros en "Géneros que me mueven", la cresta de géneros SHALL marcar las
familias que contienen algún género declarado, con un texto accesible equivalente, y SHALL nombrar aparte las familias
declaradas que no aparecen en la cresta. Sin géneros declarados no SHALL haber marcas ni línea adicional.

#### Scenario: Familia declarada presente

- **WHEN** el dueño declaró "shoegaze" y la familia Rock figura en su cresta
- **THEN** la fila de Rock lleva la marca de declarado

#### Scenario: Familia declarada ausente

- **WHEN** el dueño declaró "jazz" y Jazz no figura en su cresta
- **THEN** la huella nombra Jazz como declarada sin presencia en lo que valora

#### Scenario: Sin géneros declarados

- **WHEN** el dueño no declaró géneros
- **THEN** la cresta no muestra marcas ni línea adicional
