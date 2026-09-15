## MODIFIED Requirements

### Requirement: Acción de colección en la página de álbum
El sistema SHALL ofrecer en la página de álbum un único punto de entrada autenticado para
declarar interés de colección sobre el álbum, que SHALL ofrecer primero una elección entre **"La
tengo"** y **"La quiero"** en vez de dos acciones separadas. Eligiendo "La tengo" el sistema SHALL
comportarse como hasta ahora: agregar el álbum a la colección eligiendo formato y, opcionalmente,
atributos y nota. Eligiendo "La quiero" el sistema SHALL delegar en la capability
`collection-wishlist` para agregar una o varias entradas de deseo. La página SHALL mostrar al
usuario autenticado, por separado, las entradas propias de colección y las entradas propias de
deseo que ya tiene para ese álbum, con la posibilidad de quitar cada una. La acción SHALL tener
estados de carga, éxito, error y sesión requerida, y SHALL NOT bloquear la carga del contenido
musical.

#### Scenario: Acción sin sesión
- **WHEN** un visitante no autenticado pulsa la acción de colección en una página de álbum
- **THEN** se le solicita iniciar sesión y no se crea ninguna entrada

#### Scenario: Elegir "La tengo"
- **WHEN** un usuario autenticado elige "La tengo", indica un formato y confirma
- **THEN** se crea una entrada de colección y la página muestra la copia agregada con
  confirmación accesible

#### Scenario: Elegir "La quiero"
- **WHEN** un usuario autenticado elige "La quiero" y confirma una o varias variantes deseadas
- **THEN** se crean las entradas de deseo correspondientes y la página las muestra con
  confirmación accesible

#### Scenario: Ver y quitar copias y deseos propios del álbum
- **WHEN** un usuario autenticado con entradas de colección y de deseo para ese álbum abre la
  página
- **THEN** ve ambos listados por separado y puede quitar cualquier entrada de cualquiera de los
  dos desde ahí
