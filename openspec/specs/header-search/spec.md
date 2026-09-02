# header-search

## Purpose

Búsqueda de catálogo compacta y persistente desde el Header, disponible en toda la
aplicación para cualquier sesión.

## Requirements

### Requirement: Búsqueda persistente en el Header

El sistema SHALL exponer un campo de búsqueda compacto en el costado izquierdo del Header,
visible en toda la aplicación para cualquier visitante, con o sin sesión activa. El campo
SHALL NOT reemplazar la página `/search`: al enviar una consulta que resuelve a un artista
válido, el sistema SHALL navegar directo a `/artist/<id>`. Al enviar una consulta que no
resuelve (artista no encontrado) o que falla, el sistema SHALL navegar a
`/search?q=<consulta>` en vez de mostrar un estado de error o vacío dentro del Header.

#### Scenario: Búsqueda resuelta desde el Header
- **WHEN** una persona escribe el nombre de un artista existente en el campo del Header y
  envía el formulario
- **THEN** la aplicación navega directo a `/artist/<id>` del artista encontrado

#### Scenario: Búsqueda sin resultado desde el Header
- **WHEN** una persona envía desde el Header una consulta que no corresponde a ningún
  artista
- **THEN** la aplicación navega a `/search?q=<consulta>` sin mostrar un estado de error o
  vacío dentro del propio Header

#### Scenario: Error de búsqueda desde el Header
- **WHEN** la búsqueda enviada desde el Header falla por un error inesperado del servicio
- **THEN** la aplicación navega a `/search?q=<consulta>` para que la página completa
  muestre el estado de error correspondiente

#### Scenario: Disponible en cualquier página
- **WHEN** una persona navega a cualquier página de la aplicación, con o sin sesión activa
- **THEN** el campo de búsqueda del Header está presente y disponible para usarse

#### Scenario: Entrada vacía
- **WHEN** una persona envía el formulario del Header sin texto o únicamente con espacios
- **THEN** la aplicación no realiza ninguna solicitud ni navegación
