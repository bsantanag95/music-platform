## Context

`explore/page.tsx` compone la portada con un `getExplorePage()` y `listRecentCeremonies(5)`. Orden actual: Colecciones,
Género, Novedades, Próximos, Premios, Década, Mejor valorados, Más reseñados. Cada sección se omite si no tiene
contenido (los componentes devuelven `null`). Los rieles de álbumes ya tienen ancla (`novedades`, `proximos`,
`mejor-valorados`, `mas-resenados`) y Premios también (`premios`); Colecciones, Género y Década no.

## Goals / Non-Goals

**Goals**: nuevo orden; navegación rápida que solo enlaza a lo que se renderiza.
**Non-Goals**: barra fija, sección activa, Premios estacional, cambios de contenido, esquema, REST.

## Decisions

1. **Agrupar por intención, no por tipo de componente.**

   ```
   Entrada        1 Colecciones    2 Género
   Lo que pasa    3 Novedades      4 Próximos     5 Premios
   La comunidad   6 Mejor valorados   7 Más reseñados
   Cierre         8 Década
   ```

   Solo Década se mueve. Colecciones y Género siguen arriba (ancla editorial y eje de navegación del producto);
   Premios queda con la actualidad; la comunidad sube sobre un histograma de menor intención. Alternativa
   descartada: poner Género y Década juntos como "Explorar por". Son dos entradas de peso muy distinto y juntas
   empujarían los rieles bajo el pliegue.

2. **Anclas con `id` fijo en español**, como las existentes: `colecciones`, `generos`, `novedades`, `proximos`,
   `premios`, `mejor-valorados`, `mas-resenados`, `decadas`. En `CollectionRail`, `FamilyGrid` y `DecadeHistogram` el `id`
   va en el `<section>` (junto con `scroll-mt-24`, que ya tienen los dos últimos, para que el encabezado global no tape el
   título). No es una prop: cada uno se usa una sola vez.

3. **Navegación rápida como Server Component sin estado.** `ExploreJumpNav` recibe la lista de `{ id, label }` de las
   secciones **visibles** y pinta enlaces `<a href="#id">` dentro de un `<nav aria-label>`. Sin JavaScript. La página
   decide la visibilidad con los mismos datos que cada sección usa para omitirse: `featured.length`, `families.length`,
   `newReleases.length`, `upcoming.length`, ceremonias, `topRated.length`, `mostReviewed.length` y `decades.length`. Así
   no hay enlaces a anclas inexistentes.

4. **Se omite con menos de 4 secciones visibles** (`MIN_SECTIONS_FOR_JUMP_NAV = 4`): con un catálogo escaso la página
   cabe casi entera y la fila sería ruido. Constante en `src/services/discovery/constants.ts`, junto a los demás umbrales
   de Explorar.

5. **Etiquetas cortas propias** (`jump.*`): "Colecciones", "Géneros", "Novedades", "Próximos", "Premios", "Mejor
   valorados", "Más reseñados", "Décadas". No se reutilizan los títulos de sección ("Explorar por género") porque en una
   fila de píldoras se repetiría "Explorar por" y no cabría en móvil.

6. **Presentación.** Fila de píldoras bajo el `<h1>`, con el mismo estilo que los chips de tipo de `ExploreFilterBar`
   (borde, ámbar en hover/foco). En móvil se desplaza en horizontal (`overflow-x-auto`, sin saltos de línea). Sin
   `position: sticky`.

## Risks / Trade-offs

- [La fila agrega alto a la primera pantalla] → Es una sola línea de píldoras de baja altura; la portada ya omite
  introducción para que la primera pantalla muestre contenido.
- [Una sección se oculta y su enlace queda colgando] → La visibilidad se calcula con los mismos datos; la prueba cubre
  que solo se enlazan las visibles.
- [Cambiar el orden altera hábitos de quien ya usa la página] → Solo se mueve una sección; el resto conserva su orden
  relativo.

## Migration Plan

Sin migraciones. Rollback: revertir el commit.

## Open Questions

Ninguna.
