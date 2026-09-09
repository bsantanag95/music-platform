## Why

El feed hoy responde "¿qué hizo cada persona que sigo?" en orden cronológico. No responde
"¿en qué obra está coincidiendo mi red ahora mismo?". La dirección
`redefine-content-hierarchy` (D9 / IQ4) define la **convergencia de la red**: cuando varias
personas que seguís se relacionan con la **misma obra** en una ventana corta, eso vale
mucho más socialmente que la popularidad global ("5 personas que seguís están con este
álbum esta semana" ≫ "100 000 lo escucharon"). `rework-feed-tiers` y `add-feed-rotation-peak`
lo difirieron explícitamente a este cambio. Es la capa **"Relevante"** del feed, distinta
de la capa **"Social"** cronológica y del **pico de rotación** (que es sobre tu propio
comportamiento, no el de tu red).

## What Changes

- Nuevo panel **"En tu red esta semana"** en la cabecera de `/me/feed`, encima del listado
  cronológico: hasta unas pocas **obras** con las que **3 o más personas distintas que
  seguís** se relacionaron en los últimos **7 días**, cada una como **una sola síntesis**
  ("{obra} · {artista} — {N} personas que seguís", con los nombres), enlazada a la obra.
  Nunca como filas sueltas por persona.
- **Interacción** (Fase 1, diario manual): cuenta por igual una entrada de diario, un
  rating, una reseña o un favorito de un seguido con relación aceptada, sobre un
  **release-group** o un **recording**, dentro de la ventana. Ponderar unos tipos más que
  otros (reseña > registro) queda para después (D9: "pendiente de afinar").
- **Visibilidad**: exactamente la del feed — solo interacciones que el lector tiene
  permitido ver (audiencia de escucha/favorito; rating y reseña son públicos implícitos;
  chequeo de bloqueo en ambas direcciones). La actividad **del propio lector no cuenta**
  (es "tu red", no vos).
- **Tono cultural**: nombra a las personas y la obra, sin "tendencia", sin contador de
  fuego, sin ranking global. La única cifra es "N personas que seguís".
- **Aditivo**: el panel no suprime las entradas individuales que lo alimentan; siguen
  apareciendo en el listado cronológico de abajo (suprimirlas es una refinación posterior).
- **Sin migración, sin endpoint nuevo, sin fetcher cliente**: cálculo bajo demanda en el
  Server Component de la página (`cache()` por request), igual criterio que
  `taste-fingerprint` / `profile-in-rotation`. El panel colapsa entero si no hay
  convergencia.
- Umbrales y ventana como **constantes con nombre**, calibrables sin cambio de spec.

## Capabilities

### New Capabilities

- `network-convergence`: la detección y presentación de obras con las que 3+ personas
  distintas de la red del lector se relacionaron en una ventana de 7 días — qué cuenta como
  interacción, el filtrado por visibilidad idéntico al feed, la exclusión de la actividad
  del propio lector, el umbral y la ventana, la síntesis social única (nunca filas sueltas,
  con nombres), su lugar en la cabecera de `/me/feed` y su tono cultural.

### Modified Capabilities

_Ninguna._ El listado cronológico del feed (`activity-feed`) no cambia: el panel es una
superficie nueva encima, sin tocar su composición, paginación ni presentación.

## Impact

- **Nuevo servicio** `src/services/feed/convergence.ts` — `getNetworkConvergence(viewerId)`
  memoizado por request. Un `UNION ALL` de las cuatro fuentes (diario / rating / reseña /
  favorito) filtradas por seguidos aceptados + visibilidad + ventana, agrupado por objetivo
  con `HAVING count(distinct user_id) >= 3`, unido al catálogo para título/carátula/artista
  y con la lista de personas.
- **Nuevo componente** `src/components/feed/NetworkConvergence.tsx` — Server Component,
  colapsa si vacío.
- **Modificado** `src/app/[locale]/me/feed/page.tsx` — resuelve la convergencia junto al
  feed y renderiza el panel sobre `FeedList`.
- **i18n** `messages/{es,en}/feed.json` — bloque `convergence` (encabezado, plantilla de
  ítem con `{count}`/`{title}`, "y N más" de nombres).
- **Docs** `docs/05-features/activity-feed.md` — nueva sección "Convergencia de la red";
  tabla de las cuatro naturalezas de actividad (Personal / Social / Relevante / Automática).
- Sin cambios en `listFeed`, en el endpoint `/api/me/feed`, ni en el esquema (las cuatro
  tablas y sus índices por objetivo ya existen).
