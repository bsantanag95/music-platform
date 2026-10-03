## ADDED Requirements

### Requirement: Principal y secundarios en los chips del álbum

Los chips de géneros del álbum SHALL mostrarse en el orden de puntaje, con el género principal
primero y destacado. Los géneros secundarios (los que alcanzan al menos la mitad del puntaje del
principal, y nunca menos de 1) SHALL mostrarse a continuación; el resto de géneros efectivos
SHALL quedar en el desplegable "+N". Un álbum cuyos géneros son heredados SHALL seguir mostrándolos
atenuados, sin distinción de principal.

#### Scenario: Principal y secundario

- **WHEN** un álbum tiene "shoegaze" con puntaje 4 y "dream pop" con 2
- **THEN** los chips muestran "shoegaze" destacado y "dream pop" a continuación

#### Scenario: Género bajo el umbral

- **WHEN** además tiene "noise pop" con puntaje 1 (menos de la mitad del principal)
- **THEN** "noise pop" aparece en el desplegable "+N", no entre los chips visibles

#### Scenario: Álbum heredado

- **WHEN** los géneros del álbum son heredados del artista
- **THEN** se muestran atenuados y ninguno se destaca como principal
