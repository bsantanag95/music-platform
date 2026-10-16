# explore-collections-hub Specification

## Purpose
Página `/explore/collections` y familias de colección: las colecciones vigentes (curadas y generadas, sin distinguir
el origen) agrupadas por familia (efemérides, premios, lanzamientos, descubrimiento y rankings) y el archivo paginado
y filtrable de las automáticas que ya salieron del riel. Es el lugar donde recorrer todo lo que el riel único de
`/explore` solo resume (ADR 0038).
## Requirements
### Requirement: Familias de colección

Cada colección destacada SHALL pertenecer a una familia, guardada en su fila de `user_list_featured`: `ephemeris`
(efemérides), `awards` (premios), `releases` (lanzamientos), `discovery` (descubrimiento) o `rankings` (rankings de la
comunidad). La familia SHALL aplicar por igual a las colecciones generadas por plantilla y a las curadas a mano: SHALL
NOT existir una colección destacada sin familia.

Cada plantilla SHALL declarar su familia en el registro de plantillas y la generación SHALL escribirla en la fila al
crear la colección del período. Al destacar una lista a mano, la familia SHALL elegirse explícitamente. Una colección
cuya plantilla ya no esté en el registro SHALL conservar la familia guardada en su fila.

La familia SHALL mostrarse en la tarjeta de toda colección y SHALL poder filtrarse en la página de colecciones.

#### Scenario: Familia de una plantilla

- **WHEN** se genera una colección con `anniversaries`
- **THEN** su fila queda con la familia `ephemeris` y la tarjeta muestra la etiqueta "Efemérides"

#### Scenario: Plantilla retirada del registro

- **WHEN** el archivo contiene una colección de una plantilla que ya no existe
- **THEN** se muestra con la familia guardada en su fila, no con una de respaldo

#### Scenario: Familia de una colección curada

- **WHEN** se destaca a mano una lista oficial y se le asigna la familia `discovery`
- **THEN** su tarjeta muestra la etiqueta "Descubrimiento" y el filtro por esa familia la incluye

#### Scenario: Rankings de la comunidad

- **WHEN** se lee una colección generada por `top-rated-quarter`
- **THEN** su familia es `rankings` y la tarjeta muestra la etiqueta de rankings de la comunidad

### Requirement: Archivo de colecciones automáticas

El archivo SHALL listar las colecciones automáticas vencidas (`expires_at` en el pasado) cuya lista siga siendo
pública, visible y con al menos un álbum, de la más reciente a la más antigua por fecha de vencimiento, con 24 por página
(`?pagina=`), con el filtro por familia compartido con las vigentes (`?familia=`), en tarjetas densas y con la fecha en
que salieron del riel. El bloque SHALL omitirse cuando no haya ninguna colección archivada y no haya filtro activo; con un
filtro activo y sin resultados SHALL mostrar un mensaje con la salida a "Todas". Una colección vencida SHALL seguir enlazando a
su lista, que conserva sus álbumes del último período.

#### Scenario: Colección que sale del riel

- **WHEN** vence la colección de un período y se crea la del siguiente
- **THEN** la anterior aparece en el archivo y deja de aparecer en el rail

#### Scenario: Filtro por familia

- **WHEN** se abre el archivo con `?familia=awards`
- **THEN** solo muestra colecciones vencidas de la familia de premios

#### Scenario: Paginación

- **WHEN** hay más de 24 colecciones vencidas
- **THEN** el archivo muestra 24 por página y enlaza a la siguiente

#### Scenario: Lista oculta o privada

- **WHEN** la lista de una colección vencida deja de ser pública o queda oculta por moderación
- **THEN** no aparece en el archivo

#### Scenario: Archivo vacío sin filtro

- **WHEN** no hay ninguna colección vencida y no hay filtro activo
- **THEN** la página no renderiza el bloque del archivo

#### Scenario: Archivo vacío con filtro

- **WHEN** se filtra por una familia sin colecciones vencidas
- **THEN** el archivo muestra un mensaje de que no hay anteriores de ese tipo y un enlace para ver todas

### Requirement: Página de colecciones con destacada, vigentes y archivo

El sistema SHALL exponer una vista pública en `/{locale}/explore/collections`, accesible con y sin sesión y sujeta al
mismo interruptor de Explorar que `/explore`. La página SHALL abrir con una cabecera que explique en una frase qué es una
colección (selección de la plataforma con un criterio detrás) frente a una lista de personas, con enlace a Listas, y SHALL
componerse, en este orden, de: una barra de filtro por tipo, el bloque de **vigentes** y el **archivo** de las automáticas
vencidas. El bloque de vigentes SHALL mostrar, sin filtro activo, la primera de ellas (orden editorial del riel de
`/explore`) como **colección destacada** y el resto en **una sola rejilla**, sin separar por familia ni por origen. SHALL omitir los bloques sin contenido. Cada tarjeta SHALL enlazar al detalle público de su
colección. La página SHALL NOT personalizar su contenido por la persona que la visita.

#### Scenario: Visita pública sin filtro

