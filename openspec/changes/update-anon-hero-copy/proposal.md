## Why

La revisión del texto del hero sin sesión (2026-11-15) encontró que, tras `redesign-anon-home-phase1`, el titular «El álbum es una obra. /
Tu historial, también.» no dice qué es el sitio y es críptico («tu historial es una obra»); que la bajada empieza por valorar y reseñar,
contra el principio «Presencia ≠ Criterio» (registrar no exige opinar); que su pronombre («Valóralo, reséñalo y vuelve a él») parece
referirse al historial y no al álbum; y que acumula cinco verbos y el anglicismo «sin fricción». Se eligió la alternativa B: nombrar el
mecanismo (el diario) y la parte social desde el titular.

## What Changes

- Titular: «El diario de todo lo que escuchas.» / «Y de lo que escuchan los demás.» (segunda línea en ámbar, como ahora).
- Bajada: «Registra cada álbum sin tener que opinar. Valóralo con estrellas o de 1 a 100 cuando quieras, y descubre música a través de
  personas, no de algoritmos.» — registrar primero, opinar como capa opcional.
- Equivalentes en inglés.
- Escala del titular y reparto de columnas del hero ajustados para que el titular, más largo, siga en cuatro líneas.
- El requisito de `home` deja de exigir que el hero encuadre «el álbum como una obra» y pasa a exigir el diario + descubrimiento por
  personas.

### Goals

- Que el titular diga qué es el producto sin leer nada más.
- Coherencia con «Presencia ≠ Criterio» y con la entrada de ejemplo, que muestra precisamente una entrada del diario.

### Non-Goals

- El cierre, la cabecera y el resto de la portada (el texto «Crear cuenta» / «Registrarse» queda para otro cambio).
- Cambios de diseño o de componentes.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `home`: la propuesta de valor del hero sin sesión pasa de «el álbum como una obra» a «el diario de lo que escuchas y de lo que escuchan
  otras personas», con registrar sin opinar como primera idea.

## Impact

`messages/{es,en}/home.json` (`heroLine1`, `heroLine2`, `anonSubtagline`), clases de `src/components/home/AnonHero.tsx` (escala del
titular y columnas) y `docs/05-features/home.md`. Sin API ni esquema; las páginas informativas no describen el texto de la portada.
