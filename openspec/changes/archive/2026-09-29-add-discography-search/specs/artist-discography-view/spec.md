## ADDED Requirements

### Requirement: Buscador de la discografía

Cuando la discografía del artista tiene al menos 20 discos en total, la pestaña Discografía SHALL
ofrecer un buscador en la barra de secciones; con menos, SHALL NOT mostrarse. En móvil SHALL
presentarse como un botón que despliega el campo a todo el ancho.

Mientras el campo tiene texto, el contenido de la sección activa SHALL reemplazarse por los discos
de **todas** las secciones que coinciden, agrupados por sección en el orden del selector, cada grupo
con su nombre y cantidad, en formato tabla con las mismas columnas, marcas y menú de acciones de la
vista tabla, sin importar la vista elegida para la sección. Los discos de cada grupo SHALL seguir
el orden de la tabla. El selector de vista SHALL ocultarse mientras se busca. Un disco SHALL
coincidir cuando su título contiene el texto buscado sin distinguir mayúsculas, acentos ni el tipo
de apóstrofo o comillas; en Apariciones también cuando lo contiene el nombre del artista principal;
y, si el texto es un año de cuatro cifras, cuando el disco es de ese año.

Mientras se busca, cada pastilla de sección SHALL mostrar la cantidad de coincidencias de esa
sección en lugar del total, atenuada cuando es cero, y SHALL llevar al grupo correspondiente de los
resultados. La cantidad total de resultados SHALL anunciarse a lectores de pantalla.

Vaciar el campo o pulsar Esc SHALL restaurar la sección activa con su vista y orden. La búsqueda
SHALL NOT reflejarse en la URL ni recordarse entre visitas.

Sin coincidencias, SHALL mostrarse un aviso con un enlace para buscar el mismo texto en el catálogo
completo. Si la discografía del artista todavía se está completando en segundo plano, los
resultados SHALL avisar que puede faltar algún disco.

#### Scenario: Discografía corta

- **WHEN** un artista tiene 12 discos en total
- **THEN** la pestaña Discografía no muestra buscador

#### Scenario: Coincidencias en varias secciones

- **WHEN** una persona escribe "home" en la discografía de Mötley Crüe, que tiene "Home Sweet
  Home" en Sencillos y un disco en vivo con "Home" en el título
- **THEN** se ven dos grupos, Sencillos y En vivo, con esos discos en tabla, y las pastillas
  muestran 0 en Principal, Recopilatorios y Otros, atenuadas

#### Scenario: Coincidencia tolerante

- **WHEN** una persona escribe "dont go away" (sin apóstrofo) o "don't" con apóstrofo recto
- **THEN** aparece "Don’t Go Away Mad (Just Go Away)", escrito con apóstrofo tipográfico

#### Scenario: Búsqueda por año

- **WHEN** una persona escribe "1989"
- **THEN** aparecen los discos de 1989 y los que tienen "1989" en el título

#### Scenario: Aparición por artista principal

- **WHEN** una persona escribe el nombre del artista principal de una aparición
- **THEN** esa aparición figura en el grupo Apariciones

#### Scenario: Salir de la búsqueda

- **WHEN** una persona busca desde Principal en grilla y pulsa Esc
- **THEN** vuelve Principal en grilla, y el selector de vista reaparece

#### Scenario: Sin resultados

- **WHEN** ningún disco coincide con "zzz"
- **THEN** se muestra el aviso vacío con un enlace a la búsqueda del catálogo con "zzz"

#### Scenario: Discografía incompleta

- **WHEN** una persona busca en un artista cuya discografía se sigue ingiriendo en segundo plano
- **THEN** los resultados avisan que la discografía todavía se está completando
