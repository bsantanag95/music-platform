## ADDED Requirements

### Requirement: Presentador de Lo que viene

El presentador de `upcoming` SHALL resumir el rango real de fechas de los discos que muestra, SHALL describir cada disco
con una cartela de cuenta regresiva respecto de hoy y su fecha corta, y SHALL agruparlos por mes de lanzamiento, del mes
más cercano al más lejano. La cartela SHALL decir "Sale hoy" y "Sale mañana" para los dos primeros días, "Sale en N días"
hasta la semana y "Sale en N semanas" desde ahí. Un disco cuya fecha ya pasó SHALL describirse con la cartela de pasado
("Hace N días") y SHALL NOT mostrar un número negativo. Los discos sin fecha completa SHALL ir en el grupo final sin
encabezado.

#### Scenario: Cuenta regresiva

- **WHEN** un disco sale dentro de 9 días, el 24 de octubre
- **THEN** su cartela dice "Sale en 9 días · 24 oct"

#### Scenario: Mañana y hoy

- **WHEN** un disco sale mañana y otro hoy
- **THEN** sus cartelas dicen "Sale mañana" y "Sale hoy"

#### Scenario: Ya salió

- **WHEN** un disco de la colección salió hace 3 días, después de que se generó
- **THEN** su cartela dice "Hace 3 días" y no un número negativo

#### Scenario: Meses del más cercano al más lejano

- **WHEN** hay discos de octubre, noviembre y enero
- **THEN** se muestran en tres grupos con encabezado, de octubre a enero

#### Scenario: Sin ventana inventada

- **WHEN** se muestra el resumen de Lo que viene
- **THEN** dice el rango real de fechas de los discos mostrados y no afirma una ventana de días

### Requirement: Presentador de aniversarios

El presentador de `anniversaries` SHALL resumir el mes de su período y el rango de años que cumplen los discos, y SHALL
describir cada disco con la edad que cumple en el **año de su período** y su fecha completa de lanzamiento. Un disco sin
fecha completa, o sin años cumplidos en ese año, SHALL mostrar su año de lanzamiento. Si el período no se puede
interpretar, SHALL abstenerse.

#### Scenario: Edad según el período

- **WHEN** se abre la colección archivada de septiembre de 2025 con un disco lanzado el 5 sep 1975
- **THEN** su cartela dice "Cumple 50 años · 5 sep 1975" y no la edad de hoy

#### Scenario: Resumen

- **WHEN** se abre la colección de octubre de 2026 con discos que cumplen entre 10 y 70 años
- **THEN** el resumen nombra octubre de 2026 y el rango de 10 a 70 años

#### Scenario: Período ilegible

- **WHEN** el período de la colección no tiene la forma `AAAA-MM`
- **THEN** el presentador se abstiene y el detalle usa el de la familia

### Requirement: Presentador de un género por eras

El presentador de `genre-spotlight` SHALL resumir la regla de la colección: un disco por cada era de `ERA_YEARS` años del
género de su período, del más antiguo al más reciente, y SHALL describir cada disco con la era que representa y su año
("Era 1990–1994 · 1992"). El nombre del género SHALL salir del catálogo de familias de géneros en el idioma activo. Si el
período no trae una familia conocida, SHALL abstenerse.

#### Scenario: Era del disco

- **WHEN** un disco de 1992 está en la colección de una familia con eras de 5 años
- **THEN** su cartela dice "Era 1990–1994 · 1992"

#### Scenario: Género en el idioma activo

- **WHEN** se abre la colección de la familia `punk` en español y en inglés
- **THEN** el resumen nombra el género en cada idioma

#### Scenario: Familia desconocida

- **WHEN** el período apunta a una familia que ya no existe en la taxonomía
- **THEN** el presentador se abstiene y el detalle usa el de la familia

### Requirement: Presentador de un disco por década

El presentador de `one-per-decade` SHALL resumir la regla de la colección (el disco más destacado de cada década, de la
más reciente a la más antigua) y SHALL describir cada disco con su década y su año ("Década de 1990 · 1994", "1990s ·
1994" en inglés). Un disco sin año SHALL quedar sin cartela.

#### Scenario: Década del disco

- **WHEN** un disco de 1994 está en la colección
- **THEN** su cartela dice "Década de 1990 · 1994" en español y "1990s · 1994" en inglés

#### Scenario: Sin año

- **WHEN** un disco no tiene año de lanzamiento
- **THEN** no lleva cartela

### Requirement: Presentador de mejor valorados del trimestre

El presentador de `top-rated-quarter` SHALL resumir el trimestre de su período y el mínimo de valoraciones exigido, SHALL
describir cada disco con su valoración promedio y su número de valoraciones **de ese trimestre** ("★ 4,5 · 12
valoraciones") y SHALL numerar los discos. El promedio SHALL mostrarse con un decimal y el separador del idioma activo.
Un disco sin valoraciones en el trimestre SHALL quedar sin cartela. Si el período no se puede interpretar, SHALL
abstenerse.

#### Scenario: Cifra del trimestre

- **WHEN** un disco recibió 12 valoraciones en el trimestre con promedio 4,5
- **THEN** su cartela dice "★ 4,5 · 12 valoraciones" en español y "★ 4.5 · 12 valoraciones" en inglés

#### Scenario: Una valoración

- **WHEN** el conteo es 1
- **THEN** la cartela dice "valoración" en singular

#### Scenario: Solo el período del ranking

- **WHEN** un disco tiene valoraciones de otros trimestres
- **THEN** la cartela cuenta solo las del trimestre de la colección

#### Scenario: Numeración

- **WHEN** se abre la colección
- **THEN** las carátulas llevan número de orden

### Requirement: Presentador de lo más reseñado del mes

El presentador de `most-reviewed-month` SHALL resumir el mes de su período, SHALL describir cada disco con su número de
reseñas visibles **de ese mes** ("12 reseñas") y SHALL numerar los discos. Las reseñas ocultas por moderación SHALL NOT
contarse. Si el período no se puede interpretar, SHALL abstenerse.

#### Scenario: Reseñas del mes

- **WHEN** un disco recibió 12 reseñas visibles en el mes
- **THEN** su cartela dice "12 reseñas"

#### Scenario: Reseñas ocultas

- **WHEN** un disco tiene reseñas ocultas por moderación en el mes
- **THEN** no se cuentan en su cartela

#### Scenario: Singular

- **WHEN** el conteo es 1
- **THEN** la cartela dice "1 reseña"

### Requirement: Toda plantilla tiene presentador propio

Toda plantilla del registro de plantillas SHALL tener un presentador propio en el registro de presentadores. El presentador
de familia SHALL seguir existiendo como respaldo para colecciones cuya plantilla fue retirada del registro.

#### Scenario: Cobertura del registro

- **WHEN** se revisa el registro de presentadores
- **THEN** cada clave de `COLLECTION_TEMPLATES` tiene su presentador

#### Scenario: Plantilla retirada

- **WHEN** una colección conserva la clave de una plantilla que ya no existe
- **THEN** se presenta con el presentador de su familia
