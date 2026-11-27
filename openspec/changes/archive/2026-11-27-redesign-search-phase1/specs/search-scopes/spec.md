## MODIFIED Requirements

### Requirement: Cambiar de tipo sin reescribir

La página de resultados SHALL ofrecer, bajo el campo de búsqueda, una fila de pestañas en forma de pastilla con los
cuatro tipos (Artistas, Álbumes, Canciones, Usuarios). La actual SHALL ir marcada y llevar la cifra de resultados cuando se
conoce. La fila se desplaza de lado en móvil y sirve para repetir la misma consulta en cualquiera de los otros tipos.
Elegir uno SHALL navegar a `/search?type=<otro>&q=<misma consulta>` sin que la persona reescriba el texto. Cuando un tipo
no tiene resultados, el estado vacío SHALL incluir esos mismos accesos.

#### Scenario: Tipo equivocado
- **WHEN** una persona busca `back for the attack` en Artistas y no hay coincidencias útiles
- **THEN** el estado vacío ofrece "Buscar en Álbumes" y un clic navega a
  `/search?type=album&q=back%20for%20the%20attack`

#### Scenario: Pestañas de tipo
- **WHEN** una persona está en `/search?type=album&q=the wall`
- **THEN** bajo el campo ve las pestañas Artistas · Álbumes · Canciones · Usuarios con Álbumes marcada y "más de 1.000"
  en ella, y Canciones lleva a `/search?type=song&q=the%20wall`

### Requirement: La búsqueda rápida enlaza a la avanzada

`/search` SHALL ser el buscador rápido: campo con tipo, pastillas (Persona/Grupo, categoría, década) y resultados, sin el
panel de criterios de la avanzada. Desde `lg` esas pastillas SHALL ir en la columna lateral. Bajo el campo, como enlace de
texto (no como un segundo botón), SHALL ofrecer **Búsqueda avanzada →** a `/search/advanced?type=<tipo>&q=<texto>`
(Artistas, Álbumes y Canciones; no en Usuarios). Si la URL de `/search` trae algún criterio que la búsqueda rápida no tiene
(cualquiera de `advanced-search-filters` salvo `q`, `artistType`, una sola `category` y `decade`), la página SHALL redirigir
a `/search/advanced` con los mismos parámetros.

#### Scenario: Enlace a la avanzada
- **WHEN** una persona en `/search?type=album&q=maiden` pulsa **Búsqueda avanzada**
- **THEN** la aplicación abre `/search/advanced?type=album&q=maiden` con el título prellenado

#### Scenario: Enlace de la fase anterior
- **WHEN** una persona abre `/search?type=artist&q=sumo&country=AR`
- **THEN** la aplicación redirige a `/search/advanced?type=artist&q=sumo&country=AR`

#### Scenario: Pastillas siguen en la rápida
- **WHEN** una persona abre `/search?type=album&q=kiss&category=studio&decade=1970`
- **THEN** la página no redirige y muestra los resultados con esas pastillas activas, en la columna lateral desde `lg`
