## Context

Estado actual del descubrimiento de listas:

- **`listDiscoverLists(readerId, page, pageSize)`** (`src/services/lists/discovery.ts`):
  listas de audiencia `public` de perfiles `public`, excluyendo las propias y cualquier
  bloqueo, en orden `createdAt DESC`. Enriquecidas con `enrichLists` (conteo + carátulas) y
  `savedStateFor` (saved / following del lector). Requiere `readerId` no nulo.
- **`GET /api/lists/discover`** y la pestaña **Descubrir** de `/me/lists`
  (`DiscoverListsTab`), ambas con sesión obligatoria (`requirePageUser`).
- **`user_list_featured`** (`listId` PK, `rank` UNIQUE): curaduría editorial escrita por
  `scripts/seed-discovery.ts`. Ya alimenta el riel "Colecciones destacadas" de `/explore`,
  filtrado allí a listas de álbumes.
- **`list_save`** (`saverId`, `listId`, `following`, `createdAt`): PK compuesta, índice
  `idx_list_save_list` sobre `listId`. `list-saves` define el guardado como marcador
  privado — "solo el que guarda ve que lo hizo".
- **`audiencesForProfile({ profileVisibility, relation, blockedByMe })`**
  (`src/services/social/visibility.ts`): función pura que devuelve las audiencias visibles.
  Para `relation === "following"` → `["followers", "public"]`.
- **`listFollowing(userId, page, pageSize)`** (`src/services/social/following.ts`): usuarios
  que `userId` sigue con relación aceptada.
- Componentes reutilizables: `ListCard`, `ListCoverMosaic`, `ListsList`, `ListDetailHeader`.
- El Header (`regroup-authenticated-header`): barra general `md+` con `HeaderSearch` +
  enlace a Explorar (condicionado a `exploreEnabled`); panel móvil con bloque general +
  bloque de usuario.
- **Decisión D7** de `redefine-content-hierarchy` (cambio exploratorio, sin archivar):
  eligió `/explore` como contenedor único de descubrimiento y rechazó rutas separadas
  `/albums` + `/lists`.

## Goals / Non-Goals

**Goals:**

- Una superficie pública `/[locale]/lists` accesible con y sin sesión, enlazada desde la
  barra general del Header.
- Cuatro secciones componibles (Destacadas, Populares, De usuarios seguidos, Recientes) que
  se omiten cuando no tienen contenido, sin huecos ni mensajes de vacío por sección.
- "De usuarios seguidos" visible solo con sesión; su API responde `401 AUTH_REQUIRED` sin
  sesión.
- El conteo agregado de guardados por lista como dato público (número, no identidades),
  mostrado en las tarjetas de `/lists` y en `ListDetailHeader`.
- Reusar `list-discovery` para "Recientes" sin romper la pestaña de `/me/lists`.
- Estructura documentada para secciones futuras, sin implementarlas.

**Non-Goals:**

- Recomendación algorítmica o personalización por afinidad en cualquier sección.
- "Populares" como ranking competitivo con posiciones numeradas o badges de "top".
- Clonar / derivar listas ajenas; "lista de la semana" editorial; secciones por género o
  por tipo de entidad (se documentan como futuro).
- Cambios en el modelo de datos o en el contrato de `list_save` / `user_list`.
- Pestaña de listas dentro de `/explore` (la spec `album-discovery` no cambia).
- Exponer **quién** guardó una lista, o el conteo de guardados de listas no públicas.

## Decisions

### 1. Ruta propia `/[locale]/lists`, no una pestaña de `/explore`

Se elige ruta propia (decisión de producto del usuario). Diverge de D7. Racional aceptado:
las listas son un eje de descubrimiento con identidad distinta (curaduría humana, no
catálogo), y Letterboxd las trata como sección de primer nivel. Se actualiza la **nota D7**
de `redefine-content-hierarchy/design.md` para registrar la divergencia; la spec
`album-discovery` no se toca porque `/explore` sigue sin pestaña de listas —no hay
contradicción a nivel spec, solo a nivel de la nota de planificación.

**Alternativa descartada:** `/explore?tab=listas`. Habría forzado el shell de `/explore`
(hoy centrado en álbumes y detrás de `exploreEnabled`) sobre una superficie que no necesita
contenido semilla para ser útil.

### 2. Composición en el servidor, secciones que se omiten solas

