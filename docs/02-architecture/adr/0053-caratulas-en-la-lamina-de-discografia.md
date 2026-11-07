# ADR 0053: Carátulas en la Lámina de discografía

**Estado:** Aceptada (2026-11-07, `add-discography-lamina-phase1`). Amplía el ADR 0051 sin reescribirlo.

## Contexto

El ADR 0051 permite hasta 10 carátulas en lo que arma una persona y deja en 4 lo que compone el sistema. También dejó pendiente la gráfica de discografía,
que puede tener decenas de discos. Esa Lámina es derivada: no la arma nadie a mano, así que por la letra del ADR tendría 4, y con menos de 5 carátulas la gráfica
pierde lo que la hace reconocible. Las carátulas tienen copyright de sus sellos, y una imagen que junta muchas se acerca a la "exposición como colección" que
`data-licensing.md` §C evita. Esto no es una opinión legal.

## Decisión

Una **Lámina de discografía** puede juntar hasta **10 carátulas**, con todas las condiciones del ADR 0049, aunque la imagen muestre hasta 20 discos:

- llevan carátula los 10 mejor valorados; los demás, el recuadro tipográfico con título y año;
- cada carátula va a 250 px como máximo, sin ampliar, por el pipeline de siempre;
- cada disco queda identificado por su año, su nota y su lugar en la carrera de una persona;
- con la línea de créditos, respetando los retiros y sin exponer URL ni claves.

Lo demás que compone el sistema (género, ceremonia, clase de salón, colección, lista, Camino, colección física) sigue en 4.

## Alternativas descartadas

- **Hasta 20 carátulas:** se parece más a SeriesGraph, pero es la decisión con más riesgo, y a 20 columnas una carátula mediría unos 48 px.
- **Sin carátulas:** ningún riesgo, pero una tabla de números se comparte poco.
- **Mantener 4:** cuatro carátulas en una grilla de veinte no dicen nada.

## Consecuencias

- Una discografía de 20 discos se lee como notas con algunas carátulas, no como una pared de portadas.
- La vista Por canción (Fase 2) entra en este tope: sus cabeceras de columna son los mismos discos.