- **WHEN** una persona abre `/es/explore/collections` y hay vigentes
- **THEN** ve la cabecera con la frase y el enlace a Listas, la destacada, la rejilla con el resto de las vigentes y el
  archivo, en español

#### Scenario: Una sola colección vigente

- **WHEN** solo hay una colección vigente
- **THEN** la página la muestra como destacada y no renderiza la rejilla

#### Scenario: Filtro por tipo

- **WHEN** se abre `/es/explore/collections?familia=awards`
- **THEN** la página muestra solo las vigentes y el archivo de la familia de premios, en una rejilla sin destacada, y el
  chip de premios figura como activo

#### Scenario: Curadas y generadas mezcladas

- **WHEN** una colección curada y una generada están vigentes
- **THEN** aparecen en la misma rejilla, ordenadas como en el riel de `/explore` y sin rótulo que las distinga

#### Scenario: Bloque sin contenido

- **WHEN** no hay ninguna colección vigente
- **THEN** el bloque de vigentes no se renderiza y la página muestra solo el archivo, si lo hay

#### Scenario: Explorar apagado

- **WHEN** el interruptor de Explorar está apagado
- **THEN** la página redirige a Inicio, igual que `/explore`

### Requirement: Filtro por tipo solo con contenido

La barra de filtro por tipo SHALL ofrecer "Todas" y únicamente las familias que tengan al menos una colección vigente o
archivada, y SHALL omitirse cuando haya una sola familia con contenido. El filtro (`?familia=`) SHALL aplicarse a vigentes y
archivo a la vez y SHALL conservarse al paginar el archivo. Un valor de `familia` desconocido SHALL tratarse como "Todas".

#### Scenario: Familias sin contenido

- **WHEN** ninguna colección vigente ni archivada pertenece a la familia de rankings
- **THEN** la barra no ofrece el chip de rankings

#### Scenario: Una sola familia

- **WHEN** todo el contenido pertenece a una familia
- **THEN** la barra de filtro no se renderiza

#### Scenario: Filtro compartido

- **WHEN** se abre `?familia=releases&pagina=2`
- **THEN** las vigentes y el archivo muestran solo lanzamientos y la paginación del archivo conserva `familia`

#### Scenario: Familia desconocida

- **WHEN** se abre `?familia=inexistente`
- **THEN** la página se comporta como sin filtro

### Requirement: Tarjeta de colección con frase de contexto

Cada tarjeta de las vigentes de la página de colecciones SHALL mostrar, bajo el título, una frase (hasta dos líneas) con el
resumen que su presentador (ADR 0039) produce para esa colección, localizado en el idioma activo. La frase SHALL sustituir
a la descripción de la colección en esa tarjeta. Una colección sin resumen (curada, sin
presentador que lo produzca o con presentador que falla o se abstiene) SHALL mostrarse sin esa línea, sin error. Calcular
los resúmenes SHALL NOT requerir una consulta por álbum: SHALL leer los álbumes de todas las colecciones listadas en un
solo lote y ejecutar un presentador por colección.

#### Scenario: Resumen en la tarjeta

- **WHEN** hay una colección vigente de efemérides del mes de octubre de 2026
- **THEN** su tarjeta muestra el resumen de ese mes y el rango de años que cumplen, no solo el título

#### Scenario: Colección curada

- **WHEN** una colección curada no tiene presentador que produzca resumen
- **THEN** su tarjeta no muestra línea de contexto y mantiene el resto del contenido

#### Scenario: Presentador que falla

- **WHEN** el presentador de una colección falla
- **THEN** la página se renderiza completa y esa tarjeta no muestra línea de contexto

### Requirement: Las colecciones sin álbumes no se listan

Una colección destacada SHALL listarse solo si su lista tiene al menos un álbum. Esta condición SHALL aplicar a toda
superficie que liste colecciones vigentes o archivadas: la página de colecciones, el riel de `/explore`, la Inicio anónima y
el archivo. El detalle de una colección vacía SHALL seguir abriéndose por su enlace directo.

#### Scenario: Colección vigente vacía

- **WHEN** una colección destacada vigente no tiene ningún álbum
- **THEN** no aparece en la página de colecciones, en el riel de `/explore` ni en la Inicio anónima

#### Scenario: Colección archivada vacía

- **WHEN** una colección vencida no tiene ningún álbum
- **THEN** no aparece en el archivo

#### Scenario: Enlace directo

- **WHEN** se abre el enlace de una colección sin álbumes
- **THEN** el detalle se muestra con su estado vacío, sin error

### Requirement: Pila de carátulas dentro de su escenario

La pila de carátulas de una tarjeta de colección SHALL caber dentro del marco que la contiene en todos los anchos de
rejilla (1, 2, 3 y 4 columnas), también con el abanico abierto al pasar el mouse. La tarjeta de la página de colecciones SHALL
mostrar a lo más cinco fundas.

#### Scenario: Tarjeta de 4 columnas

- **WHEN** la página se muestra a 1280 px de ancho
- **THEN** la pila, en reposo y con el mouse encima, queda dentro del marco oscuro de la tarjeta

