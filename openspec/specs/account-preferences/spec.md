# account-preferences Specification

## Purpose
TBD - created by archiving change rework-account-settings. Update Purpose after archive.
## Requirements
### Requirement: Idioma de la interfaz guardado en la cuenta

El sistema SHALL permitir a un usuario autenticado elegir su idioma de interfaz entre los idiomas
soportados (`es`, `en`) desde Cuenta y seguridad, y SHALL guardarlo en su cuenta. Al elegirlo, la
interfaz SHALL pasar de inmediato al idioma elegido en la misma pantalla. Sin preferencia guardada,
el comportamiento SHALL ser el actual (idioma de la ruta). El sistema SHALL rechazar un idioma no
soportado.

#### Scenario: Elegir English

- **WHEN** la persona elige "English" en sus preferencias
- **THEN** se guarda `en` en su cuenta y la pantalla se muestra en inglés

#### Scenario: Idioma no soportado

- **WHEN** un cliente envía `fr` como idioma
- **THEN** la API responde con un error de validación y la preferencia no cambia

### Requirement: La preferencia se aplica al iniciar sesión

Al iniciar sesión con contraseña o con Google, el sistema SHALL llevar a la persona al idioma que
tiene guardado cuando difiera del idioma desde el que inició sesión. Sin preferencia guardada SHALL
conservar el idioma del flujo. El selector de idioma del Header SHALL NOT modificar la preferencia
guardada.

#### Scenario: Iniciar sesión con preferencia distinta

- **WHEN** una persona con preferencia `en` inicia sesión desde la página en español
- **THEN** termina en la versión en inglés del destino habitual

#### Scenario: Sin preferencia

- **WHEN** una persona sin preferencia guardada inicia sesión desde la página en español
- **THEN** sigue en español

#### Scenario: El selector del Header no cambia la preferencia

- **WHEN** una persona con preferencia `en` cambia a español con el selector del Header
- **THEN** la preferencia guardada sigue siendo `en`

