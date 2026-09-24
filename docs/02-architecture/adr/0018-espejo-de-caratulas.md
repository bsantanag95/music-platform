# ADR 0018 — Espejo propio de carátulas de Cover Art Archive

## Estado

Aceptado

## Contexto

La carga de carátulas era lenta, sobre todo en páginas densas (grilla de artista, muro de
portadas de Inicio, listas). La causa es estructural: cada miniatura de Cover Art Archive (CAA)
atraviesa tres hosts.

**Medición (2026-09-23, carátula popular, tres corridas):**

- `coverartarchive.org/release-group/{mbid}/front-250` → `307` (~0,8 s)
- `archive.org/download/...` → `302` (~0,7 s)
- `dnXXXX.ca.archive.org/...` → `200` (~1 s, 8,7 KB)

Total: **2,5–3 s en frío** por carátula de 8,7 KB. El host final no envía `Cache-Control` ni
`Expires`, así que el optimizador de `next/image` (con `minimumCacheTTL` de 60 s) volvía a la
fuente cada minuto, y cada ancho del `srcset` era una entrada de caché distinta. Además, la grilla
de artista resolvía cada carátula en cascada desde el cliente, y los álbumes sin carátula repetían
un `HEAD` a CAA en cada visita.

Esta evidencia materializa el riesgo 9 (`frontend-plan/04-risks.md`), que condicionaba cualquier
cambio a métricas reales. La decisión fue la más barata que cumple las condiciones de licencia: un
**espejo propio en baja resolución**, que paga la cadena lenta una sola vez por carátula, para
todos los usuarios, dentro del plan gratuito de R2.

## Decisión

### 1. Espejo en la app, bajo demanda

Se descartó un proxy pull-through en el edge (Cloudflare Worker): agrega una plataforma y un
deploy, consume invocaciones incluso con acierto en el plan gratuito, y su runtime no tiene
`sharp`. Con el espejo en la app, los aciertos van directo al dominio público de R2 (CDN, sin
invocaciones ni egress) y solo los fallos pasan por código propio. También se descartaron subir
`minimumCacheTTL` como solución única (no acelera la primera carga) y Cloudflare Images (costo por
imagen y otra plataforma).

### 2. `cover_thumb_url` sigue siendo "la URL servible"; la clave va aparte

Cambiar la semántica de la columna obligaría a tocar ~25 servicios y SQL crudo. `cover_thumb_url`
guarda la URL de R2 cuando está espejada y la de CAA cuando no, así que ningún lector cambia. La
fuente de verdad para operar el storage es `cover_storage_key`; la URL es un valor denormalizado
que se regenera desde la clave (`publicUrl(key)`) con `backfill --rewrite-urls` si cambia el
dominio público. Es una excepción deliberada al principio "solo la clave" de ADR 0017: aquel
aplica a imágenes propias con consumidores nuevos, y acá aplicarlo costaría reescribir todo el
read-model.

### 3. Clave versionada por contenido y caché inmutable

Clave `covers/{rgMbid}/{sha256[0..12]}.webp` con `Cache-Control: public, max-age=31536000,
immutable`. Como la clave cambia cuando cambia el contenido, `immutable` no puede servir una
carátula vieja: la revalidación escribe una clave nueva, actualiza la fila y borra la anterior.
Dos requests concurrentes para el mismo álbum producen la misma clave con los mismos bytes, así
que el `put` es idempotente y no hace falta locking. `StorageProvider.put` suma un parámetro
opcional `cacheControl` (el driver `s3` lo envía como `CacheControl`; el `local` lo ignora).

### 4. Conversión a WebP de 250 px sin re-escalar

`sharp(buffer).resize({ width: 250, height: 250, fit: "inside", withoutEnlargement: true })
.webp({ quality: 80 })`. La fuente ya es `front-250`, así que en la práctica solo se recodifica
(~8,7 KB → ~5 KB). `fit: "inside"` conserva la proporción. El espejo nunca descarga otra variante
que `front-250`: la URL se construye solo con `coverThumbUrl()`.

### 5. Habilitación fail-safe, no fail-closed

