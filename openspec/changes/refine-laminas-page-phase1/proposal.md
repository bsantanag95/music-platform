## Why

La auditoría de `/me/laminas` (2026-11-10, 1280 y 375 px) encontró que el editor del Top N es ilegible en un teléfono: la nota y tres
botones de 44 px dejan cada título en una letra. Además, en la misma lista conviven «96/100» y «5★», los dos formularios de alta usan
nombres y controles distintos para lo mismo («Qué rankeas» / «Álbumes» con selectores frente a «Qué ordenas» / «Discos» con segmentos),
las casillas salen con el azul del navegador, el texto de ejemplo del título dice «Mis 10 discos» con Top 5 elegido, «Crear» no avisa
mientras guarda y, en el teléfono, «Una lista» queda sola en otra fila. Es la Fase 1 de tres: bugs y coherencia, sin cambios de API.

## What Changes

- Editor del Top N: subir, bajar y quitar pasan a un menú ⋯ por fila; el título usa el ancho que queda (hasta dos líneas).
- La nota tiene una sola forma en el alta y en el editor: el puntaje detallado si existe, si no las estrellas, en la insignia de la escala
  de la casa (`ScoreBadge`), sin «/100».
- Los dos formularios de alta usan los mismos nombres («Qué incluye», «Discos» / «Canciones») y los mismos segmentos; formato y tipo dejan
  de ser selectores nativos.
- Casillas propias (`.form-check`) en todos los formularios de Láminas, también deshabilitadas.
- El texto de ejemplo del título sigue al formato y al tipo; «Crear» dice «Creando…» mientras guarda.
- En pantallas angostas las fuentes van en dos columnas y, con un número impar, la última ocupa la fila entera.

## Capabilities

### Modified Capabilities
- `top-laminas`: el editor ordena desde un menú por fila y la nota tiene una sola forma; requisito nuevo de controles comunes a las altas.

## Impact

`src/components/laminas/{LaminaEditor,LaminaCreateForm,TierListCreateForm,LaminaSourcePanel,TierListEditor,DiscographySettings,YearCuration}.tsx`,
`form-parts.ts` nuevo, `globals.css` (`.form-check:disabled`), mensajes `laminas`, tests y `docs/05-features/sharing.md`. Sin API ni esquema.
