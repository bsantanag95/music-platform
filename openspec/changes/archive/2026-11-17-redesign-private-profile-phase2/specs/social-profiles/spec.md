## ADDED Requirements

### Requirement: Aviso para quien no sigue un perfil público

Un perfil accesible visto por quien no es su dueño y no lo sigue (sin sesión, con sesión sin relación,
con una solicitud recibida de esa cuenta, o el dueño en la previsualización «cómo te ven») SHALL
terminar su cuerpo con un aviso genérico: «Si sigues a @usuario, verás también lo que comparte solo
con sus seguidores», con la acción de seguir (o de iniciar sesión para seguir; inerte en la
previsualización; sin acción cuando hay una solicitud recibida, que se responde desde la cabecera).
El aviso SHALL mostrarse a todo visitante que no sigue, haya o no contenido solo para seguidores, y
SHALL NOT indicar qué secciones ni cuántos elementos están ocultos (ver `diary-visibility`).

Cuando ninguna sección del cuerpo ni de la franja de identidad tiene contenido visible para ese
visitante, el cuerpo SHALL mostrar en su lugar «Nada público por ahora», con una oración equivalente
y la misma acción (sin sesión, además, un acceso para crear una cuenta).

El dueño y quien sigue el perfil SHALL NOT ver el aviso ni el estado vacío.

#### Scenario: Perfil con contenido público

- **WHEN** un visitante sin sesión abre un perfil público con secciones visibles
- **THEN** ve las secciones y, al final, el aviso genérico con la acción de iniciar sesión para seguir

#### Scenario: Sin nada oculto

- **WHEN** un visitante que no sigue abre un perfil público cuyo contenido es todo público
- **THEN** ve igualmente el aviso genérico, idéntico al de un perfil con contenido solo para seguidores

#### Scenario: Nada visible

- **WHEN** un visitante que no sigue abre un perfil público en el que ninguna sección tiene contenido
  visible para él
- **THEN** debajo de la cabecera ve «Nada público por ahora», la oración y la acción, en lugar de un
  cuerpo vacío

#### Scenario: Seguidor

- **WHEN** quien sigue el perfil lo abre
- **THEN** no ve el aviso ni el estado vacío

#### Scenario: Dueño

- **WHEN** el dueño abre su propio perfil sin previsualizar
- **THEN** no ve el aviso ni el estado vacío
