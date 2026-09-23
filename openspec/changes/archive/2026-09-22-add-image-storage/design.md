## Context

Hoy la app no posee ningún archivo de imagen propio: `app_user.avatar_url` y `artist.photo_url` son columnas de texto sin storage backend, sin endpoint de upload y sin procesamiento (`sharp` no es dependencia del proyecto). El único mecanismo de imágenes que funciona es `cover-art-resolution`, que resuelve y hotlinkea URLs externas de CoverArtArchive sin poseer el binario — un patrón deliberadamente distinto al de este change, donde la app sí es dueña del archivo y responsable de subirlo, validarlo, procesarlo, servirlo y eventualmente borrarlo.

El precedente estructural más cercano dentro del repo no es `cover-art-resolution` sino `src/services/email/` (ADR 0014): un servicio con interfaz de transporte, un adaptador de desarrollo y fail-closed en producción cuando no hay proveedor real configurado. Este change sigue ese mismo patrón para el storage.

Este change fue precedido por una discusión de diseño con el usuario que fijó las decisiones estructurales principales (1 a 9), y por una revisión posterior de la propuesta que cerró las decisiones 10 a 16: separación de capas, driver de desarrollo, consistencia ante fallas parciales, generación de la clave, columnas `kind`/`byte_size`, ubicación de los códigos de error y `remotePatterns`. El objetivo de este documento es dejarlas trazables antes de pasar a implementación.

## Goals / Non-Goals

**Goals:**
- Definir una tabla `image` que representa un archivo procesado que la aplicación posee (no un "dueño"; los dueños referencian `image.id` con FK propias, fuera de este change).
- Separar el proveedor de storage (`StorageProvider`: I/O puro) del servicio de imágenes (`imageService`: validación, procesamiento, persistencia y borrado coordinado), de forma que ninguna feature consumidora conozca el bucket/proveedor real.
- Definir el pipeline de validación (formato, tamaño, dimensiones) y procesamiento (normalización a WebP, resize a preset por `kind`) que corre en cada upload.
- Dejar el contrato de presets por `kind` abierto a extensión sin rediseño.
- Que el pipeline sea ejecutable y testeable en desarrollo sin credenciales de ningún proveedor externo, y que falle cerrado en producción si no hay proveedor configurado.
- Definir el orden de operaciones que evita objetos huérfanos y registros sin objeto ante fallas parciales.

**Non-Goals:**
- No se agrega ningún endpoint de upload orientado a usuario final, ni componente de UI, ni ninguna otra ruta HTTP nueva (el driver `local` se apoya en el servido estático de `public/`, no en un route handler).
- No se agregan columnas `*_image_id` a `app_user`, `artist`, `playlist` ni ninguna otra tabla — eso es trabajo de un change posterior por cada consumidor.
- No se modifica `profile-identity` (mantiene su requirement actual de avatar monograma-only).
- No se agregan entradas a `ErrorCodeSchema` (`src/lib/api/schemas.ts`) ni a `docs/04-api/errors.md`: sin ruta HTTP que los devuelva no hay contrato REST que documentar todavía (ver Decisión 15).
- No se implementa una tabla de variantes/múltiples resoluciones por imagen (ver Decisión 5).
- No se implementa moderación de contenido de imágenes subidas (queda para un change futuro si se vuelve necesario).
- No se implementa el job periódico de barrido de huérfanas (se deja como mitigación futura; el cleanup síncrono cubre el caso normal).

## Decisions

**1. Proveedor S3-compatible: Cloudflare R2 (confirmado) en vez de Vercel Blob o BD.**
Aunque el proyecto podría desplegarse en Vercel, Vercel Blob es lock-in de plataforma. R2 usa el mismo SDK que S3 (`@aws-sdk/client-s3`), no cobra egress (relevante porque cada imagen se sirve al navegador), y es portable si el hosting cambia. El `StorageProvider` aísla el proveedor detrás de su contrato, así que cambiar de R2 a S3 real más adelante no debería tocar ningún consumidor.

**2. Guardar solo `storage_key`, resolver la URL en el servicio.**
`image.storage_key` no es una URL completa; `resolveUrl()` la construye en runtime. Esto permite cambiar de dominio/CDN sin migrar datos, y evita que las URLs públicas queden hardcodeadas en la base. También es lo que permite que el mismo registro `image` resuelva a `/uploads/...` en desarrollo y al dominio público del bucket en producción.

