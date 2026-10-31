## ADDED Requirements

### Requirement: Disposición del panel como la del artista

El panel "Tu relación" del álbum SHALL seguir la disposición del panel del artista:
Favorito y Pendiente como conmutadores en la parte superior; después la Nota con sus
estrellas en línea; y filas para Reseña, Escuchas, Colección, Listas y Géneros, cada una
con su etiqueta y su acción en la primera línea y su estado debajo, atenuado cuando dice
que no hay nada ("Sin reseña", "Sin escuchas", "No está en tu colección", "En ninguna de
tus listas"). Las acciones de texto de las filas SHALL mostrarse en gris; el ámbar queda
para los conmutadores activos y las estrellas.

#### Scenario: Primera visita autenticada

- **WHEN** un usuario autenticado abre un álbum con el que nunca interactuó
- **THEN** ve Favorito y Pendiente arriba, y las filas Listas con "En ninguna de tus
  listas" y la acción "Elegir listas" en la línea de la etiqueta

#### Scenario: Escuchas registradas

- **WHEN** un usuario tiene 3 escuchas del álbum, la última el 12 de septiembre
- **THEN** la fila Escuchas muestra la acción "+ Registrar" junto a la etiqueta y debajo
  "3 · última 12 sep"
