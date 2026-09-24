## MODIFIED Requirements

### Requirement: Acción de Want to Listen en las páginas de catálogo
El sistema SHALL ofrecer en las páginas de artista y álbum una acción autenticada para marcar
o quitar el objetivo de Want to Listen, con estados de carga, éxito, error y sesión requerida,
que SHALL NOT bloquear la carga del contenido musical. En toda la interfaz la acción y su
estado SHALL rotularse **"Pendiente"** (no "Quiero escuchar"), para no confundirse con la
wishlist física ("En tu búsqueda"). En la página de álbum la acción SHALL vivir dentro del
panel "Tu relación" (capacidad `album-personal-panel`).

#### Scenario: Acción sin sesión
- **WHEN** un visitante no autenticado pulsa la acción de Want to Listen en una página de
  artista o álbum
- **THEN** se le solicita iniciar sesión y no se crea ninguna entrada

#### Scenario: Alternar Want to Listen
- **WHEN** un usuario autenticado pulsa el botón de Want to Listen en una página de artista o
  álbum
- **THEN** la entrada se marca o se quita y el estado de la UI se actualiza con confirmación
  accesible

#### Scenario: Rótulo Pendiente
- **WHEN** una persona ve la acción de Want to Listen en cualquier idioma soportado
- **THEN** la acción se rotula con la traducción de "Pendiente" y no con "Quiero escuchar"
