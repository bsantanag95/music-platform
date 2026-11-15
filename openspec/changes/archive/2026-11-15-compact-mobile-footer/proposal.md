## Why

En móvil el pie global mide 1104 px a 390 px (1124 a 360): más de una pantalla de teléfono al final de cada página. Medido el 2026-11-15:
618 px son cuatro grupos de enlaces apilados en una columna con títulos y 32 px entre grupos, 193 px la atribución y 117 px la barra inferior,
con 48 px de margen arriba y abajo. Además los enlaces miden 18 px de alto, poco para tocarlos con el dedo, y la tagline y la frase de
identidad dicen casi lo mismo. Pendiente anotado en `docs/05-features/home.md` tras el rediseño de la portada.

## What Changes

- Por debajo de `md`: márgenes y separaciones reducidos; los enlaces de cada grupo de navegación en **dos columnas**; los títulos de grupo
  ocultos a la vista pero presentes para lectores de pantalla; la tagline oculta (queda la frase de que no es un servicio de streaming).
- Cada enlace del pie en móvil (navegación, contacto, redes, políticas, «volver arriba») con un **área táctil de al menos 40 px**.
- Desde `md` el pie no cambia.

### Goals

- Bajar el pie móvil de ~1100 px a menos de 900 px sin quitar ningún enlace.
- Enlaces cómodos de tocar.

### Non-Goals

- Escritorio y tablet ancha (sin cambios).
- El texto de la atribución, que exige la licencia (`docs/03-data/data-licensing.md`): no se acorta en este cambio.
- Plegar grupos o quitar navegación del pie.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `site-footer`: identidad compacta en móvil (sin tagline), títulos de grupo visualmente ocultos pero accesibles y área táctil mínima en
  móvil, y enlaces de cada grupo en dos columnas en móvil.

## Impact

`src/components/layout/Footer.tsx`, `src/components/layout/Footer.test.tsx`, `docs/05-features/home.md` («Pendiente»). Sin mensajes nuevos,
API, esquema ni dependencias. Las páginas informativas y legales no cambian: el pie conserva los mismos enlaces y la misma atribución.
