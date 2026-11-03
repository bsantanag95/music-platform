## ADDED Requirements

### Requirement: Formulario agrupado

El formulario de cada pestaña SHALL agrupar sus campos en conjuntos con nombre: Artistas en **Identidad** (nombre, tipo),
**Origen** (país, ciudad o región) y **Época** (año de inicio, estado); Álbumes en **Identidad** (título, artista) y
**Lanzamiento** (año, tipo); Canciones en **Identidad** (título, artista, álbum) y **Lanzamiento** (tipo, duración). Los
campos de texto, selectores y el selector de países SHALL tener el mismo alto y tipografía; la casilla de coincidencia
exacta SHALL ir debajo de su campo; la etiqueta SHALL ir arriba y la ayuda debajo del control, de modo que los controles
de una misma fila queden alineados. En los rangos, "desde" y "hasta" SHALL ir en el texto de ejemplo de cada control.

#### Scenario: Grupos de Artistas
- **WHEN** una persona abre la pestaña Artistas
- **THEN** ve los grupos Identidad, Origen y Época, y el campo Nombre del mismo ancho que Tipo

### Requirement: Envío fijo en móvil con cantidad de criterios

La fila de envío SHALL mostrar cuántos criterios tiene el formulario, contados como en la barra de criterios, y SHALL
actualizarse al cambiar cualquier campo. En pantallas angostas SHALL quedar fija al pie de la pantalla mientras el
formulario está visible.

#### Scenario: Contar criterios
- **WHEN** una persona en Artistas elige Grupo, agrega Chile y escribe 1980 en "desde"
- **THEN** la fila de envío dice "3 criterios"

### Requirement: Validación en español

Con JavaScript, el formulario SHALL validar antes de navegar: los años SHALL tener 4 dígitos dentro del rango del campo,
"desde" SHALL NOT ser posterior a "hasta" y la duración SHALL escribirse como `m:ss` o minutos. Con un error, SHALL NOT
navegar: SHALL mostrar el mensaje bajo el grupo del campo, marcarlo con `aria-invalid` y enfocar el primer campo con
error. Sin JavaScript SHALL conservarse la validación del navegador.

#### Scenario: Rango invertido
- **WHEN** una persona escribe 1990 en "desde" y 1980 en "hasta" del año de inicio y pulsa Buscar
- **THEN** la página no navega y ve "«Desde» no puede ser posterior a «Hasta»" bajo el año de inicio

### Requirement: Aviso de valores ignorados

Si la URL trae, para un campo del tipo activo, un valor que la búsqueda no reconoce, la página SHALL avisar qué
`campo=valor` se ignoró, además de buscar con el resto.

#### Scenario: Tipo de lanzamiento desconocido
- **WHEN** una persona abre `/search/advanced?type=album&category=live&yearFrom=1994`
- **THEN** ve el aviso con `category=live` y los resultados de 1994

### Requirement: Ejemplos y búsquedas recientes sin campos

Sin campos, debajo del formulario la página SHALL ofrecer tres ejemplos de la pestaña activa, cada uno con su título y sus
criterios, que llevan a esa búsqueda, y las últimas búsquedas avanzadas mostradas en ese navegador (hasta 5, sin repetir,
cada una con su pestaña y sus criterios), con opción de quitarlas. Las recientes SHALL guardarse solo en el navegador y
la página SHALL funcionar si el almacenamiento no está disponible.

#### Scenario: Ejemplo de Artistas
- **WHEN** una persona abre `/search/advanced` y pulsa "Bandas chilenas de los 80"
- **THEN** la página busca grupos de Chile con inicio entre 1980 y 1989

#### Scenario: Reciente
- **WHEN** una persona buscó grupos de Chile y vuelve a `/search/advanced`
- **THEN** ve esa búsqueda entre las recientes con "Grupo · Chile"
