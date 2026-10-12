# explore-day-zero-templates Specification

## Purpose
Reglas de las seis colecciones destacadas que deben estar listas el día 0 de `/explore` sin actividad de la
comunidad: Novedades esenciales, Ganadores del último premio, Para entrar a {género} (una familia por
semana), Cumplen años en {mes}, Lo que viene y Un disco por década. Cada una exige carátulas resueltas y un
mínimo de álbumes; las plantillas de comunidad toman el relevo cuando hay actividad (ADR 0035).
## Requirements
### Requirement: Conjunto de seis colecciones del día 0

El sistema SHALL ofrecer seis plantillas que producen una colección válida sin actividad de la comunidad:
`new-releases`, `grammy-winners`, `genre-spotlight`, `anniversaries`, `upcoming` y `one-per-decade`. Cada una
SHALL producir como máximo `COLLECTION_SIZE` álbumes, todos con carátula resuelta, y SHALL omitirse (sin crear
ni modificar listas) si no reúne `MIN_ALBUMS_FOR_SECTION`. Con las seis disponibles, el riel SHALL mostrar
seis tarjetas. Las plantillas `top-rated-quarter` y `most-reviewed-month` SHALL seguir disponibles y, al
crearse, SHALL ubicarse por delante de las más débiles dentro del tope del riel.

#### Scenario: Seis tarjetas el día 0

- **WHEN** hay géneros, premios y calendario cargados y se ejecuta la generación
- **THEN** existen seis colecciones vigentes y el riel de `/explore` muestra seis tarjetas

#### Scenario: Plantilla de comunidad sin actividad

- **WHEN** no hay valoraciones ni reseñas suficientes
- **THEN** `top-rated-quarter` y `most-reviewed-month` no crean colección y el riel conserva las seis del día 0

#### Scenario: La comunidad toma el relevo

- **WHEN** `top-rated-quarter` reúne el mínimo de álbumes valorados
- **THEN** su colección aparece por delante de las más débiles y el riel sigue mostrando como máximo seis

### Requirement: Ganadores del premio más reciente

La plantilla `grammy-winners` SHALL generar la colección "Ganadores del Grammy {año}" con los ganadores de la
última ceremonia cargada que tengan álbum (directo o ancla), con las categorías generales antes que las de
género. Su período SHALL ser `<premio>-<año>`; al cargarse una ceremonia más reciente SHALL crear la colección
nueva y vencer la anterior.

#### Scenario: Última ceremonia

- **WHEN** la última ceremonia cargada es la de 2025 y tiene al menos seis ganadores con álbum
- **THEN** la colección "Ganadores del Grammy 2025" contiene esos álbumes, los de categorías generales primero

#### Scenario: Ceremonia nueva

- **WHEN** se carga la ceremonia de 2026 y corre la generación
- **THEN** se crea "Ganadores del Grammy 2026" y la de 2025 sale del riel sin dejar de ser pública

#### Scenario: Sin premios cargados

- **WHEN** no hay ninguna ceremonia cargada
- **THEN** la plantilla no crea colección

### Requirement: Cumplen años en el mes

La plantilla `anniversaries` SHALL generar "Cumplen años en {mes}" con álbumes `studio` de fecha de primer
lanzamiento completa cuyo mes es el actual y cuyo aniversario es múltiplo de 5 y de al menos 10 años, con los
aniversarios más redondos primero. Si así reúne menos de `MIN_ALBUMS_FOR_SECTION`, SHALL ampliarse a cualquier
aniversario de al menos 10 años. Su período SHALL ser el mes (`AAAA-MM`).

#### Scenario: Aniversarios redondos

- **WHEN** hay suficientes álbumes con aniversario múltiplo de 5 en el mes
- **THEN** la colección los lista con los de 50, 40, 30… años antes que los de 25, 20, 15 y 10

#### Scenario: Ampliación

- **WHEN** los aniversarios múltiplos de 5 no alcanzan el mínimo
- **THEN** la colección incluye también otros aniversarios de al menos 10 años

#### Scenario: Cambio de mes

- **WHEN** empieza un mes nuevo
- **THEN** se crea la colección del mes y la anterior sale del riel

### Requirement: Género de la semana

La plantilla `genre-spotlight` SHALL generar "Para entrar a {familia}" con una familia de géneros por semana
ISO, elegida de forma determinista entre las familias con candidatos suficientes, en el orden de la taxonomía.
SHALL listar un álbum por era de 5 años en orden cronológico. Si la familia elegida no reúne el mínimo con carátula,
SHALL probar la siguiente. Su período SHALL ser la semana ISO y la familia (`AAAA-Www-<familia>`).

#### Scenario: Rotación semanal

- **WHEN** pasa de una semana a la siguiente
- **THEN** se crea una colección de la familia siguiente y la anterior sale del riel

#### Scenario: Un disco por era

- **WHEN** se genera la colección de una familia
- **THEN** contiene como máximo un álbum por era de 5 años, ordenados cronológicamente

#### Scenario: Familia sin contenido suficiente

- **WHEN** la familia que toca no reúne seis álbumes con carátula
- **THEN** se usa la siguiente familia elegible

### Requirement: Lo que viene

La plantilla `upcoming` SHALL generar "Lo que viene" con los próximos lanzamientos del calendario enlazados al
catálogo, ordenados por el rango de popularidad del calendario, y completar con los próximos lanzamientos del
catálogo (misma condición que el riel de Próximos lanzamientos) hasta el mínimo. Es evergreen.

#### Scenario: Calendario poblado

- **WHEN** el calendario tiene seis o más próximos lanzamientos enlazados con carátula
- **THEN** la colección los lista por rango de popularidad

#### Scenario: Calendario corto

- **WHEN** el calendario aporta menos de seis
- **THEN** se completan con próximos lanzamientos del catálogo con carátula

### Requirement: Novedades esenciales y un disco por década

La plantilla `new-releases` SHALL ordenar los lanzamientos de los últimos `NEW_RELEASE_WINDOW_DAYS` por la
señal de calidad (popularidad del calendario cuando no hay comunidad) y no por fecha. La plantilla
`one-per-decade` SHALL elegir en cada década el álbum `studio` mejor posicionado por la señal de calidad en
lugar del más antiguo. Ambas SHALL conservar su clave y su período `evergreen`, de modo que las listas ya
creadas se siguen refrescando.

#### Scenario: Orden por popularidad

- **WHEN** hay lanzamientos recientes con rango de calendario
- **THEN** los de mejor rango aparecen primero, aunque otros sean más recientes

#### Scenario: Elección por década

- **WHEN** una década tiene un álbum ganador o nominado a un premio y otros sin señal
- **THEN** la colección elige el que tiene la señal

#### Scenario: Continuidad de las listas existentes

- **WHEN** ya existen las listas evergreen de estas plantillas
- **THEN** la generación las refresca en lugar de crear otras

