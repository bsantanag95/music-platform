## ADDED Requirements

### Requirement: Habilitación condicionada del espejo
El sistema SHALL espejar carátulas únicamente cuando haya un proveedor de storage configurado **y**
un contacto de retiro de carátulas configurado (`COVER_ART_TAKEDOWN_EMAIL`). Si falta cualquiera de
los dos, el sistema SHALL resolver las carátulas como URLs de Cover Art Archive (hotlink), sin error
y sin alojar copias.

#### Scenario: Espejo habilitado
- **WHEN** hay storage configurado y `COVER_ART_TAKEDOWN_EMAIL` tiene valor
- **THEN** una carátula resuelta por primera vez se sirve desde el storage propio

#### Scenario: Sin contacto de retiro
- **WHEN** hay storage configurado pero `COVER_ART_TAKEDOWN_EMAIL` no tiene valor
- **THEN** la carátula se resuelve como URL de Cover Art Archive y no se sube ninguna copia al storage

#### Scenario: Sin storage configurado
- **WHEN** no hay un proveedor de storage configurado
- **THEN** la carátula se resuelve como URL de Cover Art Archive sin error

### Requirement: Solo la miniatura de baja resolución
El espejo SHALL descargar exclusivamente la miniatura `front-250` del release-group desde Cover Art
Archive y SHALL almacenarla en formato WebP con un ancho y un alto de como máximo 250 px,
conservando su proporción y sin ampliarla. El sistema SHALL NOT descargar ni almacenar ninguna
otra resolución o variante.

#### Scenario: Carátula espejada en baja resolución
- **WHEN** el sistema espeja la carátula de un release-group
- **THEN** el objeto almacenado es un WebP cuyo lado mayor mide como máximo 250 px, derivado de `front-250`

### Requirement: Clave versionada por contenido y caché inmutable
El sistema SHALL almacenar cada carátula espejada bajo una clave derivada del MBID del
release-group y de un hash de su contenido, SHALL servirla con una política de caché inmutable de
larga duración, y SHALL registrar la clave en `release_group.cover_storage_key` y la URL servible en
`release_group.cover_thumb_url`.

#### Scenario: Registro tras espejar
- **WHEN** una carátula se espeja con éxito
- **THEN** `cover_storage_key` contiene la clave del objeto, `cover_thumb_url` contiene su URL pública y la respuesta del objeto declara caché inmutable

#### Scenario: Espejado concurrente del mismo álbum
- **WHEN** dos solicitudes espejan a la vez la misma carátula sin cambios en la fuente
- **THEN** ambas producen la misma clave y el resultado final es un único objeto y una fila consistente

### Requirement: Fallback ante falla del espejo
Si la carátula existe en Cover Art Archive pero no se puede almacenar en el storage, el sistema
SHALL guardar y devolver la URL de Cover Art Archive, de modo que la carátula se siga mostrando, y
el release-group SHALL quedar como candidato del backfill.

#### Scenario: Falla la subida al storage
- **WHEN** la descarga desde Cover Art Archive tiene éxito pero la subida al storage falla
- **THEN** el sistema devuelve la URL de Cover Art Archive y `cover_storage_key` queda nulo

### Requirement: Espejo diferido en el render del detalle de álbum
Al renderizar en el servidor el detalle de un álbum cuya carátula no está resuelta, el sistema
SHALL NOT bloquear el render más de lo que tarda verificar la existencia de la carátula, y SHALL
diferir la descarga y el espejo hasta después de enviar la respuesta.

#### Scenario: Primera vista de un álbum con carátula
- **WHEN** se renderiza por primera vez el detalle de un álbum con carátula en Cover Art Archive y el espejo está habilitado
- **THEN** la página se renderiza con la URL de Cover Art Archive y, tras la respuesta, la carátula se espeja, de modo que la siguiente vista usa la URL del storage propio

### Requirement: El espejo sigue a la fuente
El sistema SHALL ofrecer un proceso de revalidación que vuelva a consultar Cover Art Archive para
las carátulas espejadas cuya última verificación concluyente sea anterior a un umbral configurable
o no esté registrada. Si la fuente ya no tiene la
carátula, SHALL borrar la copia y dejar el release-group sin carátula. Si la fuente cambió, SHALL
reemplazar la copia por la nueva y borrar la anterior. Ante errores transitorios, SHALL NOT
modificar nada.

