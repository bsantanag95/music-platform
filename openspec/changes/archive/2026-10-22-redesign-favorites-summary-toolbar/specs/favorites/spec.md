## ADDED Requirements

### Requirement: Faceta de audiencia en la lista propia
La respuesta de `GET /api/me/favorites` SHALL incluir `facets.audience`, un objeto `{ private, followers, public }` con
la cantidad de favoritos propios de cada audiencia, calculada con la búsqueda `q` y el filtro `type` vigentes pero **sin**
el filtro `audience`, para que cada audiencia siga mostrando su cantidad. `counts` e `items` NO SHALL cambiar. La faceta
SHALL calcularse con una sola consulta agrupada. La lectura de favoritos ajenos (`/api/users/[username]/favorites`) NO
SHALL incluirla.

#### Scenario: Ignora el filtro de audiencia
- **WHEN** la persona filtra por audiencia pública y tiene 3 públicos, 2 para seguidores y 1 privado
- **THEN** la lista trae solo los públicos y `facets.audience` sigue trayendo `{ public: 3, followers: 2, private: 1 }`

#### Scenario: Respeta la búsqueda y el tipo
- **WHEN** filtra por tipo álbum y busca "heart"
- **THEN** `facets.audience` cuenta solo álbumes que coinciden con "heart", repartidos por audiencia

#### Scenario: Sin favoritos
- **WHEN** una persona sin favoritos pide la lista
- **THEN** `facets.audience` trae `{ private: 0, followers: 0, public: 0 }`

### Requirement: Segmentos de tipo con cantidad en favoritos
El filtro de tipo de `/me/favorites` SHALL ser un control segmentado de botones con `aria-pressed` — "Todo",
"Artistas", "Álbumes" y "Canciones" — junto al buscador, cada uno con su cantidad (`counts`; "Todo" es la suma). El segmento
activo SHALL marcarse y pulsarlo de nuevo no SHALL quitarlo: para volver a todos se elige "Todo". El control SHALL
llevar el nombre accesible "Filtrar por tipo" y cada segmento SHALL medir al menos 44 px de alto con puntero grueso.
Esto SHALL aplicarse también en modo lectura (perfil público).

#### Scenario: Cambiar de tipo
- **WHEN** la persona pulsa "Canciones"
- **THEN** el segmento queda activo, la lista muestra solo canciones y las cantidades de los demás segmentos no cambian

#### Scenario: Cantidades con búsqueda
- **WHEN** busca "heart" y hay 2 artistas, 4 álbumes y 1 canción que coinciden
- **THEN** los segmentos muestran "Todo 7", "Artistas 2", "Álbumes 4" y "Canciones 1"

#### Scenario: Volver a todos
- **WHEN** con "Canciones" activo pulsa "Todo"
- **THEN** se quita el filtro de tipo y la URL deja de llevar `type`

### Requirement: Fichas de audiencia con cantidad en favoritos
En la vista propia, el filtro de audiencia de `/me/favorites` SHALL ser un grupo de tres fichas — "Público", "Seguidores" y
"Privado" — con la cantidad de cada una (`facets.audience`), como botones con `aria-pressed` que activan el filtro de esa
audiencia; pulsar la ficha activa SHALL quitarlo. El grupo SHALL llevar el nombre accesible "Filtrar por audiencia" y cada
ficha SHALL medir al menos 44 px de alto con puntero grueso. En modo lectura NO SHALL mostrarse. Tras cambiar la audiencia
de un favorito, quitarlo o cambiar varios en lote, las cantidades de las fichas y de los segmentos SHALL actualizarse en el
lugar, sin recargar ni reordenar la lista.

#### Scenario: Ver el reparto
- **WHEN** una persona con 3 favoritos públicos, 2 para seguidores y 1 privado abre `/me/favorites`
- **THEN** ve las fichas "Público 3", "Seguidores 2" y "Privado 1"

#### Scenario: Filtrar y quitar
- **WHEN** pulsa "Privado" y luego vuelve a pulsarla
- **THEN** primero la lista muestra solo los privados y la ficha queda activa; después se quita el filtro y la URL deja de llevar `audience`

#### Scenario: Ajuste tras cambiar la audiencia
- **WHEN** cambia la audiencia de un favorito de "Seguidores" a "Público"
- **THEN** "Seguidores" baja en uno y "Público" sube en uno, sin recargar la lista

#### Scenario: Ajuste tras quitar
- **WHEN** quita un favorito de tipo álbum con audiencia pública
- **THEN** "Público" y el segmento "Álbumes" bajan en uno

#### Scenario: Perfil público
- **WHEN** alguien abre los favoritos de un perfil ajeno
- **THEN** ve los segmentos de tipo pero ninguna ficha de audiencia
