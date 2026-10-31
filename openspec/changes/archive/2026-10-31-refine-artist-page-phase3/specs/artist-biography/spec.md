## ADDED Requirements

### Requirement: Datos de la discografía junto a la Biografía

La pestaña Biografía SHALL mostrar, junto al texto en escritorio y debajo en móvil, una tarjeta con los datos que la
página ya tiene: primer y último álbum con su año (enlazados), cuántos álbumes tiene Principal (sin EP) y, en un grupo,
sus integrantes actuales y antiguos, o en una persona, cuántas bandas. Una fila sin dato SHALL omitirse y sin ninguna la
tarjeta SHALL NOT mostrarse. La tarjeta SHALL NOT pedir datos nuevos: usa las mismas lecturas que la cabecera.

#### Scenario: Banda con discografía

- **WHEN** una persona abre la Biografía de Iron Maiden
- **THEN** ve al lado "Primer álbum: Iron Maiden (1980)", "Último álbum: Senjutsu (2021)", "Álbumes: 17 álbumes" e
  "Integrantes: 6 actuales · 18 antiguos"
