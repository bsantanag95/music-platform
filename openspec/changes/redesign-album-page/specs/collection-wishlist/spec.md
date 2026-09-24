## ADDED Requirements

### Requirement: Rótulo "En tu búsqueda"

En toda la interfaz la wishlist física SHALL rotularse **"En tu búsqueda"** para el estado
propio y **"lo buscan"** para el agregado de la comunidad, y SHALL NOT usar el verbo
"querer" ("Lo quiero"), para no confundirse con la señal Pendiente (want-to-listen).

#### Scenario: Estado propio

- **WHEN** un usuario tiene un álbum en su wishlist y abre la página del álbum
- **THEN** el panel "Tu relación" muestra "En tu búsqueda"

### Requirement: Participación anónima en el conteo agregado

Las entradas de la wishlist SHALL contar, como personas distintas, en el conteo agregado
"lo buscan" del bloque de comunidad del álbum (capacidad `album-community-stats`), con el
umbral mínimo de esa capacidad. Ese conteo SHALL ser la única exposición de la wishlist
fuera de su listado propio y SHALL NOT revelar la identidad de ninguna persona.

#### Scenario: Wishlist privada en el total

- **WHEN** 12 personas tienen un álbum en su wishlist
- **THEN** el bloque de comunidad muestra "12 lo buscan" y ninguna superficie permite ver
  quiénes son
