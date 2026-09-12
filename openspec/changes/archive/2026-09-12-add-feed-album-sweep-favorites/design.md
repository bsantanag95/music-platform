## Context

`add-feed-album-sweep` excluyó el favorito a propósito, en el entendido de que el pedido
original era específicamente "valorar canción por canción". Verificando con datos reales
(capturas de un feed con varias canciones de un mismo álbum marcadas como favorito, sin
ninguna valoración) se confirmó que ese flujo es al menos igual de común, y que el corte
existente tiene un efecto colateral no anticipado: un único favorito de paso —agregado y
luego quitado, algo trivial de hacer sin querer decir nada especial sobre el álbum— corta la
corrida de escuchas/valoraciones en dos mitades que por separado pueden no alcanzar el
umbral, haciendo desaparecer un barrido que debería existir.

## Goals / Non-Goals

**Goals:**

- El favorito cuenta como señal de "recorrer el álbum", igual que la valoración.
- Un favorito no rompe una corrida de valoraciones que de otro modo calificaría.
- Mantener `pnpm run typecheck && lint && test && build` en verde.

**Non-Goals:**

- No se agrega ponderación (una valoración "vale más" que un favorito) — ambas cuentan por
  igual hacia el umbral de canciones distintas.
- Comentarios y reseñas siguen fuera del barrido — no se pidió y no hay señal de que sean
  parte del flujo "recorrer el álbum".

## Decisions

### 1. Favorito y valoración cuentan por canción, no por entrada

Si una canción tiene favorito Y valoración dentro de la misma corrida, cuenta una sola vez
hacia el umbral — el conteo sigue siendo sobre `Set<recordingId>`, ahora poblado desde ambos
`kind`. Evita que "favoritear y luego valorar la misma canción" infle artificialmente el
recuento.

### 2. El rótulo deja de decir "valoradas"

Con favorito como señal legítima, "N canciones valoradas" pasaría a ser impreciso cuando el
barrido se formó solo con favoritos. Se simplifica a "N canciones" (`feed.albumSweep`).

## Risks / Trade-offs

- [Un favorito "de prueba" (agregado y quitado al toque) ahora puede contribuir a formar un
  barrido] → Aceptado: es exactamente el caso que motivó este cambio — un favorito de paso
  ya no debe poder cortar ni distorsionar la lectura de una corrida real.

## Migration Plan

No aplica migración de datos ni de esquema. Rollback = revertir el cambio de código.
