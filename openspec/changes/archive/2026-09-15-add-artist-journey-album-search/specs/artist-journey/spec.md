## ADDED Requirements

### Requirement: Buscador en la selección de álbumes de una discografía
El sistema SHALL ofrecer un buscador por título dentro de la vista agrupada de selección de
álbumes de una discografía — tanto en el editor de la página de gestión como en el modal de
inicio, que comparten esa misma vista —, sin distinguir mayúsculas de minúsculas ni diacríticos
(una búsqueda sin tilde SHALL encontrar un título con tilde, y viceversa), filtrando localmente
sin ida y vuelta al servidor. Mientras el buscador tiene texto, cualquier grupo de categoría con
al menos un álbum coincidente SHALL mostrarse expandido, sin importar su estado de colapso
previo; los grupos sin ningún álbum coincidente SHALL NOT mostrarse. Al vaciar el buscador, el
estado de colapso previo a la búsqueda SHALL regir de nuevo. Si ningún álbum de la discografía
coincide con el texto buscado, el sistema SHALL mostrar un estado vacío localizado. El buscador
SHALL NOT alterar la selección ya hecha, ni el alcance de "Seleccionar todo"/"Deseleccionar todo"
de un grupo, que SHALL seguir aplicando al grupo completo, no solo a los álbumes visibles por la
búsqueda.

#### Scenario: Buscar filtra por título de álbum
- **WHEN** el propietario escribe en el buscador un texto que coincide con el título de algunos
  álbumes de la discografía
- **THEN** la vista muestra solo los álbumes cuyo título coincide, sin llamar al servidor

#### Scenario: Buscar sin distinguir diacríticos
- **WHEN** el propietario escribe el título de un álbum con tildes u otros diacríticos sin
  incluirlos, o a la inversa
- **THEN** el sistema encuentra el álbum correspondiente sin exigir que los diacríticos coincidan
  exactamente

#### Scenario: Un grupo con coincidencias se muestra expandido durante la búsqueda
- **WHEN** el propietario busca un título que pertenece a un grupo de categoría que estaba
  colapsado
- **THEN** ese grupo se muestra expandido mientras dure la búsqueda, sin necesidad de expandirlo
  a mano

#### Scenario: Un grupo sin coincidencias no se muestra durante la búsqueda
- **WHEN** ningún álbum de un grupo de categoría coincide con el texto buscado
- **THEN** ese grupo no se muestra mientras dure la búsqueda

#### Scenario: Vaciar la búsqueda restaura el colapso previo
- **WHEN** el propietario vacía el buscador después de haber expandido un grupo solo por efecto
  de la búsqueda
- **THEN** ese grupo vuelve a mostrarse colapsado si así estaba antes de buscar

#### Scenario: Búsqueda sin coincidencias
- **WHEN** el texto buscado no coincide con ningún álbum de la discografía
- **THEN** el sistema muestra un estado vacío localizado de "sin resultados"

#### Scenario: Buscar no altera la selección ni "Seleccionar todo"
- **WHEN** el propietario activa "Seleccionar todo" de un grupo mientras el buscador está
  filtrando solo algunos de sus álbumes
- **THEN** el sistema marca todos los álbumes del grupo completo, no solo los visibles por la
  búsqueda
