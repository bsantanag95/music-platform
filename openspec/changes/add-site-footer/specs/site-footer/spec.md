## ADDED Requirements

### Requirement: Presencia global del pie de página

El sistema SHALL renderizar un único elemento `<footer>` al final de cada página,
en todas las rutas y en ambos locales (`es`, `en`), montado en el layout de locale
por fuera del elemento `<main>`.

#### Scenario: El footer aparece en cualquier ruta

- **WHEN** una persona visita cualquier ruta de la aplicación (home, catálogo,
  perfil, ajustes, error, no encontrado)
- **THEN** la página contiene exactamente un elemento `<footer>` con rol
  `contentinfo` renderizado después del contenido principal

#### Scenario: El footer se renderiza en el servidor sin JavaScript de cliente

- **WHEN** se solicita cualquier página con JavaScript deshabilitado
- **THEN** el footer y todos sus enlaces se muestran y son navegables

### Requirement: Grupo de identidad

El footer SHALL incluir un grupo de identidad con el monograma/logo enlazado a la
home, el nombre de la aplicación tomado de i18n (`common.appName`), la tagline
(`common.tagline`) y una frase breve que aclare que la aplicación cataloga y opina
sobre música y no es un servicio de reproducción.

#### Scenario: El nombre usa el valor de i18n

- **WHEN** se renderiza el footer
- **THEN** el nombre mostrado proviene de `common.appName` y no está escrito de
  forma literal en el componente

#### Scenario: El logo enlaza a la home del locale activo

- **WHEN** una persona en `/en/...` activa el logo del footer
- **THEN** navega a `/en` (la home con el prefijo de locale vigente)

### Requirement: Navegación secundaria "Explorar"

El footer SHALL incluir un grupo de navegación "Explorar" con enlaces a Buscar
(`/search`), Gente (`/users`), Listas públicas, Actividad de la comunidad y "Cómo
funciona", usando el componente `Link` de `src/i18n/navigation.ts`.

#### Scenario: Los enlaces conservan el prefijo de locale

- **WHEN** una persona en locale `es` activa "Buscar" en el footer
- **THEN** navega a `/es/search`

#### Scenario: El grupo es un landmark de navegación etiquetado

- **WHEN** un lector de pantalla recorre el footer
- **THEN** el grupo "Explorar" se expone como `<nav>` con un `aria-label`
  localizado

### Requirement: Navegación secundaria "Cuenta" según estado de sesión

El footer SHALL mostrar un grupo "Cuenta" cuyo contenido depende de si hay sesión
activa, resuelta en el servidor a partir del mismo usuario que recibe el `Header`.

#### Scenario: Visitante anónimo

- **WHEN** no hay sesión activa
- **THEN** el grupo "Cuenta" muestra enlaces a Iniciar sesión (`/auth/login`) y
  Crear cuenta (`/auth/register`) y no muestra enlaces de perfil ni de cierre de
  sesión

#### Scenario: Usuario con sesión

- **WHEN** hay sesión activa
- **THEN** el grupo "Cuenta" muestra enlaces a su perfil
  (`/users/<username>`), Ajustes (`/me/settings`) y Sesiones/accesos, y no muestra
  los enlaces de iniciar sesión ni de registro

### Requirement: Navegación "Recursos"

El footer SHALL incluir un grupo "Recursos" con enlaces a Acerca de (`/about`) y
Ayuda, usando el componente `Link` de `src/i18n/navigation.ts`.

#### Scenario: El grupo "Recursos" enlaza a información del producto

- **WHEN** se renderiza el grupo "Recursos"
- **THEN** existen enlaces a `/about` y a la página de ayuda, cada uno con el prefijo
  del locale activo

### Requirement: Grupo "Conectar" con contacto y redes sociales

El footer SHALL incluir un grupo "Conectar" con un enlace de contacto `mailto:` cuya
dirección de correo es visible como texto, y una lista de enlaces a los perfiles
sociales y canales del sitio (como mínimo X, Instagram, Mastodon, Bluesky,
Discord/comunidad y un feed RSS). Todos los valores (correo y URLs) SHALL provenir
de una única fuente `src/lib/site-links.ts`. Mientras esas cuentas no existan, los
enlaces son marcadores de posición hacia los handles previstos y NO se ocultan.

#### Scenario: El contacto es un mailto con la dirección visible

- **WHEN** se renderiza el grupo "Conectar"
- **THEN** existe un enlace con esquema `mailto:` cuyo texto visible contiene la
  dirección de correo completa, tomada de `src/lib/site-links.ts`

#### Scenario: Los enlaces sociales están presentes aunque las cuentas no existan

- **WHEN** se renderiza el grupo "Conectar" y aún no hay cuentas sociales reales
- **THEN** se muestran igualmente los enlaces a cada red/canal definido en
  `src/lib/site-links.ts`, apuntando a la URL prevista (nunca a `#`)

#### Scenario: Cada enlace social es accesible y seguro

- **WHEN** se renderiza cualquier enlace social del grupo "Conectar"
- **THEN** tiene un `aria-label` que identifica la red, `target="_blank"` y `rel`
  que incluye `noopener` y `noreferrer`

#### Scenario: Un único punto de configuración

- **WHEN** se necesita cambiar el correo de contacto o una URL social
- **THEN** basta con editar `src/lib/site-links.ts`, sin tocar el componente `Footer`
  ni los archivos de traducción

