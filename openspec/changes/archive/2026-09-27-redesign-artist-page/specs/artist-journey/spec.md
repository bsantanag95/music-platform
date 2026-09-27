## MODIFIED Requirements

### Requirement: Progreso informativo acotado a la página de gestión
El sistema SHALL mostrar el progreso de un recorrido (proporción de la selección propia ya
escuchada) únicamente dentro de la página de gestión de ese recorrido
(`/me/artist-journeys/[artistId]`), de forma discreta y sin fracciones numéricas ni alertas en
ningún otro punto de la interfaz. La fila Recorrido del panel "Tu relación" de la página del
artista (capability `artist-personal-panel`) SHALL poder mostrar la misma señal discreta
(barra de progreso sin fracción numérica), pero SHALL NOT ofrecer edición de la selección ni
ninguna otra acción mutable. El sistema SHALL NOT mostrar mensajes que indiquen una cantidad
de álbumes restantes fuera de la página de gestión.

#### Scenario: Progreso visible en la gestión del recorrido
- **WHEN** el propietario abre la página de gestión de un recorrido en curso
- **THEN** ve una señal discreta de su progreso contra su propia selección

#### Scenario: Resumen de solo lectura en la página del artista
- **WHEN** el propietario de un recorrido en curso visita la página del artista
- **THEN** ve en la fila Recorrido del panel el estado y una señal discreta de progreso, sin
  ningún control de edición, archivado o borrado

#### Scenario: Sin mensajes de álbumes restantes
- **WHEN** el propietario navega el catálogo o su perfil con recorridos en curso
- **THEN** ninguna superficie fuera de la gestión del recorrido muestra cuántos álbumes le
  faltan
