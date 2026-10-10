## ADDED Requirements

### Requirement: La bienvenida se muestra con navegación reducida

La ruta `/[locale]/welcome` SHALL mostrarse como pantalla de foco: el Header SHALL reducirse al logo (enlazado a Inicio) y al selector de idioma, y el pie SHALL reducirse a la atribución de fuentes de datos y a los enlaces legales. La bienvenida SHALL NOT mostrar el buscador, la navegación general, las acciones rápidas, el menú de usuario ni los grupos de navegación, cuenta, recursos y redes del pie.

#### Scenario: Navegación reducida

- **WHEN** una persona abre `/welcome`
- **THEN** el Header solo tiene el logo y el selector de idioma, y el pie solo tiene la atribución de fuentes y los enlaces legales

#### Scenario: Salida a Inicio

- **WHEN** la persona toca el logo desde la bienvenida
- **THEN** va a Inicio, el onboarding sigue pendiente y Inicio ofrece el enlace para retomarlo

#### Scenario: Idioma

- **WHEN** la persona cambia de idioma desde el Header de la bienvenida
- **THEN** sigue en `/welcome` en el idioma elegido

#### Scenario: Al terminar, el sitio completo

- **WHEN** la persona cierra el onboarding y va a Inicio
- **THEN** el Header y el pie completos vuelven a mostrarse
