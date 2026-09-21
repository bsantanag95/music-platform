## MODIFIED Requirements

### Requirement: Pantalla Curaduría

La pantalla **Curaduría** SHALL resumir lo que el dueño elige mostrar: "Empieza por aquí" (con
conteo sobre el máximo de 4), listas fijadas, valoraciones destacadas y entradas de diario
destacadas. "Empieza por aquí" SHALL abrir su editor en el panel lateral de edición. La
pantalla SHALL NOT listar el himno ni los álbumes favoritos: el himno se elige desde la Tarjeta
de Identidad (pantalla Perfil) y los álbumes favoritos ya no son una sección del perfil. Listas
fijadas, valoraciones destacadas y entradas de diario destacadas SHALL mostrar su conteo y un
enlace al lugar donde se fijan o destacan, sin duplicar esa acción en la pantalla.

#### Scenario: Ver el resumen de curaduría

- **WHEN** el dueño abre la pantalla Curaduría
- **THEN** ve cada tipo de curaduría con su conteo real y, según el tipo, una acción para editarlo
  o un enlace a su origen

#### Scenario: Editar los destacados desde Curaduría

- **WHEN** el dueño pulsa "Editar" en "Empieza por aquí"
- **THEN** el editor se abre en el panel lateral de edición sin salir de la pantalla

#### Scenario: Sin Himno ni Álbumes favoritos

- **WHEN** el dueño abre la pantalla Curaduría
- **THEN** no ve filas de Himno ni de Álbumes favoritos
