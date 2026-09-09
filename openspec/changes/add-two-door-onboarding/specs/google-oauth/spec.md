## MODIFIED Requirements

### Requirement: Sesión común y retorno fijo
El flujo SHALL finalizar siempre en la sesión server-side común (cookie `music_session`
`httpOnly`, `secure`, `sameSite=lax`). SHALL NOT aceptar un parámetro `returnTo` ni ninguna
URL de retorno controlada por el cliente. La redirección post-autenticación SHALL usar el
locale validado y persistido en el estado del flujo, y SHALL decidirse según el estado de
onboarding del usuario: si `onboarded_at` es nula SHALL redirigir a `/<locale>/welcome`; en
caso contrario SHALL redirigir a `/<locale>/search` de forma fija.

#### Scenario: Redirección post-login de un usuario ya onboardeado
- **WHEN** el flujo de Google completa con éxito para un usuario cuyo `onboarded_at` no es nula
- **THEN** el navegador es redirigido a `/<locale>/search` y la cookie de sesión queda establecida

#### Scenario: Redirección post-alta de un usuario nuevo
- **WHEN** el flujo de Google completa con éxito y crea un usuario nuevo (o resuelve uno con `onboarded_at` nula)
- **THEN** el navegador es redirigido a `/<locale>/welcome` y la cookie de sesión queda establecida

#### Scenario: Sin retorno dinámico
- **WHEN** una persona agrega un parámetro de retorno arbitrario al callback
- **THEN** la redirección posterior ignora ese parámetro y usa solo el destino que corresponde al estado de onboarding
