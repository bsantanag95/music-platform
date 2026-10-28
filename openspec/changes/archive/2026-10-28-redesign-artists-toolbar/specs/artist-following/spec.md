## MODIFIED Requirements

### Requirement: Superficie de gestión de artistas seguidos

El sistema SHALL exponer una ruta `/[locale]/me/artists` que liste **todos** los artistas que el
usuario en sesión sigue, del más reciente al más antiguo, sin cortar la lista. La ruta SHALL requerir sesión. El panel
del dueño del perfil SHALL incluir un enlace a esta superficie.

Cada artista SHALL ofrecer un menú de acciones nombrado con el artista ("Acciones para «X»"), de al menos 44 px con
puntero grueso, con "Añadir a una lista", "Marcar como favorito" o "Quitar de favoritos" según su estado, y "Dejar de
seguir". La fila SHALL NOT llevar un botón de seguimiento. Dejar de seguir SHALL quitar la fila y ofrecer **Deshacer**,
que vuelve a seguir al artista y lo repone en su lugar.

La página SHALL ofrecer en su cabecera **"+ Seguir artista"**, que abre el diálogo de acciones rápidas en la acción
"Seguir artista"; al seguir a alguien desde ahí, la lista SHALL actualizarse sin recargar la página.

La lista SHALL acotarse con segmentos, cada uno con su cuenta sobre la lista completa: **Todos**, **Con novedades**
(artistas con un disco en el calendario de lanzamientos, no excluido, de los últimos 30 días o anunciado), **Grupos**
(tipo grupo, orquesta o coro) y **Solistas** (tipo persona). El orden SHALL ofrecer, además de Recientes y Alfabético,
**Último lanzamiento**: la fecha de su novedad o, si no tiene, la de su último disco publicado en la discografía
guardada, de la más reciente a la más antigua, con los artistas sin dato al final.

La búsqueda, el orden y el segmento SHALL reflejarse en la URL (`q`, `sort`, `segment`) sin crear historial y
restaurarse al abrir el enlace. La
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

#### Scenario: Seguir desde la página

- **WHEN** el usuario elige "+ Seguir artista", busca "Europe" y lo sigue
- **THEN** el diálogo confirma que lo sigue y, al cerrarlo, Europe aparece primero en la lista

#### Scenario: Con novedades

- **WHEN** el calendario de lanzamientos tiene un disco de Sabrina Carpenter que sale en dos semanas y ninguno de los
  demás artistas que sigue
- **THEN** el segmento "Con novedades" dice 1 y, elegido, muestra solo a Sabrina Carpenter

#### Scenario: Grupos y solistas

- **WHEN** el usuario sigue a 7 grupos y 3 solistas y elige "Solistas"
- **THEN** ve solo a los 3 solistas, y los segmentos dicen Todos 10, Grupos 7 y Solistas 3

#### Scenario: Orden por último lanzamiento

- **WHEN** el usuario elige "Último lanzamiento"
- **THEN** primero va el artista con un disco anunciado, luego los demás por la fecha de su último disco, y al final
  los que no tienen ninguno en el catálogo

#### Scenario: Búsqueda y orden en la URL

- **WHEN** el usuario busca "que" con orden alfabético y recarga
- **THEN** la URL contiene `q=que&sort=alpha` y la lista sigue filtrada y ordenada

#### Scenario: Lista vacía

- **WHEN** un usuario que no sigue a ningún artista abre `/me/artists`
- **THEN** ve un estado vacío claro, sin filas ni error, con un enlace a buscar artistas

#### Scenario: Sin sesión

- **WHEN** una persona sin sesión abre `/me/artists`
- **THEN** es redirigida al login
