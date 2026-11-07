## Context

Tercera fase de `add-discography-lamina`. Decisiones tomadas al abrirla (2026-11-07): lista con estrellas, discos y canciones, y "Arma la tuya" que lleva a la
discografía propia en el modo para valorar.

Estado de partida:

- `StarRatingInput` es el control de estrellas accesible del panel del álbum; `saveRating(target, id, { stars })` escribe por la API de siempre.
- `getDiscographyLamina` lee los discos con alguna valoración. Al dueño le devuelve la página aunque no llegue a ninguna vista, con `missing`.
- ADR 0052 admite una sola intención cerrada, el id de una Lámina, y dice que otra intención necesita su propio valor y un ADR que lo amplíe.
- La intención viaja como `laminaId` en `AuthForm`, `LoginPanel`, `SocialSignIn` y el estado de Google.

## Goals / Non-Goals

**Goals:**

- Valorar en lote sin endpoint nuevo y sin otro control de estrellas.
- Una segunda intención con la misma garantía: el cliente aporta un identificador, nunca una ruta.

**Non-Goals:**

- Valorar desde la grilla, puntaje detallado en lote, comparación con otra persona.

## Decisions

### 1. Valorar en lote es una lista, no un formulario

`?valorar=1` en la discografía propia muestra los discos sin nota de las secciones mostradas, en orden cronológico, cada uno con `StarRatingInput`. Cada toque
guarda con `saveRating`: no hay botón de enviar ni lote atómico.

- **Por qué:** es el mismo gesto que en el panel del álbum, accesible con teclado y a 375 px. Un error en uno no pierde los demás.
- La fila queda marcada como guardada y sale de la lista al volver a la discografía. Para un visitante, el parámetro se ignora.
- `readDiscs` ya recorre los discos de las secciones: la Lámina suma `ownerDiscs`, todos los discos mostrados con o sin nota, solo cuando mira el dueño.

### 2. Canciones en la Lámina del álbum

En `?disco=`, el dueño ve sus estrellas en las canciones sin nota, con el mismo componente y `saveRating("recording", …)`. La Lámina de álbum existe para el dueño con
cualquier disco mostrado, también sin canciones valoradas, con lo que falta para el umbral: la lista para valorar enlaza a cada uno.

### 3. La discografía del dueño siempre existe

Para el dueño, la página existe con cualquier cantidad de discos valorados, también 0, para que "Arma la tuya" tenga adónde llevar. Los visitantes siguen con los umbrales.

### 4. Una intención cerrada con dos formas

`src/lib/laminas/intent.ts` pasa a `BuildIntent = { kind: "lamina", id } | { kind: "discography", artistId }`. No se llama `AuthIntent` porque el flujo de Google ya tiene su propia intención (`login`, `link`, `reauth`).

- `parseBuildIntent(params)` lee `lamina` o `discografia`; un valor que no es un identificador se descarta, y si llegan las dos manda `lamina`.
- `buildIntentDestination(intent, username)` arma la ruta: `/me/laminas?desde=<id>` o `/users/<username>/artist/<artistId>?valorar=1`. El usuario es el autenticado, no uno del cliente.
- `AuthForm`, `LoginPanel` y `SocialSignIn` reciben `intent` en lugar de `laminaId`. El estado de Google guarda `buildIntent`; una cookie en curso con el `laminaId` anterior se sigue leyendo.
- **Por qué no un parámetro aparte por cada intención:** la regla es una sola y así se valida en un solo lugar.
- Queda en el ADR 0054, que amplía el 0052.

### 5. El llamado en la discografía

`LaminaCta` recibe su destino. En una discografía ajena: con sesión, `/users/<yo>/artist/<id>?valorar=1`; sin sesión, `/auth/register?discografia=<id>` y
`/auth/login?discografia=<id>`. El dueño no lo ve, igual que en el Top N.

## Risks / Trade-offs

- [Muchas valoraciones seguidas llenan el feed de quien sigue] → el feed ya agrupa las valoraciones seguidas de una misma persona (`group-mixed-feed-runs`).
- [Renombrar `laminaId` toca la autenticación] → las pruebas y el smoke de Google cubren las dos intenciones, el valor inválido y el callback que no lee su query.
- [Un artista con cientos de discos sin nota] → la lista muestra todos los de las secciones elegidas; son de una persona y una página, sin paginación en esta fase.

## Migration Plan

Sin migración. El estado de Google acepta el campo anterior durante los 10 minutos de vida de la cookie.

## Open Questions

Ninguna.