`/[locale]/lists/page.tsx` es un Server Component que resuelve la sesión con
`resolveSession()` y compone las secciones en orden fijo. Cada sección se renderiza solo si
su consulta devuelve al menos una lista. "De usuarios seguidos" además solo se consulta si
hay sesión. Igual patrón que `/explore` ("sección sin contenido se omite").

La primera página de cada sección se carga en el servidor; "Populares" y "Recientes" pueden
paginar con TanStack Query contra sus endpoints (mismo patrón que `DiscoverListsTab`).
"Destacadas" es un rail acotado sin paginación. "De usuarios seguidos" pagina contra
`/api/lists/from-following`.

### 3. Conteo agregado de guardados público

Nuevo helper `saveCountsFor(listIds: string[]): Promise<Map<string, number>>` —
`SELECT list_id, count(*) FROM list_save WHERE list_id = ANY($1) GROUP BY list_id`, apoyado
en `idx_list_save_list`. Se expone:

- En el enriquecimiento de las tarjetas de `/lists` (las cuatro secciones).
- En `ListDetailHeader` de listas públicas (propio y ajeno).

Se expone **solo para listas de audiencia `public`**. El conteo de una lista `followers` o
`private` no se muestra a nadie salvo su dueño (que ya lo puede inferir). La identidad de
quién guardó **nunca** se expone —`list-saves` "marcador privado" sigue vigente para el
registro individual.

**"Populares"** ordena por `save_count DESC, createdAt DESC`. Sin número de posición, sin
badge de "top N": la tarjeta muestra "N guardados" igual que en el resto de secciones. Es
una vitrina, no un leaderboard. Umbral mínimo: se listan solo listas con `save_count >= 1`
(una lista con cero guardados no es "popular").

**Alternativa descartada:** señal blanda sin número ("guardadas recientemente"). El usuario
pidió explícitamente exponer el conteo.

### 4. "De usuarios seguidos": visibilidad

Listas cuyo `ownerId` está en `listFollowing(viewerId)`, con
`audience IN ('followers','public')` (el visitante sigue al dueño con relación aceptada →
`audiencesForProfile` da `["followers","public"]`), excluyendo bloqueos y perfiles que
dejaron de ser visibles, en `createdAt DESC`. No incluye listas propias.

### 5. `list-discovery` para "Recientes"

`listDiscoverLists` se generaliza para aceptar `readerId: string | null`. Con `readerId`
nulo (anónimo): se omite la exclusión "listas propias" y `savedStateFor` devuelve todo en
`false`. El resto de la consulta (audiencia `public`, perfil `public`, sin bloqueo) no
depende del lector. La pestaña Descubrir de `/me/lists` sigue llamando con `readerId` no
nulo — sin cambio observable ahí.

### 6. Enlace en el Header

La barra general añade "Listas" → `/lists` junto a Explorar, con `common.lists` como
etiqueta. **No** se condiciona a ningún flag: "Recientes" tiene contenido en cuanto exista
una lista pública, y si la superficie entera estuviera vacía muestra un estado vacío
localizado (no un 404). El orden en la barra: Buscador · Explorar · Listas.

## Risks / Trade-offs

- **[Divergencia con D7]** → una nota de planificación de un cambio exploratorio queda
  desactualizada. Mitigación: se edita D7 en el mismo cambio para registrar la decisión; no
  hay spec archivada que contradecir.
- **[Reversión de la privacidad del conteo de guardados]** → algún usuario podría preferir
  no exponer cuántos guardaron su lista. Mitigación: solo se expone para listas `public`
  (que el dueño eligió hacer públicas), solo el número agregado, nunca identidades, y sin
  ranking competitivo. Se documenta el cambio de decisión en el doc de features.
- **[Duplicación Descubrir ↔ /lists]** → la pestaña de `/me/lists` y la sección "Recientes"
  muestran lo mismo. Aceptado por el usuario; ambas comparten servicio, así que no hay
  duplicación de lógica. A futuro la pestaña puede deep-linkear a `/lists`.
- **[Coste de `saveCountsFor` en listas con muchos guardados]** → `GROUP BY` sobre
  `list_save` acotado por `list_id = ANY(...)` de a lo sumo `pageSize` listas, con índice.
  Barato. Si creciera, cachear por request como ya hace el perfil.
- **[`/lists` vacío en instancias nuevas]** → sin listas públicas la página es un estado
  vacío. Aceptable; mejora sola con actividad. No se pone flag para no esconder una
  superficie que se llena orgánicamente.
