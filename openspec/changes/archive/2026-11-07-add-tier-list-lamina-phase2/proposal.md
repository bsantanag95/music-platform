## Why

La Fase 1 dejó la tier list armada solo desde la discografía de un artista y solo de discos. La sección §4.3 de `docs/05-features/sharing.md`
pide más fuentes (una lista, un género, una década, a mano) y, después de los discos, canciones. El ranking de las canciones de un álbum es la tier
list más común: falta. Esta es la segunda de tres fases.

## What Changes

- **Tier lists de canciones**, además de las de discos. Mismo editor, mismos niveles, misma imagen; la carátula de una canción es la de su disco.
- **Fuentes nuevas al crearla:**
  - **Las canciones de un disco:** sus pistas caen en el nivel de tu nota; las que no valoraste, en la bandeja.
  - **Tus valoraciones**, con los filtros del Top N (año o década, año de escucha, género, artista): discos o canciones. Todo tiene nota, así que
    todo cae en un nivel. "Tus canciones mejor valoradas de un artista" es esta fuente con el filtro de artista.
  - **Una lista propia** de discos o canciones: lo valorado cae en su nivel y lo demás, en la bandeja.
- **Vista previa** con los candidatos de la fuente, hasta 50, todos elegidos por defecto; se puede quitar alguno antes de armarla. Reusa el panel de
  fuentes del Top N.
- **Agregar a mano** en el editor, con el buscador local-first: un disco o una canción cae en el nivel de tu nota, o en la bandeja si no la tiene.
- **Título sugerido** según la fuente.
- Sigue naciendo privada y sigue siendo una foto: nunca escribe valoraciones ni se mueve con ellas.

Sin migración: `0086` ya admite canciones en una tier list.

Fuera de esta fase: "Arma la tuya" y el llamado en la discografía (Fase 3); favoritos como fuente; artistas como ítems; niveles variables.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `tier-laminas`: discos o canciones, fuentes nuevas con vista previa, canciones de un disco y agregar a mano.

## Impact

- **Código:** `src/services/laminas/tiers.ts` (fuentes, ubicación por nota, alta de un ítem), `src/services/laminas/sources.ts` (tope de candidatos
  configurable hasta 50), `/api/me/laminas` (fuentes nuevas), `/api/me/laminas/[id]/items` (alta en una tier list), `/api/me/laminas/candidates`
  (`limit`), `TierListCreateForm`, `TierListEditor`, `use-lamina-source`.
- **Base de datos:** ninguna migración.
- **Dependencias:** ninguna.
- **Docs:** `sharing.md`, `business-rules.md`, `04-api/contracts.md`.
