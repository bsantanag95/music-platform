## MODIFIED Requirements

### Requirement: Orden de los álbumes del género

El listado SHALL ofrecer cinco órdenes, todos deterministas con el identificador del álbum como desempate:
`mejor` (predeterminado, "Destacados": el orden por defecto de los listados de Explorar, capacidad `album-discovery`),
`populares` (la puntuación de popularidad de siempre, capacidad `popularity`, descendente; los álbumes sin actividad al
final, en el orden `mejor`), `recientes` (año descendente, sin año al final), `antiguos` (año ascendente, sin año al
final) y `az` (título sin acentos ni mayúsculas ascendente). Con `orden=mejor` y sin otros filtros el resultado SHALL
coincidir con el listado por género de Explorar. La etiqueta de `populares` SHALL ser "Populares" / "Popular".

#### Scenario: Más recientes primero

- **WHEN** una persona elige `orden=recientes`
- **THEN** los álbumes aparecen del año más nuevo al más antiguo y los de año desconocido al final

#### Scenario: Orden estable

- **WHEN** dos álbumes empatan en el criterio de orden
- **THEN** su orden relativo es el mismo en cada visita y entre páginas

#### Scenario: Populares por personas, no por valoraciones

- **WHEN** un disco tiene 4 personas que lo escucharon y otro tiene 2 valoraciones
- **THEN** con `orden=populares` el primero aparece antes