`isCoverMirrorEnabled()` = storage resoluble **y** `COVER_ART_TAKEDOWN_EMAIL` presente. Si falta
alguno, el espejo se apaga y la app hace hotlink como antes, sin error. A diferencia de las
imágenes propias (ADR 0017, fail-closed), acá existe una alternativa funcional, y alojar copias
sin canal de retiro violaría la condición de licencia. En desarrollo, el driver `local` cuenta
como storage configurado.

### 6. Resolución síncrona: `GET` con caché de negativos

Cuando la resolución espeja en el acto (ruta cover-only, backfill, revalidación), un único `GET`
reemplaza al `HEAD`, porque el espejo necesita los bytes. Sigue redirecciones con timeout (8 s):

- `2xx` con cuerpo: se espeja. Si el espejo está deshabilitado, se guarda la URL de CAA.
- `404`: `cover_thumb_url = null` y `cover_checked_at = now()`.
- Error de red o `5xx`: no se escribe nada; el próximo acceso reintenta.

Un `null` con `cover_checked_at` de menos de 7 días se devuelve sin consultar CAA. Si el `put`
falla, se guarda la URL de CAA (la carátula existe) y el álbum queda como candidato del backfill.

### 7. En SSR del detalle de álbum, `HEAD` y espejo diferido con `after()`

El detalle de álbum no puede bloquearse los ~2,5 s de un `GET` que sigue tres redirecciones. El
SSR conserva un `HEAD` con `redirect: "manual"` (~0,8 s, un solo salto) y, si existe carátula y el
espejo está habilitado, difiere el `GET` + espejo con `after()` de `next/server`. Las visitas
siguientes ya encuentran la URL de R2. La ruta cover-only, que consume el cliente y no bloquea la
página, hace `GET` y espejo síncronos.

### 8. Discografía: la carátula viaja en el payload

Cada release-group de la discografía agrega `coverThumbUrl: string | null` y `coverResolved:
boolean`. `coverResolved` es verdadero si hay URL conocida, si la ausencia fue confirmada dentro
de la ventana de negativos o si la carátula fue retirada. No se llama `coverChecked`: no equivale a
"tiene `cover_checked_at`, y un negativo vencido cuenta como no resuelto para que el cliente lo
re-resuelva. `AlbumCard` usa `CoverThumb` en la carga inicial cuando `coverResolved` es verdadero
(con URL o placeholder) y `LazyCoverImage` solo cuando es falso. Es un cambio aditivo del contrato.

### 9. Optimizador activo por defecto; salteo solo para fuentes preprocesadas

Las carátulas espejadas (WebP de 250 px) y los avatares (WebP de 256 px, ADR 0017) ya salen
procesados y en tamaño final. Pasarlos por el optimizador solo suma entradas de caché por ancho,
una caché local por instancia y, en Vercel, costo por transformación. Pero `images.unoptimized:
true` global haría que cualquier imagen futura sin procesar se sirviera tal cual, y lo único que lo
evitaría sería una regla documental. Por eso:

- **Global:** el optimizador sigue activo. `minimumCacheTTL` sube a 30 días para que el camino de
  hotlink (espejo deshabilitado o antes del backfill) aproveche la caché, porque archive.org no
  envía `Cache-Control`.
- **`src/components/ui/AppImage.tsx`:** único punto que importa `next/image`. Calcula
  `unoptimized` con `isPreprocessedImageSrc(src)`, verdadero solo si el `src` pertenece al dominio
  público del storage o empieza con `/uploads/` (driver `local`). La comparación es por hostname
  exacto, no por prefijo de cadena.
- **ESLint:** `no-restricted-imports` prohíbe importar `next/image` fuera de `AppImage.tsx`. La
  regla la exige el lint (y el CI), no la disciplina.
- **Dominio en el cliente:** `STORAGE_PUBLIC_DOMAIN` se inyecta en build con `env` de
  `next.config.mjs`. No es un secreto.

*Descartadas:* `unoptimized` global; `unoptimized` a mano en cada componente (decisión dispersa en
14 archivos); un `loaderFile` global (reconstruir la URL de `/_next/image` depende de detalles
internos de Next).

### 10. Seguir a la fuente, retiro a pedido y marca de retiro

