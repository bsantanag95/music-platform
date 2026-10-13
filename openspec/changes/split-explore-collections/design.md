## Context

Hoy `listFeaturedCollections()` devuelve un único conjunto (`user_list_featured` vigente, tope 6) que mezcla filas
`curated` (lista oficial destacada a mano, ADR 0034) y `template` (generadas, ADR 0033/0035). `/explore` lo pinta
en un solo `CollectionRail`; la Inicio anónima usa la misma función; `/lists` → Destacadas lee la tabla sin mirar
el origen; la consola calcula "dentro del tope" y el orden con un único conjunto (`PUT /featured/order` exige el
conjunto completo de filas vigentes o programadas).

Las listas vencidas **ya se conservan**: una generada que sale del riel recibe `expires_at` y sigue siendo pública y
accesible por su URL. El archivo existe; falta una superficie que lo muestre.

## Goals / Non-Goals

**Goals:** separar editorial y automática en lectura, UI, orden y consola sin migrar datos; una página para
recorrerlo todo; que una plantilla nueva solo exija declarar su familia.

**Non-Goals:** plantillas nuevas, efemérides de personas, tocar la Inicio anónima, curaduría de contenido.

## Decisions

1. **El grupo se deriva de `source`, sin columna nueva.** `curated` → grupo `curated` (rail "Selección editorial");
   `template` → grupo `automatic` (rail "Descubre por datos"). *Alternativa descartada:* columna `group`; duplica
   `source` y exige migración.
2. **Familia por plantilla, en código** (`collections/families.ts`): `COLLECTION_FAMILIES` mapea `template_key` →
   `ephemeris | awards | releases | discovery | community`, con `discovery` como respaldo para una clave que ya no
   existe (archivo de una plantilla retirada). Hoy: `anniversaries` → `ephemeris`; `grammy-winners` → `awards`;
   `new-releases`, `upcoming` → `releases`; `genre-spotlight`, `one-per-decade` → `discovery`; `top-rated-quarter`,
   `most-reviewed-month` → `community`. Las curadas no tienen familia (son "editorial"). *Alternativa descartada:*
   guardar la familia en la fila; una plantilla retirada la perdería y exigiría migración.
3. **Lecturas separadas** en `discovery.ts`: `listEditorialCollections()` y `listAutomaticCollections()`, ambas con
   `featuredRailCondition()` filtrada por `source`, orden `weight desc, rank asc, starts_at desc` y tope propio
   (`EDITORIAL_RAIL_LIMIT` = `AUTOMATIC_RAIL_LIMIT` = 6; el valor de `FEATURED_RAIL_LIMIT` se conserva para la Inicio
   anónima, que sigue con `listFeaturedCollections()` mezclado). `FeaturedCollection` gana `family` y `source`.
4. **Página `/explore/colecciones`** (Server Component, bajo el mismo `isExploreEnabled`):
   - "Selección editorial": todas las curadas vigentes (sin tope de 6, pero acotadas a 48).
   - "Colecciones automáticas": las vigentes agrupadas por familia, cada grupo con su etiqueta.
   - "Anteriores" (archivo): filas `template` vencidas (`expires_at <= now()`) de listas públicas y visibles, de la más
     reciente a la más antigua, 24 por página (`?pagina=`), filtrables por `?familia=`. Sin consulta de comunidad ni
     afinidad.
   Las tarjetas reutilizan la tarjeta de `CollectionRail`, extraída a un componente de tarjeta compartido.
5. **Ruta localizada** siguiendo la convención de `src/i18n/routing`; "Ver todas →" de cada rail enlaza a la página y
   la navegación rápida de `/explore` incluye ambos riles.
6. **Consola: orden por grupo.** `PUT /featured/order` recibe `{ group, listIds }` y el conjunto que debe coincidir es el
   de las filas vigentes o programadas **de ese grupo**; `FEATURED_ORDER_CONFLICT` si difiere. Dos grupos, dos
   órdenes independientes, así reordenar la editorial no mueve las automáticas. El panel "Destacadas en Explorar"
   muestra los dos grupos y "dentro del tope" se evalúa por grupo (`railListIds(group)`). Destacar sigue siendo solo
   curado (una automática no se "destaca": la crea su plantilla).
7. **`/lists` → Destacadas excluye `template`.** Las colecciones automáticas son contenido de la plataforma para
   explorar, no listas de la comunidad ni editoriales; viven en Explorar. Las curadas (oficiales) siguen en ambas
   puertas.
8. **Nombres.** Rail editorial: "Selección editorial". Rail automático: "Descubre por datos" (provisional, es solo
   un mensaje i18n). Página: "Colecciones". "Hoy en la música" se reserva para la futura sección de efemérides de
   personas, porque implica actualidad que muchas colecciones no tienen.

## Risks / Trade-offs

- **Rail editorial vacío al lanzar** (nadie ha curado aún) → se oculta; el automático lleva la portada. La página y la
  consola dejan claro que falta curaduría.
- **Quien reordenaba el conjunto mezclado** → el contrato de `PUT /featured/order` cambia (`group` obligatorio); la
  UI es el único cliente y se actualiza a la vez.
- **El archivo crece** (~52 listas de `genre-spotlight` al año) → paginado de 24 y filtro por familia.
- **Una plantilla retirada del registro** → sus filas viejas caen a la familia de respaldo `discovery` en el archivo.
- **Duplicación de tarjetas curadas** entre `/lists` y Explorar → es la misma lista, dos puertas; no hay datos
  duplicados.

## Migration Plan

1. Desplegar el código; no hay migración.
2. Verificar con un par de filas `curated` y las `template` existentes que cada rail muestra lo suyo.
3. Rollback: volver a la versión anterior restaura el riel mezclado; el contrato de orden vuelve a no pedir `group`.

## Open Questions

- Nombre definitivo del rail automático ("Descubre por datos" es provisional).
