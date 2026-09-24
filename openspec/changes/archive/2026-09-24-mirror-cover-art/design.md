## Context

- **Cadena medida** (2026-09-23, carátula popular, 3 corridas): `coverartarchive.org/release-group/{mbid}/front-250` → 307 (~0,8 s) → `archive.org/download/...` → 302 (~0,7 s) → `dnXXXX.ca.archive.org/...` → 200 (~1 s, 8,7 KB). Total: 2,5–3 s en frío. El último host no envía `Cache-Control` ni `Expires`.
- **Puntos de resolución:** solo dos llaman a `findOrResolveCover` (`src/services/catalog/cover.ts`): el detalle de álbum (`album-detail.ts`, SSR) y `GET /api/catalog/release-group/{id}/cover` (lo consume `LazyCoverImage` en la grilla de artista). Ninguna ingesta escribe la carátula.
- **Puntos de lectura:** unos 25 servicios leen `release_group.cover_thumb_url` directamente, con Drizzle y con SQL crudo (`home`, `feed`, `lists`, `diary`, `favorites`, `camino`, `convergence`…), y algunos filtran con `IS NOT NULL`. Todos la tratan como "URL que se renderiza".
- **Render:** 14 componentes usan `next/image`. `LazyCoverImage` declara `sizes` en `vw`, lo que genera un `srcset` de 640–3840 px para una fuente de 250 px, y `CoverThumb` usa `64px`. Cada ancho es una entrada distinta del optimizador.
- **Grilla de artista:** `ReleaseGroupSchema` no incluye la carátula, así que cada `AlbumCard` resuelve la suya desde el cliente aunque ya esté en la base.
- **Negativos:** `findOrResolveCover` repite el `HEAD` cada vez que el valor es `null`.
- **Base disponible:** `StorageProvider` (`put`/`delete`/`publicUrl`) con drivers `s3` (R2) y `local`, además de `sharp`, ya en el proyecto (`add-image-storage`, ADR 0017).

## Goals / Non-Goals

Ver `proposal.md`. En resumen: servir las carátulas desde el storage propio con costo ~0, sin la cascada en páginas densas y cumpliendo condiciones de licencia verificables. Quedan fuera las plataformas nuevas, otras resoluciones y la redacción legal de `/terms`.

## Decisions

**1. Espejo en la app, bajo demanda, en lugar de un proxy pull-through en el edge (Cloudflare Worker).**
Un Worker delante de R2 daría URLs deterministas sin tocar la base, pero agrega una plataforma y un deploy más. Además, en el plan gratuito cada request consume invocaciones (100k/día) incluso cuando hay acierto, y el runtime no tiene `sharp`. Con el espejo en la app, los aciertos van directo al dominio público de R2 (CDN, sin invocaciones ni egress) y solo los fallos pasan por código que ya existe. *Descartadas también:* subir `minimumCacheTTL` como solución única (no acelera la primera carga y la caché del optimizador es local de cada instancia) y Cloudflare Images (tiene costo por imagen y es otra plataforma).

**2. `cover_thumb_url` sigue siendo "la URL servible", y la clave de storage va en una columna aparte.**
Cambiar la semántica de la columna obligaría a tocar ~25 servicios y el SQL crudo. En cambio, `cover_thumb_url` guarda la URL de R2 cuando la carátula está espejada y la de CAA cuando no, así que ningún lector cambia. La fuente de verdad para operar el storage es `cover_storage_key`. La URL es un valor denormalizado que se regenera desde la clave (`publicUrl(key)`) si cambia el dominio público, con una sola sentencia desde el script de backfill (`--rewrite-urls`). Esto se aparta a propósito del principio "solo la clave" de ADR 0017: aquel aplica a imágenes propias con consumidores nuevos, y acá el costo de aplicarlo sería reescribir todo el read-model.

**3. Clave versionada por contenido: `covers/{rgMbid}/{sha256[0..12]}.webp`, con `Cache-Control: public, max-age=31536000, immutable`.**
Como la clave cambia cuando cambia el contenido, se puede usar `immutable` sin riesgo de servir una carátula vieja: la revalidación escribe una clave nueva, actualiza la fila y borra la anterior. Dos requests concurrentes para el mismo álbum producen la misma clave con los mismos bytes, así que el `put` es idempotente y no hace falta locking. `StorageProvider.put` suma un parámetro opcional `cacheControl` (el driver `s3` lo manda como `CacheControl`; el `local` lo ignora).

