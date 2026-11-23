## 1. Datos de la línea de tiempo

- [x] 1.1 `src/components/artist/lineup-timeline.ts`: `lineupTimeline(lineup, group, nowYear)` → eje, marcas y filas (actuales en su orden, antiguos por primer año), tramos por período con `kind` voz/instrumento, `openStart`/`openEnd` para fechas desconocidas, `null` con menos de dos integrantes fechados
- [x] 1.2 Tests unitarios (Iron Maiden reducido, período sin fin, sin años, grupo separado) y de propiedades (`lineup-timeline.property.test.ts`): tramos dentro del eje, `from ≤ to`, filas = integrantes con algún año, nunca un tramo sin años

## 2. Componente

- [x] 2.1 `LineupTimeline.tsx`: `figure` con título y leyenda, rejilla nombre + pista, tramos en porcentaje, voz ámbar encima, extremos desvanecidos, texto `sr-only` por fila con `formatInstrumentLine`, pista `aria-hidden`; columna del nombre angosta y marcas pares en el teléfono
- [x] 2.2 `GroupLineupView` la monta encima del filtro en Completa, Actual y Antiguos; `members/page.tsx` le pasa los años del grupo desde `loadProfile`
- [x] 2.3 Mensajes `catalog.artist.lineup.timeline` (es/en): título, leyenda, «hoy»
- [x] 2.4 Tests de la pestaña (`ArtistLineup.test.tsx`, `artist-pages.test.tsx`): aparece en Completa/Actual/Antiguos, no en Apoyo ni con pocos datos

## 3. Documentación y verificación

- [x] 3.1 `pnpm run i18n:client-messages`
- [x] 3.2 `docs/05-features/catalog-browsing.md`: la línea de tiempo en Integrantes; la Fase 2 sin cambios en Biografía
- [x] 3.3 `pnpm run verify` y `pnpm run build`
- [x] 3.4 Navegador a 1440, 1024, 820 y 390 px, sin sesión: Iron Maiden (muchos cambios), un grupo con fechas incompletas y uno sin fechas; sin desbordes
