## ADDED Requirements

### Requirement: Contexto de cada solicitud

Cada solicitud recibida SHALL indicar, cuando exista, cuántas de las personas que el usuario sigue siguen a quien pide,
sin revelar quiénes son, y cuántos discos tienen en común (álbumes que ambos tienen en favoritos o valoraron con 4
estrellas o más, contando solo lo que esa persona deja ver al usuario) cuando son al menos 3.

#### Scenario: Seguidores en común

- **WHEN** el usuario sigue a 3 personas que siguen a quien le pide seguirlo
- **THEN** la solicitud dice "Lo siguen 3 personas que sigues" sin nombrarlas

#### Scenario: Sin señales

- **WHEN** nadie que el usuario sigue sigue a quien pide y tienen menos de 3 discos en común
- **THEN** la solicitud solo dice el @usuario y cuánto hace que llegó
