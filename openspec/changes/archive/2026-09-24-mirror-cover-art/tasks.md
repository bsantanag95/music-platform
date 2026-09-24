## 1. Esquema y configuración

- [x] 1.1 Escribir `drizzle/0047_cover_art_mirror.sql`: `ALTER TABLE release_group ADD COLUMN cover_storage_key TEXT UNIQUE, ADD COLUMN cover_checked_at TIMESTAMPTZ, ADD COLUMN cover_blocked_at TIMESTAMPTZ`, sin backfill de datos: las filas existentes quedan con `cover_checked_at` nulo (no hay verificación registrada en el flujo nuevo; la del `HEAD` viejo es más débil y su momento es desconocido).
- [x] 1.2 Reflejar las tres columnas en `src/db/schema.ts`, con un comentario del change de origen.
- [x] 1.3 Agregar a `src/lib/config/` los parámetros del espejo: tamaño máximo (250), calidad WebP (80), reintento de negativos (7 días), umbral de revalidación (90 días), timeout del `GET` (8 s) y concurrencia del backfill (2).
- [x] 1.4 Documentar `COVER_ART_TAKEDOWN_EMAIL` en `.env.example` (qué habilita y que sin ella la app hace hotlink).
- [x] 1.5 Correr la migración contra una base local y confirmar que `typecheck` pasa.

## 2. Storage

- [x] 2.1 Extender `StorageProvider.put` con un parámetro opcional `cacheControl`: el driver `s3` lo envía como `CacheControl` y el `local` lo ignora. Ajustar los tests de `image-service` si cambia la firma de los mocks.
- [x] 2.2 Implementar `isCoverMirrorEnabled()`: storage resoluble sin `StorageConfigError` **y** `COVER_ART_TAKEDOWN_EMAIL` presente.

## 3. Resolución y espejo

- [x] 3.1 En `src/services/cover-art.ts`, agregar `fetchCoverThumb(mbid)`: un `GET` a `coverThumbUrl(mbid)` que sigue redirecciones con timeout y devuelve `{ status: "found", bytes } | { status: "missing" } | { status: "transient" }`. Conservar `resolveCoverThumbUrl` (el `HEAD`) para el camino SSR.
- [x] 3.2 Crear `src/services/catalog/cover-mirror.ts`: `mirrorCover(rg, bytes)` convierte con `sharp` (`fit: "inside"`, `withoutEnlargement`, WebP), calcula la clave `covers/{mbid}/{sha256[0..12]}.webp`, hace `put` con `immutable` y actualiza `cover_storage_key`, `cover_thumb_url` y `cover_checked_at`. Si el `put` falla, guarda la URL de CAA y deja la clave nula.
- [x] 3.3 Reescribir `findOrResolveCover` para la ruta cover-only: retirado → `null` sin consulta; URL cacheada → devolverla; `null` con verificación de menos de 7 días → `null` sin consulta; si no, `fetchCoverThumb` → espejar (si está habilitado) o guardar la URL de CAA; `missing` → `null` + `cover_checked_at`; `transient` → `null` sin escribir.
- [x] 3.4 En `album-detail.ts`, resolver con el `HEAD` como hoy (respetando el retiro y la caché de negativos) y, si existe carátula y el espejo está habilitado, diferir `fetchCoverThumb` + `mirrorCover` con `after()` de `next/server`.
- [x] 3.5 Asegurar que ningún otro punto construya URLs de carátula a mano (regla de AGENTS.md).

## 4. Discografía de artista

- [x] 4.1 Agregar `coverThumbUrl` y `coverResolved` a cada release-group del payload de discografía (servicio, `ReleaseGroupSchema` en `src/lib/api/schemas.ts` y ruta). `coverResolved` es verdadero si `cover_thumb_url IS NOT NULL` (URL conocida), si hay ausencia confirmada (`cover_thumb_url IS NULL` con `cover_checked_at` dentro de la ventana de negativos) o si `cover_blocked_at IS NOT NULL`. Un negativo vencido cuenta como no resuelto, para que `LazyCoverImage` lo re-resuelva.
- [x] 4.2 En `AlbumCard`: si `coverResolved`, renderizar `CoverThumb` (con URL o placeholder) en la carga inicial; si no, `LazyCoverImage` como hoy.
- [x] 4.3 Ajustar los `sizes` de `LazyCoverImage` y `CoverThumb` para que no pidan anchos mayores a la fuente de 250 px. Aplica al camino de hotlink, que sigue pasando por el optimizador.

## 5. Optimización de imágenes

- [x] 5.1 En `next.config.mjs`, dejar el optimizador activo, fijar `images.minimumCacheTTL` en 30 días, conservar `remotePatterns` (CAA, archive.org y dominio del storage) y exponer `STORAGE_PUBLIC_DOMAIN` al cliente vía `env`.
- [x] 5.2 Crear `src/lib/image-source.ts` con `isPreprocessedImageSrc(src)`: verdadero solo para URLs del dominio público del storage o rutas `/uploads/`, falso para cualquier otra (incluidas CAA/archive.org y dominios desconocidos).
- [x] 5.3 Crear `src/components/ui/AppImage.tsx`: envuelve `next/image` con los mismos props y fija `unoptimized={isPreprocessedImageSrc(src)}`, sin permitir que el llamador lo sobrescriba.
- [x] 5.4 Migrar los 14 componentes que importan `next/image` a `AppImage`.
- [x] 5.5 En `eslint.config.mjs`, agregar `next/image` a `no-restricted-imports` con un mensaje que apunte a `AppImage`, y una excepción solo para `src/components/ui/AppImage.tsx` que conserve la restricción existente de `react`.
- [x] 5.6 Verificar en el navegador que avatares y carátulas espejadas se sirven directo desde el storage (sin `/_next/image`), que una carátula en hotlink sí pasa por `/_next/image`, y que se ven bien en tamaños de 40 a 250 px.

