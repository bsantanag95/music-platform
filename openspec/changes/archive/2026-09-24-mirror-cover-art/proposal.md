## Why

La carga de carátulas es lenta, y peor en páginas con muchas carátulas simultáneas (grilla de artista, muro de portadas de Inicio, listas). La causa es estructural, no de caché de URLs. Medido el 2026-09-23 sobre una carátula popular, cada miniatura de Cover Art Archive atraviesa 3 hosts: `coverartarchive.org` (307, ~0,8 s), `archive.org/download` (302, ~0,7 s) y un nodo `dnXXXX.ca.archive.org` (200, ~1 s), o sea **2,5–3 s por carátula en frío** para 8,7 KB. archive.org no envía `Cache-Control` ni `Expires`, así que el optimizador de `next/image` (con el `minimumCacheTTL` de 60 s de Next 15) vuelve a ir a la fuente cada minuto. Cada ancho del `srcset` es una entrada de caché distinta. Además, la grilla de artista resuelve cada carátula en cascada desde el cliente, y los álbumes sin carátula repiten un `HEAD` a CAA en cada visita.

Esto materializa el riesgo 9 (`docs/02-architecture/frontend-plan/04-risks.md`), que condicionaba el cambio a evidencia de latencia. Con esa evidencia, la solución más barata es un espejo propio en baja resolución: la cadena lenta se paga una sola vez por carátula, para todos los usuarios, y el costo de storage queda dentro del plan gratuito de R2.

## Goals

- Servir las carátulas desde el storage propio (R2 detrás del CDN de Cloudflare), sin la cadena de redirecciones de archive.org en cada vista.
- Eliminar la cascada de resolución por carátula en páginas densas cuando la carátula ya se conoce.
- Mantener la política de licencia (solo 250 px, fines de identificación, atribución), pero sumarle las condiciones que hacen defendible alojar copias: el espejo sigue a la fuente, hay retiro a pedido y no se expone como colección.
- Costo operativo prácticamente nulo y sin plataformas nuevas: reutilizar el `StorageProvider` de `add-image-storage`.

## Non-Goals

- No se sirve ninguna resolución distinta de `front-250`.
- No se agrega una plataforma nueva (Workers, Cloudflare Images, cola de jobs). El espejo corre en la app y los procesos periódicos son scripts.
- No se programa la ejecución periódica de la revalidación (cron/infra). Se entrega el script y queda documentado cuándo correrlo.
- No se redactan los términos legales de `/terms` (siguen como placeholder por `legal-pages`). Solo se agrega el canal de contacto para pedir el retiro.
- No se toca la tabla `image` ni el ciclo de vida de imágenes propias: las carátulas son copias de terceros con clave determinista, no archivos propios.
- No se migra ni se reescribe `release.cover_thumb_url` (fallback legado).

## What Changes

- **Espejo bajo demanda.** Al resolver una carátula, el servidor hace un único `GET` a CAA (reemplaza al `HEAD`), la convierte a WebP con `sharp`, la sube al storage con una clave versionada por contenido (`covers/{mbid}/{hash}.webp`) y `Cache-Control: immutable`, y guarda la URL servible en `release_group.cover_thumb_url`. Si el espejo no está habilitado o falla, se conserva el comportamiento actual (URL de CAA).
- **El espejo se habilita solo con sus condiciones cumplidas.** Requiere un proveedor de storage configurado **y** el contacto de retiro (`COVER_ART_TAKEDOWN_EMAIL`). Sin alguno de los dos, la app sigue haciendo hotlink como hoy.
- **Caché de negativos.** Un álbum sin carátula se vuelve a consultar como máximo una vez cada 7 días, no en cada visita.
- **Render directo en páginas densas.** La discografía de artista incluye la carátula ya conocida en el payload inicial. `LazyCoverImage` solo resuelve las carátulas todavía sin resolver.
- **Optimizador de Next solo donde aporta.** Sigue activo por defecto, con `minimumCacheTTL` de 30 días. Un wrapper único, `AppImage`, lo saltea solo para fuentes ya preprocesadas: carátulas espejadas (~5 KB) y avatares (256 px). ESLint prohíbe importar `next/image` fuera del wrapper, así que una fuente nueva no prevista pasa por el optimizador sin depender de una regla documental.
- **Scripts operativos:** backfill del espejo para las carátulas ya resueltas; revalidación (seguir a la fuente: borrar o reemplazar si CAA la retiró o la cambió); retiro de una carátula a pedido, con marca persistente para que no se vuelva a espejar.
- **Contacto público de retiro** en el bloque de atribución del footer, visible solo si `COVER_ART_TAKEDOWN_EMAIL` está configurado.
- **Documentación:** se actualiza la sección C de `data-licensing.md` (se permite el espejo con condiciones), el riesgo 9 pasa a mitigado, y se crea el ADR 0018. También se actualizan `sql-model.md`, `contracts.md` y `.env.example`.

## Capabilities

### New Capabilities
- `cover-art-mirror`: espejo propio de miniaturas de Cover Art Archive. Cubre las condiciones de habilitación, la conversión y el almacenamiento con clave versionada, el fallback al hotlink, la revalidación contra la fuente, el retiro a pedido, el backfill y la prohibición de exponer las carátulas como colección.

### Modified Capabilities
- `cover-art-resolution`: la resolución pasa de `HEAD` a `GET` con espejo, `cover_thumb_url` pasa a guardar la URL servible (espejo o CAA), el reintento de negativos queda limitado a una vez cada 7 días, y un álbum retirado deja de resolverse.
- `catalog-artist`: la carga progresiva de carátulas se limita a las no resueltas; las de URL conocida, ausencia confirmada o retiradas se renderizan en la carga inicial.
- `site-footer`: el bloque de atribución incorpora el contacto para pedir el retiro de una carátula cuando está configurado.

## Impact

- **DB:** migración `0047` que agrega a `release_group` las columnas `cover_storage_key`, `cover_checked_at` y `cover_blocked_at`.
- **Código:** `src/services/cover-art.ts`, `src/services/catalog/cover.ts`, `album-detail.ts` (espejo en segundo plano con `after()`), `StorageProvider.put` (acepta `Cache-Control`), servicio y ruta de discografía de artista, `LazyCoverImage`/`AlbumCard`, `Footer`, `src/lib/site-links.ts`, `next.config.mjs`, 3 scripts nuevos en `scripts/`, el wrapper `src/components/ui/AppImage.tsx` (los 14 componentes que hoy importan `next/image` pasan a usarlo) y una restricción nueva en `eslint.config.mjs`.
- **API:** la discografía de artista agrega `coverThumbUrl` y `coverResolved` a cada release-group (cambio aditivo). `GET /api/catalog/release-group/{id}/cover` conserva su contrato.
- **Sin dependencias nuevas:** reutiliza `sharp` y `@aws-sdk/client-s3`.
- **Costo:** con ~50.000 carátulas de ~5 KB, alrededor de 250 MB, dentro del plan gratuito de R2 (10 GB, sin costo de egress). La mayoría de las lecturas las responde la caché del CDN.
- **Rollback:** quitar `COVER_ART_TAKEDOWN_EMAIL` o el storage devuelve la app al hotlink. Las URLs ya espejadas siguen sirviéndose hasta que se corra el script de revalidación o de backfill inverso.
