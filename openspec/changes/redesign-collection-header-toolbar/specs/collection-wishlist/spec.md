## MODIFIED Requirements

### Requirement: Listado propio de la wishlist
El sistema SHALL permitir al usuario autenticado ver su wishlist completa, paginada, ordenada por
recencia por defecto, mostrando por entrada el álbum (con su carátula cuando exista), su artista,
el formato (o "cualquier formato" cuando esté ausente), los atributos y la nota. El sistema SHALL
aceptar búsqueda por texto (`q`) sobre el título del álbum y el nombre del artista acreditado
(coincidencia parcial sin distinguir mayúsculas), y orden (`sort`) entre recencia (default) y
alfabético por título. La respuesta SHALL incluir el total de entradas del usuario sin filtros
(`total`), que la pestaña Busco muestra junto a su nombre. La wishlist SHALL NOT tener ninguna
vista pública ni de terceros por `username`: solo el dueño puede listarla. Su única exposición
individual fuera del listado propio es el feed de actividad de seguidos, según la audiencia de
cada entrada (ver "Audiencia de la entrada de deseo"). El listado propio SHALL mostrar la
audiencia de cada entrada.

#### Scenario: Ver la wishlist propia
- **WHEN** un usuario autenticado abre la pestaña "Quiero" de su colección
- **THEN** ve sus entradas de deseo paginadas, con la carátula del álbum cuando está disponible

#### Scenario: Buscar por título de álbum
- **WHEN** el usuario busca un título en su wishlist
- **THEN** ve únicamente las entradas cuyo álbum coincide parcialmente con ese texto

#### Scenario: Wishlist vacía
- **WHEN** un usuario sin entradas de deseo abre la pestaña "Quiero"
- **THEN** ve un estado vacío localizado y no un error técnico

#### Scenario: Sesión requerida para listar
- **WHEN** una request sin sesión pide el listado propio de la wishlist
- **THEN** la API responde `401` con código `AUTH_REQUIRED`

#### Scenario: Sin superficie pública
- **WHEN** un visitante intenta consultar la wishlist de otro usuario por su `username`
- **THEN** el sistema no ofrece ninguna ruta ni endpoint para esa consulta

#### Scenario: Total en la pestaña
- **WHEN** el usuario tiene 6 entradas de deseo y busca un título que deja 1
- **THEN** la respuesta trae `total: 6` y la pestaña sigue diciendo "Busco 6"
