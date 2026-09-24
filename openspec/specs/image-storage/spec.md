# image-storage Specification

## Purpose

Gestión del ciclo de vida de las imágenes propias de la aplicación: registro en la tabla `image`, proveedor de storage intercambiable (driver local para desarrollo y S3-compatible para producción) separado del servicio de imágenes, validación de formato, tamaño y dimensiones, normalización a WebP con presets por `kind`, generación de la clave de storage en el servidor, resolución de URL y borrado coordinado de objeto y registro. Cambio add-image-storage.

## Requirements

### Requirement: Registro de imágenes propias
El sistema SHALL representar cada imagen procesada que la aplicación posee mediante un registro en la tabla `image`, con al menos `id`, `storage_key`, `kind`, `mime_type`, `width`, `height`, `byte_size` y `created_at`. Un registro `image` representa un único archivo en una única resolución; el sistema SHALL NOT almacenar el archivo original recibido en el upload.

#### Scenario: Registro creado tras un upload exitoso
- **WHEN** un archivo válido termina de procesarse por el pipeline de validación y normalización
- **THEN** el sistema crea un registro `image` con el `storage_key` del objeto resultante, el `kind` solicitado, su `mime_type` normalizado, `width`/`height`/`byte_size` finales y `created_at`

#### Scenario: El original no se persiste
- **WHEN** un archivo válido es procesado y normalizado a WebP
- **THEN** el sistema no conserva el buffer/archivo original en ningún storage, solo la versión procesada referenciada por `storage_key`

#### Scenario: El kind queda registrado para reprocesamiento futuro
- **WHEN** se consulta un registro `image` existente
- **THEN** el registro indica con qué `kind` fue generado, sin necesidad de inferirlo de sus dimensiones ni de la entidad que lo referencia

### Requirement: Generación de la clave de storage
El sistema SHALL derivar el `storage_key` de cada imagen íntegramente del lado del servidor, a partir del `kind` y de un identificador generado por el sistema. El sistema SHALL NOT usar el nombre de archivo, la ruta ni ningún otro dato provisto por el cliente para construir la clave. El `storage_key` SHALL ser único entre todos los registros `image`.

#### Scenario: Clave derivada del servidor
- **WHEN** se sube un archivo válido para un `kind` dado
- **THEN** el `storage_key` resultante queda determinado por el servidor y no contiene el nombre de archivo original

#### Scenario: Nombre de archivo del cliente ignorado
- **WHEN** el cliente envía un archivo cuyo nombre incluye separadores de ruta o secuencias de traversal
- **THEN** el objeto se almacena bajo la clave derivada por el servidor, sin que el nombre recibido altere la ubicación del objeto

### Requirement: Validación de formato de entrada
El sistema SHALL aceptar únicamente archivos de entrada en formato JPEG, PNG, WebP o AVIF para el pipeline de imágenes propias. El sistema SHALL rechazar cualquier otro formato, incluyendo SVG.

#### Scenario: Formato soportado aceptado
- **WHEN** se recibe un archivo JPEG, PNG, WebP o AVIF válido
- **THEN** el sistema continúa el pipeline de validación de límites y procesamiento

#### Scenario: SVG rechazado explícitamente
- **WHEN** se recibe un archivo SVG
- **THEN** el sistema rechaza el archivo sin procesarlo y sin crear un registro `image`

#### Scenario: Formato no soportado rechazado
- **WHEN** se recibe un archivo cuyo formato no está en la lista soportada (ej. GIF, BMP, PDF)
- **THEN** el sistema rechaza el archivo sin procesarlo y sin crear un registro `image`

### Requirement: Límites de tamaño y dimensiones
El sistema SHALL rechazar archivos que excedan un tamaño máximo configurado o cuyas dimensiones excedan un máximo configurado, y SHALL rechazar archivos cuyas dimensiones sean menores a un mínimo configurado cuando el `kind` lo requiera. El sistema SHALL leer las dimensiones desde la metadata del archivo antes de decodificar el contenido completo de píxeles, para evitar procesar archivos que decodifiquen a bitmaps desproporcionadamente grandes respecto a su tamaño en disco.

#### Scenario: Rechazo por tamaño de archivo excedido
- **WHEN** se recibe un archivo que supera el tamaño máximo permitido
- **THEN** el sistema rechaza el archivo antes de iniciar cualquier procesamiento de imagen

#### Scenario: Rechazo por dimensiones excedidas detectado vía metadata
- **WHEN** la metadata del archivo reporta dimensiones que superan el máximo permitido
- **THEN** el sistema rechaza el archivo sin decodificar el contenido completo de píxeles

#### Scenario: Rechazo por dimensiones menores al mínimo del kind
- **WHEN** se recibe un archivo válido cuyas dimensiones son menores al mínimo definido para el `kind` solicitado
- **THEN** el sistema rechaza el archivo indicando que las dimensiones son insuficientes, sin intentar upscalear

### Requirement: Procesamiento y normalización
El sistema SHALL reencodear todo archivo aceptado a formato WebP y SHALL redimensionarlo al tamaño definido por el preset del `kind` solicitado antes de subirlo al storage.

#### Scenario: Imagen normalizada a WebP y redimensionada
- **WHEN** un archivo válido en cualquier formato soportado termina el pipeline de procesamiento
- **THEN** el objeto resultante en storage está en formato WebP y sus dimensiones coinciden con el preset del `kind` solicitado

