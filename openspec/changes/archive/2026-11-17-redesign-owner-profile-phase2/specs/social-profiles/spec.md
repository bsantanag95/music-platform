## ADDED Requirements

### Requirement: Marcas de audiencia y acciones para agregar del dueño

En la vista del dueño (no en la previsualización "cómo te ven"), las entradas del diario, los
favoritos y las listas (incluidas las listas para completar) que el cuerpo del perfil muestra SHALL
llevar una marca con su audiencia cuando no sea pública: "Seguidores" para solo seguidores y "Solo
tú" para privada; los elementos públicos SHALL NOT llevar marca. Los estantes Diario, Favoritos,
Listas y Colección física SHALL ofrecer al dueño, junto a la vista completa, una acción para agregar
que abre la acción correspondiente del diálogo "Añadir" del sitio (registrar una escucha, marcar un
favorito, crear una lista, agregar a la colección), también cuando el estante está vacío; al
cerrarlo tras un cambio, el perfil SHALL mostrar lo agregado sin recargar a mano. Un visitante, y el
dueño en la previsualización, SHALL NOT ver marcas de audiencia ni acciones para agregar.

#### Scenario: Entrada solo para seguidores

- **WHEN** el dueño abre su perfil y una de las entradas recientes del diario es solo para seguidores
- **THEN** esa fila lleva la marca "Seguidores" y las entradas públicas no llevan marca

#### Scenario: Lista privada

- **WHEN** el dueño abre su perfil y una de sus listas es privada
- **THEN** su tarjeta lleva la marca "Solo tú"

#### Scenario: Registrar desde el diario

- **WHEN** el dueño pulsa "Registrar" en el estante Diario, registra una escucha y cierra el diálogo
- **THEN** el diálogo abre en la acción Escucha y, al cerrarlo, el diario del perfil muestra la entrada nueva

#### Scenario: Visitante y previsualización

- **WHEN** un visitante, o el dueño en "Ver como visitante", abre el perfil
- **THEN** no ve marcas de audiencia ni acciones para agregar