#### Scenario: La fuente retiró la carátula
- **WHEN** la revalidación recibe `404` de Cover Art Archive para una carátula espejada
- **THEN** el objeto se borra del storage y `cover_thumb_url` y `cover_storage_key` quedan nulos

#### Scenario: La fuente cambió la carátula
- **WHEN** la revalidación descarga un contenido con hash distinto al espejado
- **THEN** se almacena bajo una clave nueva, la fila apunta a la nueva y el objeto anterior se borra

#### Scenario: Error transitorio en la revalidación
- **WHEN** Cover Art Archive responde con error de servidor o la red falla durante la revalidación
- **THEN** la copia y la fila quedan sin cambios

### Requirement: Retiro de una carátula a pedido
El sistema SHALL ofrecer un procedimiento operativo para retirar la carátula de un release-group
que borre la copia del storage, deje la carátula nula y registre la marca `cover_blocked_at`. Un
release-group marcado SHALL NOT volver a resolverse, espejarse ni mostrarse por hotlink, y SHALL
mostrarse con el placeholder de álbum sin carátula.

#### Scenario: Retiro de una carátula espejada
- **WHEN** se ejecuta el retiro sobre un release-group con carátula espejada
- **THEN** el objeto se borra, `cover_thumb_url` y `cover_storage_key` quedan nulos y `cover_blocked_at` queda registrado

#### Scenario: Un álbum retirado no se vuelve a resolver
- **WHEN** se solicita la carátula de un release-group con `cover_blocked_at`
- **THEN** el sistema devuelve `null` sin consultar Cover Art Archive y la interfaz muestra el placeholder

### Requirement: Backfill y reversión del espejo
El sistema SHALL ofrecer un proceso de backfill que espeje las carátulas ya resueltas como URL de
Cover Art Archive, con concurrencia limitada y un límite de filas por ejecución. SHALL permitir
regenerar las URLs servibles desde `cover_storage_key` y SHALL permitir revertir todas las filas
espejadas a URLs de Cover Art Archive.

#### Scenario: Backfill de carátulas existentes
- **WHEN** se ejecuta el backfill con el espejo habilitado
- **THEN** las filas cuya `cover_thumb_url` apunta a Cover Art Archive pasan a apuntar al storage propio, sin superar la concurrencia configurada

#### Scenario: Regenerar URLs tras cambiar el dominio público
- **WHEN** se ejecuta el backfill en modo de regeneración de URLs
- **THEN** cada fila con `cover_storage_key` recibe la URL pública calculada desde su clave

#### Scenario: Revertir el espejo
- **WHEN** se ejecuta el backfill en modo reversión
- **THEN** cada fila espejada vuelve a una URL de Cover Art Archive construida desde su MBID

### Requirement: Optimización de imágenes por defecto con salteo solo para fuentes preprocesadas
El sistema SHALL servir las imágenes renderizadas a través del optimizador de imágenes de la
aplicación por defecto. SHALL servir sin re-optimizar solo las imágenes cuyo origen sea el storage
propio, cuyo contenido ya fue procesado a su tamaño final. La decisión SHALL depender únicamente
del origen de la imagen y SHALL NOT poder sobrescribirla el componente que la renderiza.

#### Scenario: Carátula espejada servida directo
- **WHEN** se renderiza una carátula cuya URL pertenece al storage propio
- **THEN** la imagen se solicita directamente al storage, sin pasar por el optimizador

#### Scenario: Carátula en hotlink optimizada
- **WHEN** se renderiza una carátula cuya URL es de Cover Art Archive
- **THEN** la imagen se sirve a través del optimizador de la aplicación

#### Scenario: Fuente no prevista optimizada
- **WHEN** se renderiza una imagen de un origen que no es el storage propio
- **THEN** la imagen se sirve a través del optimizador, aunque ese origen no haya sido contemplado explícitamente

### Requirement: Sin exposición de las carátulas como colección
El sistema SHALL NOT exponer ningún endpoint ni superficie que liste, enumere o permita descargar
en bloque las carátulas espejadas. Las carátulas SHALL servirse solo por su URL exacta, en el
contexto de su álbum.

#### Scenario: No hay listado de carátulas
- **WHEN** se inspeccionan las rutas de la API
- **THEN** ninguna devuelve un listado de claves o URLs de carátulas desvinculado de sus álbumes