### Requirement: Presets por kind extensibles
El sistema SHALL resolver el tamaño objetivo del procesamiento a partir de un `kind` provisto en la solicitud de upload, usando una tabla de presets extensible. El sistema SHALL rechazar solicitudes cuyo `kind` no tenga un preset definido.

#### Scenario: Preset conocido aplicado
- **WHEN** se solicita un upload con un `kind` que tiene preset definido (ej. `avatar`)
- **THEN** el sistema redimensiona el resultado al tamaño configurado para ese `kind`

#### Scenario: Kind desconocido rechazado
- **WHEN** se solicita un upload con un `kind` sin preset definido
- **THEN** el sistema rechaza la solicitud sin procesar el archivo ni escribir en el storage

### Requirement: Proveedor de storage intercambiable con adaptador de desarrollo
El sistema SHALL acceder al storage a través de un contrato de proveedor (`put`, `delete`, `publicUrl`) independiente de la persistencia del registro `image`, de modo que agregar o cambiar un proveedor no requiera modificar la lógica de base de datos ni el código consumidor. El sistema SHALL ofrecer un adaptador de desarrollo utilizable sin credenciales de ningún proveedor externo, y SHALL NOT permitir ese adaptador en producción: sin un proveedor real configurado, el sistema SHALL fallar cerrado en vez de aceptar el archivo.

#### Scenario: Pipeline ejecutable en desarrollo sin credenciales
- **WHEN** el entorno no es de producción y el driver de desarrollo está seleccionado
- **THEN** el pipeline completo de validación, procesamiento, almacenamiento y registro funciona sin credenciales de un proveedor externo, y la URL resuelta es servible por la propia aplicación

#### Scenario: Producción sin proveedor configurado falla cerrado
- **WHEN** el entorno es de producción y no hay un proveedor de storage real configurado
- **THEN** el sistema rechaza la operación señalando configuración ausente, sin escribir el archivo en el filesystem del host ni crear un registro `image`

### Requirement: Resolución de URL desacoplada del proveedor
El sistema SHALL exponer una función `resolveUrl()` en el servicio de imágenes que construya la URL pública de una imagen a partir de su `storage_key`, de forma que ningún código consumidor construya URLs de storage directamente ni dependa del proveedor o dominio subyacente.

#### Scenario: URL resuelta a partir de storage_key
- **WHEN** un consumidor solicita la URL pública de un registro `image` a través de `resolveUrl()`
- **THEN** el sistema retorna una URL válida sin que el consumidor haya construido o conocido la ruta del bucket/proveedor

#### Scenario: La URL resuelta es renderizable por el optimizador de imágenes
- **WHEN** el proveedor configurado sirve las imágenes desde un dominio externo
- **THEN** ese dominio está habilitado en la configuración de imágenes remotas de la aplicación, de modo que un consumidor pueda renderizar la URL resuelta sin cambiar esa configuración

### Requirement: Eliminación coordinada de imagen y objeto de storage
El sistema SHALL exponer una función de borrado en el servicio de imágenes que elimine tanto el registro `image` en base de datos como el objeto correspondiente en el proveedor de storage, de forma que un consumidor no pueda borrar uno sin el otro a través del contrato del servicio. El sistema SHALL eliminar primero el objeto del storage y después el registro, de modo que una falla parcial deje un borrado reintentable y nunca un objeto sin registro que lo referencie.

#### Scenario: Borrado elimina registro y objeto
- **WHEN** un consumidor invoca el borrado sobre un registro `image` existente
- **THEN** el sistema elimina el objeto del proveedor de storage y elimina el registro `image` correspondiente

#### Scenario: Falla al borrar el objeto conserva el registro
- **WHEN** el borrado del objeto en el proveedor falla
- **THEN** el sistema conserva el registro `image` y propaga el error, de modo que la operación pueda reintentarse sin perder la referencia al objeto

### Requirement: Consistencia ante una falla parcial del alta
El sistema SHALL subir el objeto procesado antes de crear el registro `image`, y SHALL intentar eliminar ese objeto si la creación del registro falla, de modo que una falla parcial nunca deje un registro `image` cuyo objeto no exista.

#### Scenario: Falla al registrar compensa borrando el objeto
- **WHEN** el objeto procesado ya se subió al proveedor y la creación del registro `image` falla
- **THEN** el sistema intenta eliminar el objeto recién subido y propaga el error, sin dejar un registro `image` a medio crear

#### Scenario: Ningún registro apunta a un objeto inexistente
- **WHEN** cualquier operación de alta termina con error
- **THEN** no queda ningún registro `image` cuyo `storage_key` no corresponda a un objeto existente en el proveedor

### Requirement: Motivos de rechazo identificables
El sistema SHALL señalar cada rechazo del pipeline con un código estable y específico del motivo (formato no soportado, tamaño excedido, dimensiones excedidas, dimensiones insuficientes, `kind` desconocido, configuración de storage ausente), consumible por el código llamador sin interpretar el mensaje de error. Ese código SHALL pertenecer al servicio de imágenes; mientras no exista una ruta HTTP que exponga estas operaciones, el sistema SHALL NOT incorporarlo al contrato de errores de la API.

#### Scenario: Rechazo distinguible por motivo
- **WHEN** el pipeline rechaza un archivo por cualquiera de los motivos previstos
- **THEN** el llamador puede distinguir el motivo por un código estable, sin parsear el texto del mensaje

#### Scenario: El contrato REST no cambia
- **WHEN** se agregan los códigos de rechazo del servicio de imágenes
- **THEN** el conjunto de códigos de error de la API pública queda sin cambios, porque ninguna ruta expone todavía estas operaciones
