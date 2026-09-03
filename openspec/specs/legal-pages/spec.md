# legal-pages Specification

## Purpose
TBD - created by archiving change add-site-footer. Update Purpose after archive.
## Requirements
### Requirement: Rutas de información y políticas

El sistema SHALL exponer las rutas `/about`, `/terms`, `/privacy`, `/cookies` y
`/guidelines` bajo el segmento de locale, como páginas estáticas renderizadas en el
servidor, disponibles en `es` y `en` con slugs neutros iguales para ambos locales.

#### Scenario: Cada ruta responde en ambos locales

- **WHEN** se solicita `/es/terms` o `/en/terms` (y análogamente el resto de rutas)
- **THEN** la página responde con estado 200 y renderiza un encabezado y un cuerpo
  de contenido

#### Scenario: Los slugs no se traducen

- **WHEN** se navega a estas páginas desde el footer en locale `es`
- **THEN** la URL usa el slug en inglés con prefijo de locale (`/es/privacy`), no un
  slug traducido

### Requirement: Metadata y exclusión de indexación mientras sean placeholder

Cada página de políticas SHALL definir `generateMetadata` con un título propio y,
mientras su contenido sea un marcador de posición, SHALL declarar `robots: noindex`
para no exponer políticas no vigentes a los buscadores.

#### Scenario: Título propio por página

- **WHEN** se carga `/en/privacy`
- **THEN** el `<title>` del documento identifica la página de privacidad y el nombre
  de la aplicación

#### Scenario: Las páginas placeholder no se indexan

- **WHEN** un rastreador solicita cualquiera de estas páginas en estado placeholder
- **THEN** la respuesta incluye `noindex` en su metadata de robots

### Requirement: Contenido de marcador de posición honesto

El cuerpo de cada página SHALL indicar de forma explícita que el documento está en
preparación y no constituye todavía una política vigente, sin incluir texto legal
inventado. El texto SHALL provenir de un namespace i18n dedicado (`legal`).

#### Scenario: El placeholder declara su estado

- **WHEN** se renderiza cualquiera de las páginas de políticas en estado placeholder
- **THEN** el contenido informa que el documento está en preparación y no es aún
  vinculante

#### Scenario: El texto está localizado

- **WHEN** se solicita `/es/guidelines` y `/en/guidelines`
- **THEN** el contenido de marcador de posición se muestra en el idioma del locale,
  desde el namespace `legal`, sin claves crudas

