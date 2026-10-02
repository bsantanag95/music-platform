## MODIFIED Requirements

### Requirement: Crestas de décadas y géneros

La huella SHALL incluir una cresta de las décadas más presentes en las valoraciones y
escuchas visibles del dueño, derivada de las fechas de publicación del catálogo, y una
cresta de los géneros más presentes, agrupados por **familia** de géneros (las 8 familias con
más álbumes visibles; un álbum suma una vez a cada familia de sus géneros efectivos, incluidos
los heredados de su artista). Cada familia de la cresta SHALL nombrar sus 2 o 3 géneros de estilo
más presentes. La cresta de décadas SHALL degradarse de forma
legible cuando haya pocas fechas disponibles. La cresta de géneros SHALL mostrar un estado
"sin datos de género todavía" cuando no haya datos de género para las entidades
implicadas.

#### Scenario: Cresta de décadas

- **WHEN** las entidades valoradas y escuchadas visibles del dueño tienen fechas de
  publicación concentradas en los años 70 y 90
- **THEN** la cresta de décadas destaca esas dos décadas

#### Scenario: Sin datos de género

- **WHEN** ninguna de las entidades implicadas tiene datos de género
- **THEN** la cresta de géneros muestra el estado "sin datos de género todavía" y el resto
  de la huella se renderiza con normalidad

#### Scenario: Cresta por familias con sus géneros

- **WHEN** el dueño valoró tres álbumes de "shoegaze", uno de "post-punk" y uno de "trap latino"
- **THEN** la cresta muestra Rock con 4 (sobre todo shoegaze y post-punk), Hip hop con 1 y Latina
  con 1, con sus nombres localizados

#### Scenario: Frase de resumen

- **WHEN** la familia más presente del dueño es Rock y su género más presente dentro de ella es
  shoegaze
- **THEN** el resumen de la huella dice que su familia más presente es Rock, sobre todo shoegaze