**3. Procesar al subir; no conservar el original.**
El upload siempre pasa por `sharp`: se valida y luego se reencodea a WebP + resize al preset del `kind`. El archivo original nunca se persiste. Esto limita el storage a tamaños conocidos y cierra la superficie de ataque de archivos disfrazados de imagen (un JPEG válido de 50MB no tiene motivo para vivir en el bucket si el caso de uso es un avatar de 256px).

**4. `image` como archivo, no como "dueño" — FK real por entidad, no polimórfica.**
Se descartó `image.owner_type` / `image.owner_id` (asociación polimórfica) porque Postgres no puede validarla con FK real. En su lugar, cada entidad consumidora futura tendrá su propia columna `*_image_id → image.id` (ej. `app_user.avatar_image_id`, `artist.photo_image_id`, `playlist.cover_image_id`), lo que da integridad referencial real. Esas columnas están fuera de este change; aquí solo se define `image` y el servicio. Ver "Guía para consumidores futuros" para el comportamiento esperado de esas FK.

**5. Sin tabla de variantes en v1 — una fila `image` = una resolución.**
Cada `kind` genera un único tamaño, elegido como el mayor que ese `kind` necesita en cualquier contexto de UI conocido hoy (ej. avatar → 256px). Contextos más chicos (thumbnails en listas) se resuelven con downscale de `next/image`, que no tiene costo perceptible de calidad. Mismo patrón que ya usa `cover-art-resolution` (solo 250px, sin variantes). Si en el futuro aparece un caso real de art direction por breakpoint (no solo downscale), se evaluará agregar una tabla `image_variant` hija de `image` — nunca convertir cada tamaño en su propia fila `image`, para no romper la semántica "una `image` = un archivo que la app posee".

**6. Formatos de entrada: JPEG, PNG, WebP, AVIF. SVG rechazado.**
Un SVG puede contener `<script>`/`foreignObject` y es un vector de XSS conocido si se sirve sin sanitizar; sanitizarlo no se justifica para el caso de uso actual (fotos/avatares). La salida siempre se normaliza a WebP sin importar el formato de entrada.

**7. Validación de dimensiones vía metadata antes de decodificar el pixel data completo.**
Un archivo pequeño puede decodificar a un bitmap enorme (decompression bomb) y agotar memoria al procesarlo. `sharp(buffer).metadata()` se lee primero para rechazar por dimensiones antes de que el pipeline intente decodificar/redimensionar.

**8. Upload mediado por servidor, no upload directo a bucket con URL prefirmada.**
El cliente envía los bytes a una ruta de la app, que corre validación + `sharp` + `provider.put()`. Esto garantiza que ningún archivo llega al bucket sin pasar por el pipeline de validación/normalización. Se documenta como decisión de v1; una ruta con URL prefirmada queda como posible optimización futura si el volumen lo justifica.

**9. Cleanup síncrono en el flujo del consumidor, sin job de barrido en esta fase.**
El primitivo `deleteImage()` existe en el servicio; la disciplina de "desasociar y borrar en el mismo flujo" es responsabilidad del código consumidor (change futuro). Un job periódico de red de seguridad queda anotado como mitigación futura, no como parte de este change.

**10. Dos capas: `StorageProvider` (I/O) e `imageService` (dominio).**
`StorageProvider` expone `put(key, body, contentType)`, `delete(key)` y `publicUrl(key)`, y no sabe nada de la tabla `image`. El `imageService` orquesta validar → procesar → `put()` → `INSERT`, y `deleteImage()` → `delete()` → `DELETE`. Si el alta y la baja vivieran dentro del provider, cada proveedor nuevo tendría que reimplementar la lógica de base de datos, y los tests no podrían mockear solo el I/O. Los consumidores solo conocen el `imageService`.

**11. Driver seleccionable por entorno, con adaptador `local` y fail-closed en producción.**
`STORAGE_DRIVER=local` escribe en `public/uploads/` (gitignored) y `publicUrl()` devuelve `/uploads/<key>`: Next lo sirve estáticamente, así que el pipeline completo es ejecutable y testeable en desarrollo sin credenciales ni ruta HTTP nueva. `STORAGE_DRIVER=s3` usa el proveedor S3-compatible. Como en `getEmailTransport()`, el driver `local` solo se permite fuera de producción: en producción, sin proveedor real configurado, el servicio lanza `STORAGE_CONFIG_MISSING` en vez de escribir en el filesystem efímero del host. Se descartó exigir credenciales reales o levantar MinIO para desarrollar, que sube el costo de entrada del repo sin ganar nada.

