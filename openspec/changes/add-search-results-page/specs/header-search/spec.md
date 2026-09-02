## MODIFIED Requirements

### Requirement: Búsqueda persistente en el Header

El sistema SHALL exponer un campo de búsqueda compacto en el Header, visible en toda la
aplicación para cualquier visitante, con o sin sesión activa. Al enviar una consulta con texto
no vacío tras normalizar, el Header SHALL navegar **siempre** a `/search?q=<consulta>` y SHALL
NOT intentar resolver la búsqueda ni navegar directamente a `/artist/<id>` desde el propio
Header. La resolución de la búsqueda y la elección entre resultados ocurren en la página
`/search`.

#### Scenario: Búsqueda enviada desde el Header
- **WHEN** una persona escribe un texto y envía el formulario del Header
- **THEN** la aplicación navega a `/search?q=<consulta>` con el texto normalizado

#### Scenario: El Header no resuelve a un artista
- **WHEN** una persona envía desde el Header el nombre exacto de un artista que existe
- **THEN** la aplicación igualmente navega a `/search?q=<consulta>` y es la página de resultados
  la que muestra ese artista (al tope, por coincidencia exacta), sin salto directo al perfil

#### Scenario: Disponible en cualquier página
- **WHEN** una persona navega a cualquier página de la aplicación, con o sin sesión activa
- **THEN** el campo de búsqueda del Header está presente y disponible para usarse

#### Scenario: Entrada vacía
- **WHEN** una persona envía el formulario del Header sin texto o únicamente con espacios
- **THEN** la aplicación no realiza ninguna solicitud ni navegación
