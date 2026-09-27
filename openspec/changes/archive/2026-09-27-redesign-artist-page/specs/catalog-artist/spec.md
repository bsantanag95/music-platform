## MODIFIED Requirements

### Requirement: Perfil localizado de artista
La aplicación SHALL exponer un perfil público en `/{locale}/artist/{id}` para los locales soportados y SHALL mostrar la cabecera del artista (foto, identidad, ficha y resumen de la biografía cuando existan, según la capability `artist-header`), su discografía disponible y breadcrumbs localizados dentro del encabezado global del catálogo.

#### Scenario: Artista válido en español
- **WHEN** una persona visita `/es/artist/<id-válido>`
- **THEN** la aplicación muestra el nombre y los datos musicales del artista, las etiquetas de interfaz aparecen en español y el breadcrumb enlaza al inicio

#### Scenario: Artista válido en inglés
- **WHEN** una persona visita `/en/artist/<id-válido>`
- **THEN** la aplicación muestra el mismo contenido musical, las etiquetas de interfaz aparecen en inglés y el breadcrumb enlaza al inicio

#### Scenario: Artista inexistente
- **WHEN** una persona visita un id que no corresponde a ningún artista
- **THEN** la aplicación responde con un 404 amigable y localizado, sin mostrar el mensaje crudo del backend

### Requirement: Datos opcionales del artista
La aplicación SHALL renderizar el placeholder visual 4:3 cuando el artista no tenga foto y SHALL omitir, sin dejar huecos, cada dato de la cabecera que falte (descripción, cada fila de la ficha, enlaces y resumen de la biografía), sin impedir la navegación de la página.

#### Scenario: Artista sin foto ni biografía
- **WHEN** el artista no tiene foto, descripción ni resumen de la biografía
- **THEN** la cabecera muestra el placeholder, el tipo y el nombre, sin líneas vacías, y el resto del perfil se renderiza correctamente

### Requirement: Carga progresiva de carátulas
La discografía SHALL incluir, por cada `releaseGroup`, su carátula conocida y si su carátula está resuelta. Una carátula está resuelta cuando su URL es conocida, cuando su ausencia fue confirmada dentro de la ventana de reintento de negativos o cuando fue retirada. La aplicación SHALL renderizar en la carga inicial la carátula (o el fallback visual de álbum sin carátula) de los `releaseGroup` resueltos, sin requests por carátula desde el cliente. Solo para los `releaseGroup` no resueltos, y solo cuando su tarjeta o fila entra en el área visible (o se acerca a ella), la aplicación SHALL cargar la carátula mediante el endpoint cover-only (`GET /api/catalog/release-group/{id}/cover`), que resuelve la carátula sin ingerir el tracklist del álbum, SHALL mostrar un estado de carga accesible, SHALL reintentar de forma limitada los fallos transitorios y SHALL usar un fallback visual estable cuando no exista carátula o se agoten los reintentos.

#### Scenario: Carátula con URL conocida
- **WHEN** la discografía incluye un `releaseGroup` con URL de carátula conocida
- **THEN** la tarjeta muestra la miniatura desde la carga inicial, sin skeleton y sin consultar el endpoint cover-only

#### Scenario: Ausencia confirmada o carátula retirada
- **WHEN** la discografía incluye un `releaseGroup` cuya ausencia de carátula fue confirmada dentro de la ventana de reintento de negativos, o cuya carátula fue retirada
- **THEN** la tarjeta muestra el fallback visual estable desde la carga inicial, sin consultar el endpoint cover-only

#### Scenario: Negativo vencido se re-resuelve
- **WHEN** la discografía incluye un `releaseGroup` sin carátula cuya última confirmación de ausencia está fuera de la ventana de reintento
- **THEN** la tarjeta resuelve la carátula mediante el endpoint cover-only cuando entra en el área visible

#### Scenario: Carátula disponible
- **WHEN** el `releaseGroup` no está resuelto, el endpoint cover-only devuelve una carátula válida y la imagen carga
- **THEN** la tarjeta reemplaza su skeleton por la miniatura devuelta por el backend sin bloquear la carga inicial del perfil

#### Scenario: Fallo transitorio de consulta
- **WHEN** la consulta cover-only falla de forma transitoria
- **THEN** la tarjeta conserva un estado accesible durante como máximo dos reintentos con backoff y no crea un bucle de requests

#### Scenario: Fallo definitivo de imagen
- **WHEN** la URL recibida existe pero la imagen falla después del máximo de reintentos
- **THEN** la tarjeta muestra un placeholder accesible y el resto de la discografía permanece usable

#### Scenario: Carátula ausente
- **WHEN** el endpoint cover-only devuelve `cover: null`
- **THEN** la tarjeta muestra inmediatamente un fallback visual estable y conserva su enlace al álbum

#### Scenario: Carátula fuera de pantalla
- **WHEN** la discografía tiene 200 discos sin carátula resuelta y la persona solo ve los primeros 12
- **THEN** la aplicación consulta el endpoint cover-only solo para los discos visibles o próximos a serlo, y consulta los demás a medida que se desplaza

### Requirement: Sección de integrantes y membresías

El perfil SHALL integrar la sección de integrantes para grupos y la sección de grupos para personas, y SHALL NOT combinar la discografía de los grupos asociados con la discografía de una persona: los grupos de una persona se presentan en la franja "También en" de la capability `artist-discography-view`.

#### Scenario: Perfil de grupo con integrantes

- **WHEN** se visita un perfil de tipo `group` con filas `membership`
- **THEN** la página muestra integrantes enlazados y mantiene la discografía del grupo

#### Scenario: Perfil de persona con membresías

- **WHEN** se visita un perfil de tipo `person` con grupos relacionados
- **THEN** la discografía muestra solo los discos de la persona y sus grupos aparecen en la franja "También en", enlazados a sus páginas

### Requirement: Página de artista discografía-forward

La página de detalle de artista SHALL presentar la **discografía inmediatamente después de
la cabecera del artista**, como pestaña activa por defecto, antes de la sección de
integrantes/membresías y antes de cualquier área de opinión de la comunidad. El artista se
lee primero por su obra. Las acciones de catálogo (seguir, registrar escucha, marcar
favorito, Pendiente, agregar a lista, recorrido) SHALL ubicarse en el panel "Tu relación" de
la cabecera (capability `artist-personal-panel`), no en una columna de botones aparte.

#### Scenario: La discografía va primero

- **WHEN** una persona abre la página de un artista con discografía
- **THEN** ve la discografía justo debajo de la cabecera, antes de las membresías y de las
  notas de la comunidad

#### Scenario: Artista sin discografía ingerida aún

- **WHEN** la discografía todavía se está resolviendo o está vacía
- **THEN** el resto de la página (cabecera, membresías, notas) se compone sin un hueco
  roto donde iría la discografía

## REMOVED Requirements

### Requirement: Discografía agrupada

**Reason**: La discografía deja de agruparse por las cuatro categorías (`studio`,
`single_ep`, `compilation`, `live_other`) y pasa a las secciones Principal, En vivo,
Recopilatorios, Sencillos, Otros y Apariciones, con vistas grilla y tabla.

**Migration**: Ver la capability `artist-discography-view` (secciones, orden por año,
secciones vacías omitidas) y `artist-discography` (clasificación). La columna `category` se
conserva para recorridos, búsqueda y la franja de discografía del álbum.