**12. Orden de operaciones y compensación ante fallas parciales.**
Son dos escrituras en sistemas distintos, sin transacción común, así que el orden se elige para que la falla parcial caiga siempre del lado recuperable:
- Alta: `put()` primero, `INSERT` después. Si el `INSERT` falla, se intenta borrar el objeto recién subido (compensación) y se propaga el error; si esa compensación también falla, queda un objeto huérfano sin fila — invisible para la app y recuperable por un barrido futuro.
- Baja: `delete()` del objeto primero, `DELETE` de la fila después. Si falla el borrado del objeto, la fila sobrevive y el borrado es reintentable; al revés quedaría un objeto huérfano sin ningún rastro en la base.
Nunca se acepta el estado inverso (fila sin objeto), porque ese sí rompe la UI del consumidor.

**13. `storage_key` derivada server-side, nunca del nombre de archivo del cliente.**
La clave es `{kind}/{uuid}.webp`, generada por el servicio. El nombre original que envíe el cliente no participa: evita path traversal en la clave, colisiones entre usuarios y claves adivinables o enumerables. `storage_key` es `UNIQUE` en la tabla como red de seguridad.

**14. Persistir `kind` y `byte_size` en la tabla `image`.**
Sin `kind` no hay forma de saber con qué preset se generó una fila: si mañana el preset de `avatar` pasa de 256 a 320, no se puede identificar qué reprocesar, ni auditar, ni limpiar por tipo. `byte_size` queda para auditoría y para cuotas por usuario si aparecen. Ambas son gratis ahora y requerirían una migración con backfill imposible si se agregan después. `mime_type` es constante (`image/webp`) mientras la normalización sea forzada; se persiste igual para no tener que migrar si en el futuro se admite otro formato de salida (ej. AVIF).

**15. Códigos de error propios del servicio, no entradas nuevas en `ErrorCodeSchema`.**
`ErrorCode` es un `z.enum` de `src/lib/api/schemas.ts` que el cliente HTTP valida en cada respuesta: es el contrato REST, y este change no expone ninguna ruta. Los rechazos se modelan como `StorageError` con un `readonly code` estable (formato no soportado, tamaño excedido, dimensiones excedidas, dimensiones insuficientes, `kind` desconocido, configuración ausente), igual que `EmailConfigError` en `src/services/email/index.ts`. El change que exponga la primera ruta traduce esos códigos a `ApiError`, los suma a `ErrorCodeSchema` y los documenta en `docs/04-api/errors.md` — recién ahí existe un contrato que documentar.

**16. `images.remotePatterns` alimentado desde el entorno en este change.**
La decisión 5 depende de que `next/image` pueda hacer downscale del original; sin el hostname del storage en `remotePatterns`, nada de lo que devuelve `resolveUrl()` se puede renderizar. Se agrega acá, derivando el hostname de la variable de entorno del dominio público, para que el primer consumidor no tenga que tocar configuración de Next. Con el driver `local` la URL es relativa al propio origen, así que no requiere patrón alguno.

**17. Límites de entrada: 10 MB de archivo y 8192×8192 píxeles.**
El tamaño de archivo es el freno real del abuso; el límite por lado existe para acotar la memoria de decodificación (8192×8192 ≈ 67 MP ≈ 268 MB de bitmap en el peor caso, rechazado por metadata antes de decodificar). Se descartó 4096×4096 porque rechazaría fotos de celulares recientes (un sensor de 48 MP produce ~8000×6000) por un motivo que el usuario no puede entender ni corregir, siendo que el resultado se redimensiona a 256px de todos modos. Mínimo por `kind`: `avatar` exige al menos 128×128, para no aceptar una imagen que se vería peor que el monograma. Los tres valores viven en `src/lib/config/` como fuente única.

## Guía para consumidores futuros

Estas reglas no se implementan en este change, pero forman parte del contrato que hereda cada consumidor:

- La columna `*_image_id` referencia `image(id)` con `ON DELETE SET NULL`: borrar una imagen todavía referenciada no debe fallar por integridad referencial ni arrastrar la fila dueña. El proyecto ya tuvo un incidente con una FK `RESTRICT` bloqueando un borrado legítimo (auditoría de moderación en `rework-account-settings`).
- El orden correcto al reemplazar o quitar una imagen es **desasociar primero** (poner la FK en `NULL`) y **después** llamar a `deleteImage()`; nunca borrar la fila `image` con SQL propio, porque eso saltea el borrado del objeto.
- Ningún consumidor construye URLs de storage: siempre `resolveUrl()`.

## Risks / Trade-offs

- **Sin tabla de variantes** → si aparece un caso real de responsive art-direction, requiere una migración adicional (`image_variant`). Mitigación: el diseño de `image` ya es forward-compatible con esa extensión sin romper las FK de los consumidores.
- **Decompression bombs / archivos maliciosos disfrazados de imagen** → mitigado por validación de metadata antes de decodificar y por límites de tamaño/dimensiones aplicados server-side antes de tocar `sharp` con el buffer completo.
- **`sharp` es un módulo nativo** → impacta el bundling del servidor (puede necesitar quedar fuera del bundle vía `serverExternalPackages`), el tamaño del artefacto de deploy y el tiempo de `pnpm install` en CI. Además, los tests que lo ejerciten corren bajo el `environment: "jsdom"` global de `vitest.config.ts` y conviene marcarlos `// @vitest-environment node`. Se acepta porque es la única opción realista de procesamiento de imágenes en Node y Next ya la usa para su propio optimizador en producción.
- **Huérfanas por compensación fallida o por un consumidor que no implemente el cleanup** → mitigado por el orden de operaciones de la decisión 12 y por el contrato (`deleteImage()` siempre borra objeto + fila), pero sin un job de barrido en esta fase queda como deuda conocida.
- **Driver `local` escribiendo dentro de `public/`** → los archivos quedan servidos estáticamente sin control de acceso y sobreviven entre reinicios del dev server. Es aceptable para desarrollo (el caso de uso es público de todos modos) y está bloqueado en producción por el fail-closed de la decisión 11; `public/uploads/` va al `.gitignore` para que no se commiteen fixtures.
- **R2 fuera del ecosistema nativo de Vercel** → agrega credenciales/env vars propias y una llamada de red adicional en el upload; se acepta a cambio de evitar lock-in y costo de egress.
- **Normalización forzada a WebP** → un consumidor que necesite preservar el formato original (poco probable dado el caso de uso) no podría hacerlo sin un cambio de diseño; se acepta porque no hay caso de uso conocido que lo requiera hoy.

## Migration Plan

1. Agregar dependencias: `sharp`, `@aws-sdk/client-s3` (o el SDK del proveedor elegido).
2. Agregar la migración SQL a mano para la tabla `image` (no toca tablas existentes) y su espejo en `src/db/schema.ts`.
3. Documentar las nuevas variables de entorno (`STORAGE_DRIVER`, endpoint, bucket, credenciales, dominio público) en `.env.example`; agregar `public/uploads/` al `.gitignore`.
4. Implementar `src/services/storage/`: `StorageProvider` (drivers `local` y S3-compatible) e `imageService` con el pipeline de validación/procesamiento.
5. Agregar el `remotePattern` derivado del dominio público en `next.config.mjs`.
6. Registrar el ADR nuevo y actualizar `docs/03-data/sql-model.md` y el índice de ADRs de `docs/README.md`.
7. Sin datos existentes que migrar (no hay consumidores todavía) y sin cambios de comportamiento visibles para el usuario final.

**Rollback**: al no tener consumidores conectados, revertir es trivial — eliminar la tabla `image`, el servicio, el `remotePattern` y las dependencias nuevas sin efectos secundarios. El ADR no se revierte: si la decisión cambia, se agrega uno nuevo que lo supersede (ADR 0006).

## Open Questions

Ninguna pendiente. Las dos que quedaron abiertas al proponer el change se cerraron en la revisión:

- **Proveedor de storage** → Cloudflare R2, confirmado (Decisión 1). Queda como tarea operativa crear la cuenta y el bucket antes de poder ejercitar el driver `s3` end-to-end, pero no es una decisión de diseño pendiente.
- **Valores de los límites** → 10 MB de archivo, 8192×8192 máximo, `avatar` con mínimo 128×128 (Decisión 17). La spec los sigue tratando como "configurados" para no volverlos normativos: cambiarlos es editar `src/lib/config/`, no reescribir un requirement.