**4. Conversión a WebP de 250 px sin re-escalar.**
`sharp(buffer).resize({ width: 250, height: 250, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 })`. La fuente ya es `front-250`, así que en la práctica solo se recodifica (~8,7 KB → ~5 KB). `fit: "inside"` conserva la proporción, sin recortar el arte. El espejo nunca descarga otra variante que `front-250`, porque la URL se construye solo con `coverThumbUrl()`.

**5. Habilitación fail-safe, no fail-closed: `isCoverMirrorEnabled()` = storage real configurado **y** `COVER_ART_TAKEDOWN_EMAIL` presente.**
Si falta alguno de los dos, el espejo se apaga y la app hace hotlink como hoy, sin error. A diferencia de las imágenes propias (ADR 0017, que falla cerrado), acá existe una alternativa funcional, y alojar copias sin canal de retiro violaría la condición de licencia. En desarrollo, el driver `local` cuenta como storage configurado, para poder ejercitar el flujo completo.

**6. Resolución síncrona: `GET` en lugar de `HEAD`, con caché de negativos por `cover_checked_at`.**
Cuando la resolución va a espejar en el acto (ruta cover-only, backfill, revalidación), un solo `GET` reemplaza al `HEAD` porque el espejo necesita los bytes. El `GET` sigue las redirecciones con timeout (8 s). Resultados:
- `2xx` con cuerpo de imagen: se espeja. Si el espejo está deshabilitado, se guarda la URL de CAA como hoy.
- `404`: `cover_thumb_url = null` y `cover_checked_at = now()`.
- Error de red o `5xx`: no se escribe nada, así el próximo acceso reintenta, igual que hoy.

Un `null` con `cover_checked_at` de menos de 7 días se devuelve sin consultar CAA. Si el `put` al storage falla, se guarda la URL de CAA (la carátula existe) y el álbum queda como candidato del backfill.

**7. En SSR del detalle de álbum, conservar el `HEAD` y espejar en segundo plano con `after()`.**
El detalle de álbum no puede bloquearse los ~2,5 s de un `GET` que sigue las 3 redirecciones. Hoy el SSR espera un `HEAD` con `redirect: "manual"` (~0,8 s, un solo salto), y ese costo se conserva. Si no hay nada cacheado, el SSR resuelve la existencia con el `HEAD` y devuelve la URL de CAA en ese render. Si existe, difiere el `GET` y el espejo con `after()` de `next/server` (estable en 15.5). Las visitas siguientes ya encuentran la URL de R2. La ruta cover-only, que se consume desde el cliente y no bloquea la página, hace `GET` y espejo en forma síncrona y devuelve directamente la URL de R2. La decisión 6 describe esta ruta síncrona; el `HEAD` queda solo para el camino SSR.

**8. Discografía: la carátula viaja en el payload y `LazyCoverImage` queda solo para lo no resuelto.**
El release-group de la discografía agrega `coverThumbUrl: string | null` y `coverResolved: boolean`. `coverResolved` indica que la resolución ya tiene una respuesta que se puede usar sin consultar CAA: URL conocida (`cover_thumb_url IS NOT NULL`), ausencia confirmada dentro de la ventana de negativos (`cover_thumb_url IS NULL` con `cover_checked_at` de menos de 7 días) o carátula retirada (`cover_blocked_at IS NOT NULL`). Deliberadamente **no** se llama `coverChecked`: no equivale a "tiene `cover_checked_at`", y confundirlos llevaría a rellenar esa columna con verificaciones inventadas. Un negativo vencido cuenta como no resuelto, para que `LazyCoverImage` lo re-resuelva. `AlbumCard` usa `CoverThumb` en la carga inicial cuando `coverResolved` es verdadero (con URL o con placeholder) y `LazyCoverImage` solo cuando es falso. Así desaparece la cascada en las grillas ya visitadas alguna vez. Es un cambio aditivo del contrato: los campos existentes no cambian.

