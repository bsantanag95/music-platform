# ADR 0017 — Imágenes propias de la aplicación y proveedor de storage

## Estado

Aceptado

## Contexto

La aplicación no poseía ningún archivo de imagen propio: `app_user.avatar_url` y `artist.photo_url`
eran columnas de texto sin storage backend, sin endpoint de upload y sin procesamiento. El único
mecanismo de imágenes que funcionaba era `cover-art-resolution`, que resuelve y hotlinkea URLs
externas de Cover Art Archive sin poseer el binario — un patrón deliberadamente distinto al de este
ADR, donde la app sí es dueña del archivo y responsable de subirlo, validarlo, procesarlo, servirlo
y eventualmente borrarlo.

Cada feature futura que necesitara una imagen propia (avatar, foto de artista, portada de playlist,
banner) habría terminado reinventando su propio mecanismo de storage si no se resolvía una vez, de
forma genérica, ahora.

## Decisión

- **La app posee el binario.** A diferencia de `cover-art-resolution` (que hotlinkea URLs externas),
  las imágenes propias se suben, validan, procesan y almacenan en un proveedor controlado. El
  original nunca se conserva: todo upload pasa por `sharp` y se normaliza a WebP.

- **Proveedor S3-compatible (Cloudflare R2).** Se descartó Vercel Blob (lock-in de plataforma) y
  guardar en la base de datos. R2 usa el mismo SDK que S3 (`@aws-sdk/client-s3`), no cobra egress
  (relevante porque cada imagen se sirve al navegador), y es portable si el hosting cambia. El
  `StorageProvider` aísla el proveedor detrás de su contrato.

- **Driver de desarrollo con fail-closed en producción.** `STORAGE_DRIVER=local` escribe en
  `public/uploads/` (servido estáticamente por Next) y permite ejercitar el pipeline completo sin
  credenciales. En producción, sin un proveedor real configurado, el servicio falla cerrado con
  `STORAGE_CONFIG_MISSING` (mismo patrón que `EmailConfigError` en ADR 0014).

- **Normalización forzada sin conservar el original.** Todo upload se reencodea a WebP y se
  redimensiona al preset del `kind` solicitado. El archivo original nunca se persiste: limita el
  storage a tamaños conocidos y cierra la superficie de ataque de archivos disfrazados de imagen.

- **Separación `StorageProvider` / servicio de imágenes.** `StorageProvider` expone `put()`,
  `delete()` y `publicUrl()`, y no sabe nada de la tabla `image`. El `imageService` orquesta
  validar → procesar → `put()` → `INSERT`, y `deleteImage()` → `delete()` → `DELETE`. Cambiar de
  proveedor implementa una interfaz; la lógica de base de datos no se toca.

- **`storage_key` derivada server-side.** La clave es `{kind}/{uuid}.webp`, generada por el
  servicio. El nombre original que envíe el cliente no participa: evita path traversal, colisiones
  y claves adivinables.

- **Validación de dimensiones vía metadata antes de decodificar.** `sharp(buffer).metadata()` se
  lee primero para rechazar por dimensiones antes de que el pipeline intente decodificar/redimensionar
  (previene decompression bombs).

- **Orden de operaciones definido.** Alta: `put()` primero, `INSERT` después; si el `INSERT` falla,
  se intenta borrar el objeto recién subido (compensación). Baja: `delete()` del objeto primero,
  `DELETE` de la fila después; si falla el borrado del objeto, la fila sobrevive y el borrado es
  reintentable. Nunca se acepta el estado inverso (fila sin objeto).

- **Códigos de error propios del servicio, no entradas nuevas en `ErrorCodeSchema`.** Los rechazos
  se modelan como `StorageError` con un `readonly code` estable. Sin ruta HTTP que los devuelva, no
  hay contrato REST que documentar todavía. El change que exponga la primera ruta traduce esos
  códigos a `ApiError`.

## Consecuencias

- Nuevas dependencias: `sharp` (módulo nativo) y `@aws-sdk/client-s3`.
- Nuevas variables de entorno: `STORAGE_DRIVER`, `STORAGE_S3_*`, `STORAGE_PUBLIC_DOMAIN`.
- Nueva tabla `image` (migración 0044); no toca tablas existentes.
- `next.config.mjs` alimenta `images.remotePatterns` con el hostname del storage leído del entorno.
- Sin consumidores conectados todavía: no hay cambio de comportamiento visible para el usuario
  final. Conectar un primer consumidor (ej. avatar) es un change posterior.

## Guía para consumidores futuros

Estas reglas no se implementan en este change, pero forman parte del contrato que hereda cada
consumidor:

- La columna `*_image_id` referencia `image(id)` con `ON DELETE SET NULL`: borrar una imagen
  todavía referenciada no debe fallar por integridad referencial ni arrastrar la fila dueña.
- El orden correcto al reemplazar o quitar una imagen es **desasociar primero** (poner la FK en
  `NULL`) y **después** llamar a `deleteImage()`; nunca borrar la fila `image` con SQL propio,
  porque eso saltea el borrado del objeto.
- Ningún consumidor construye URLs de storage: siempre `resolveUrl()`.
