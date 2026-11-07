## Context

Primera fase de `add-tier-list-lamina`. Decisiones tomadas al abrirla (2026-11-07): tres fases; arrastrar nativo más "Mover a…", sin dependencias
nuevas; la bandeja se guarda pero no sale en la imagen ni en la página pública; el prellenado es una foto, no se mueve con las notas.

Estado de partida:

- Las Láminas Top N viven en `user_list` con `kind = 'top'` (migración `0083`) y tienen rutas propias: `/me/laminas`, `/me/laminas/<id>`,
  `/users/<u>/laminas/<id>` y `/api/me/laminas`. Las superficies de listas filtran por `kind = 'standard'`.
- `src/lib/share/score-scale.ts` ya define los seis tramos de la escala de la casa (§5.3), que son los seis niveles de la tier list.
- `readArtistDiscography` y la sección principal (`sectionOf`) son la base de la Lámina de discografía: la misma selección de discos sirve para
  el prellenado.
- ADR 0051: una Lámina armada por una persona puede juntar hasta 10 carátulas. ADR 0053 resuelve el resto de una discografía en texto.
- Una Lámina armada desde una fuente nace privada (`add-top-n-lamina-phase2`).

## Goals / Non-Goals

**Goals:**

- Que una tier list de una discografía esté lista en segundos: elegir el artista y tener ya los discos en su nivel.
- Un editor que se usa entero con teclado y con el dedo, no solo arrastrando.
- Que se vea de la misma casa que el Top N y la discografía: misma escala, marco y firma.

**Non-Goals:**

- Otras fuentes, agregar discos a mano y canciones (Fase 2). "Arma la tuya" (Fase 3).
- Cantidad de niveles variable, colores elegidos por la persona.
- Escribir valoraciones desde la tier list (D8).

## Decisions

### 1. `user_list` con `kind = 'tier'`

Migración `0086`:

- `chk_user_list_kind` suma `tier`.
- `user_list.tier_labels text[]`: las seis etiquetas, en orden de S a E. `CHECK`: `(kind = 'tier') = (tier_labels IS NOT NULL)`, seis elementos
  y cada uno de 1 a 12 caracteres sin espacios a los costados, con una función inmutable `fn_tier_labels_valid(text[])` (un `CHECK` no admite
  subconsultas sobre el arreglo).
- `user_list_item.tier smallint`: `0` = S … `5` = E; `NULL` = bandeja. `CHECK tier IS NULL OR tier BETWEEN 0 AND 5`.
- Tipo de entidad de una tier list: `release-group` o `recording` en el `CHECK` (la Fase 2 suma canciones sin otra migración); el servicio acepta
  solo `release-group` en esta fase.
- `chk_share_event_target_kind` suma `tier`.

`lamina_format` queda `NULL` en una tier list: tiene un solo formato de Lámina. `lamina_show_scores` sirve igual que en el Top N.

- **Por qué:** hereda audiencia, moderación, exportación y las exclusiones, como el Top N. El nivel es un dato del ítem, no un ítem aparte.
- **Que el nivel solo exista en una tier list** es una regla entre tablas: la impone el servicio, único que escribe `tier`, y el smoke verifica
  que las listas de otros tipos no tienen ninguno.

### 2. Orden

`position` sigue siendo el orden único de la lista. Dentro de un nivel, el orden es el de `position`. Guardar la disposición reescribe las
posiciones: primero S, luego A … E y al final la bandeja.

### 3. Prellenado desde la discografía

`POST /api/me/laminas` con `{ kind: 'tier', title, source: { type: 'discography', artistId } }`. Toma los discos de la sección principal del
artista (la misma de la Lámina de discografía, sin las secciones extra), por año. Cada disco cae en el nivel del tramo de la nota del dueño
(`scaleScore`: la nota detallada si existe; si no, el tramo de sus estrellas) y uno sin valorar, en la bandeja. Si el artista no tiene discos
sincronizados, se sincronizan como en su página (cacheo bajo demanda); sin discos principales responde `400` con `VALIDATION_ERROR`.

