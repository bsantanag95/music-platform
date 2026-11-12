## MODIFIED Requirements

### Requirement: Página Mis conciertos

El usuario autenticado SHALL tener la página **Mis conciertos** (`/{locale}/me/concerts`) con sus registros agrupados
por año, del más reciente al más antiguo; dentro de un año, por fecha descendente, con los de fecha parcial después de
los de fecha completa del mismo mes o año. Cada fila SHALL mostrar el artista (enlazado), la fecha con su precisión, el
recinto, la ciudad y el país, la gira, la nota, el enlace al setlist si existe y la audiencia, con acciones para
editar, cambiar la audiencia y quitar (con confirmación). La audiencia Seguidores SHALL mostrarse como un ícono con su
nombre al pasar el cursor y para lectores de pantalla; Privado, con su nombre. Una fila sin recinto, ciudad ni país
SHALL ofrecer "Agregar lugar", que abre la edición de ese registro. Junto al título SHALL ir un botón "Registrar concierto"
que abre el formulario con un buscador de artistas, y debajo un resumen con el total de conciertos, de artistas distintos,
de ciudades distintas (ciudad y país) y de países, cada uno con la cifra primero, sin las cifras en cero. Sin filtro y con
todos los registros leídos, el resumen SHALL decir desde cuándo (la fecha más antigua) y el artista más visto, solo si lo
vio más de una vez y nadie lo iguala. Los registros a los que les falta ciudad o país y no están enlazados SHALL contarse en
un aviso que permita ver solo esos. Una barra fija SHALL ofrecer las vistas Por año (por defecto) y Por artista (una
tarjeta por artista con cuántas veces lo vio y en qué años, que lleva al filtro `?artista=`) y, en Por año, saltos a cada
año. Cada fila SHALL mostrar la fecha como un bloque (día y mes, o la precisión que tenga), la foto del artista desde
pantallas medianas (su inicial si no tiene) y, si el registro está enlazado a un concierto compartido, cuántas personas
estuvieron (con el umbral de 5) y si es un festival. La página
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

#### Scenario: Resumen con ciudades

- **WHEN** un usuario tiene conciertos en Santiago (CL) dos veces y en Buenos Aires (AR)
- **THEN** el resumen muestra 3 conciertos, 2 ciudades y 2 países

#### Scenario: El más visto

- **WHEN** un usuario vio 3 veces a Soda Stereo y una a otros dos artistas
- **THEN** el resumen dice "el más visto: Soda Stereo, 3 veces"

#### Scenario: Ver solo los que faltan completar

- **WHEN** 2 registros no tienen ciudad o país y el usuario pulsa "Completar" en el aviso
- **THEN** la lista muestra solo esos 2 y el aviso ofrece "Ver todos"

#### Scenario: Vista por artista

- **WHEN** el usuario elige "Por artista"
- **THEN** ve una tarjeta por artista, la de Soda Stereo con "3 veces · 2008–2019", que lleva a la página filtrada por él

#### Scenario: Concierto compartido en la fila

- **WHEN** un registro está enlazado a un concierto compartido en el que estuvieron 41 personas
- **THEN** su fila dice "41 personas estuvieron" en el enlace al concierto
