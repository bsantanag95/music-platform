## Why

El modelo de salones de la fama ya está (`award.kind = hall_of_fame`, ADR 0044) y hoy tiene un solo salón, el Grammy Hall of Fame.
Rellenar más clases suyas no cambia lo que se ve en Explorar (solo muestra la última), así que el siguiente paso con valor es **un
segundo salón**. El **National Recording Registry** de la Biblioteca del Congreso de EE. UU. es el que mejor encaja: incorpora cada
año 25 grabaciones (álbumes, canciones y otras), es una lista de un organismo público sin marca ni licencia de por medio, y cubre
géneros que el Grammy Hall of Fame cubre poco (folk, jazz histórico, country, grabaciones de campo).

Con dos salones, la sección de Explorar tal como se hizo (un riel con **todas** las incorporaciones de cada salón) deja de escalar:
serían dos rieles de ~14 y ~25 tarjetas. Premios resolvió lo mismo con **una tarjeta por premio**; los salones deben mostrarse igual.

## Goals

- Cubrir el **National Recording Registry** con las **últimas 5 clases** (2022, 2023, 2024, 2025 y 2026; el Registry anuncia una
  clase cada primavera, sin interrupciones), enlazado al catálogo.
- Que la sección **"Salón de la Fama"** de Explorar se vea **como Premios**: una tarjeta por salón (nombre, clase más reciente,
  carátulas) en la misma cuadrícula, en vez de un riel por salón. La tarjeta es la misma del hub `/awards`.
- Que el segundo salón sea **solo datos**: ninguna migración ni cambio de lectura; el modelo de ADR 0044 ya lo admite.

## Non-Goals

- Otros salones (Latin Grammy Hall of Fame, Rock and Roll Hall of Fame, Songwriters…): se agregan después como carpetas de datos.
- Clases anteriores a 2022 ni las ~700 grabaciones completas del Registry.
- Insignia de ingresado en las fichas de álbum, canción y artista: cambio posterior.
- Resolver al catálogo las grabaciones históricas sin disco en MusicBrainz (discursos, radio, sonidos de campo, sencillos de
  principios del siglo XX): se publican como texto, sin enlace.
- Copiar las descripciones de la Biblioteca ni mostrar su logo: solo los hechos (título, artista, año de la clase) y el nombre de
  forma descriptiva.
- Que las incorporaciones sumen a los puntajes del catálogo: sigue la decisión del ADR 0044 (un salón no es un premio ganado).

## What Changes

- **Datos:** `data/awards/national-recording-registry/` (`kind: hall_of_fame`, `voting: jury`) con las cinco clases y tres categorías:
  *Álbumes* (sujeto el disco), *Canciones* (sujeto la grabación anclada en su disco o sencillo) y *Otras grabaciones* (discursos,
  emisiones de radio, entrevistas y sonidos de campo, que nunca se enlazan). Cada clase cita el comunicado de la Biblioteca como
  fuente, con la fecha del anuncio como fecha de la clase. Se resuelven con `scripts/resolve-award-nominees.ts` y se cargan con
  `scripts/load-awards.ts`.
- **Explorar:** la sección "Salón de la Fama" deja el riel por salón y pasa a ser un encabezado con **una tarjeta por salón**, en la
  misma cuadrícula y con el mismo estilo que Premios (carátula difuminada de fondo, nombre, año de la clase, datos y cuatro
  carátulas), y enlace "Ver todos" al hub. El encabezado va en plural con más de un salón.
- **Tarjeta de salón:** `HallOfFameTile` toma el aspecto de `AwardTile` (fondo teñido por la carátula, `detailed` para el hub con
  el rango de clases, cuántas hay, quién decide y las clases anteriores como enlaces) y la comparten Explorar y el hub.
- **Textos:** nombre del premio (`names.national-recording-registry`), encabezado y entrada de la navegación rápida en plural
  según cuántos salones haya (es/en).
- **Docs:** `awards.md`, `explore.md` y el ADR 0044 (nota de que el segundo salón no requirió cambios de modelo).

## Capabilities

### New Capabilities
<!-- ninguna: se extiende music-awards y album-discovery -->

### Modified Capabilities
- `music-awards`: se añade la cobertura del National Recording Registry; la tarjeta de un salón en el hub pasa a la forma
  detallada de las tarjetas de premios.
- `album-discovery`: la sección "Salón de la Fama" de `/explore` muestra una tarjeta por salón (como Premios) en lugar de un riel
  con las incorporaciones de cada salón.

## Impact

- Código: `src/components/awards/{HallOfFameExploreSection,HallOfFameTile}.tsx` (+ pruebas), `explore/page.tsx` (plural de la
  navegación rápida), `awards/page.tsx` (tarjeta detallada), `messages/{es,en}/{awards,catalog}.json`.
- Datos: `data/awards/national-recording-registry/` (curaduría con revisión humana).
- Sin migraciones, sin cambios en `src/services/awards/*`, sin contratos REST ni dependencias nuevas.
- Docs: `docs/05-features/{awards,explore}.md`, ADR 0044 (nota), `AGENTS.md` solo si cambia el smoke test.
