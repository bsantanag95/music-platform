## Context

`Footer` (server) arma: identidad, «Explorar», «Tu cuenta», y una columna con «Recursos» y «Conectar» en una rejilla `md:grid-cols-2
lg:grid-cols-[...]`, y debajo la atribución y la barra inferior. Por debajo de `md` todo se apila en una columna con `gap-8`, `py-12` y
enlaces en línea de 18 px. Un prototipo inyectado en `/es/about` a 390 px (enlaces de cada grupo en dos columnas, títulos fuera de la
vista, tagline fuera, 40 px por enlace, márgenes de 32 px) midió 846 px.

## Goals / Non-Goals

**Goals:** pie móvil por debajo de 900 px, áreas táctiles de 40 px, misma estructura accesible.

**Non-Goals:** cambiar el pie desde `md`, acortar la atribución, ocultar enlaces.

## Decisions

### Solo clases responsivas, misma estructura
Se mantiene el mismo DOM (un `<nav>` con `aria-label` y `h2` por grupo, `contentinfo` único) y se cambia la presentación por debajo de
`md` con utilidades: los `h2` de grupo `sr-only md:not-sr-only`; las listas de cada grupo `grid grid-cols-2` (desde `md`, columna);
`FooterLink` con `flex min-h-10 items-center` (desde `md`, en línea sin alto mínimo); el contacto, las redes, las políticas y «volver
arriba» con el mismo alto mínimo. *Alternativa descartada:* una sola lista de ocho enlaces en dos columnas, como el prototipo — rompe los
grupos `<nav>` etiquetados que pide la spec de accesibilidad; con un `<nav>` por grupo y 24 px entre grupos, la lectura es casi igual.

### Qué frase de identidad queda
La spec pide la tagline y una frase de que no es un servicio de reproducción. En móvil se oculta la tagline (`hidden md:block`): la otra
lleva la aclaración que importa. Ambas siguen en el DOM y en escritorio.

## Risks / Trade-offs

- [Los títulos ocultos hacen menos evidente el agrupamiento a la vista] → Separación de 24 px entre grupos y el orden ya conocido del
  menú.
- [40 px por enlace alarga cada grupo] → Las dos columnas lo compensan; la medición del prototipo da 846 px.

## Migration Plan

Sin datos; revertir el commit restaura el pie anterior.
