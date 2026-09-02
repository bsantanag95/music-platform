## ADDED Requirements

### Requirement: Autoejecución de búsqueda a partir de un query param

`/search` SHALL leer un parámetro de consulta `q` opcional en la URL y, si está presente y no
vacío tras normalizarlo, SHALL pasarlo como valor inicial a `SearchForm`. `SearchForm` SHALL
autoejecutar la búsqueda con ese valor una única vez al montar, reusando la misma lógica que
un envío manual del formulario (mismos estados de carga, aviso de importación lenta, no
encontrado y error). Si el parámetro `q` está ausente o vacío, `SearchForm` SHALL comportarse
como hasta ahora, sin autoejecutar ninguna búsqueda.

#### Scenario: Llega con una consulta en la URL
- **WHEN** una persona abre `/search?q=Radiohead`
- **THEN** `SearchForm` inicia con el campo prellenado con "Radiohead" y ejecuta la búsqueda
  automáticamente, sin requerir que la persona vuelva a enviar el formulario

#### Scenario: Autoejecución única
- **WHEN** `SearchForm` ya autoejecutó la búsqueda inicial a partir de `q`
- **THEN** no vuelve a autoejecutarla en renders posteriores del mismo montaje

#### Scenario: Sin consulta en la URL
- **WHEN** una persona abre `/search` sin parámetro `q`
- **THEN** `SearchForm` se comporta igual que antes de este cambio: campo vacío, sin
  autoejecutar ninguna búsqueda
