## MODIFIED Requirements

### Requirement: Grupo de identidad

El footer SHALL incluir un grupo de identidad con el monograma/logo enlazado a la
home, el nombre de la aplicación tomado de i18n (`common.appName`), la tagline
(`common.tagline`) y una frase breve que aclare que la aplicación cataloga y opina
sobre música y no es un servicio de reproducción. En pantallas angostas el grupo SHALL
mostrar el nombre y esa frase, y la tagline SHALL mostrarse desde anchos medianos (dice
lo mismo con otras palabras y en móvil alarga el pie sin aportar).

#### Scenario: El nombre usa el valor de i18n

- **WHEN** se renderiza el footer
- **THEN** el nombre mostrado proviene de `common.appName` y no está escrito de
  forma literal en el componente

#### Scenario: El logo enlaza a la home del locale activo

- **WHEN** una persona en `/en/...` activa el logo del footer
- **THEN** navega a `/en` (la home con el prefijo de locale vigente)

#### Scenario: Identidad compacta en móvil

- **WHEN** se muestra el footer en un viewport de 390px de ancho
- **THEN** se ven el logo, el nombre y la frase de que no es un servicio de reproducción,
  y no se ve la tagline

### Requirement: Accesibilidad del footer

El footer SHALL usar un único landmark `contentinfo`, exponer cada grupo de enlaces
como `<nav>` con `aria-label` localizado, usar encabezados reales para los títulos
de grupo (en pantallas angostas pueden ocultarse a la vista, pero SHALL seguir expuestos
a lectores de pantalla), dar a cada enlace del footer en pantallas angostas un área
táctil de al menos 40px de alto, y mantener contraste de texto conforme a WCAG AA sobre el fondo `ink`.

#### Scenario: Un solo landmark contentinfo por página

- **WHEN** se auditan los landmarks de cualquier página
- **THEN** existe exactamente un `contentinfo`

#### Scenario: Foco visible en los enlaces del footer

- **WHEN** una persona navega el footer con el teclado
- **THEN** cada enlace enfocado muestra el contorno de foco del proyecto (ámbar)

#### Scenario: Área táctil en móvil

- **WHEN** se muestra el footer en un viewport de 390px de ancho
- **THEN** cada enlace de navegación, contacto, redes, políticas y "volver arriba" mide al
  menos 40px de alto

#### Scenario: Títulos de grupo para lectores de pantalla en móvil

- **WHEN** un lector de pantalla recorre el footer en un viewport de 390px
- **THEN** cada grupo de enlaces sigue anunciado por su encabezado aunque el título no se
  vea

### Requirement: Comportamiento responsive del footer

El footer SHALL adaptar su disposición a cuatro columnas en pantallas anchas y dos
columnas en pantallas medianas, sin provocar scroll horizontal de la página. En móvil
los grupos SHALL apilarse en una sola columna con márgenes reducidos, y los enlaces de
cada grupo de navegación SHALL repartirse en dos columnas, para que el pie no ocupe más
de lo necesario.

#### Scenario: Sin scroll horizontal en móvil

- **WHEN** se muestra el footer en un viewport de 360px de ancho
- **THEN** los grupos se apilan en una sola columna, los enlaces de cada grupo van en
  dos columnas y el documento no tiene scroll horizontal

#### Scenario: Pie más corto en móvil

- **WHEN** se muestra el footer completo sin sesión en un viewport de 390px
- **THEN** el footer mide menos de 900px de alto
