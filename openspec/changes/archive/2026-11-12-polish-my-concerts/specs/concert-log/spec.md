## MODIFIED Requirements

### Requirement: Página Mis conciertos

El usuario autenticado SHALL tener la página **Mis conciertos** (`/{locale}/me/concerts`) con sus registros agrupados
por año, del más reciente al más antiguo; dentro de un año, por fecha descendente, con los de fecha parcial después de
los de fecha completa del mismo mes o año. Cada fila SHALL mostrar el artista (enlazado), la fecha con su precisión, el
recinto, la ciudad y el país, la gira, la nota, el enlace al setlist si existe y la audiencia, con acciones para
editar, cambiar la audiencia y quitar (con confirmación). La audiencia Seguidores SHALL mostrarse como un ícono con su
nombre al pasar el cursor y para lectores de pantalla; Privado, con su nombre. Una fila sin recinto, ciudad ni país
SHALL ofrecer "Agregar lugar", que abre la edición de ese registro. Junto al título SHALL ir un botón "Registrar concierto"
que abre el formulario con un buscador de artistas, y debajo el total de conciertos, de artistas distintos y de países,
sin las cifras en cero. La página
SHALL aceptar `?artista=<id>` para mostrar solo los de un artista, con forma de quitar el filtro. Sin registros SHALL
mostrar un estado vacío que explique cómo registrar desde la página de un artista.

#### Scenario: Agrupado por año

- **WHEN** un usuario tiene conciertos en 2024, 2019 y 2019-11-02
- **THEN** ve el grupo 2024 primero y luego 2019, con 2019-11-02 antes que el registro de solo año 2019

#### Scenario: Filtrar por artista

- **WHEN** el usuario llega desde "Lo viste 3 veces" en un artista
- **THEN** la página muestra solo esos 3 registros y un enlace para ver todos

#### Scenario: Registrar sin pasar por el artista

- **WHEN** el usuario pulsa "Registrar concierto", busca "Soda Stereo" y guarda con el año 2007
- **THEN** el registro aparece en el grupo 2007

#### Scenario: Sin sesión

- **WHEN** una persona sin sesión abre `/me/concerts`
- **THEN** se la lleva a iniciar sesión, como en las demás páginas personales

#### Scenario: Sin país anotado

- **WHEN** un usuario tiene un solo concierto y no anotó el país
- **THEN** los totales dicen "1 concierto · 1 artista", sin "0 países"

#### Scenario: Registro sin lugar

- **WHEN** un registro no tiene recinto, ciudad ni país
- **THEN** su fila muestra "Sin lugar · Agregar lugar" y el enlace abre la edición de ese registro
