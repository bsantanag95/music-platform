## Why

El feed ya pliega una corrida de 3+ escuchas consecutivas del mismo autor en una fila
"registró N escuchas". Cuando esa corrida es además **del mismo tema o del mismo álbum**,
no es "actividad ambiente repetida" — es una señal de comportamiento: *lo tiene en
rotación*. La dirección `redefine-content-hierarchy` (D9 / OQ5) define esta síntesis como
el equivalente en el feed a la sección "En rotación" del perfil, a una escala temporal
menor (**7 días en el feed, 30 días en el perfil**). `rework-feed-tiers` dejó la jerarquía
de tiers y la agrupación listas y difirió explícitamente el pico de rotación a este cambio.

## What Changes

- Cuando una corrida colapsada de escuchas sin nota (tier 3) del mismo autor es toda del
  **mismo objetivo**, y ese objetivo acumula suficientes registros en los últimos **7
  días**, la fila plegada se presenta como un **pico de rotación**: *"En rotación · {título}
  · {N} registros esta semana"*, con el título enlazado al objetivo — en vez de la fila
  genérica "registró N escuchas" con la lista de títulos (todos iguales).
- Umbrales (constantes con nombre, deliberadamente simples, calibrables sin cambio de spec):
  - **Canción**: ≥ 3 registros del mismo tema en 7 días.
  - **Álbum**: ≥ 2 registros del mismo álbum en 7 días (repetir un álbum completo es mucho
    menos frecuente que repetir una canción). Un pico de álbum puede formarse a partir de
    una corrida de solo 2 entradas, por debajo del mínimo de plegado genérico (3).
  - **Artista** como objetivo: nunca produce pico (demasiado grueso para "en rotación",
    igual criterio que `profile-in-rotation`).
- **Tono cultural, no de gamificación**: sin emoji de fuego, sin "racha", sin "¡escuchaste
  esto N veces!", sin exponer el algoritmo. Solo la síntesis y la cuenta de la semana.
- Se aplica en las tres superficies que usan `FeedActivityList`: `/me/feed`, el preview de
  feed de seguidos de Inicio y el rastro reciente del propio usuario (en `self` sin nombre
  de autor, igual que el resto de la presentación).
- **Sin cambios de datos, servicio ni API**: es una refinación de presentación sobre la
  corrida que `groupFeedRuns` ya detecta. El feed puede *subestimar* respecto de la
  realidad (solo ve corridas consecutivas dentro de la página cargada); el cálculo exacto
  de 30 días vive en el perfil. El pico del feed es una lectura en contexto de una racha
  evidente, no una analítica.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `activity-feed`: se añade el requirement **"Pico de rotación en el feed"** — cuándo una
  corrida colapsada de escuchas del mismo objetivo se presenta como síntesis de rotación
  (ventana de 7 días, umbrales por canción/álbum, artista excluido), su copy de tono
  cultural sin métricas de gamificación, y su alcance en las tres superficies de
  `FeedActivityList`. Refina —sin contradecir— el párrafo "Agrupación de actividad" del
  requirement "Jerarquía de presentación del feed": una corrida que califica como pico se
  renderiza como pico en lugar de como fila genérica de grupo.

## Impact

- **Modificado** `src/components/feed/feed-grouping.ts`: `groupFeedRuns` gana un parámetro
  `now` y, tras detectar una corrida de escuchas, evalúa si es un pico de rotación (mismo
  `target.id`, cuenta en ventana de 7 días ≥ umbral por tipo). Nueva fila `FeedRotationPeak`
  en la unión `FeedRow`.
- **Modificado** `src/components/feed/FeedActivityList.tsx`: rama de render para
  `kind: "rotation-peak"` (fila subordinada, indentada, sin celda — como `GroupRow` — con
  el título enlazado y la cuenta); `groupFeedRuns` recibe `useNow()`.
- **Modificado** `messages/{es,en}/feed.json`: clave `rotationPeak` (`"En rotación · {title}
  · {count, plural, ...} esta semana"` / `"In rotation · {title} · {count} …"`).
- **Modificado** `src/components/feed/feed-grouping.test.ts`, `FeedActivityList.test.tsx`:
  casos de pico de canción, pico de álbum de 2, corrida fuera de ventana que no es pico,
  corrida de títulos distintos que sigue siendo grupo genérico, corte por tier 1.
- **Docs** `docs/05-features/activity-feed.md`: sección "Agrupación por tier" gana el pico
  de rotación; nota de relación con la sección "En rotación" del perfil (7 d vs 30 d).
- Sin migración, sin endpoint nuevo, sin fetcher, sin cambio de contrato REST.