### Requirement: Bloque de atribución de fuentes de datos

El footer SHALL incluir un bloque de atribución, visualmente separado, que declare:
(1) que la metadata del catálogo proviene de MusicBrainz, mayormente bajo CC0 y en
parte bajo CC BY-NC-SA 3.0; (2) que las carátulas provienen del Cover Art Archive,
se muestran en baja resolución con fines de identificación y son propiedad de sus
titulares de derechos; (3) que el servicio de metadata lo opera la MetaBrainz
Foundation; (4) que music-platform no está afiliada ni respaldada por la MetaBrainz
Foundation; (5) que music-platform no reproduce ni aloja audio. Cada fuente
nombrada SHALL enlazar a su sitio oficial.

#### Scenario: Las tres fuentes están nombradas y enlazadas

- **WHEN** se renderiza el bloque de atribución
- **THEN** aparecen los nombres "MusicBrainz", "Cover Art Archive" y "MetaBrainz",
  cada uno dentro de un enlace a su sitio oficial

#### Scenario: Los enlaces externos se abren de forma segura

- **WHEN** se renderiza cualquier enlace externo del bloque de atribución
- **THEN** tiene `target="_blank"` y `rel` que incluye `noopener` y `noreferrer`, y
  un indicador accesible de que abre en una pestaña nueva

#### Scenario: Los nombres de las fuentes no se traducen

- **WHEN** se cambia el locale entre `es` y `en`
- **THEN** los nombres "MusicBrainz", "Cover Art Archive" y "MetaBrainz Foundation"
  permanecen idénticos y solo cambia el texto que los rodea

#### Scenario: Aclaración de no afiliación y de no reproducción

- **WHEN** se renderiza el bloque de atribución
- **THEN** incluye una frase de no afiliación con MetaBrainz Foundation y una frase
  de que la aplicación no reproduce ni aloja audio

### Requirement: Barra inferior con copyright y políticas

El footer SHALL incluir una barra inferior con un aviso de copyright que contenga el
año y el nombre de la aplicación, y enlaces a Términos (`/terms`), Privacidad
(`/privacy`), Cookies (`/cookies`) y Directrices de la comunidad (`/guidelines`).

#### Scenario: El aviso de copyright muestra el año

- **WHEN** se renderiza la barra inferior
- **THEN** el aviso de copyright contiene un año de cuatro dígitos y el nombre de
  `common.appName`

#### Scenario: Los cuatro enlaces de políticas están presentes

- **WHEN** se renderiza la barra inferior
- **THEN** existen enlaces a `/terms`, `/privacy`, `/cookies` y `/guidelines`, cada
  uno con el prefijo del locale activo

### Requirement: Accesibilidad del footer

El footer SHALL usar un único landmark `contentinfo`, exponer cada grupo de enlaces
como `<nav>` con `aria-label` localizado, usar encabezados reales para los títulos
de grupo, y mantener contraste de texto conforme a WCAG AA sobre el fondo `ink`.

#### Scenario: Un solo landmark contentinfo por página

- **WHEN** se auditan los landmarks de cualquier página
- **THEN** existe exactamente un `contentinfo`

#### Scenario: Foco visible en los enlaces del footer

- **WHEN** una persona navega el footer con el teclado
- **THEN** cada enlace enfocado muestra el contorno de foco del proyecto (ámbar)

### Requirement: Comportamiento responsive del footer

El footer SHALL adaptar su disposición a cuatro columnas en pantallas anchas, dos
columnas en pantallas medianas y una columna apilada en móvil, sin provocar scroll
horizontal de la página.

#### Scenario: Sin scroll horizontal en móvil

- **WHEN** se muestra el footer en un viewport de 360px de ancho
- **THEN** el contenido se apila en una sola columna y el documento no tiene scroll
  horizontal

### Requirement: Enlace "volver arriba"

El footer SHALL incluir un enlace "volver arriba" implementado como ancla
(`<a href="#top">`) hacia un destino con `id="top"` al inicio del contenido de la
página, sin depender de JavaScript.

#### Scenario: El ancla lleva al inicio del contenido

- **WHEN** una persona activa "volver arriba" al final de una página larga
- **THEN** el documento desplaza el foco/scroll al inicio del contenido y la URL
  recibe el fragmento `#top`

#### Scenario: Funciona sin JavaScript

- **WHEN** se solicita la página con JavaScript deshabilitado
- **THEN** el enlace "volver arriba" sigue funcionando

### Requirement: El footer no duplica el selector de idioma

El footer SHALL NOT incluir un selector de idioma; el cambio de locale se mantiene
exclusivamente en el `Header`.

#### Scenario: Sin selector de idioma en el footer

- **WHEN** se renderiza el footer en cualquier locale
- **THEN** no contiene controles para cambiar de idioma

### Requirement: Localización del footer

Todo el texto del footer SHALL provenir del namespace i18n `footer` (o de `common`
para nombre y tagline), sin cadenas literales en el componente, y SHALL estar
disponible en `es` y `en`.

#### Scenario: El footer se traduce completo

- **WHEN** se solicita el footer en locale `en`
- **THEN** todas sus etiquetas, encabezados de grupo y textos de atribución se
  muestran en inglés, sin claves de traducción crudas ni texto en español
