## Context

Primera fase de `add-discography-lamina`. Decisiones tomadas al abrirla (2026-11-07): marca por artista, hasta 10 carátulas y el resto en texto, Recorrido en la barra si
existe, tres fases y "Compárala con la tuya" aparte. Al implementar apareció que §6.4.1 prohíbe "X de Y" fuera de la página de gestión, y la barra pasó a ser discreta, sin números.

Estado de partida:

- `rating` no tiene audiencia: la ven el dueño y sus seguidores. `rating_share` (ADR 0050) hace pública una sola valoración y `getRelationView` aplica ese criterio por dato.
- `getArtistDiscography` devuelve las secciones del artista; `main` es la discografía principal, con álbumes y EP.
- El Recorrido es un `user_list` con `kind = 'artist_journey'`; su progreso se deriva de `listen_entry` con `countsByListId`, que pueden ser escuchas privadas.
- ADR 0051 limita a 10 carátulas lo armado por una persona y a 4 lo que compone el sistema, y deja este formato para su propio análisis.
- `share_event.target_ref` guarda identificadores internos, nunca nombres visibles, y `ownShareEvents` borra por cuenta.
- D9, el umbral de la vista por canción, es de la Fase 2. La BD de scratch tiene 86 valoraciones, así que no sirve para fijarlo.

## Goals / Non-Goals

**Goals:**

- Una Lámina derivada: sin editor, siempre al día.
- Ninguna nota pública sin el gesto de su dueño.

**Non-Goals:**

- Por canción, Lámina de álbum, interruptores de tipo, valoración en lote, "Arma la tuya", comparación.

## Decisions

### 1. Una marca por artista, en su propia tabla

`discography_share (user_id, artist_id, shared_at)`, con clave primaria compuesta y borrado en cascada. Tiene fila o no la tiene: no hay audiencia.

- **Por qué:** es el criterio de `rating_share` a la escala de una discografía, y evita marcar decenas de valoraciones, que además dejarían afuera las nuevas.
- **Se mantiene al día:** una nota nueva de ese artista queda a la vista. La hoja lo dice antes del gesto. La alternativa era guardar una foto fija; dejaría de ser una Lámina derivada.
- **La marca abre solo esta página y su imagen:** no vuelve públicas esas valoraciones en la página de relación ni en otro lugar.

### 2. Visibilidad

`getDiscographyLamina(username, artistId, viewerId)` parte de `getProfileByUsername` y `audiencesForProfile`, así que un perfil privado, un bloqueo o una cuenta desactivada se resuelven como siempre.

| Quién mira | Sin marca | Con marca |
|---|---|---|
| Dueño | ve | ve |
| Seguidor aceptado | ve | ve |
| Con acceso al perfil, sin seguir | `404` | ve |
| Sin acceso al perfil | `404` | `404` |

`404` también con menos de 3 discos valorados, salvo para el dueño, que ve cuánto le falta. La página no distingue por qué no se puede ver.

### 3. Qué discos entran

Los de la sección `main` con valoración del disco, en orden cronológico. Las notas de canciones no cuentan en esta fase. El dato es el vigente: detallada si existe; si no, estrellas, y se muestra como estrellas.

- **Curva:** el eje usa la detallada o, sin ella, estrellas × 20, solo para ubicar el punto. La etiqueta siempre muestra el dato real, sin inventar un número.

### 4. Progreso

Con un Recorrido no archivado y con selección: `countsByListId` y un porcentaje para la barra discreta de siempre, sin números a la vista. Sin Recorrido: "7 discos valorados", sin total.

- **Por qué:** §6.4.1 de la filosofía de producto y la spec `artist-journey` prohíben "X de Y" fuera de la página de gestión, para que no se lea como logro. Los conteos de escuchas no salen del servicio: solo el porcentaje, y nunca qué ni cuándo. La hoja avisa que el avance se verá.

### 5. Imagen

Tipo `discography`, con referencia `<userId>.<artistId>`: dos identificadores, como exige `share_event`, y estable si cambia el `username`. `ownShareEvents` la borra por prefijo.

`DiscographyFrame` usa `LaminaFrame`, `ScoreChip`, `CoverTile` y la escala de la casa. Formatos Publicación, Enlace e Historia.

- Cabecera: artista y `@usuario`. Cuerpo: progreso, curva y grilla de 5 columnas, hasta 20 discos; con más, los 20 primeros y "+n".
- Enlace, por su altura, lleva la curva y hasta 5 discos.
- **Carátulas:** las 10 mejor valoradas llevan su carátula a no más de 250 px; las demás, el recuadro tipográfico que ya existe, con año y título. Son las que más importan a quien comparte y el orden sigue siendo cronológico.
- Anónimo solo con marca. `?personal=1`, imagen del dueño con `private, no-store`, como en una valoración.

### 6. El gesto usa lo que ya existe

`discography` entra en `OWN_SHARE_KINDS`. `POST /api/me/share/discography/<ref>` crea la marca y `DELETE` la quita. Perfil privado: `409` con `PROFILE_PRIVATE`. Exige que no haya suspensión social, como hacer pública una Lámina.

### 7. Entradas

- `/me/laminas`: sección "Tus discografías", con los artistas con 3 discos valorados o más, de mayor a menor cantidad, hasta 12.
- Página del artista: enlace para quien tiene 3 discos valorados.
- La página del dueño muestra cuántos discos faltan si aún no llega a 3.

## Risks / Trade-offs

- [Una nota nueva se publica sin un gesto nuevo] → se avisa antes de la marca y se quita con un toque. Es lo que hace que sea derivada.
- [La barra del Recorrido deja entrever escuchas privadas] → solo una proporción, bajo la marca y con aviso.
- [Una caché de 5 minutos sigue sirviendo la imagen después de quitar la marca] → igual que en lo demás de personas; la versión del contenido cambia y la página responde `404` al instante.
- [Artistas con cientos de discos valorados] → la imagen corta en 20; la página los lista todos, sin paginar, porque son de una sola persona.
- [Discos sin año en una curva cronológica] → van al final de la grilla y no entran en la curva.

## Migration Plan

`0084_discography_share.sql`, aditiva: tabla nueva y `CHECK` de `share_event`. Se aplica en scratch; la BD real sigue pendiente de `0079` a `0083`.

## Open Questions

Ninguna para esta fase. D9 se decide en la Fase 2.
