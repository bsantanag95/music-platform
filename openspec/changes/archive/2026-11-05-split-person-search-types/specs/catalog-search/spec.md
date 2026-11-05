## MODIFIED Requirements


### Requirement: Accesibilidad del buscador por tipo
El campo de búsqueda SHALL exponer un label asociado y estados de validación mediante atributos
ARIA. El selector de tipo SHALL anunciar su función y el tipo activo. La lista de resultados
SHALL ser navegable por teclado, los filtros (Solista/Grupo, categoría, década) SHALL exponer su
estado seleccionado, y el estado de carga, el aviso de resultados incompletos y el estado vacío
SHALL poder ser percibidos por un lector de pantalla.

#### Scenario: Campo etiquetado
- **WHEN** una persona navega el formulario con teclado o lector de pantalla
- **THEN** el campo de búsqueda tiene un label asociado y el mensaje de validación se relaciona
  con él

#### Scenario: Filtros anunciables
- **WHEN** una persona con lector de pantalla recorre el filtro Solista/Grupo
- **THEN** cada opción anuncia su nombre y si está seleccionada

