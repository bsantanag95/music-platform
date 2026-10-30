## MODIFIED Requirements

### Requirement: Pantalla Red

La pantalla **Red** SHALL enlazar, sin reimplementar listados, las solicitudes de seguimiento
pendientes, los seguidores, los seguidos y las cuentas bloqueadas, apuntando a las superficies
existentes. Las solicitudes SHALL mostrar el número de pendientes cuando sea mayor que cero,
presentado como bandeja de entrada y no como métrica de logro. Seguidores, seguidos y cuentas bloqueadas SHALL mostrar
cuántos hay, en texto secundario. Los destinos SHALL derivarse de la
misma definición compartida que el menú de usuario del Header.

#### Scenario: Solicitudes pendientes en Red

- **WHEN** el dueño tiene solicitudes de seguimiento pendientes y abre la pantalla Red
- **THEN** ve el número de pendientes junto al enlace a `/me/follow-requests`

#### Scenario: Sin solicitudes pendientes

- **WHEN** el dueño no tiene solicitudes pendientes
- **THEN** el enlace a solicitudes no muestra ningún indicador numérico

#### Scenario: Cuentas bloqueadas

- **WHEN** el dueño pulsa "Cuentas bloqueadas" en la pantalla Red
- **THEN** llega a `/me/blocks`

#### Scenario: Cifras de la red

- **WHEN** el dueño con 12 seguidores, 3 seguidos y 1 cuenta bloqueada abre la pantalla Red
- **THEN** cada enlace muestra su cifra: 12, 3 y 1

## ADDED Requirements

### Requirement: Estado de la cuenta en el menú de Ajustes

En pantallas anchas, el menú lateral de Ajustes SHALL resumir bajo cada entrada lo que conviene saber sin entrar: la
visibilidad del perfil bajo "Privacidad y audiencia", si el resumen semanal por email está activo bajo
"Notificaciones" y, si el email no está verificado, un aviso bajo "Cuenta y seguridad". Tras cambiar la visibilidad o
el resumen, el menú SHALL reflejar el valor nuevo sin recargar la página.

#### Scenario: Perfil privado

- **WHEN** el dueño con perfil privado abre cualquier pantalla de Ajustes en una pantalla ancha
- **THEN** el menú dice "Perfil privado" bajo "Privacidad y audiencia"

#### Scenario: Cambiar la visibilidad

- **WHEN** el dueño pasa su perfil a público en Privacidad y audiencia
- **THEN** el menú dice "Perfil público" sin recargar la página

### Requirement: Foco al cambiar de pantalla en Ajustes

Al pasar de una pantalla de Ajustes a otra, el foco SHALL ir al título de la pantalla nueva, de modo que un lector de
pantalla la anuncie y la navegación por teclado continúe desde su contenido. En la carga inicial de la página el foco
SHALL NOT moverse.

#### Scenario: Elegir otra pantalla

- **WHEN** el dueño elige "Notificaciones" en el menú de Ajustes
- **THEN** el foco queda en el título "Notificaciones"
