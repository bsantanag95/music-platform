# catalog-artist

## Purpose

Perfil público de artista en el catálogo navegable, con enriquecimiento de stub y discografía agrupada.
## Requirements
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

### Requirement: Enriquecimiento de artistas stub
La aplicación SHALL enriquecer automáticamente un artista almacenado como stub cuando se visite su perfil y SHALL renderizar el perfil enriquecido si MusicBrainz entrega los datos.

#### Scenario: Visita de artista stub
- **WHEN** una persona visita el perfil de un artista cuyo tipo almacenado es `unknown`
- **THEN** el servicio de catálogo intenta enriquecerlo antes de mostrar la información y la página presenta los datos obtenidos

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

### Requirement: Enlaces preparados para álbumes
Las tarjetas de discografía SHALL construir enlaces locale-aware a `/album/[id]` usando la navegación interna del proyecto, sin construir URLs de carátula manualmente.

#### Scenario: Enlace de álbum conserva el locale
- **WHEN** una persona selecciona una tarjeta desde `/es/artist/<id>` o `/en/artist/<id>`
- **THEN** el enlace apunta al detalle del álbum con el mismo locale activo y el id propio del `releaseGroup`

### Requirement: Sección de integrantes y membresías

El perfil SHALL integrar la sección de integrantes para grupos y la sección de grupos para personas, y SHALL NOT combinar la discografía de los grupos asociados con la discografía de una persona: los grupos de una persona se presentan en la franja "También en" de la capability `artist-discography-view`.

#### Scenario: Perfil de grupo con integrantes

- **WHEN** se visita un perfil de tipo `group` con filas `membership`
- **THEN** la página muestra integrantes enlazados y mantiene la discografía del grupo

#### Scenario: Perfil de persona con membresías

- **WHEN** se visita un perfil de tipo `person` con grupos relacionados
- **THEN** la discografía muestra solo los discos de la persona y sus grupos aparecen en la franja "También en", enlazados a sus páginas

### Requirement: Memberships disponibles tras ingesta fría

El perfil de artista SHALL garantizar que las memberships se hayan sincronizado antes de construir la respuesta de un artista frío, y SHALL leerlas desde PostgreSQL después de esa sincronización.

#### Scenario: Perfil frío con relaciones

- **WHEN** una persona visita un artista cuyo `memberships_synced_at` es `NULL`
- **THEN** la aplicación sincroniza las relaciones válidas y muestra integrantes o grupos relacionados en el perfil

#### Scenario: Perfil cacheado

- **WHEN** una persona visita un artista con memberships ya sincronizadas
- **THEN** el perfil no realiza una llamada externa adicional para resolver memberships

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

### Requirement: Opinión sobre el artista como nota, sin rating

La página de artista SHALL NOT ofrecer un control de **rating de estrellas** ni mostrar un
**agregado de estrellas** para el artista. El área de comunidad del artista SHALL limitarse
a notas conversacionales cortas (comentarios), presentadas con encabezado y texto de ayuda
de "nota / contexto / empezá por aquí" — no como reseña ni veredicto. El modelo de datos
SHALL seguir aceptando ratings de artista (no se elimina la capacidad ni los datos
existentes); solo la página deja de exponerlos.

#### Scenario: No hay estrellas en la página de artista

- **WHEN** un usuario autenticado abre la página de un artista
- **THEN** puede dejar una nota corta, pero no encuentra un control de estrellas ni un
  promedio de estrellas del artista

#### Scenario: Un rating de artista anterior no se pierde

- **WHEN** existe en la base un rating de artista creado antes de este cambio
- **THEN** ese dato se conserva intacto aunque la página ya no lo muestre

#### Scenario: Las notas se leen como contexto

- **WHEN** un artista tiene notas de la comunidad
- **THEN** se presentan como notas cortas de contexto ("empezá por aquí"), diferenciadas de
  una reseña con rating

### Requirement: Clasificación del tipo de disco

El sistema SHALL derivar la categoría de un release-group de sus tipos de MusicBrainz así:
`compilation` si entre sus tipos secundarios está `Compilation`; si no, `live_other` si está
`Live`; si no, `studio` cuando el tipo primario es `Album` y no tiene otro tipo secundario que
`Soundtrack`; `single_ep` cuando el tipo primario es `Single` o `EP`; y `live_other` en
cualquier otro caso (incluido un `Album` con `Demo`, `Remix`, `DJ-mix`, `Mixtape/Street`,
`Spokenword`, `Interview`, `Audiobook`, `Audio drama` o `Field recording`). La
misma regla SHALL aplicarse en todas las ingestas y búsquedas, y los discos ya ingeridos SHALL
poder reclasificarse con un script operativo.

#### Scenario: Demo publicado como álbum

- **WHEN** se ingiere un release-group `Album` con el tipo secundario `Demo`
- **THEN** su categoría es `live_other` y la discografía del artista no lo muestra entre los
  álbumes de estudio

#### Scenario: Banda sonora de un artista

- **WHEN** se ingiere un release-group `Album` con el tipo secundario `Soundtrack` (por ejemplo
  *Obscured by Clouds*)
- **THEN** su categoría es `studio` y figura entre los álbumes de estudio del artista

#### Scenario: Álbum de estudio

- **WHEN** se ingiere un release-group `Album` sin tipos secundarios
- **THEN** su categoría es `studio`

#### Scenario: Reclasificación de discos existentes

- **WHEN** se corre el script de reclasificación sobre una base con un demo guardado como
  `studio`
- **THEN** el demo pasa a `live_other` y los discos cuya categoría no cambia no se escriben

