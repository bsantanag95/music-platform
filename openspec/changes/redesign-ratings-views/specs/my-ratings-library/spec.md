## MODIFIED Requirements

### Requirement: Edición en la fila
Cada entrada SHALL permitir abrir el diálogo de puntaje (`album-personal-panel`) con su
valoración, que permite afinar el puntaje, destacar o quitar de destacadas y borrar la nota. En
el modo Detallada la fila SHALL además permitir cambiar las estrellas con el control de selección
de estrellas de `rating-display`; en los modos Índice y Gráfico las estrellas SHALL cambiarse
solo desde el diálogo. Cambiar las estrellas SHALL conservar el puntaje solo si sigue siendo
coherente; si no, SHALL guardarse sin puntaje y avisar de forma accesible cuál se quitó. Tras
editar, la entrada SHALL actualizarse en el lugar sin reordenarse hasta que se cambie el orden o
los filtros, o se recargue la página. Borrar la nota SHALL quitar la entrada y actualizar el total
y el contador de su tipo.

#### Scenario: Cambiar estrellas conserva un puntaje coherente
- **WHEN** una persona con 4,5★ · 86 cambia las estrellas a 4,5 (sin cambio) o a 5★
- **THEN** con 4,5 nada cambia, y con 5★ se guarda sin puntaje y se avisa que se quitó el 86

#### Scenario: Afinar desde la fila
- **WHEN** la persona abre el diálogo desde una fila de 4★ y guarda 76
- **THEN** la fila muestra 4 estrellas y `76/100`, sin cambiar de posición

#### Scenario: Afinar desde la pared
- **WHEN** la persona abre el diálogo desde una carátula del modo Gráfico y guarda 76
- **THEN** la leyenda de esa carátula muestra el puntaje 76, sin cambiar de posición

#### Scenario: Borrar desde la fila
- **WHEN** la persona confirma "Borrar nota" desde el diálogo de una fila
- **THEN** la fila desaparece y el total baja en uno

### Requirement: Marca "Sin afinar"
Las entradas sin puntaje detallado SHALL mostrar en lugar de `86/100` un guion atenuado `—` con la ayuda "Sin
afinar" y el nombre accesible "Afinar puntaje", que a la vez SHALL ser la acción que abre el diálogo de
puntaje, en los modos Detallada, Índice y Gráfico. La frase "Sin afinar" NO SHALL repetirse como texto visible
en cada entrada, y SHALL seguir en la etiqueta accesible del enlace de la carátula del modo Gráfico. La marca
SHALL existir solo en esta página.

#### Scenario: Fila sin puntaje
- **WHEN** una valoración de 4 estrellas no tiene puntaje detallado
- **THEN** su fila muestra las estrellas y un guion con la ayuda "Sin afinar", y al activarlo se abre el
  diálogo de puntaje

#### Scenario: Carátula sin puntaje
- **WHEN** esa misma valoración se ve en el modo Gráfico
- **THEN** la leyenda muestra las estrellas y un guion con la ayuda "Sin afinar", y al activarlo se abre el
  diálogo de puntaje
