## ADDED Requirements

### Requirement: Navegación global del catálogo

La aplicación SHALL mostrar un encabezado común en las páginas públicas del catálogo con un
acceso al buscador y un selector de los locales soportados (`es` y `en`).

#### Scenario: Acceso global al buscador

- **WHEN** una persona visita una página de inicio, artista o álbum
- **THEN** el encabezado muestra un enlace al buscador que conserva el locale activo

#### Scenario: Cambio de idioma en una página de álbum

- **WHEN** una persona cambia de `/es/album/<id>` a inglés desde el selector
- **THEN** la aplicación navega a `/en/album/<id>` manteniendo el mismo id de álbum

### Requirement: Breadcrumbs navegables y localizados

Las páginas de artista y álbum SHALL mostrar breadcrumbs con etiquetas localizadas y enlaces
locale-aware hacia el inicio y las entidades cuyo contexto esté disponible.

#### Scenario: Breadcrumb de álbum con artista principal

- **WHEN** el detalle del álbum incluye un artista principal
- **THEN** la página muestra enlaces hacia inicio y `/artist/<artistId>`, además del álbum actual

#### Scenario: Álbum sin artista principal

- **WHEN** el detalle del álbum no tiene un artista principal identificable
- **THEN** la página mantiene el enlace a inicio y muestra el álbum actual sin crear un enlace roto

### Requirement: Créditos destacados navegables

Los créditos de track con rol `featured` SHALL mostrarse como enlaces hacia el perfil del artista
acreditado usando su `artistId` propio y preservando el locale activo.

#### Scenario: Crédito featured con artista válido

- **WHEN** un track contiene un crédito destacado con `artistId` válido
- **THEN** el nombre del crédito aparece enlazado a `/<locale>/artist/<artistId>`

#### Scenario: Track sin créditos destacados

- **WHEN** un track no contiene créditos con rol `featured`
- **THEN** no se muestra una sección de colaboración ni un enlace adicional

### Requirement: Datos de catálogo sin traducción

La navegación SHALL traducir únicamente etiquetas de interfaz, mientras que títulos, nombres de
artistas y nombres de créditos SHALL conservarse tal como los entrega el catálogo.

#### Scenario: Mismo álbum en dos locales

- **WHEN** una persona visita el álbum en español y en inglés
- **THEN** cambian las etiquetas de navegación y permanecen iguales los datos musicales
