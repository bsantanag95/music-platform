## Context

La búsqueda del tipo Canciones (`src/services/catalog/search/songs.ts`) agrupa por
(título base, artista) y solo expande el primer grupo: browsea sus primeras 4 grabaciones, une sus
apariciones locales y con las de MusicBrainz, e ingiere la grabación identidad. Esa identidad viaja
al frontend como `recordingId` en `SongGroupResult` (`types.ts:78`), junto con los álbumes que la
contienen. El panel `SongGroupPanel.tsx` pinta el encabezado "Álbumes que contienen «X»" y la lista
de álbumes, pero nunca usa `recordingId`; la spec `catalog-search` y `docs/04-api/contracts.md`
fijan explícitamente que la canción **no** enlaza a `/song/<id>`. La página de canción ya existe
(`src/app/[locale]/(catalog)/song/[id]/page.tsx`) y está preparada para abrirse en frío (ficha
compacta; agenda la sincronización de créditos).

## Goals / Non-Goals

**Goals:**

- Que la canción resuelta en Canciones tenga un enlace directo a `/song/<recordingId>`.
- No tocar API, esquema, ingesta ni presupuesto de MusicBrainz.
- Mantener la lista de álbumes como contexto.

**Non-Goals:**

- Enlazar los grupos colapsados ni la página siguiente (`recordingId` es `null` ahí).
- Cambiar el shape de la respuesta o el orden de los resultados.

## Decisions

### D1. Enlace "Ver canción" en el encabezado del panel, reutilizando `recordingId`

`SongGroupPanel` es el componente del grupo resuelto y ya recibe `recordingId`. El enlace va en el
`<header>`, como acción explícita junto al título, sin convertir el título en enlace (el título es
dato del catálogo y el encabezado describe la lista de álbumes, no la canción). **Alternativas
descartadas:** (a) enlazar el nombre de la canción en el encabezado — el encabezado dice "Álbumes
que contienen «X»", enlazarlo a la canción es ambiguo; (b) una fila superior tipo resultado — suma
una tarjeta para un dato que ya da el encabezado.

### D2. Solo el grupo resuelto

Solo el primer grupo tiene `recordingId` (`expandGroup`/`localExpandedResult`); los colapsados y
los de "Cargar más" llegan con `recordingId: null` y su `query` para re-abrir la búsqueda. Resolver
todos los grupos implicaría browses e ingestas adicionales por búsqueda (más presupuesto de
MusicBrainz) para enlazar canciones ambiguas del listado secundario. **Alternativa descartada:**
expandir cada grupo para enlazarlo.

### D3. Sin `recordingId`, el panel queda como hoy

El enlace se renderiza solo si `group.recordingId !== null`. Cubre el caso de una resolución sin
ganador remoto ni contribución local, sin degradar la lista de álbumes.

### D4. Sin cambios de contrato

`recordingId` ya está en la respuesta y en el espejo Zod (`schemas.ts:158`); el cambio es de UI +
i18n + docs. La regla documental de navegación de `docs/04-api/contracts.md` se actualiza, pero el
JSON no cambia.

### D5. Accesibilidad e i18n

Enlace con texto visible "Ver canción" y `aria-label` que nombra la canción (nueva clave
`catalog.search.results.songContext.*` en `es`/`en`); el título de la canción no se traduce. Se
reutiliza `Link` de `@/i18n/navigation`.

### D6. Streaming consistente

En el render local inmediato (`localOnly`) el grupo resuelto ya trae `recordingId` de las
apariciones locales, así que el enlace aparece de una; al llegar la respuesta remota, el grupo
resuelto se vuelve a calcular con la misma identidad y el enlace se mantiene.

## Risks / Trade-offs

- [Grabación resuelta todavía sin tracklist/créditos] → la página de canción es ficha compacta y
  agenda la ingesta del disco principal; ya soporta apertura en frío.
- [Confusión entre el encabezado y la acción] → la acción es textual ("Ver canción") y el título
  del panel sigue describiendo los álbumes.
- [Grupos sin `recordingId` sin enlace] → intencional (D2); siguen abriendo su búsqueda.

## Migration Plan

No aplica: cambio de presentación sin datos persistidos. Revertir es quitar el enlace y restaurar
el requisito retirado.
