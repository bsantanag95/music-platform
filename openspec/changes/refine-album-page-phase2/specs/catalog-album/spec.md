## MODIFIED Requirements

### Requirement: Cabecera de la pestaña Canciones sin duplicados

La pestaña Canciones SHALL NOT repetir de forma visible lo que ya muestran la barra de
pestañas y la ficha técnica: el título "Canciones" SHALL existir solo para lectores de
pantalla, y la edición mostrada con su acceso a Ediciones SHALL verse solo en la ficha
técnica, que está abierta en cualquier ancho.

#### Scenario: Escritorio

- **WHEN** una persona abre la pestaña Canciones en escritorio
- **THEN** la lista empieza directamente por la primera pista, sin título visible ni línea
  de edición, y la ficha técnica sigue mostrando la edición

#### Scenario: Móvil

- **WHEN** una persona abre la pestaña Canciones en móvil
- **THEN** la lista empieza por la primera pista y la edición mostrada, con el acceso a
  Ediciones, se ve en la ficha técnica de la cabecera

## ADDED Requirements

### Requirement: Ficha técnica abierta en cualquier ancho

La ficha técnica SHALL mostrarse abierta también en móvil, sin plegarse tras un control de
despliegue.

#### Scenario: Ficha en 375 px

- **WHEN** una persona abre un álbum en 375 px
- **THEN** ve Lanzamiento, Duración, Edición y Sello bajo la identidad sin tocar nada