Tope: 50 discos por tier list, contando la bandeja. Si la discografía tiene más, entran primero los valorados y luego los demás por año.

Nace privada, como cualquier Lámina armada desde una fuente. Es una foto: cambiar después una nota no mueve nada.

### 4. Guardar la disposición

`PUT /api/me/laminas/<id>/tiers` con `{ tiers: string[][], tray: string[] }`: seis arreglos de ids de ítem y la bandeja. Debe traer exactamente
los ítems de la lista; si no coincide, `400` con `VALIDATION_ERROR`, como el orden del Top N. Una sola transacción con bloqueo de la fila de la
lista; toca `user_list.updated_at` como el reordenamiento del Top N.

Cada movimiento en el editor guarda la disposición completa (la lista es chica). Quitar un disco usa la ruta de ítems de siempre. Etiquetas,
título, audiencia y notas van por `PATCH /api/me/laminas/<id>` (`tierLabels`).

### 5. Editor

Seis filas y la bandeja debajo. Cada fila: la etiqueta, con el color de su tramo, editable en el lugar (un campo de texto), y los discos como
carátulas chicas.

- **Arrastrar:** API nativa de arrastrar y soltar (`draggable`, `dragover`, `drop`) en escritorio. Soltar sobre un disco lo deja antes de ese
  disco; sobre el fondo de la fila, al final.
- **"Mover a…":** cada disco es un botón que abre un menú con los seis niveles, la bandeja, "a la izquierda" y "a la derecha". Funciona con
  teclado (Enter, flechas, Escape) y con toque: es el camino accesible, no un extra. Tras mover, el foco sigue al disco y un aviso `aria-live`
  dice dónde quedó.
- **Nota real:** el dueño la ve, discreta, en el menú del disco. Nunca se edita desde aquí.

### 6. Página pública e imagen

`/users/<u>/laminas/<id>` despacha por tipo: una tier list muestra los seis niveles, vacíos incluidos, con sus etiquetas y sus discos enlazados.
La bandeja no sale. Con las notas encendidas, cada disco muestra su nota real como una insignia chica sobre la carátula: tocar el disco lleva a
su página, así que la nota no puede depender de tocarlo. No hay "Arma la tuya" en esta fase (Fase 3).

`TierFrame`: formatos `post` (por defecto), `link` y `story`. Cada fila lleva la etiqueta sobre el color de su tramo (el color no cambia con la
etiqueta). Carátulas para los primeros 10 discos desde S hacia abajo y en orden; el resto, como fichas de texto con el título (criterio del
ADR 0053, sin ADR nuevo: el tope de 10 del ADR 0051 ya cubre lo que arma una persona). El tamaño de ficha se ajusta a la fila más llena, hasta dos
renglones por nivel; se mide con 50 discos colocados. En Enlace, los tres primeros niveles con contenido.

### 7. Lo propio, compartir y feed

`tier` se suma a `OWN_SHARE_KINDS` con el mismo gesto que `top` (`audience = 'public'`) y a `SHARE_TARGET_KINDS`. El feed ya admite Láminas
(`kind = 'top'`); se amplía a `tier` con la misma entrada. `/me/laminas` lista ambas, con el tipo a la vista. El objetivo `tier` versiona la
imagen por `updated_at` de la lista.

## Risks / Trade-offs

- **[Arrastrar nativo no funciona en táctiles]** → el menú "Mover a…" es el camino del toque; las pruebas de componente lo cubren.
- **[Una discografía larga llena la imagen]** → tope de 50, fichas que se achican y muestra PNG con 50.
- **[Guardar en cada movimiento con dos pestañas abiertas]** → la segunda recibe `400` porque los ítems no coinciden y el editor recarga la
  disposición.
- **[El nivel sugiere la nota aunque las notas estén apagadas]** → es la tier list del dueño, no su valoración: puede moverlo; nace privada y
  publicarla es un gesto explícito.

## Migration Plan

`0086` en scratch durante el cambio. En la BD real va después de `0079` a `0085`.

## Open Questions

Ninguna.