- `scripts/revalidate-cover-mirror.ts [--older-than=90d] [--limit=N]`: re-descarga las carátulas
  espejadas con verificación vieja. `404` → borra el objeto y anula; hash distinto → sube la clave
  nueva, actualiza y borra la anterior; error transitorio → sin cambios.
- `scripts/takedown-cover.ts <releaseGroupId|mbid>`: borra el objeto, anula URL y clave y fija
  `cover_blocked_at`. Un release-group marcado nunca se vuelve a resolver ni a espejar, ni siquiera
  por hotlink. Revertir un retiro es un `UPDATE` manual (el script lo imprime).
- `scripts/backfill-cover-mirror.ts [--limit=N] [--rewrite-urls] [--revert]`: espeja las filas
  cuya `cover_thumb_url` apunta a CAA, con concurrencia limitada (2). `--rewrite-urls` regenera
  URLs desde la clave. `--revert` vuelve a URLs de CAA sin borrar objetos.

### 11. Sin exposición como colección

No hay endpoint que liste claves ni carátulas. El bucket se sirve solo por clave exacta: el dominio
público de R2 no permite listar, y así debe configurarse. Las carátulas solo aparecen junto a su
álbum.

### 12. Contacto de retiro por configuración

`COVER_ART_TAKEDOWN_EMAIL` se lee en `src/lib/site-links.ts` como `COVER_TAKEDOWN_EMAIL: string |
null`. El bloque de atribución del footer agrega una línea con un `mailto:` visible solo cuando
está configurado. Como el espejo no se habilita sin este valor (decisión 5), nunca hay copias
alojadas sin canal de retiro publicado.

## Reglas operativas

- **Revalidación periódica:** correr `revalidate-cover-mirror.ts` con el umbral de 90 días (por
  ejemplo, mensual) para seguir a la fuente. Se documenta en el runbook de despliegue.
- **Retiro a pedido:** ante un pedido de un titular, correr `takedown-cover.ts`; es inmediato y
  persistente. Imprime la sentencia para revertirlo.
- **Dominio público sin listado:** el dominio público de R2 debe configurarse sin listado; el
  bucket se sirve solo por clave exacta.
- **Regeneración de URLs:** si cambia el dominio público, correr `backfill-cover-mirror.ts
  --rewrite-urls` para recalcular `cover_thumb_url` desde `cover_storage_key`.
- **Backfill:** al habilitar el espejo, correr `backfill-cover-mirror.ts --limit=N` en tandas hasta
  cubrir el catálogo existente.

## Política de optimización

El optimizador de imágenes de la aplicación está activo por defecto. Se saltea **solo** para
fuentes preprocesadas a su tamaño final (carátulas espejadas y avatares), y la decisión depende
únicamente del origen de la imagen, centralizada en `AppImage` y exigida por lint. **Supuesto a
cuidar:** todo lo que se escribe en el storage sale ya procesado. Solo dos caminos escriben ahí:
`image-storage` (resize obligatorio) y el espejo (≤250 px). Cualquier fuente fuera del storage
pasa por el optimizador por defecto.

## Consecuencias

- Nueva migración `0047`: `release_group.cover_storage_key`, `cover_checked_at`, `cover_blocked_at`.
- Nuevos scripts: `backfill-cover-mirror.ts`, `revalidate-cover-mirror.ts`, `takedown-cover.ts`.
- Nuevo wrapper `src/components/ui/AppImage.tsx`; los componentes que usaban `next/image` pasan a
  usarlo, y ESLint lo exige.
- Nueva variable de entorno: `COVER_ART_TAKEDOWN_EMAIL` (habilita el espejo y publica el contacto).
- `data-licensing.md` (sección C) pasa de "evolución futura condicionada" a la política vigente; el
  riesgo 9 queda mitigado con la medición como evidencia.
- Sin dependencias nuevas: reutiliza `sharp` y `@aws-sdk/client-s3`.

## Rollback

Quitar `COVER_ART_TAKEDOWN_EMAIL` (o el storage) desactiva el espejo para resoluciones nuevas: la
app vuelve al hotlink. `backfill-cover-mirror.ts --revert` devuelve todas las filas a URLs de CAA.
Las columnas nuevas pueden quedar: son nulables y no las lee nadie fuera de este flujo.
