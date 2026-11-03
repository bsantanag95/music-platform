## MODIFIED Requirements

### Requirement: Cambiar de tipo sin reescribir

La página de resultados SHALL ofrecer, sobre el resumen de la búsqueda, una barra de pestañas con los
cuatro tipos (Artistas, Álbumes, Canciones, Usuarios), el actual marcado, para repetir la misma consulta
en cualquiera de los otros; la barra se desplaza de lado en móvil. Elegir uno SHALL navegar a
`/search?type=<otro>&q=<misma consulta>` sin que la persona reescriba el texto. Cuando un tipo
no tiene resultados, el estado vacío SHALL incluir esos mismos accesos.

#### Scenario: Tipo equivocado
- **WHEN** una persona busca `back for the attack` en Artistas y no hay coincidencias útiles
- **THEN** el estado vacío ofrece "Buscar en Álbumes" y un clic navega a
  `/search?type=album&q=back%20for%20the%20attack`

#### Scenario: Pestañas de tipo
- **WHEN** una persona está en `/search?type=album&q=the wall`
- **THEN** sobre los resultados ve las pestañas Artistas · Álbumes · Canciones · Usuarios con Álbumes marcada, y
  Canciones lleva a `/search?type=song&q=the%20wall`

### Requirement: La búsqueda rápida enlaza a la avanzada

`/search` SHALL ser el buscador rápido: campo con tipo, pastillas (Persona/Grupo, categoría, década) y resultados, sin
panel de filtros. Bajo el campo, como enlace de texto (no como un segundo botón), SHALL ofrecer **Búsqueda avanzada →** a
`/search/advanced?type=<tipo>&q=<texto>` (Artistas, Álbumes y Canciones; no en Usuarios). Si la URL de `/search` trae
algún criterio que la búsqueda rápida no tiene (cualquiera de `advanced-search-filters` salvo `q`, `artistType`, una sola
`category` y `decade`), la página SHALL redirigir a `/search/advanced` con los mismos parámetros.

#### Scenario: Enlace a la avanzada
- **WHEN** una persona en `/search?type=album&q=maiden` pulsa **Búsqueda avanzada**
- **THEN** la aplicación abre `/search/advanced?type=album&q=maiden` con el título prellenado

#### Scenario: Enlace de la fase anterior
- **WHEN** una persona abre `/search?type=artist&q=sumo&country=AR`
- **THEN** la aplicación redirige a `/search/advanced?type=artist&q=sumo&country=AR`

#### Scenario: Pastillas siguen en la rápida
- **WHEN** una persona abre `/search?type=album&q=kiss&category=studio&decade=1970`
- **THEN** la página no redirige y muestra los resultados con esas pastillas activas