**9. Optimizador activo por defecto; se saltea solo para fuentes preprocesadas, con la decisión centralizada en un wrapper y exigida por lint.**
Las carátulas espejadas (WebP de 250 px) y los avatares (WebP de 256 px, ADR 0017) ya salen procesados y en tamaño final. Pasarlos por el optimizador solo suma entradas de caché por ancho, una caché local por instancia y, en Vercel, costo por transformación. Pero un `images.unoptimized: true` global haría que cualquier imagen futura sin procesar se sirviera tal cual, y lo único que lo evitaría sería una regla documental. Por eso se invierte el default:
- **Global:** el optimizador sigue activo. `minimumCacheTTL` sube a 30 días para que el camino de hotlink (espejo deshabilitado o antes del backfill) aproveche la caché, porque archive.org no envía `Cache-Control`.
- **`src/components/ui/AppImage.tsx`:** es el único punto que importa `next/image`. Calcula `unoptimized` con `isPreprocessedImageSrc(src)`, que es verdadero solo si el `src` empieza con el dominio público del storage o con `/uploads/` (driver `local`). Cualquier otra fuente, incluida una nueva que nadie haya previsto, pasa por el optimizador.
- **ESLint:** `no-restricted-imports` prohíbe importar `next/image` fuera de `AppImage.tsx`, con un mensaje que apunta al wrapper. Así la regla la exige el lint (y el CI, que corre `lint`), no la disciplina.
- **Dominio en el cliente:** `STORAGE_PUBLIC_DOMAIN` se inyecta en build con `env` de `next.config.mjs`. No es un secreto: ya aparece en cada URL servida y en `remotePatterns`.

*Descartadas:* `unoptimized` global (el default es inseguro y la protección es solo documental); `unoptimized` a mano en cada componente (la decisión queda dispersa en 14 archivos y un componente nuevo puede olvidarlo en cualquiera de los dos sentidos); un `loaderFile` global (reemplaza el loader por defecto para todas las imágenes, y reconstruir a mano la URL de `/_next/image` depende de detalles internos de Next).

**10. Seguir a la fuente, retiro a pedido y marca de retiro.**
- `scripts/revalidate-cover-mirror.ts [--older-than=90d]`: vuelve a descargar de CAA las carátulas espejadas cuyo `cover_checked_at` sea más viejo que el umbral. Con `404`, borra el objeto y deja `cover_thumb_url`/`cover_storage_key` en `null`. Con un hash distinto, sube la clave nueva, actualiza la fila y borra la anterior. Con errores transitorios, no toca nada.
- `scripts/takedown-cover.ts <releaseGroupId|mbid>`: borra el objeto, deja la URL y la clave en `null` y fija `cover_blocked_at = now()`. Un release-group con `cover_blocked_at` nunca se vuelve a resolver ni a espejar, ni siquiera por hotlink, y se muestra el placeholder. Revertir un retiro es un `UPDATE` manual documentado.
- `scripts/backfill-cover-mirror.ts [--limit] [--rewrite-urls] [--revert]`: espeja las filas cuya `cover_thumb_url` apunta a CAA, respetando un ritmo de ~2 requests concurrentes para no martillar a archive.org. `--rewrite-urls` regenera URLs desde la clave. `--revert` vuelve a URLs de CAA, para rollback.

**11. Sin exposición como colección.**
No hay endpoint que liste claves ni carátulas. El bucket se sirve solo por clave exacta: el dominio público de R2 no permite listar, y así debe configurarse (documentado en el ADR). Las carátulas solo aparecen junto a su álbum.

**12. Contacto de retiro por configuración.**
`COVER_ART_TAKEDOWN_EMAIL` se lee en `src/lib/site-links.ts` (única fuente de enlaces del sitio, según `site-footer`) como `COVER_TAKEDOWN_EMAIL: string | null`. El bloque de atribución agrega una línea con un `mailto:` visible solo cuando está configurado. Como el espejo no se habilita sin este valor (decisión 5), nunca hay copias alojadas sin canal de retiro publicado.

## Risks / Trade-offs

