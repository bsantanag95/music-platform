## Context

`generateCollection` guarda `title` (en español) en `user_list`. Esa cadena alimenta: las tarjetas del rail y de la
página de colecciones (`FeaturedCollection.title`), el archivo, el panel de la consola, el detalle de lista (encabezado
y slug de la URL), la lista de guardadas y la pestaña de listas del perfil `@exploracion`. `listHref(username, title,
id)` arma `/users/<username>/lists/<slug>-<id>`, y `resolveCatalogRoute` canonicaliza el segmento (308) si el slug
cambió. Las rutas públicas del catálogo son iguales en todos los idiomas (`routing.ts` no define `pathnames`), con el
prefijo de locale delante.

El título de una colección generada **es función pura** de `(template_key, period_key)` y del idioma: el período ya
guarda el año (`2026-Q4`, `2026-10`, `2026-W43-rock`, `grammy-2025`) y la familia de géneros. No hace falta persistir
traducciones.

## Goals / Non-Goals

**Goals:** títulos y URLs sin español obligatorio, derivados y centralizados, sin migración.

**Non-Goals:** selección editorial por idioma, más idiomas, tocar el usuario `exploracion`.

## Decisions

1. **`collectionTitle(templateKey, periodKey, locale, fallback)`** (`collections/titles.ts`, puro, sin BD): despacha por
   plantilla y devuelve el título del idioma, o `fallback` (el `user_list.title` guardado) si la clave no existe o el
   período no se puede interpretar. Plantillas e interpretación del período:
   | Plantilla | Período | es | en |
   |---|---|---|---|
   | `new-releases` | `evergreen` | Novedades esenciales | Essential new releases |
   | `upcoming` | `evergreen` | Lo que viene | What's coming |
   | `one-per-decade` | `evergreen` | Un disco por década | One album per decade |
   | `grammy-winners` | `<premio>-<año>` | Ganadores del Grammy 2025 | Grammy winners 2025 |
   | `anniversaries` | `AAAA-MM` | Cumplen años en octubre de 2026 | Anniversaries in October 2026 |
   | `genre-spotlight` | `AAAA-Www-<familia>` | Para entrar a Rock | Getting into Rock |
   | `top-rated-quarter` | `AAAA-Qn` | Mejor valorados del 4.º trimestre de 2026 | Top rated of Q4 2026 |
   | `most-reviewed-month` | `AAAA-MM` | Lo más reseñado de octubre de 2026 | Most reviewed in October 2026 |
   Los meses salen de `Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" })` y los nombres de familia de
   los catálogos `genres.families` de cada idioma. *Alternativa descartada:* `titleEs`/`titleEn` en la fila; duplica
   datos derivables, exige migración y se desfasa si cambia la redacción.
2. **Catálogo de textos** en `messages/{es,en}/catalog.json` (`explore.collectionTitles.*`) con marcadores simples
   (`{month}`, `{year}`, `{family}`, `{award}`, `{quarter}`) que `titles.ts` sustituye sin ICU; así el servicio no
   depende del contexto de React. Una prueba de paridad garantiza que ambos idiomas tengan las mismas claves.
3. **El título guardado no cambia.** `user_list.title` sigue en español: es el respaldo y lo leen consumidores que no
   tienen idioma (scripts, consola vieja). Nunca se hace `UPDATE user_list` desde las lecturas.
4. **Una sola ruta de salida del título.** Las lecturas que arman `FeaturedCollection` / archivo reciben `locale` y
   devuelven `title` ya localizado y `storedTitle`. Un asistente `localizedTitlesFor(listIds, locale)` consulta
   `user_list_featured` (solo filas `template`) y devuelve un mapa `id → título` para las superficies que leen listas
   por otro camino (guardadas, pestaña de listas de `@exploracion`, panel de la consola). Las listas que no son
   generadas conservan su título.
5. **Ruta de detalle `/explore/collections/[segment]`.** `segment = <slug del título localizado>-<id>`; la página
   resuelve por id, comprueba que la lista sea una colección generada (fila `template`, lista pública y visible) y
   canonicaliza con `resolveCatalogRoute({ kind: "collection", ... })` (nuevo tipo con base `explore/collections`).
   Reutiliza `ListDetailHeader` y `ListItemsView`. Para guardar/seguir usa las mismas acciones de lista (por id), sin
   depender del nombre de usuario.
6. **Dueño como plataforma.** En el detalle de una colección generada, el dueño se muestra como la plataforma
   ("Exploración" / "Explore", mensaje i18n) y no enlaza a `/users/exploracion`. `ListDetailHeader` gana una propiedad
   opcional `ownerLabel`; sin ella se comporta como hoy.
7. **Redirect de la ruta vieja.** `users/[username]/lists/[listId]` comprueba, tras cargar la lista, si es una colección
   generada y responde `permanentRedirect` a `collectionHref(titleLocalizado, id)`. Los enlaces ya compartidos y los
   de guardadas siguen funcionando.
8. **`collectionHref(title, id)`** en `catalog-links.ts` arma `/explore/collections/<slug>-<id>`; `CollectionRail` la
   usa para las generadas y `listHref` para las curadas (que siguen siendo listas de la cuenta curadora). La ruta
   `/explore/collections` (página) y `/explore/collections/<segment>` (detalle) conviven: el primer segmento libre es
   el detalle.
9. **Lista de guardadas y perfil de `@exploracion`.** Muestran el título localizado y enlazan a la ruta nueva; la
   pestaña de listas del perfil de la cuenta curadora **deja de listar las colecciones generadas** (no son listas
   personales; se descubren en Explorar), igual que ya hace `/lists`.

## Risks / Trade-offs

- **Período no interpretable** (formato futuro o clave retirada) → `collectionTitle` devuelve el título guardado; nunca
  falla ni muestra una clave cruda.
- **El slug cambia con el idioma** → `/es/explore/collections/novedades-esenciales-<id>` y
  `/en/explore/collections/essential-new-releases-<id>` son canónicas cada una en su idioma; el `id` resuelve cualquiera
  y `resolveCatalogRoute` corrige el slug con un 308.
- **Título derivado ≠ título guardado** → el archivo ve "Cumplen años en octubre de 2026" aunque lo guardado diga
  "Cumplen años en octubre"; es deliberado (el año desambigua) y queda en el spec.
- **Más trabajo por lectura** → es una derivación de cadena en memoria; el asistente por lote hace una consulta por
  superficie, no por lista.
- **Redirect permanente equivocado** → solo se emite para listas con fila `template`; una lista personal nunca se
  redirige. Con la fila ausente el comportamiento es el de hoy.

## Migration Plan

1. Desplegar el código; no hay migración ni backfill.
2. Los enlaces antiguos a colecciones generadas redirigen (308) a la ruta nueva; los demás no cambian.
3. Rollback: volver atrás restaura las URL de usuario; las colecciones siguen existiendo intactas.

## Open Questions

- La selección editorial en dos idiomas (título y descripción por idioma) queda para un cambio aparte, con su tabla.
