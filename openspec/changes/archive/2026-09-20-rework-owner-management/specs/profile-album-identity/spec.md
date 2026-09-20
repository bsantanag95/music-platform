## MODIFIED Requirements

### Requirement: Edición de los álbumes favoritos desde el propio perfil

El editor de "Álbumes favoritos" SHALL montarse únicamente en vistas del propio dueño: su
perfil con el modo edición activo y su área de ajustes. SHALL listar los favoritos de álbum del
dueño y permitir marcar hasta 6 y ordenarlos, y SHALL guardar el conjunto ordenado completo en
una sola operación (reemplazo, no mutaciones por ítem). El editor SHALL NOT incluir un buscador
de catálogo embebido: se elige de los favoritos ya existentes. Si el dueño no tiene favoritos de
álbum, el editor SHALL invitarlo a marcar álbumes como favoritos antes.

#### Scenario: Reemplazo del conjunto

- **WHEN** el dueño guarda una selección ordenada de cuatro álbumes favoritos
- **THEN** su sección queda exactamente con esos cuatro en ese orden, reemplazando la
  selección anterior

#### Scenario: Dueño sin favoritos de álbum

- **WHEN** un dueño que no marcó ningún álbum como favorito abre el editor
- **THEN** ve una invitación a marcar álbumes favoritos, no una lista vacía sin explicación

#### Scenario: El editor no aparece en un perfil ajeno

- **WHEN** un visitante abre el perfil de otra persona
- **THEN** ve la sección "Álbumes favoritos" en modo lectura, sin controles de edición
