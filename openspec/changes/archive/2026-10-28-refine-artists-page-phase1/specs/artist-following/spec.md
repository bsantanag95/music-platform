## MODIFIED Requirements

### Requirement: Superficie de gestión de artistas seguidos

El sistema SHALL exponer una ruta `/[locale]/me/artists` que liste **todos** los artistas que el
usuario en sesión sigue, del más reciente al más antiguo, sin cortar la lista. La ruta SHALL requerir sesión. El panel
del dueño del perfil SHALL incluir un enlace a esta superficie.

Cada artista SHALL ofrecer un menú de acciones nombrado con el artista ("Acciones para «X»"), de al menos 44 px con
puntero grueso, con "Añadir a una lista", "Marcar como favorito" o "Quitar de favoritos" según su estado, y "Dejar de
seguir". La fila SHALL NOT llevar un botón de seguimiento. Dejar de seguir SHALL quitar la fila y ofrecer **Deshacer**,
que vuelve a seguir al artista y lo repone en su lugar.

La búsqueda y el orden SHALL reflejarse en la URL (`q`, `sort`) sin crear historial y restaurarse al abrir el enlace. La
cabecera SHALL alinearse a la izquierda con migas, el título y cuántos artistas sigue. El modo de vista guardado SHALL
aplicarse sin mostrar antes el otro modo.

#### Scenario: Ver los artistas seguidos

- **WHEN** un usuario autenticado abre `/me/artists`
- **THEN** ve la lista de artistas que sigue, del más reciente al más antiguo, y puede
  dejar de seguir a cualquiera desde su menú de acciones

#### Scenario: Más de 50 artistas

- **WHEN** un usuario que sigue a 120 artistas abre `/me/artists` y busca al que siguió primero
- **THEN** la lista tiene los 120 y la búsqueda lo encuentra

#### Scenario: Dejar de seguir con Deshacer

- **WHEN** el usuario elige "Dejar de seguir" en el menú de Ratt
- **THEN** Ratt desaparece de la lista y un aviso ofrece Deshacer; al usarlo, vuelve a seguir a Ratt y la fila vuelve a
  su lugar

#### Scenario: Favorito según su estado

- **WHEN** el usuario abre el menú de un artista que ya marcó como favorito
- **THEN** ve "Quitar de favoritos" y no "Marcar como favorito"

#### Scenario: Búsqueda y orden en la URL

- **WHEN** el usuario busca "que" con orden alfabético y recarga
- **THEN** la URL contiene `q=que&sort=alpha` y la lista sigue filtrada y ordenada

#### Scenario: Lista vacía

- **WHEN** un usuario que no sigue a ningún artista abre `/me/artists`
- **THEN** ve un estado vacío claro, sin filas ni error, con un enlace a buscar artistas

#### Scenario: Sin sesión

- **WHEN** una persona sin sesión abre `/me/artists`
- **THEN** es redirigida al login
