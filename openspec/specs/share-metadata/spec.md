# share-metadata Specification

## Purpose
Dar a cada página de destino metadatos Open Graph y Twitter con URL canónica e imagen absoluta y versionada, para que el enlace pegado en otra red muestre la tarjeta correcta sin exponer lo que un visitante anónimo no puede ver.
## Requirements
### Requirement: Metadatos de la página para compartir
Las páginas de álbum (y sus pestañas), artista (y sus pestañas), canción, género, premios (índice y
ceremonia), salones de la fama (índice y clase), colecciones de Explorar (página y detalle) y perfil SHALL declarar metadatos Open Graph y de Twitter/X: título, descripción, tipo, URL
canónica absoluta, idioma (`og:locale`), imagen Enlace con su ancho, alto y texto alternativo, y
`twitter:card = summary_large_image`. La URL de la imagen SHALL ser absoluta y SHALL incluir la versión
de contenido de la imagen.

#### Scenario: Enlace de un álbum
- **WHEN** un crawler pide la página de un álbum
- **THEN** el HTML incluye `og:title`, `og:description`, `og:url`, `og:image` (1200×630, absoluta y
  versionada), `og:image:alt`, `og:locale` y `twitter:card = summary_large_image`

#### Scenario: Pestaña de créditos
- **WHEN** un crawler pide `/es/album/<slug-id>/credits`
- **THEN** la imagen anunciada es la del álbum

### Requirement: Base absoluta de las URL
El layout raíz SHALL fijar `metadataBase` a partir de `NEXT_PUBLIC_APP_URL`. Si la variable falta, la
app SHALL seguir funcionando y SHALL usar el origen local de desarrollo, sin anunciar imágenes con una
URL relativa.

#### Scenario: Variable configurada
- **WHEN** `NEXT_PUBLIC_APP_URL` es `https://ejemplo.app`
- **THEN** `og:image` y `og:url` empiezan con `https://ejemplo.app`

### Requirement: La URL canónica no incluye el canal
`og:url` SHALL ser la dirección canónica del objeto y SHALL omitir el parámetro `via` y cualquier otro
parámetro de medición, aunque la página se haya abierto con él. Los metadatos de compartir SHALL NOT
redefinir `alternates`, para no pisar los idiomas que declara el layout raíz.

#### Scenario: Página abierta desde un enlace compartido
- **WHEN** se abre `/es/album/<slug-id>?via=whatsapp`
- **THEN** `og:url` es `/es/album/<slug-id>` absoluta, sin `via`

### Requirement: Metadatos según lo que ve un anónimo
Los metadatos SHALL calcularse como si el visitante fuera anónimo, sea quien sea quien carga la página.
Un perfil privado SHALL anunciar solo su identidad pública (nombre visible y `@usuario`) y una
descripción genérica, sin la bio ni datos de gusto. Una cuenta desactivada o un objeto inexistente
SHALL anunciar la imagen genérica y no SHALL anunciar el nombre del objeto.

#### Scenario: Dueño de un perfil privado
- **WHEN** el dueño de un perfil privado abre su perfil con sesión
- **THEN** los metadatos son los mismos que vería un anónimo

#### Scenario: Cuenta desactivada
- **WHEN** un crawler pide el perfil de una cuenta desactivada
- **THEN** los metadatos anuncian la imagen genérica y no el nombre de la cuenta

### Requirement: Descripción del enlace
La descripción SHALL ser un texto corto (≤160 caracteres) en el idioma de la ruta, construido con datos
que el anónimo puede ver: para un álbum, artista, tipo y año; para un artista, tipo y origen; para un
perfil público, la bio recortada; y SHALL NOT incluir datos con audiencia restringida.

#### Scenario: Bio larga
- **WHEN** un perfil público tiene una bio de 400 caracteres
- **THEN** la descripción es la bio recortada a 160 caracteres como máximo, en un límite de palabra

