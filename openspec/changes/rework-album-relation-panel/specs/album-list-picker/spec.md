## ADDED Requirements

### Requirement: Pertenencia visible en el selector

El selector de listas del panel del álbum SHALL mostrar las listas propias de álbumes y los
Caminos propios no archivados como casillas de verificación, marcadas cuando el álbum ya
está en esa lista o Camino. La pertenencia inicial SHALL venir del servidor junto con el
resto del estado personal del álbum. Las listas automáticas (recorridos de artista) SHALL
NOT aparecer en el selector.

#### Scenario: Álbum ya en una lista

- **WHEN** un usuario abre el selector de un álbum que ya está en su lista "Glam Metal"
- **THEN** la casilla de "Glam Metal" aparece marcada

#### Scenario: Camino archivado

- **WHEN** el usuario tiene un Camino archivado
- **THEN** ese Camino no aparece en el selector

### Requirement: Alta y baja por casilla

Marcar una casilla SHALL agregar el álbum a esa lista o Camino; desmarcarla SHALL quitarlo.
Cada cambio SHALL reflejarse de inmediato en la casilla y, si la operación falla, SHALL
revertirse y mostrarse un error accesible sin cerrar el selector. Mientras una operación
está en curso, SHALL NOT poder lanzarse otra sobre la misma casilla.

#### Scenario: Quitar de una lista

- **WHEN** un usuario desmarca "Glam Metal"
- **THEN** el álbum sale de esa lista y la casilla queda desmarcada

#### Scenario: Falla al agregar

- **WHEN** falla el alta del álbum en un Camino
- **THEN** la casilla vuelve a desmarcarse y el selector muestra el error

### Requirement: Alcance completo y búsqueda

El selector SHALL permitir llegar a cualquier lista propia de álbumes, sin importar
cuántas tenga el usuario: SHALL mostrar primero las listas que contienen el álbum y luego
las más recientes, y SHALL ofrecer un campo de búsqueda por título que consulta al
servidor. El selector SHALL NOT descartar en silencio listas por encima de un tamaño de
página. La lista de Caminos SHALL filtrarse con el mismo campo de búsqueda.

#### Scenario: Usuario con muchas listas

- **WHEN** un usuario con 80 listas de álbumes busca "hard rock"
- **THEN** el selector muestra sus listas cuyo título coincide, aunque estén fuera de las
  50 más recientes

#### Scenario: Lista que contiene el álbum fuera de la primera página

- **WHEN** el álbum está en una lista antigua del usuario
- **THEN** esa lista aparece marcada al abrir el selector, sin necesidad de buscarla

### Requirement: Selector compacto

El selector SHALL tener un alto máximo con desplazamiento interno, secciones "Listas" y
"Caminos" rotuladas, y una acción "+ Nueva" por sección en una sola línea que despliega el
formulario de creación correspondiente. Crear una lista o Camino desde el selector SHALL
agregar el álbum y dejar su casilla marcada. El selector SHALL poder cerrarse con Escape.

#### Scenario: Crear lista desde el selector

- **WHEN** un usuario crea la lista "Pop 2025" desde el selector
- **THEN** la lista aparece marcada en el selector y contiene el álbum

#### Scenario: Muchos Caminos

- **WHEN** un usuario tiene 40 Caminos activos
- **THEN** el selector no crece más allá de su alto máximo y los Caminos se recorren con
  desplazamiento interno
