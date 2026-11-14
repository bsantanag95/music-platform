## MODIFIED Requirements

### Requirement: Navegación secundaria "Explorar"

El footer SHALL incluir un grupo de navegación "Explorar" con enlaces a Inicio
(`/`), Explorar (`/explore`, solo si está habilitado), Buscar (`/search`) y Personas
(`/users`), usando el componente `Link` de `src/i18n/navigation.ts`. Los
descubrimientos que hoy solo viven en la home (actividad de la comunidad, listas
públicas) se alcanzan por el enlace a Inicio; el footer no inventa rutas que no
existen y no repite en este grupo los enlaces del grupo "Recursos".

#### Scenario: Los enlaces conservan el prefijo de locale

- **WHEN** una persona en locale `es` activa "Buscar" en el footer
- **THEN** navega a `/es/search`

#### Scenario: El grupo es un landmark de navegación etiquetado

- **WHEN** un lector de pantalla recorre el footer
- **THEN** el grupo "Explorar" se expone como `<nav>` con un `aria-label`
  localizado

#### Scenario: Sin enlaces repetidos

- **WHEN** se renderiza el footer completo
- **THEN** ninguna ruta interna aparece enlazada dos veces

### Requirement: Navegación "Recursos"

El footer SHALL incluir un grupo "Recursos" con enlaces a Acerca de (`/about`) y
Ayuda (`/help`), usando el componente `Link` de `src/i18n/navigation.ts`. Ambas rutas
SHALL existir. «Fuentes de datos» no se enlaza desde el footer: cuelga de «Acerca de».

#### Scenario: El grupo "Recursos" enlaza a información del producto

- **WHEN** se renderiza el grupo "Recursos"
- **THEN** existen enlaces a `/about` y a `/help`, cada uno con el prefijo
  del locale activo

### Requirement: Bloque de atribución de fuentes de datos

El footer SHALL incluir un bloque de atribución breve, sin encabezado propio y sin
enlace a la página de fuentes de datos, que declare: (1) que la metadata del catálogo
proviene de MusicBrainz, en su mayoría de dominio público (CC0); (2) que las carátulas
provienen del Cover Art Archive, se muestran en baja resolución y son propiedad de sus
titulares; (3) que music-platform no está afiliada ni respaldada por la MetaBrainz
Foundation, que opera esos servicios; y (4), cuando el contacto de retiro de carátulas
está configurado, cómo pedir el retiro de una carátula, con un enlace `mailto:` a ese
contacto cuya dirección es visible como texto. Cada fuente nombrada SHALL enlazar a su
sitio oficial. El detalle (licencias completas, cómo se obtienen los datos, límites) vive
en `/about/data-sources`. El contacto de retiro SHALL provenir de `src/lib/site-links.ts`,
que lo lee de la configuración (`COVER_ART_TAKEDOWN_EMAIL`); si no está configurado, el
punto (4) SHALL omitirse.

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

#### Scenario: Aclaración de no afiliación

- **WHEN** se renderiza el bloque de atribución
- **THEN** incluye una frase de no afiliación con MetaBrainz Foundation

#### Scenario: Sin encabezado ni enlace a la página de fuentes

- **WHEN** se renderiza el footer
- **THEN** el bloque de atribución no tiene encabezado visible y ningún enlace del
  footer apunta a `/about/data-sources`

#### Scenario: Contacto de retiro configurado

- **WHEN** `COVER_ART_TAKEDOWN_EMAIL` tiene valor y se renderiza el bloque de atribución
- **THEN** incluye una frase localizada para pedir el retiro de una carátula con un
  enlace `mailto:` cuyo texto visible es esa dirección

#### Scenario: Contacto de retiro sin configurar

- **WHEN** `COVER_ART_TAKEDOWN_EMAIL` no tiene valor
- **THEN** el bloque de atribución no muestra la frase de retiro ni un enlace vacío
