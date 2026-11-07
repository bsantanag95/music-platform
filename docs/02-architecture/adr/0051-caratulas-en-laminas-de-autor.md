# ADR 0051: Carátulas en las Láminas de autor

**Estado:** Aceptada (2026-11-06, `add-top-n-lamina-phase1`). Amplía el ADR 0049 sin reescribirlo.

## Contexto

El ADR 0049 permite que una imagen para compartir junte hasta 4 miniaturas. Un Top 10 necesita 10 y una grilla 3×3, 9: con 4, el
formato pierde lo que lo hace compartible. Las carátulas tienen copyright de sus sellos. Mostrarlas para identificar el disco es la
práctica habitual de estos formatos, pero eso no es una opinión legal, y una imagen que junta muchas se acerca más a la "exposición
como colección" que `data-licensing.md` §C evita.

## Decisión

Una **Lámina armada por una persona** puede juntar hasta **10 carátulas**, con todas las condiciones del ADR 0049:

- cada una a 250 px como máximo, sin ampliar, por el pipeline de siempre;
- identificando su disco dentro de un ranking concreto, con título, puesto o lugar propio;
- con la línea de créditos;
- respetando los retiros: una carátula retirada sale como recuadro tipográfico;
- sin exponer URL ni claves.

Todo lo que el sistema compone solo (género, ceremonia, clase de salón, colección, lista, Camino, colección física) sigue en 4.

## Alternativas descartadas

- **Mantener 4:** el Top 5 mostraría cuatro carátulas y el resto como texto; Top 10 y grilla casi sin imágenes.
- **Sin tope:** una gráfica de discografía podría juntar decenas. Se decide cuando llegue ese formato, con su propio análisis.

## Consecuencias

- El tope vive en un solo lugar (`MAX_COVERS`, `src/services/share/targets/lamina.ts`): bajarlo es un cambio de una línea si un sello lo
  objeta.
- La distinción es quién elige: lo que arma una persona, a diferencia de lo que compone el sistema.
- `add-discography-lamina` necesitará revisar este tope.
