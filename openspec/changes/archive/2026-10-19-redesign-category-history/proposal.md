## Why

El historial de una categoría repetía la tarjeta completa de la ceremonia por cada año, con todos los nominados a la vista: seis
años ocupaban unos 3.500 px, el premio solo aparecía en las migas y para saber quién ganó cada año había que recorrer todas las
tarjetas. Tampoco había forma de pasar a otra categoría sin volver a la ceremonia. El enlace que lleva a esta página decía
"Historia", cuando la página es un historial.

## What Changes

- El enlace desde la ceremonia dice "Historial de la categoría" (y "Historial" en las categorías compactas).
- Cabecera con contexto: "Premio Lo Nuestro · 6 ediciones · 2021–2026".
- **Ganadores por año**: una fila con el ganador de cada ceremonia, enlazada a su año.
- Cada año en forma compacta, con ancla, el ganador y los nominados plegados; abierto solo el más reciente.
- **Los más nominados**: artistas con dos o más nominaciones en la categoría, con sus victorias.
- **Otras categorías** del premio, en el orden de la ceremonia.

## Impact

- `getCategoryHistory` suma `subjectKind` y `otherCategories` (de la consulta de categorías que ya hacía).
- Nuevos `CategoryWinnersTimeline` y `category-leaders.ts`; `AwardCategory` suma `id` y `nomineesOpen`.
- `src/app/[locale]/(catalog)/awards/[award]/categories/[key]/page.tsx`, `messages/{es,en}/awards.json`,
  `docs/05-features/awards.md`. Sin cambios de esquema.
