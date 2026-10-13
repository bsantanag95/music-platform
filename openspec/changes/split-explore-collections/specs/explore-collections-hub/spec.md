## ADDED Requirements

### Requirement: Familias de colección

Cada plantilla de colecciones SHALL pertenecer a una familia, declarada en código en el registro de plantillas:
`ephemeris` (efemérides), `awards` (premios), `releases` (lanzamientos), `discovery` (descubrimiento) o `community`
(comunidad). Una clave de plantilla que ya no esté en el registro SHALL resolverse a la familia `discovery`. Las
colecciones curadas SHALL no tener familia: son "editorial". La familia SHALL mostrarse en la tarjeta de la
colección automática y SHALL poder filtrarse en la página de colecciones.

#### Scenario: Familia de una plantilla

- **WHEN** se lee una colección generada por `anniversaries`
- **THEN** su familia es `ephemeris` y la tarjeta muestra la etiqueta "Efemérides"

#### Scenario: Plantilla retirada del registro

- **WHEN** el archivo contiene una colección de una plantilla que ya no existe
- **THEN** se muestra con la familia `discovery` en lugar de fallar

### Requirement: Página de colecciones

El sistema SHALL exponer una vista pública en `/{locale}/explore/colecciones`, accesible con y sin sesión y sujeta al
mismo interruptor de Explorar que `/explore`, con tres bloques: la **selección editorial** vigente, las
**colecciones automáticas** vigentes agrupadas por familia y el **archivo** de las automáticas vencidas. SHALL
omitir los bloques sin contenido. Cada tarjeta SHALL enlazar al detalle público de su lista. La página SHALL NOT
personalizar su contenido por la persona que la visita.

#### Scenario: Visita pública

- **WHEN** una persona abre `/es/explore/colecciones`
- **THEN** ve la selección editorial vigente, las colecciones automáticas por familia y el archivo, en español

#### Scenario: Bloque sin contenido

- **WHEN** no hay colecciones curadas vigentes
- **THEN** el bloque de selección editorial no se renderiza

#### Scenario: Explorar apagado

- **WHEN** el interruptor de Explorar está apagado
- **THEN** la página redirige a Inicio, igual que `/explore`

### Requirement: Archivo de colecciones automáticas

El archivo SHALL listar las colecciones automáticas vencidas (`expires_at` en el pasado) cuya lista siga siendo
pública y visible, de la más reciente a la más antigua por fecha de vencimiento, con 24 por página (`?pagina=`) y
filtro opcional por familia (`?familia=`). Una colección vencida SHALL seguir enlazando a su lista, que conserva sus
álbumes del último período.

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
