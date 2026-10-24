## MODIFIED Requirements

### Requirement: Área de ajustes con una pantalla por tipo de ajuste

El sistema SHALL ofrecer a todo usuario autenticado un área de ajustes bajo `/me/settings` con
una pantalla por tipo de ajuste: **Perfil** (`/me/settings/profile`), **Curaduría**
(`/me/settings/curation`), **Privacidad y audiencia** (`/me/settings/privacy`), **Red**
(`/me/settings/network`), **Notificaciones** (`/me/settings/notifications`, ver `notifications`) y
**Cuenta y seguridad** (`/me/settings/account`). Todas las pantallas
SHALL compartir un menú de navegación lateral (pestañas horizontales por debajo del punto de
corte `md`) que marque la pantalla activa. La ruta `/me/settings` SHALL redirigir a
`/me/settings/profile`. El área SHALL NOT incluir accesos a la biblioteca (diario, favoritos, por
escuchar, listas, colección, artistas, recorridos, feed), que se alcanzan desde el menú de
usuario. Una pantalla SHALL listarse en el menú únicamente cuando ofrezca al menos un control
disponible. Una petición sin sesión SHALL ser dirigida al inicio de sesión.

#### Scenario: Entrar a Ajustes desde el menú de usuario

- **WHEN** un usuario autenticado abre "Ajustes" desde el menú de usuario
- **THEN** llega a `/me/settings/profile` con el menú lateral mostrando "Perfil" como activo

#### Scenario: Navegar entre pantallas

- **WHEN** el usuario elige otra pantalla en el menú lateral
- **THEN** llega a su ruta propia, enlazable de forma directa, y el menú marca esa pantalla

#### Scenario: Ajustes sin sesión

- **WHEN** una persona sin sesión abre cualquier ruta bajo `/me/settings`
- **THEN** es dirigida al inicio de sesión y no se muestra ningún dato

#### Scenario: Pantalla sin controles disponibles

- **WHEN** una pantalla del área no ofrece ningún control disponible todavía
- **THEN** no aparece en el menú lateral

#### Scenario: Pantalla Notificaciones

- **WHEN** el usuario elige "Notificaciones" en el menú lateral
- **THEN** llega a `/me/settings/notifications` con un interruptor por cada tipo desactivable y la
  explicación de los tipos que no se pueden desactivar
