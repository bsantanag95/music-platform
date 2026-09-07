## ADDED Requirements

### Requirement: Huella de gusto filtrada por audiencia

El sistema SHALL calcular una huella de gusto para cada perfil a partir únicamente de las
actividades del dueño visibles para el visitante, aplicando las mismas reglas de visibilidad
que el resto de superficies sociales. Las valoraciones —que no tienen audiencia propia—
SHALL ser visibles solo para el dueño y para seguidores en relación aceptada, igual que en
el feed. Las escuchas, favoritos, listas y colección SHALL filtrarse por su audiencia
respecto de la relación del visitante. Un visitante público, un seguidor aprobado y el
dueño SHALL poder ver huellas distintas del mismo perfil según lo que cada uno tiene
permitido ver. El cálculo SHALL hacerse bajo demanda, sin tabla materializada.

#### Scenario: El seguidor ve la curva de valoraciones y el visitante público no

- **WHEN** un perfil público con valoraciones lo abre un seguidor aprobado y, por otro
  lado, un visitante sin relación
- **THEN** el seguidor ve la curva de valoraciones y el visitante sin relación no la ve

#### Scenario: El seguidor ve más escuchas que el visitante público

- **WHEN** un perfil tiene escuchas con audiencia `followers` y otras con audiencia
  `public`
- **THEN** un seguidor aprobado ve las crestas calculadas con ambos conjuntos y un
  visitante público solo con las de audiencia `public`

#### Scenario: Perfil privado sin autorización

- **WHEN** un visitante no autorizado abre un perfil privado
- **THEN** no se calcula ni se muestra ninguna huella de gusto

### Requirement: Curva de valoraciones

La huella SHALL incluir la distribución de las valoraciones vigentes del dueño por número de
estrellas (de 0,5 a 5 en pasos de media estrella), cuando el visitante tiene permitido ver
las valoraciones (dueño o seguidor aprobado). La distribución SHALL presentarse como la
forma del conjunto, no como una puntuación agregada ni como un promedio destacado.

#### Scenario: Distribución con datos

- **WHEN** un seguidor aprobado abre un perfil cuyo dueño tiene valoraciones repartidas
  entre 3, 3,5 y 4 estrellas
- **THEN** la curva muestra una barra por cada valor de estrella con su cantidad relativa

#### Scenario: Sin valoraciones visibles

- **WHEN** el visitante no tiene permitido ver las valoraciones del dueño, o el dueño no
  tiene valoraciones
- **THEN** la curva no se muestra y en su lugar aparece una línea breve indicando que
  todavía no hay datos

### Requirement: Crestas de décadas y géneros

La huella SHALL incluir una cresta de las décadas más presentes en las valoraciones y
escuchas visibles del dueño, derivada de las fechas de publicación del catálogo, y una
cresta de los géneros más presentes. La cresta de décadas SHALL degradarse de forma
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

### Requirement: Reparto por tipo

La huella SHALL incluir lecturas del reparto de la actividad visible del dueño: cantidad de
artistas, álbumes y canciones valorados, entradas de colección física y listas visibles.
Estas lecturas SHALL presentarse como retrato de actividad y SHALL NOT presentarse como
progreso hacia una meta, pendientes ni completitud.

#### Scenario: Reparto visible

- **WHEN** un visitante autorizado abre un perfil con valoraciones, colección y listas
  visibles
- **THEN** ve las lecturas de reparto correspondientes a lo que tiene permitido ver

### Requirement: Equivalente textual accesible de la huella

La huella SHALL exponer un equivalente textual accesible de su contenido (por ejemplo, una
tabla o un resumen para lector de pantalla), de modo que su información no dependa
únicamente de la representación gráfica ni del color.

#### Scenario: Lector de pantalla

- **WHEN** una persona navega la huella con un lector de pantalla
- **THEN** obtiene los valores de la distribución de valoraciones, las décadas y los
  géneros en forma de texto
