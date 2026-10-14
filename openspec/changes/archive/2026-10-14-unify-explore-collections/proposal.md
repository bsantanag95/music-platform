## Why

El riel de colecciones de `/explore` está partido por `user_list_featured.source` (`curated` contra `template`), es
decir por **cómo se mantiene** la colección, no por lo que significa. A quien mira no le sirve ese dato: las dos son
contenido oficial de la plataforma, firmado por la cuenta curadora, y la diferencia solo le importa a quien edita,
porque la plantilla sobreescribe sus ítems en la próxima corrida y la manual no.

La partición además dejó un hueco: la familia se deriva de `template_key`
([families.ts](../../../src/services/discovery/collections/families.ts)), así que una colección escrita a mano queda
con `family: null` y no tiene dónde ubicarse en `/explore/collections`, donde solo se agrupan las automáticas. Una
colección editorial temática ("Discos de culto", "Bandas que antecedieron a otras") no encuentra lugar en la
estructura, y quien la publica no entiende por qué aparece en un riel aparte del resto.

## What Changes

Se establece un modelo de dos conceptos, separados por **de quién es la voz**, que es lo único que el lector percibe:

- **Colección** — contenido de la plataforma. Se arma a mano o por plantilla, indistinto para quien mira. Vive en
  Explorar y en `/explore/collections`, se organiza por familia.
- **Lista** — contenido de una persona. Vive en `/lists` y en el perfil, se organiza por autor y popularidad.

Cambios concretos:

- **BREAKING** `/explore` deja de mostrar dos riles ("Selección editorial" y "Descubre") y muestra **un solo riel
  "Colecciones"** que mezcla curadas y generadas en una secuencia ordenada única, con tope de 10 tarjetas y
  desplazamiento horizontal con controles `< >`. Revierte la parte de presentación del ADR 0036.
- **BREAKING** La familia pasa a ser propiedad de la colección y no de la plantilla: columna `family` en
  `user_list_featured`, con relleno desde el registro actual para las filas `template`. Destacar a mano exige elegir
  familia.
- **BREAKING** El orden es una secuencia única sobre las dos fuentes. Desaparece el reordenamiento por grupo, donde
  mover un grupo no afectaba al otro.
- La familia `community` se renombra a `rankings`: hoy agrupa rankings calculados de la actividad de la gente
  (`top-rated-quarter`, `most-reviewed-month`) y el nombre choca con "Listas de la comunidad".
- `/explore/collections` pasa de tres bloques a dos: las colecciones vigentes agrupadas por familia, con las manuales
  incluidas, y el archivo. El archivo no cambia de forma.
- `/lists` → "Destacadas" deja de mostrar tarjetas de colecciones curadas y en su lugar enlaza a
  `/explore/collections`. Una colección no es una lista. Las listas editoriales oficiales no destacadas siguen ahí.
- La consola conserva la distinción, que es donde sí importa: las pestañas "Destacadas en Explorar" y "Generadas
  automáticamente" siguen separadas, porque quien edita necesita saber qué sobreescribe la próxima corrida.
- ADR nuevo que reemplaza la decisión de presentación del ADR 0036 y documenta el modelo Colección / Lista.

Fuera de alcance, explícitamente:

- No se crea una familia "La casa recomienda" ni ninguna otra señal visible de "esto lo eligió una persona".
- No se aborda destacar listas de la comunidad: hoy `featureList` solo acepta listas de `@exploracion`, y abrirlo es
  un cambio aparte, con su propio modelo de autoría.

## Capabilities

### New Capabilities

Ninguna. El cambio reordena el modelo de capacidades existentes; no introduce una superficie nueva.

### Modified Capabilities

- `album-discovery`: la composición de `/explore` pasa de nueve secciones con dos riles de colecciones a ocho con uno;
  el requisito "Colecciones destacadas" describe un riel único, mezclado, con tope 10 y desplazamiento horizontal.
- `explore-collections-hub`: la familia se guarda en la fila y aplica también a las curadas; desaparece "las
  colecciones curadas no tienen familia"; la página pasa a dos bloques; la familia `community` se renombra a
  `rankings`.
- `explore-featured-management`: destacar a mano exige familia; el reordenamiento es una secuencia única sobre las dos
  fuentes y el estado "dentro del tope" se evalúa contra un tope único.
- `community-lists`: la sección "Destacadas" de `/lists` deja de incluir las colecciones curadas y gana un enlace a la
  página de colecciones.

## Impact

- **Esquema:** migración nueva con `family` en `user_list_featured` (`CHECK` sobre las familias válidas, `NOT NULL` tras
  el relleno) y renombre del valor `community` a `rankings` en las filas existentes. Espejo en `src/db/schema.ts` y en
  `docs/03-data/sql-model.md`.
- **Servicios:** `src/services/discovery/discovery.ts` (`listEditorialCollections`, `listAutomaticCollections`,
  `listCollectionsHub`, `GROUP_SOURCE`), `src/services/discovery/featured.ts` (reorden por grupo, `railIdsOf`),
  `src/services/discovery/collections/families.ts` (la familia deja de derivarse), `src/services/lists/community.ts`
  (Destacadas).
- **Generación:** `src/services/discovery/collections/generate.ts` persiste la familia de la plantilla en la fila.
- **UI:** `CollectionRail` necesita una variante de carrusel con controles `< >` accesibles por teclado (hoy es una
  rejilla); `src/app/[locale]/(catalog)/explore/page.tsx`, `.../explore/collections/page.tsx`,
  `src/components/admin/FeaturedPanel.tsx` (familia al destacar, orden único) y la navegación rápida de Explorar.
- **Constantes:** `EDITORIAL_RAIL_LIMIT` y `AUTOMATIC_RAIL_LIMIT` se reemplazan por un tope único;
  `HUB_EDITORIAL_LIMIT` y `HUB_AUTOMATIC_LIMIT` se unifican.
- **API:** el contrato de reordenamiento de destacadas deja de recibir el grupo; `docs/04-api/contracts.md` y
  `errors.md` se actualizan en el mismo cambio.
- **Docs:** `docs/05-features/explore.md`, `docs/05-features/lists-and-favorites.md`, ADR nuevo, y `AGENTS.md` para lo
  que verifica el smoke test.
- **Pruebas:** smoke test `scripts/smoke-test-explore-collections.ts` (riel único, familia en la fila, orden único) y
  las unitarias de Explorar, la página de colecciones, la consola y `/lists`.
