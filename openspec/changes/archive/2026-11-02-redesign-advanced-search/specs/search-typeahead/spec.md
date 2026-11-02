## MODIFIED Requirements

### Requirement: Acciones del desplegable

Debajo de las sugerencias, el desplegable SHALL ofrecer "Ver todos los resultados de «<texto>»
en <tipo>" y accesos "Buscar en otro tipo" para los demás tipos, que cambian el tipo del campo
conservando el texto. En los tipos Artistas, Álbumes y Canciones SHALL ofrecer además **Búsqueda avanzada**,
que navega a `/search/advanced?type=<tipo>&q=<texto>` (la pestaña del tipo con el nombre o título prellenado). Si no
hay sugerencias locales, el desplegable SHALL mostrar igualmente estas acciones.

#### Scenario: Sin sugerencias locales
- **WHEN** una persona escribe `farruko` en Artistas y no hay coincidencias locales
- **THEN** el desplegable muestra "Ver todos los resultados de «farruko» en artistas" y los
  accesos a los otros tipos

#### Scenario: Cambiar de tipo desde el desplegable
- **WHEN** una persona pulsa "Álbumes" en "Buscar en otro tipo"
- **THEN** el selector pasa a Álbumes, el texto se conserva y las sugerencias se recalculan para
  álbumes

#### Scenario: Abrir la búsqueda avanzada desde el Header
- **WHEN** una persona escribe `maiden` en Álbumes en el Header y elige **Búsqueda avanzada**
- **THEN** la aplicación navega a `/search/advanced?type=album&q=maiden`, con la pestaña Álbumes y el título prellenado
