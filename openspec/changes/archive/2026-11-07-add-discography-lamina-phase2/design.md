## Context

Segunda fase de `add-discography-lamina`. Decisiones tomadas al abrirla (2026-11-07): D9 en 10 canciones repartidas en 2 discos, preferencias del dueño por
artista y la Lámina de álbum dentro de la discografía, abierta por la misma marca.

Estado de partida:

- `getDiscographyLamina` lee la sección `main` con la nota del disco y decide quién mira; `discography_share` abre la página y la imagen.
- `discographySection` clasifica en `main`, `live`, `compilations`, `singles`, `other` y `appearances`. `main` ya incluye los EP.
- `release.is_representative` marca la edición cuya tracklist es "la del disco"; `track` guarda `disc_number`, `position` y `recording_id`.
- Las notas de canciones están en `rating.recording_id`, sin audiencia.
- La BD de scratch tiene 49 valoraciones de canciones: no sirve para fijar D9.
- La referencia de imagen es `<userId>.<artistId>` y `ownShareEvents` borra por ese prefijo.

## Goals / Non-Goals

**Goals:**

- Una sola lectura que sirva a las dos vistas, a la Lámina de álbum y a la imagen.
- Que lo compartido siga a una sola fuente de verdad: lo que eligió el dueño.

**Non-Goals:**

- Valoración en lote y "Arma la tuya" (Fase 3).

## Decisions

### 1. Preferencias en su propia tabla

`discography_preference (user_id, artist_id, sections text[], default_view text, updated_at)`, con clave compuesta y borrado en cascada. `CHECK`: `sections`
solo con `live` y `compilations`, y `default_view` en `disc` o `song`. Sin fila: solo la sección principal y la vista Por disco.

- **Por qué aparte de la marca:** el dueño elige también sin compartir, y quitar la marca no debe borrar lo que eligió.
- **Por qué del dueño y no del visitante:** la imagen compartida es una sola; si cada visitante filtrara, el enlace mostraría otra cosa que la imagen.
- El visitante puede cambiar de vista en la página con `?vista=`, sin guardar nada.

### 2. Una lectura con pistas

`readDiscography` pasa a leer, para los discos de las secciones elegidas, la nota del disco y las notas de las canciones de su edición representativa, en dos consultas agrupadas. Cada disco trae sus pistas en orden (`disc_number`, `position`) con un número correlativo.

- **Discos que entran:** los que tienen nota del disco o alguna canción valorada. Por disco usa solo los que tienen nota del disco, como en la Fase 1; el umbral de 3 se cuenta igual.
- **La página existe con cualquiera de las dos vistas:** quien valoró canciones de dos discos y ningún disco entero también tiene su Lámina, en Por canción.
- Un disco sin edición representativa entra sin pistas: aparece en Por disco, pero no en Por canción.
- Una canción en dos discos (una reedición, un compilado) se muestra con la misma nota en cada uno: la nota es de la canción.

### 3. D9

`DISCOGRAPHY_SONG_MIN = 10` canciones valoradas y `DISCOGRAPHY_SONG_MIN_DISCS = 2` discos con alguna, en `src/lib/laminas/discography.ts`. Si la vista por defecto del dueño es Por canción y no llega, la página y la imagen muestran Por disco.

- **Por qué:** con menos, la grilla queda casi vacía y se lee como un error. Queda en una constante porque no hay datos para afinarla; `sharing.md` lo anota en D9.

### 4. Lámina de álbum dentro de la discografía

`?disco=<album>` en la misma página muestra las pistas del disco como barras verticales, con su nota, desde 3 canciones valoradas. La abre la misma marca: la vista Por canción ya publica esas notas, así que una marca por álbum no protegería nada nuevo.

- La imagen usa la referencia `<userId>.<artistId>.<albumId>`, con el mismo tipo `discography`: `ownShareEvents` la borra por el mismo prefijo.
- El disco tiene que estar entre los de la discografía mostrada; si no, `404`, igual que con un disco ajeno.

### 5. Imágenes

- **Por canción:** cabecera de columnas con la nota del disco y el año; las 10 mejor valoradas llevan carátula (ADR 0053). Hasta 20 discos y 20 pistas; con más, "+n". Celdas con el color de la escala y el número escrito; vacías con borde.
- **Álbum:** carátula, barras de hasta 25 pistas con su nota y "+n".
- Las estrellas van con `clipPath`, como en la Fase 1: un `<svg>` por celda haría la imagen inviable.

### 6. API

`PUT /api/me/discography/<artistId>` con `{ sections, view }`. Solo el dueño, sobre sí mismo; no requiere marca. Sin suspensión: no abre nada.

## Risks / Trade-offs

- [D9 sin datos] → constante única, documentada, para ajustarla cuando la BD real tenga valoraciones de canciones.
- [Discografías con cientos de pistas] → la lectura es por lote; la imagen corta en 20 × 20 y la página muestra todas. Se mide en el smoke con 50 discos de 15 pistas.
- [Un cambio de preferencia cambia una imagen ya compartida] → es lo esperado de una Lámina derivada, igual que una nota nueva.
- [Ediciones representativas que cambian por re-canonicalización] → la tracklist sigue a la edición vigente; la nota es de la canción, así que no se pierde.

## Migration Plan

`0085_discography_preference.sql`, aditiva. Sin fila, todo sigue como en la Fase 1. Se aplica en scratch; la BD real sigue pendiente de `0079` a `0085`.

## Open Questions

Ninguna.
