## ADDED Requirements

### Requirement: Pie reducido en pantallas de foco

En las pantallas de foco (hoy, `/welcome`) el pie SHALL ser una variante reducida que conserve el bloque de atribución de fuentes de datos completo (incluido el contacto de retiro de carátulas cuando está configurado) y la barra inferior con copyright y enlaces de políticas, y SHALL omitir la identidad, la navegación Explorar, Cuenta y Recursos, el grupo Conectar y el enlace «volver arriba». Seguirá existiendo un único `<footer>` con rol `contentinfo`, renderizado en el servidor.

#### Scenario: Atribución en una pantalla de foco

- **WHEN** se muestra el pie en `/welcome`
- **THEN** nombra y enlaza a MusicBrainz, al Cover Art Archive y a la MetaBrainz Foundation, incluye el aviso de no afiliación y los enlaces legales

#### Scenario: Navegación omitida

- **WHEN** se muestra el pie en `/welcome`
- **THEN** no contiene los grupos Explorar, Tu cuenta, Recursos ni Conectar

#### Scenario: Pie completo en el resto del sitio

- **WHEN** se muestra el pie en cualquier otra ruta
- **THEN** conserva todos sus grupos