## 6. Scripts operativos

- [x] 6.1 `scripts/backfill-cover-mirror.ts [--limit=N] [--rewrite-urls] [--revert]`: por defecto espeja las filas cuya URL apunta a CAA (sin retiro), con concurrencia configurable. `--rewrite-urls` recalcula `cover_thumb_url` desde `cover_storage_key`. `--revert` vuelve cada fila espejada a `coverThumbUrl(mbid)` sin borrar objetos. Debe abortar si el espejo no está habilitado (salvo en `--revert`).
- [x] 6.2 `scripts/revalidate-cover-mirror.ts [--older-than=90d] [--limit=N]`: re-descarga las carátulas espejadas con verificación vieja. `404` → borrar objeto y anular; hash distinto → nueva clave, actualizar y borrar la anterior; error transitorio → sin cambios.
- [x] 6.3 `scripts/takedown-cover.ts <releaseGroupId|mbid>`: borrar el objeto si existe, anular la URL y la clave y fijar `cover_blocked_at`. Imprimir la sentencia `UPDATE` para revertir un retiro.
- [x] 6.4 Los scripts usan `--env-file=.env` como los smoke tests y registran un resumen (procesadas, espejadas, faltantes, errores).

## 7. Footer

- [x] 7.1 En `src/lib/site-links.ts`, exponer `COVER_TAKEDOWN_EMAIL: string | null`, leído de `COVER_ART_TAKEDOWN_EMAIL`.
- [x] 7.2 En el bloque de atribución del `Footer`, agregar la frase de retiro con `mailto:` visible solo cuando está configurado. Sumar las claves en `messages/{es,en}/footer.json`.

## 8. Tests

- [x] 8.1 `fetchCoverThumb`: `found` / `missing` (404) / `transient` (5xx, timeout, red) con `fetch` mockeado.
- [x] 8.2 `mirrorCover`: WebP ≤250 px sin ampliar; clave estable para los mismos bytes y distinta para otros; `cacheControl` inmutable; fallback a URL de CAA si el `put` falla.
- [x] 8.3 `findOrResolveCover`: retirado, URL cacheada, negativo reciente, negativo vencido, espejo habilitado y deshabilitado (sin contacto y sin storage), transitorio sin escritura.
- [x] 8.4 Detalle de álbum: el SSR usa el `HEAD` y agenda el espejo con `after()` (mock).
- [x] 8.5 `AlbumCard`: resuelto con URL → `CoverThumb` sin request; ausencia confirmada o retirado → placeholder sin request; no resuelto o negativo vencido → `LazyCoverImage`.
- [x] 8.6 Footer: la frase de retiro aparece con el contacto configurado y no aparece sin él.
- [x] 8.7 Scripts: lógica de revalidación y retiro testeada como funciones puras o con storage y `fetch` mockeados.
- [x] 8.8 `isPreprocessedImageSrc`: verdadero para el dominio del storage y `/uploads/`; falso para CAA, archive.org, dominios desconocidos y dominios que solo *contienen* el del storage como prefijo engañoso (por ejemplo `https://storage.example.evil.com`). `AppImage` pasa `unoptimized` según el helper e ignora el que envíe el llamador.

## 9. Documentación

- [x] 9.1 ADR `docs/02-architecture/adr/0018-espejo-de-caratulas.md`: medición, decisiones 1–12 del design, reglas operativas (revalidación periódica, retiro, dominio público sin listado, regeneración de URLs) y la política de optimización (optimizador por defecto, salteo solo para el storage vía `AppImage`, exigido por lint; supuesto: todo lo que se escribe en el storage sale ya procesado).
- [x] 9.2 `docs/03-data/data-licensing.md`, sección C: reemplazar "evolución futura condicionada" por la política vigente, que permite el espejo con condiciones (solo `front-250`, sigue a la fuente, retiro a pedido con contacto publicado, sin exposición como colección, atribución). Mantener los gates antes de monetizar.
- [x] 9.3 `docs/02-architecture/frontend-plan/04-risks.md`, riesgo 9: marcarlo como mitigado por ADR 0018, con la medición como evidencia.
- [x] 9.4 `docs/03-data/sql-model.md`: columnas nuevas de `release_group` y la semántica de `cover_thumb_url` como URL servible.
- [x] 9.5 `docs/04-api/contracts.md`: campos `coverThumbUrl` y `coverResolved` en la discografía de artista.
- [x] 9.6 AGENTS.md, sección de arquitectura: actualizar la línea de `src/services/cover-art.ts` para mencionar el espejo y los scripts operativos.
- [x] 9.7 Al archivar: reemplazar el `Purpose` "TBD" de `openspec/specs/site-footer/spec.md` por uno real.

## 10. Verificación

- [x] 10.1 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build` pasan.
- [x] 10.2 Con el driver `local` y el contacto configurado, en el navegador: abrir un artista con discografía grande, confirmar que la primera vista espeja las carátulas (en `public/uploads/covers/`) y que la segunda las renderiza en la carga inicial sin requests a `/cover` ni a archive.org. Medir el tiempo de carga antes y después.
- [x] 10.3 Sin `COVER_ART_TAKEDOWN_EMAIL`, confirmar que la app vuelve al hotlink y que el footer no muestra la frase de retiro.
- [x] 10.4 Correr `takedown-cover.ts` sobre un álbum y confirmar el placeholder y que no se re-resuelve. Correr `backfill --revert` y confirmar las URLs de CAA.
