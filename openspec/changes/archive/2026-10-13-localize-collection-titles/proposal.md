## Why

Las colecciones generadas guardan su título como **una sola cadena en español** en `user_list.title`
("Novedades esenciales", "Cumplen años en octubre"). Alguien que usa la interfaz en inglés ve títulos que no
entiende, y la URL mezcla idiomas: `/users/exploracion/lists/novedades-esenciales-<id>` combina las rutas fijas en
inglés (`users`, `lists`), el nombre de usuario de la cuenta curadora (`exploracion`) y un slug sacado del título en
español. Es un defecto de la funcionalidad que ya está en producción de código (ADR 0033 y 0035), no un detalle de
estilo: las colecciones son contenido de la plataforma y deben leerse y compartirse en el idioma de quien las ve.

## What Changes

- **Capa 1 — títulos localizados.** El título de una colección generada **se deriva al leer** de su
  `template_key` y su `period_key` (que ya incluyen año, mes, semana, familia de géneros y premio) con un
  catálogo es/en. Nada se traduce en la base de datos: `user_list.title` se conserva como título canónico en español
  y como respaldo. Los períodos se muestran con el formato del idioma (mes en texto, año), y los títulos con período
  ganan el año ("Cumplen años en octubre de 2026"), que el archivo necesita para no ser ambiguo.
- **Capa 2 — ruta propia bajo Explorar.** Cada colección generada tiene su detalle en
  `/explore/collections/<slug>-<id>`, con el slug del título **en el idioma activo**. La cuenta curadora desaparece de
  la URL. La ruta vieja `/users/exploracion/lists/<slug>-<id>` responde un redirect permanente a la nueva cuando la
  lista es una colección generada; las demás listas no cambian.
- El detalle de una colección generada reutiliza la vista de lista (álbumes, guardar, seguir) con el título
  localizado y el dueño mostrado como la plataforma ("Exploración" / "Explore"), sin enlazar a un perfil de usuario.
- Las tarjetas del rail, la página de colecciones, el archivo, el panel de la consola, la lista de guardadas y la
  pestaña de listas de la cuenta curadora muestran el título localizado y enlazan a la ruta nueva.
- La canonicalización de rutas del catálogo (`resolveCatalogRoute`) suma el tipo `collection`.
- Se corrige una cláusula del ADR 0035: los títulos generados **no** se guardan solo en español como consecuencia
  aceptada; ADR 0037 la reemplaza.

## Capabilities

### New Capabilities
- `localized-collection-titles`: derivación del título de una colección generada por idioma, con año en los
  períodos, formato de fecha del idioma y respaldo al título guardado.
- `explore-collection-detail`: ruta `/explore/collections/<slug>-<id>`, slug por idioma, canonicalización, redirect
  desde la ruta de usuario y dueño mostrado como plataforma.

### Modified Capabilities
<!-- Ninguna: los requisitos nuevos van como ADDED en las capacidades nuevas para no reescribir los vigentes. -->

## Goals / Non-Goals

**Goals:**
- Que ningún texto ni URL de una colección generada exija saber español.
- Cero migración y cero traducción persistida de contenido generado.
- Una sola función de títulos que todas las superficies usen.

**Non-Goals:**
- Traducir los títulos y descripciones de la **selección editorial** (los escribe una persona; guardar un título por
  idioma exige una tabla nueva y una decisión editorial, cambio aparte).
- Localizar el nombre de usuario `exploracion` o su nombre visible en el resto de la app (solo deja de aparecer en las
  colecciones generadas).
- Localizar los textos de las demás listas (siguen siendo de quien las escribió).
- Más idiomas que es y en.

## Impact

- Código: nuevo `src/services/discovery/collections/titles.ts`; `discovery.ts` (lecturas con `locale`);
  `src/lib/catalog-links.ts` y `src/lib/catalog-route.ts`; nueva ruta
  `src/app/[locale]/(catalog)/explore/collections/[segment]/page.tsx`; la ruta de lista de usuario (redirect);
  `CollectionRail`, páginas de Explorar y de colecciones, `FeaturedPanel`/`featured.ts`, `lists/saved-lists.ts` y la
  pestaña de listas del perfil de la cuenta curadora.
- Contrato: `GET /api/admin/editorial/featured` y las lecturas de colecciones devuelven el título localizado además del
  guardado; se documenta en `contracts.md`.
- Docs: `explore.md`, ADR 0037, `AGENTS.md` (smoke test ampliado).
- Sin migraciones ni dependencias nuevas.
