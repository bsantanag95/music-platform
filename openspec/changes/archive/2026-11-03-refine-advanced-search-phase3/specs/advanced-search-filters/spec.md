## ADDED Requirements

### Requirement: Datos filtrados destacados

En `/search/advanced`, cada fila de resultados SHALL destacar los datos que la búsqueda filtró: en Artistas, el tipo, el
país, la ciudad o región y los años (con un filtro de año de inicio o de estado); en Álbumes, el artista, el tipo y el
año de lanzamiento; en Canciones, el artista, el álbum y la duración. `/search` SHALL NOT destacar nada.

#### Scenario: Grupos de Chile de los 80
- **WHEN** una persona busca grupos de Chile con inicio entre 1980 y 1989
- **THEN** en cada fila "Grupo", "Chile" y los años se ven destacados

### Requirement: Vista Tabla de los resultados

Con resultados y en pantallas anchas, `/search/advanced` SHALL ofrecer las vistas **Lista** (por defecto) y **Tabla**. La
tabla SHALL tener una fila por resultado y estas columnas: Artistas: Nombre, Tipo, País, Ciudad o región, Años, Discos;
Álbumes: Título, Artista, Tipo, Año, Media, Tú; Canciones: Título, Artista, Duración. Las columnas de los criterios de la
búsqueda SHALL marcarse. La elección SHALL recordarse en el navegador y la página SHALL funcionar si el almacenamiento no
está disponible. "Cargar más" SHALL agregar los resultados en la misma vista. En pantallas angostas SHALL verse siempre
la lista. La tabla SHALL NOT ordenarse por columna.

#### Scenario: Elegir Tabla
- **WHEN** una persona elige Tabla en una búsqueda de álbumes de Pink Floyd de los 70 y luego busca otra cosa
- **THEN** ve la tabla con las columnas Artista, Tipo y Año marcadas, y la búsqueda nueva también en Tabla

#### Scenario: Teléfono
- **WHEN** una persona que eligió Tabla abre la búsqueda en un teléfono
- **THEN** ve la lista
