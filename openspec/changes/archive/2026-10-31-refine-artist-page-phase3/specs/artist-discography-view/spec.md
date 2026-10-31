## ADDED Requirements

### Requirement: Filtro personal de la discografía

Con sesión y al menos una marca propia (nota, escucha, favorito o Pendiente) en algún disco de la discografía, la barra
SHALL ofrecer un selector **Todo · Sin valorar N · Tuyos N**, con las cifras de la sección activa. "Sin valorar" SHALL
atenuar los discos que el usuario ya valoró y "Tuyos" los que no tienen ninguna marca suya; ningún disco SHALL
esconderse ni cambiar de lugar, y uno atenuado SHALL recuperar su opacidad al pasar el puntero o recibir el foco. El
filtro SHALL aplicarse a la grilla y a la tabla y SHALL conservarse al cambiar de sección. Sin sesión o sin marcas, el
selector SHALL NOT mostrarse. La URL `?filter=unrated` SHALL abrir la discografía con "Sin valorar" activo.

#### Scenario: Ver lo que falta valorar

- **WHEN** un usuario que valoró 5 discos de Principal elige "Sin valorar"
- **THEN** esos 5 discos quedan atenuados en su lugar y el resto se ve igual

#### Scenario: Sin marcas propias

- **WHEN** un usuario sin ninguna marca sobre la discografía abre el artista
- **THEN** no ve el selector de filtro
