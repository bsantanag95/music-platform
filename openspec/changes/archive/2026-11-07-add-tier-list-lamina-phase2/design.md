## Context

Segunda fase de `add-tier-list-lamina`. Decisiones tomadas al abrirla (2026-11-07): de un género o una década entran tus valorados (no el catálogo);
un disco agregado a mano cae en el nivel de tu nota o en la bandeja; las canciones salen de un disco, de tus valoraciones (con el filtro de artista para
"las de un artista") y de una lista; la fase va entera.

Estado de partida:

- `src/services/laminas/tiers.ts` crea una tier list desde la discografía (`placementsFromDiscography`): cada disco en el nivel de `tierForScore`, los sin
  nota en la bandeja, hasta 50, nace privada. El servicio solo acepta `release-group`; la base (`0086`) ya admite `recording`.
- El Top N tiene fuentes con filtros (`src/services/laminas/sources.ts`: valoraciones, favoritos, lista; año o década, año de escucha, género, artista) y
  un panel que muestra candidatos con su nota y deja elegirlos (`LaminaSourcePanel`, `useLaminaSource`). El tope de candidatos es 30.
- La Lámina de discografía lee las pistas de la edición representativa de un disco con la nota del dueño en una sola consulta.
- `POST /api/me/laminas/[id]/items` y `useTargetSearch` sirven al Top N.

## Goals / Non-Goals

**Goals:**

- Armar en segundos el ranking de las canciones de un disco.
- Reusar las fuentes y el panel del Top N, sin una segunda implementación de filtros.
- Que todo lo que entra caiga en su nivel por la misma regla, venga de donde venga.

**Non-Goals:**

- "Arma la tuya" y el llamado en la discografía (Fase 3).
- Favoritos como fuente, artistas como ítems, discos y canciones mezclados en una misma tier list.

## Decisions

### 1. Una regla de ubicación

`placeTargets(ownerId, entityType, targetIds)` lee la nota del dueño de cada objetivo y devuelve su nivel (`tierForScore`) o `null` (bandeja). La usan el
prellenado, las fuentes nuevas y el alta a mano. El orden dentro de cada nivel es el de la fuente.

### 2. Fuentes al crear

`POST /api/me/laminas` con `kind: 'tier'` y `entityType` (`release-group` o `recording`) acepta:

- `{ type: 'discography', artistId }`: discos (Fase 1).
- `{ type: 'album', releaseGroupId }`: canciones. Las pistas de la edición representativa, en orden, sin repetir una grabación (una pista repetida en otro
  medio queda una vez). Sin pistas: `VALIDATION_ERROR`.
- `{ type: 'picked', targetIds }`: de 1 a 50 objetivos elegidos en la vista previa de tus valoraciones o de una lista. El servidor valida que existan y que
  sean del tipo, y los ubica por la nota del dueño; no confía en ninguna nota que mande el cliente.

Combinaciones inválidas (`discography` con canciones, `album` con discos) responden `VALIDATION_ERROR`. Todas nacen privadas. Tope de 50 en todas.

- **Por qué `picked`:** es el mismo contrato que el Top N desde una fuente (`targetIds`): la vista previa ya filtra y deja quitar, y el servidor no
  repite la consulta de filtros. Un objetivo ajeno a la fuente no abre nada: solo puede poner en la tier list lo que la persona podría agregar a mano.

### 3. Vista previa de hasta 50

`GET /api/me/laminas/candidates` suma `limit` (de 1 a 50; 30 por defecto, como hasta ahora). `useLaminaSource` lo recibe y lo manda. La tier list usa el
panel del Top N con `slots = 50` y sin numerar puestos: todos los candidatos nacen elegidos y se pueden quitar.

### 4. Agregar a mano

`POST /api/me/laminas/[id]/items` despacha por tipo, como el resto de las rutas: en una tier list, `addTierListItem` agrega el objetivo al final de su
nivel (o de la bandeja), con la fila de la lista bloqueada y el tope de 50 contado ahí. Un repetido no cambia nada. El editor suma el buscador
(`useTargetSearch`, álbum o canción según la tier list) arriba de la bandeja, y anuncia dónde quedó lo agregado.

### 5. Formulario de alta

`TierListCreateForm` suma el tipo (Discos / Canciones) y la fuente: para discos, Discografía de un artista, Mis valoraciones o Una lista; para canciones,
Canciones de un disco, Mis valoraciones o Una lista. Discografía y disco usan el buscador de artista o de álbum. Valoraciones y lista usan el panel del Top
N. Título sugerido por fuente: "Tier list de {artista}", "Las canciones de {disco}", y para valoraciones y listas los títulos del Top N sin número.

### 6. Canciones en la imagen y la página

Sin cambios de forma: la ficha usa la carátula del disco de la canción (como el Top N de canciones) y enlaza a la canción. El tope de 10 carátulas es el
mismo. La página pública enlaza cada ítem a su disco o a su canción.

## Risks / Trade-offs

- **[Un disco con muchas pistas o muchos medios]** → pasa del tope en casos raros (una caja de 60 canciones): entran las primeras 50 en orden. Es raro
  y se puede quitar y agregar a mano; no justifica una vista previa propia para esta fuente.
- **[`picked` acepta cualquier objetivo]** → es lo mismo que agregar a mano: solo lo propio, privado, sin notas ajenas.
- **[Canciones sin carátula]** → la ficha de texto ya resuelve la falta de carátula.

## Migration Plan

Sin migración. `0079` a `0086` siguen pendientes en la BD real, en orden.

## Open Questions

Ninguna.
