## RENAMED Requirements

- FROM: `### Requirement: Puerta 1 — los álbumes elegidos son los Álbumes favoritos`
- TO: `### Requirement: Puerta 1 — los álbumes elegidos se guardan como favoritos`

## MODIFIED Requirements

### Requirement: Puerta 1 — los álbumes elegidos se guardan como favoritos

En la Puerta 1 el usuario SHALL buscar álbumes y seleccionar hasta **6** (la UI SHALL
sugerir entre 3 y 5). Al guardar, cada álbum seleccionado SHALL convertirse en un **favorito de
álbum** del usuario: el sistema SHALL crear el `favorite` de álbum correspondiente (si no
existe) con la audiencia por defecto de un favorito nuevo. La Puerta 1 SHALL NOT fijar ni
ordenar los álbumes, y SHALL NOT crear ninguna valoración ("esto me representa" no es "5
estrellas") ni ninguna entrada de diario. Guardar con cero álbumes SHALL ser válido
(equivale a saltar la puerta). Intentar guardar más de 6, o un álbum inexistente, SHALL
responder `400` con código `VALIDATION_ERROR`.

#### Scenario: Elegir álbumes que te definen

- **WHEN** el usuario selecciona cuatro álbumes en la Puerta 1 y guarda
- **THEN** esos cuatro son favoritos de álbum del usuario y aparecen en su sección Favoritos
  del perfil, sin valoración ni entrada de diario asociada

#### Scenario: Saltar la Puerta 1

- **WHEN** el usuario termina el onboarding sin elegir ningún álbum
- **THEN** no se crea ningún favorito y el onboarding queda cerrado igual

#### Scenario: Exceder el máximo

- **WHEN** el usuario intenta guardar siete álbumes
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no se crea nada

### Requirement: Cierre del onboarding

El onboarding SHALL cerrarse mediante una única operación `POST /api/me/onboarding` que
recibe los ids de álbum de la Puerta 1 (posiblemente vacíos), crea los favoritos de álbum que
falten y fija `onboarded_at`. La respuesta SHALL informar `onboardedAt`. La operación SHALL ser
idempotente: invocarla cuando el usuario ya está onboardeado SHALL responder `200` sin volver a
crear favoritos ni re-marcar.

#### Scenario: Terminar el onboarding

- **WHEN** el usuario toca "Ir a Inicio" tras elegir álbumes
- **THEN** se crean esos favoritos de álbum, se fija `onboarded_at`, y el usuario llega a
  Inicio

#### Scenario: Llamada repetida

- **WHEN** el cliente reintenta `POST /api/me/onboarding` para un usuario ya onboardeado
- **THEN** la API responde `200` sin efectos adicionales
