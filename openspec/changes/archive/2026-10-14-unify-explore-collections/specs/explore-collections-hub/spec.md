## MODIFIED Requirements

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

### Requirement: Página de colecciones

El sistema SHALL exponer una vista pública en `/{locale}/explore/collections`, accesible con y sin sesión y sujeta al
mismo interruptor de Explorar que `/explore`, con dos bloques: las **colecciones vigentes** agrupadas por familia —sin
separar las curadas de las generadas— y el **archivo** de las automáticas vencidas. SHALL omitir los bloques sin
contenido. Cada tarjeta SHALL enlazar al detalle público de su lista. La página SHALL NOT personalizar su contenido
por la persona que la visita.

#### Scenario: Visita pública

- **WHEN** una persona abre `/es/explore/collections`
- **THEN** ve las colecciones vigentes agrupadas por familia y el archivo, en español

#### Scenario: Bloque sin contenido

- **WHEN** no hay ninguna colección vigente
- **THEN** el bloque de colecciones vigentes no se renderiza y la página muestra solo el archivo

#### Scenario: Explorar apagado

- **WHEN** el interruptor de Explorar está apagado
- **THEN** la página redirige a Inicio, igual que `/explore`

#### Scenario: Curadas y generadas en la misma familia

- **WHEN** una colección curada y una generada comparten la familia `discovery`
- **THEN** aparecen juntas en el grupo de esa familia, sin rótulo que las distinga
