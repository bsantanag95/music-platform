## Context

Cambio de texto del hero sin sesión (`AnonHero`), que lee `heroLine1`, `heroLine2` (en ámbar) y `anonSubtagline` de
`messages/{es,en}/home.json`. El requisito «Contenido de Inicio diferenciado por sesión» de `home` fijaba el encuadre «el álbum como una
obra» desde `reframe-anon-landing-album-forward`.

## Goals / Non-Goals

**Goals:** titular que nombre el producto; bajada en el orden registrar → opinar (opcional) → descubrir por personas.

**Non-Goals:** componentes, diseño, cierre y cabecera.

## Decisions

- **Mismas claves, texto nuevo.** No cambia la estructura (dos líneas + bajada), así que no se tocan componentes ni tests de estructura;
  `client-messages.json` no cambia porque el hero es de servidor.
- **«Diario» en lugar de «historial».** Es el nombre de la sección del producto y lo que muestra la entrada de ejemplo; «historial» se
  confunde con el del navegador y se repetía en el cierre.
- **El encuadre «el álbum es una obra» sale del requisito**, no de la página: la sección del reencuadre en `home.md` queda como historia.
  *Alternativa descartada:* conservar la frase como titular (alternativa A), más fiel al reencuadre anterior pero que sigue sin decir qué
  es el sitio.
- **Inglés:** «A diary of everything you listen to. / And of what others are hearing.»

## Risks / Trade-offs

- [Se pierde la frase más propia del landing] → Puede volver en el cierre en un cambio aparte si se quiere conservar.
- [Titular más largo: 34 caracteres frente a 21] → Con la escala anterior ocupaba cinco líneas a 1440 px (seis en inglés a 390). Se
  reduce la escala del titular a `clamp(2.25rem, 4.2vw, 4rem)` y la columna de texto pasa a `1.15fr` frente a `1fr` de la caja de
  carátulas: cuatro líneas a 390, 1024 y 1440 px en los dos idiomas. La segunda línea en inglés se acorta a «And of what others are
  hearing.».