- **[Licencia] Pasamos a alojar material con copyright, aunque sea en baja resolución.** → Mitigación: solo `front-250`, el espejo sigue a la fuente, retiro a pedido con marca persistente, contacto publicado como requisito técnico de habilitación, sin exposición como colección y la atribución de siempre. Se documenta en `data-licensing.md` y ADR 0018. El gate de monetización (revisión legal) sigue vigente.
- **[Latencia] Primera vista de un álbum nunca visto:** la ruta cover-only tarda el `GET` más la subida (~3 s una vez). → Aceptado: es el mismo costo de hoy, pero se paga una sola vez para todos. El backfill lo evita para el catálogo existente.
- **[Consistencia] Si el dominio público cambia, las URLs denormalizadas quedan viejas.** → `backfill --rewrite-urls` las regenera desde `cover_storage_key` con una sentencia. Queda documentado en el ADR.
- **[Carátula obsoleta] Si CAA cambia la portada, el espejo sirve la anterior hasta la próxima revalidación.** → Aceptado. La revalidación con umbral de 90 días lo acota. Para el retiro de derechos existe el script inmediato.
- **[Carga sobre CAA] El backfill hace una ráfaga de requests.** → Concurrencia limitada a 2 y `--limit` por corrida.
- **[Instancias múltiples] Dos instancias espejan el mismo álbum a la vez.** → La clave por contenido hace que el `put` sea idempotente. El último `UPDATE` gana con el mismo valor.
- **[Salteo del optimizador] Un objeto sin procesar subido al storage se serviría tal cual.** → Solo dos caminos escriben en el storage: `image-storage` (resize obligatorio) y el espejo (≤250 px). Cualquier fuente fuera del storage pasa por el optimizador por defecto, y el lint impide que un componente saltee el wrapper. Queda un único supuesto que cuidar, y lo documenta el ADR: todo lo que se escribe en el storage sale ya procesado.
- **[Migración a `AppImage`] Hay que tocar los 14 componentes que importan `next/image`.** → Es un reemplazo mecánico, y el lint confirma que no quedó ninguno.

## Migration Plan

1. Migración `0047_cover_art_mirror.sql`: `ALTER TABLE release_group ADD COLUMN cover_storage_key TEXT UNIQUE, ADD COLUMN cover_checked_at TIMESTAMPTZ, ADD COLUMN cover_blocked_at TIMESTAMPTZ`, sin backfill de datos. Las filas existentes quedan con `cover_checked_at` nulo: su existencia la confirmó el `HEAD` viejo (más débil que el `GET`, y en un momento desconocido), y fijar `now()` inventaría una verificación. No hace falta para la grilla, porque una `cover_thumb_url` no nula ya cuenta como resuelta (decisión 8). El backfill del espejo registrará `cover_checked_at` real al descargar cada una.
2. Deploy del código con el espejo **deshabilitado** (sin `COVER_ART_TAKEDOWN_EMAIL`). El comportamiento sigue siendo el de hoy, más la caché de negativos y el render directo en la discografía.
3. Configurar el dominio público de R2 (sin listado) y `COVER_ART_TAKEDOWN_EMAIL`. A partir de ahí el espejo queda habilitado para resoluciones nuevas.
4. Correr `backfill-cover-mirror.ts` en tandas (`--limit`) hasta cubrir el catálogo existente.
5. Documentar la ejecución periódica de `revalidate-cover-mirror.ts` (por ejemplo, mensual) en el ADR y en el runbook de despliegue.

**Rollback:** quitar `COVER_ART_TAKEDOWN_EMAIL` desactiva el espejo para resoluciones nuevas. `backfill-cover-mirror.ts --revert` devuelve todas las filas a URLs de CAA. Las columnas nuevas pueden quedar: son nulables y no las lee nadie fuera de este flujo.

## Open Questions

- Umbral de revalidación (se propone 90 días) y reintento de negativos (7 días): son valores de referencia; se pueden ajustar en `src/lib/config/` sin cambiar el diseño.
- Plataforma de despliegue: no bloquea. Las fuentes preprocesadas (carátulas espejadas y avatares, la gran mayoría de las imágenes) no pasan por el optimizador, así que el costo de Image Optimization de Vercel queda acotado a fuentes no previstas y al hotlink residual.
