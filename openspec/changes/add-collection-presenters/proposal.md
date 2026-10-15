## Why

El contexto de una colección en su detalle no es un mecanismo, es un `if` en la página
([page.tsx](../../../src/app/[locale]/(catalog)/explore/collections/[segment]/page.tsx)). La cartela de cada disco la
decide `collectionNote(family, fechas)` **por familia**; solo Premios tiene algo más, porque la página pregunta
`family === "awards"` y llama a `ceremonyContext` para sacar la categoría ganada por disco y el texto de la cabecera.
Cada colección nueva que quiera explicarse obliga a tocar la página, y la decisión está en el lugar equivocado: se toma
por familia, pero el contexto es de la **plantilla**.

Eso ya duele. "Lanzamientos" agrupa `new-releases` y `upcoming`, que necesitan cosas distintas ("hace 5 días" contra
"sale en 9 días") y `collectionNote(family, …)` no las distingue. Lo que la plantilla ya sabe (la ventana de 90 días
de Novedades esenciales, el tamaño de era de "Para entrar a…") vive solo en su `plan()` y la página no puede decirlo.
Y `CollectionAlbumGrid` recibe `notes` y `numbered` ya resueltos por la página, así que el componente no puede pedir
otra cosa, como agrupar los discos por mes.

Antes de seguir añadiendo contexto colección por colección, hay que fijar el mecanismo: si el contrato no se define
ahora, cada colección lo inventa a su manera dentro de la página.

## What Changes

- Un **presentador por plantilla**: cada colección generada declara cómo se explica en su detalle, con un contrato
  pequeño y declarativo (`CollectionContext`): una frase de resumen para la cabecera, un enlace opcional, una cartela
  por disco, una agrupación opcional de los discos y si se numeran.
- El presentador devuelve **datos, no texto** (clave de mensaje y parámetros), igual que los títulos derivados
  (ADR 0037): se localiza al presentar y nunca se guarda traducido.
- Un **registro con caída**: presentador de la plantilla → presentador de su familia → sin contexto (la descripción
  genérica de la familia y el año de lanzamiento). Se migra una plantilla a la vez; nada se rompe mientras tanto.
- **Premios** (`grammy-winners`) pasa a ser el primer presentador, con el mismo resultado visible que hoy.
- **La caída por familia** (efemérides → aniversario, lanzamientos → fecha, resto → año) pasa a presentadores de
  familia con el mismo resultado visible, para que la página no tenga ninguna rama por familia.
- **Novedades esenciales** (`new-releases`) es el segundo presentador y la prueba del contrato: resumen con el rango
  real de lo que muestra, cartela relativa ("Hace 5 días · 9 oct") y discos agrupados por mes. Si el contrato no alcanza
  para esto, está mal diseñado.
- La página del detalle deja de conocer familias: llama a un único `presentCollection(...)`. `CollectionAlbumGrid`
  aprende a pintar grupos y `CollectionDetailHeader` recibe el resumen y el enlace ya resueltos.
- ADR 0039 con el modelo; `docs/05-features/explore.md` al día.

Fuera de alcance, explícitamente:

- Presentadores para las demás plantillas (`upcoming`, `anniversaries` más allá de lo que ya hay, `one-per-decade`,
  `genre-spotlight`, los rankings). Quedan para cambios siguientes, cuando el contrato esté probado con dos casos reales.
- Las colecciones curadas a mano: se abren en la página de lista de la cuenta curadora, que este cambio no toca. Solo
  el detalle de las colecciones generadas (`/explore/collections/<slug>-<id>`) usa presentadores. Notas por disco
  escritas a mano quedan como decisión aparte.
- Filtros interactivos por tipo (Álbumes / Singles y EPs).
- Cualquier cambio en cómo se generan o rotan las colecciones: `plan()` no cambia.
- Las tarjetas del riel y de la página de colecciones: solo el detalle.
- Migraciones de esquema: el contexto se calcula al leer, no se guarda.

## Capabilities

### New Capabilities

- `collection-presenters`: contrato `CollectionContext`, registro con caída plantilla → familia → nada, localización en
  la presentación, y los casos de Premios, las familias y Novedades esenciales.

### Modified Capabilities

- `explore-collection-detail`: el detalle de una colección generada muestra el contexto de su plantilla (resumen en
  la cabecera, cartela por disco y, si la hay, agrupación) y cae a la descripción genérica de su familia cuando no tiene.

## Impact

- **Servicios:** nueva carpeta `src/services/discovery/collections/presenters/` (contrato, registro, presentadores de
  premios, de familias y de `new-releases`); `src/services/awards/collection-context.ts` se reutiliza desde el
  presentador de Premios.
- **Presentación:** un resolvedor de mensajes (clave + parámetros → texto del idioma activo) junto a
  `src/components/discovery/collection-notes.ts`, que se retira cuando sus ramas pasan a los presentadores.
- **UI:** `[segment]/page.tsx` (sin ramas por familia), `CollectionAlbumGrid` (grupos), `CollectionDetailHeader`
  (resumen y enlace ya resueltos).
- **Mensajes:** nuevo grupo `catalog.explore.collectionContext` en `messages/{es,en}/catalog.json`; la prueba de
  completitud entre idiomas ya existente lo cubre.
- **Esquema y API:** ninguno. El contexto se calcula en la request de la página, sin escribir ni usar `after()`.
- **Docs:** ADR 0039 y `docs/05-features/explore.md`.
- **Pruebas:** unitarias de contrato, registro y cada presentador (fecha de hoy inyectable), del resolvedor de mensajes,
  de `CollectionAlbumGrid` con grupos y de la página; el smoke test de colecciones gana la comprobación de que los
  presentadores reales consultan por lote.
