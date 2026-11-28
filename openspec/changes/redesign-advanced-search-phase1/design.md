## Context

`/search/advanced` (redesign-advanced-search, refine-advanced-search-phase1–3, add-catalog-search-fields y
split-person-search-types) es un formulario GET por pestaña dentro de una tarjeta, agrupado en Identidad · Origen · Época ·
Del catálogo (Artistas), Identidad · Lanzamiento · Del catálogo (Álbumes) e Identidad · Lanzamiento (Canciones). Con una
búsqueda, el formulario se recoge tras la barra de criterios (`AdvancedSearchDisclosure`, «Editar búsqueda»). Los campos
son no controlados: sin JavaScript el navegador envía todo; con JavaScript, `formParams` navega solo con lo que tiene valor
y la fila de envío cuenta los criterios.

La auditoría y los mockups están en `mockups/advanced-search-2026-11/`. La persona eligió **C · Facetas con las pastillas de
A** (`c-facetas.html` y `a-ficha.html`).

## Goals / Non-Goals

**Goals:** marco de 88rem y escala de título; pestañas en pastillas; Tipo, Estado y Tipo de lanzamiento como pastillas;
etiqueta visible del catálogo; letra mínima de 12 px.

**Non-Goals:** columna de filtros, resultados primero, hoja del teléfono y atajos de década (fases 2 y 3); URL, criterios y
endpoint.

## Plan de las tres fases

| Fase | Cambio | Contenido |
| --- | --- | --- |
| 1 | `redesign-advanced-search-phase1` (este) | Marco de 88rem y título; pestañas en pastillas; Tipo, Estado y Tipo de lanzamiento como pastillas; etiqueta «solo lo ya cargado» en el grupo del catálogo; letra mínima de 12 px. El formulario sigue en su tarjeta y se recoge tras buscar. |
| 2 | `redesign-advanced-search-phase2` | **Facetas en escritorio.** Desde `lg`, los resultados van primero. Un mismo `<form>` reparte el campo Nombre/Título con Buscar sobre la lista y el resto de grupos en una columna izquierda fija (3/12), con secciones plegables (`<details>`, abiertas si tienen valor o son las primeras) y «Aplicar» con la cifra de criterios al pie. Sobre la lista, los criterios aplicados como pastillas con «Quitar todo». Desde `lg` el formulario ya no se recoge («Editar búsqueda» solo por debajo). Sin criterios, la columna principal muestra la introducción y los ejemplos. |
| 3 | `redesign-advanced-search-phase3` | **Hoja en el teléfono.** Por debajo de `lg`, resultados primero: el campo Nombre/Título arriba y «Filtros · N», que abre una hoja inferior (diálogo modal: foco atrapado, Escape, sin desplazar el fondo) con los mismos grupos y «Aplicar» fijo. Atajos de década (70s, 80s, 90s, 2000s…) bajo los rangos de año, que rellenan desde/hasta. |

Cada fase se archiva, se fusiona y se publica antes de empezar la siguiente.

## Decisions

### D1. Pastillas como radios y casillas reales

Tipo y Estado son `<input type="radio">` visualmente ocultos (`sr-only`), cada uno dentro de su `<label>` con forma de
pastilla. El aspecto de la marcada sale de `has-[:checked]` y el foco, de `has-[:focus-visible]`. El grupo es un `<fieldset>`
con su `<legend>`. La opción «Cualquiera» lleva `value=""`, así que `formParams` la omite como hoy y sin JavaScript el
servidor ignora el vacío. El Tipo de lanzamiento sigue siendo `<input type="checkbox" name="category">`, ahora con la misma
pastilla. Teclado: flechas dentro de los radios y espacio en las casillas (comportamiento nativo).

El cambio de etiqueta del año según el tipo (`artistType` en estado) escucha `onChange` del grupo de radios en lugar del
`<select>`. El recuento de criterios ya escucha cambios del formulario.

*Alternativa descartada:* botones con `aria-pressed` y un input oculto. Exige JavaScript para enviar y duplica la
semántica nativa.

### D2. Grupo del catálogo

La leyenda «Del catálogo» lleva al lado una etiqueta «solo lo ya cargado» (`font-data` 12 px, borde y texto petróleo, el
mismo color que «en el catálogo» de los resultados). La ayuda del grupo pasa a `font-body` 14 px, sin acento. El título del
grupo sigue sin color de acento (requisito vigente).

### D3. Tamaños

`hintClass` y los contadores pasan de 11 px a 12 px (`text-xs`). Las leyendas de grupo pasan de 11 px a 12 px. Los
ejemplos de la portada usan 12 px en su línea de datos.

### D4. Marco, título y pestañas

`<main>` usa el marco de las páginas rediseñadas (`max-w-[88rem] px-4 sm:px-8 xl:px-12`). El título pasa a
`font-display font-bold` 30–44 px, como Explorar o Listas. La tarjeta del formulario conserva su ancho de lectura (~64rem):
estirarla a 88rem dejaría líneas de campos demasiado largas antes de la fase 2. Las pestañas pasan al estilo de pastillas de
`/search` (`SearchTypeTabs`): se extrae una pieza común o se replica la clase.

## Risks / Trade-offs

- [Los tests buscan `combobox` para Tipo y Estado] → Se actualizan a `radio` por nombre accesible. El parámetro de la URL no cambia.
- [Ocho pastillas de categoría y década pueden ocupar dos filas en el teléfono] → En Álbumes son 4 de tipo de lanzamiento. Las décadas llegan en la fase 3.
- [La tarjeta queda más estrecha que el marco] → Es temporal: la fase 2 reparte el ancho entre filtros y resultados.

## Migration Plan

Solo interfaz; se revierte con el commit.

## Open Questions

Ninguna.
