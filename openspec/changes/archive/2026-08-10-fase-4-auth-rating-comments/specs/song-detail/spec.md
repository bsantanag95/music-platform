# song-detail

Detalle navegable de una grabación musical.

## ADDED Requirements

### Requirement: Detalle localizado de canción
La aplicación SHALL exponer `/{locale}/song/{id}` y `GET /api/catalog/recording/{id}` para una grabación identificada por su UUID interno, con título, duración, variante, créditos y breadcrumbs localizados.

#### Scenario: Canción válida
- **WHEN** una persona visita `/es/song/<id-válido>` o `/en/song/<id-válido>`
- **THEN** la aplicación muestra los datos musicales sin traducir y el chrome de interfaz en el locale activo

#### Scenario: Canción inexistente
- **WHEN** el id no corresponde a una grabación
- **THEN** la página muestra un 404 localizado y el endpoint responde con un código machine-readable de grabación inexistente

### Requirement: Apariciones de una grabación
El detalle SHALL mostrar las ediciones y posiciones de track donde aparece la grabación, enlazando cada álbum mediante navegación locale-aware.

#### Scenario: Grabación en varias ediciones
- **WHEN** una grabación aparece en más de una edición o álbum
- **THEN** el detalle lista todas las apariciones disponibles con álbum, disco y posición sin duplicar la grabación

### Requirement: Créditos de la grabación
El detalle SHALL mostrar los créditos de la grabación en orden de posición y SHALL enlazar los artistas conocidos a sus perfiles.

#### Scenario: Grabación con créditos
- **WHEN** la grabación tiene créditos almacenados
- **THEN** el detalle muestra nombre, rol y join phrase según el catálogo y conserva los enlaces de artista

### Requirement: Read-model compartido
La página, el endpoint y las consultas sociales de la grabación SHALL consumir un read-model compartido sin duplicar la resolución de datos musicales.

#### Scenario: Lectura pública y lectura autenticada
- **WHEN** se solicita el detalle con o sin sesión
- **THEN** los datos públicos de la grabación son iguales y la sesión solo añade el estado social del usuario actual
