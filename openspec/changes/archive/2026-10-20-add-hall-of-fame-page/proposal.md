## Why

Los salones de la fama (ADR 0044) no son premios ganados, pero hoy viven dentro de `/awards`: la clase 2026 del Registry lleva la miga
"Inicio / Premios / Registro Nacional de Grabaciones / Clase de 2026"; "Ver todos" de la sección de Explorar aterriza en un hub de
premios donde los salones son el último bloque, debajo de "Ganadores recientes" y "Los más premiados"; y `/awards` redirige al premio
cuando solo hay una competencia cargada, con lo que el bloque de salones quedaría inalcanzable. Con dos salones (Grammy Hall of Fame y
National Recording Registry) y más por venir, ya hay un índice propio que merece su página, igual que Explorar ya les da una sección
aparte de Premios.

## Goals

- Una página **`/hall-of-fame`** (índice de salones) y las clases en **`/hall-of-fame/<salón>/<año>`**, con su propia miga
  ("Inicio / Salón de la Fama / <salón> / Clase de <año>").
- Que las URL actuales (`/awards/<salón>` y `/awards/<salón>/<año>`) **redirijan** de forma permanente a las nuevas.
- Que "Ver todos" de Explorar, las tarjetas y las clases anteriores apunten a la página nueva, y que `/awards` deje de mostrar el bloque
  de salones.
- Sin cambios de modelo: `award.kind = hall_of_fame` sigue igual; las rutas filtran por tipo.

## Non-Goals

- Cambiar el esquema, la curaduría o los datos de los salones.
- Nuevas clases o salones.
- Rediseñar la tarjeta de salón ni la vista de la clase (solo su miga y sus enlaces).
- Historial de categorías de un salón (sigue sin ofrecerse).

## What Changes

- **Rutas nuevas** bajo `src/app/[locale]/(catalog)/hall-of-fame/`: índice, `[hall]` (redirige a la clase más reciente) y
  `[hall]/[year]` (la vista de la clase, `HallOfFameClassView`).
- **Índice `/hall-of-fame`:** encabezado, una tarjeta detallada por salón (`HallOfFameTileGrid detailed`) y, por salón, un riel con las
  incorporaciones de su última clase y enlace a todas sus clases. Sin salones se muestra un mensaje de vacío.
- **Redirecciones permanentes:** `awards/[award]` y `awards/[award]/[year]` redirigen cuando el premio es un salón; la historia de
  categoría de un salón sigue sin existir (no encontrada).
- **Enlaces:** `award-links.ts` gana `hallOfFameIndexHref`, `hallHref` y `hallClassHref`; `HallOfFameTile`, `HallOfFameExploreSection` y
  `HallOfFameClassView` los usan.
- **`/awards`:** quita el bloque "Salones de la fama" y lo sustituye por un enlace corto "Salones de la fama →" cuando hay salones.
- **Textos y docs:** mensajes es/en del índice y la miga; `awards.md`, `explore.md` y una nota en el ADR 0044.

## Capabilities

### New Capabilities
<!-- ninguna: se extiende music-awards y album-discovery -->

### Modified Capabilities
- `music-awards`: los salones tienen su índice y sus clases en `/hall-of-fame`, con redirecciones desde `/awards`; el bloque de salones
  sale del hub de premios.
- `album-discovery`: "Ver todos" de la sección Salón de la Fama de Explorar lleva a `/hall-of-fame` y las tarjetas abren la clase en la
  ruta nueva.

## Impact

- Código: `src/app/[locale]/(catalog)/hall-of-fame/**` (nuevo), `awards/page.tsx`, `awards/[award]/page.tsx`,
  `awards/[award]/[year]/page.tsx`, `src/components/awards/{award-links.ts,HallOfFameTile,HallOfFameExploreSection,HallOfFameClassView}.tsx`,
  `src/services/awards/read.ts` (leer el tipo de un premio), `messages/{es,en}/awards.json`.
- Sin migraciones, contratos REST ni dependencias nuevas. Las URL antiguas siguen funcionando por redirección.
- Docs: `docs/05-features/{awards,explore}.md`, ADR 0044 (nota).
